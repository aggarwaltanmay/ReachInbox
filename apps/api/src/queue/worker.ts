import { DelayedError, UnrecoverableError, Worker, type Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { indexEmail } from '../lib/search.js';
import { redis } from './emailQueue.js';

type JobData = { emailId: string; sendAfter?: number };
type RateWindow = { id: number; endsAt: number; key: string };

if (!env.ETHEREAL_USER || !env.ETHEREAL_PASS) {
  throw new Error('ETHEREAL_USER and ETHEREAL_PASS are required; refusing to mark unsent messages as sent');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
  auth: { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASS }
});

function rateWindow(sender: string): RateWindow {
  const now = Date.now();
  const id = Math.floor(now / 3_600_000);
  return { id, endsAt: (id + 1) * 3_600_000, key: `rate:${sender}:${id}` };
}

async function currentRateCount(window: RateWindow) {
  return Number((await redis.get(window.key)) ?? 0);
}

async function reserveHourlySlot(window: RateWindow) {
  const count = await redis.incr(window.key);
  if (count === 1) await redis.pexpire(window.key, Math.max(1, window.endsAt - Date.now() + 60_000));
  return count;
}

async function reserveGlobalSendTime() {
  if (env.MIN_SEND_INTERVAL_MS === 0) return Date.now();
  const script = `
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')
    local now = tonumber(ARGV[1])
    local interval = tonumber(ARGV[2])
    local slot = math.max(current, now)
    local ttl = (slot + interval - now) + 60000
    redis.call('SET', KEYS[1], slot + interval, 'PX', ttl)
    return slot
  `;
  return Number(await redis.eval(script, 1, 'email-send:next-at', Date.now(), env.MIN_SEND_INTERVAL_MS));
}

async function notifyRateLimit(userId: string, sender: string, window: RateWindow) {
  const row = await db.query(
    'SELECT access_token, webhook_url, channel_id FROM slack_connections WHERE user_id=$1',
    [userId]
  );
  const connection = row.rows[0];
  if (!connection) return;
  if (!connection.webhook_url && !connection.channel_id) return;

  const notificationKey = `rate-notified:${userId}:${sender}:${window.id}`;
  const first = await redis.set(notificationKey, '1', 'PX', Math.max(1, window.endsAt - Date.now() + 60_000), 'NX');
  if (!first) return;
  const text = `ReachInbox: ${sender} reached its hourly sending limit. Pending emails will resume in the next UTC hour.`;

  try {
    if (connection.webhook_url) {
      const response = await fetch(connection.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error(`Slack webhook returned HTTP ${response.status}`);
      return;
    }
    if (!connection.channel_id) throw new Error('Slack connection has no selected notification channel; reconnect Slack');
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${connection.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: connection.channel_id, text })
    });
    const result = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || `Slack returned HTTP ${response.status}`);
  } catch (error) {
    console.error('Slack rate-limit notification failed', error);
  }
}

async function delayUntil(job: Job<JobData>, timestamp: number) {
  await job.moveToDelayed(timestamp, job.token!);
  throw new DelayedError();
}

export function startEmailWorker() {
  const worker = new Worker<JobData>(
    'email-send',
    async (job) => {
      const result = await db.query("SELECT * FROM emails WHERE id=$1 AND status='scheduled'", [job.data.emailId]);
      const email = result.rows[0];
      if (!email) return;

      const limit = email.hourly_limit_per_sender ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;
      const window = rateWindow(email.sender);
      if ((await currentRateCount(window)) >= limit) {
        // A slot from the previous window must not bypass pacing after the
        // hourly counter resets.
        if (job.data.sendAfter) await job.updateData({ emailId: job.data.emailId });
        await notifyRateLimit(email.user_id, email.sender, window);
        await delayUntil(job, window.endsAt + 1_000);
      }

      if (job.data.sendAfter) {
        // Delayed jobs must consume their previously reserved slot. Reserving
        // a new slot every time they wake causes perpetual queue starvation
        // when several workers are active.
        if (job.data.sendAfter > Date.now() + 10) await delayUntil(job, job.data.sendAfter);
        await job.updateData({ emailId: job.data.emailId });
      } else {
        const globalSlot = await reserveGlobalSendTime();
        if (globalSlot > Date.now() + 10) {
          await job.updateData({ ...job.data, sendAfter: globalSlot });
          await delayUntil(job, globalSlot);
        }
      }

      const count = await reserveHourlySlot(window);
      if (count > limit) {
        await notifyRateLimit(email.user_id, email.sender, window);
        await delayUntil(job, window.endsAt + 1_000);
      }

      const claimed = await db.query(
        "UPDATE emails SET status='processing', send_attempted_at=now(), error=NULL WHERE id=$1 AND status='scheduled' RETURNING *",
        [email.id]
      );
      if (!claimed.rows[0]) return;

      try {
        const info = await transporter.sendMail({
          from: email.sender,
          to: email.recipient,
          subject: email.subject,
          text: email.body,
          headers: { 'X-ReachInbox-Email-Id': email.idempotency_key }
        });
        const updated = await db.query(
          "UPDATE emails SET status='sent', sent_at=now(), message_id=$2 WHERE id=$1 RETURNING *",
          [email.id, info.messageId]
        );
        await indexEmail(updated.rows[0]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'SMTP send failed';
        const failed = await db.query("UPDATE emails SET status='failed', error=$2 WHERE id=$1 RETURNING *", [
          email.id,
          message
        ]);
        await indexEmail(failed.rows[0]);
        // SMTP has no idempotency API. Do not retry an attempted send because the
        // provider may have accepted it before the connection failed.
        throw new UnrecoverableError(message);
      }
    },
    { connection: redis, concurrency: env.WORKER_CONCURRENCY }
  );
  worker.on('error', console.error);
  return worker;
}

export async function verifyEmailTransport() {
  await transporter.verify();
}
