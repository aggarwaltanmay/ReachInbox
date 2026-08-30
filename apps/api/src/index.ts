import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { env } from './config/env.js';
import { db, migrate } from './db/index.js';
import { auth, type AuthRequest, issueToken, verifyToken } from './lib/auth.js';
import { emailQueue } from './queue/emailQueue.js';
import { startEmailWorker, verifyEmailTransport } from './queue/worker.js';
import { ensureSearchIndex, indexEmail, searchEmails } from './lib/search.js';

const app = express();
app.use(cors({ origin: env.WEB_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

const board = new ExpressAdapter();
board.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: board });
app.use('/admin/queues', board.getRouter());

const scheduleSchema = z.object({
  requestId: z.string().uuid(),
  sender: z.string().email(),
  recipients: z.array(z.string().email()).min(1).max(5000),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  startAt: z.string().datetime(),
  delayMs: z.number().int().min(0).default(0),
  hourlyLimitPerSender: z.number().int().positive().optional()
});

type QueuedEmail = { id: string; scheduled_at: string | Date };

async function enqueueEmails(emails: QueuedEmail[]) {
  const batchSize = 500;
  for (let offset = 0; offset < emails.length; offset += batchSize) {
    const batch = emails.slice(offset, offset + batchSize);
    await emailQueue.addBulk(batch.map((email) => ({
      name: 'send-email',
      data: { emailId: email.id },
      opts: { jobId: `email-${email.id}`, delay: Math.max(0, new Date(email.scheduled_at).getTime() - Date.now()) }
    })));
  }
}

async function indexEmails(emails: Record<string, unknown>[]) {
  const batchSize = 100;
  for (let offset = 0; offset < emails.length; offset += batchSize) {
    await Promise.all(emails.slice(offset, offset + batchSize).map(indexEmail));
  }
}

async function reconcileScheduledEmails() {
  const uncertain = await db.query(
    `UPDATE emails
     SET status='failed', error='Delivery outcome unknown after worker restart; not retried to prevent duplicate delivery'
     WHERE status='processing' RETURNING *`
  );
  await Promise.all(uncertain.rows.map((email) => indexEmail(email)));

  const pending = await db.query(
    "SELECT id, scheduled_at FROM emails WHERE status='scheduled' ORDER BY scheduled_at ASC"
  );
  await db.query("UPDATE emails SET bull_job_id='email-' || id::text WHERE status='scheduled'");
  await enqueueEmails(pending.rows);
}

async function reindexStoredEmails() {
  const stored = await db.query('SELECT * FROM emails ORDER BY created_at ASC');
  await indexEmails(stored.rows);
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/auth/google', (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID) return res.status(501).json({ error: 'Google OAuth is not configured' });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = z.string().parse(req.query.code);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });
    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error('No Google identity token');

    const profile = (
      await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_CLIENT_ID
      })
    ).getPayload();
    if (!profile?.email || !profile.email_verified) throw new Error('Google account is not verified');

    const actual = (
      await db.query(
        `INSERT INTO users(id,email,name,avatar_url)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(email) DO UPDATE SET
           name=excluded.name,
           avatar_url=COALESCE(excluded.avatar_url, users.avatar_url)
         RETURNING id,email,name,avatar_url`,
        [randomUUID(), profile.email, profile.name || profile.email, profile.picture ?? null]
      )
    ).rows[0];

    res.redirect(`${env.WEB_ORIGIN}/?token=${issueToken(actual)}`);
  } catch {
    res.status(400).send('Google sign-in failed');
  }
});

app.get('/me', auth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const row = await db.query('SELECT id,email,name,avatar_url FROM users WHERE id=$1', [user.id]);
  res.json(row.rows[0]);
});

app.get('/emails', auth, async (req, res) => {
  const status = z.enum(['scheduled', 'sent', 'failed']).optional().parse(req.query.status);
  const user = (req as AuthRequest).user;
  const values: unknown[] = [user.id];
  let query = 'SELECT * FROM emails WHERE user_id=$1';
  if (status === 'scheduled') {
    query += " AND status IN ('scheduled', 'processing')";
  } else if (status === 'sent') {
    query += " AND status IN ('sent', 'failed')";
  } else if (status) {
    values.push(status);
    query += ' AND status=$2';
  }
  query += ' ORDER BY COALESCE(sent_at, scheduled_at) DESC LIMIT 200';
  const rows = await db.query(query, values);
  res.json(rows.rows);
});

app.get('/emails/search', auth, async (req, res) => {
  const q = z.string().min(1).parse(req.query.q);
  const user = (req as AuthRequest).user;
  const hits = await searchEmails(user.id, q);
  if (hits) return res.json(hits);

  const rows = await db.query(
    `SELECT * FROM emails
     WHERE user_id=$1 AND (recipient ILIKE $2 OR subject ILIKE $2 OR body ILIKE $2)
     ORDER BY COALESCE(sent_at, scheduled_at) DESC LIMIT 50`,
    [user.id, `%${q}%`]
  );
  res.json(rows.rows);
});

app.get('/emails/stats', auth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const rows = await db.query(
    `SELECT status, COUNT(*)::int AS count FROM emails WHERE user_id=$1 GROUP BY status`,
    [user.id]
  );
  const stats = { scheduled: 0, processing: 0, sent: 0, failed: 0 };
  for (const row of rows.rows) stats[row.status as keyof typeof stats] = row.count;
  res.json(stats);
});

app.post('/emails/schedule', auth, async (req, res) => {
  const input = scheduleSchema.parse(req.body);
  const user = (req as AuthRequest).user;
  const base = new Date(input.startAt).getTime();
  if (base < Date.now() - 1000) return res.status(400).json({ error: 'Start time must be in the future' });

  const client = await db.connect();
  let records: Record<string, unknown>[];
  let created = false;
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `INSERT INTO schedule_requests(user_id,idempotency_key) VALUES($1,$2)
       ON CONFLICT DO NOTHING RETURNING idempotency_key`,
      [user.id, input.requestId]
    );
    created = Boolean(claimed.rows[0]);

    if (created) {
      records = [];
      for (let i = 0; i < input.recipients.length; i++) {
        const id = randomUUID();
        const scheduledAt = new Date(base + i * input.delayMs);
        const inserted = await client.query(
          `INSERT INTO emails(id,user_id,sender,recipient,subject,body,scheduled_at,status,bull_job_id,idempotency_key,hourly_limit_per_sender,schedule_request_key)
           VALUES($1,$2,$3,$4,$5,$6,$7,'scheduled',$8,$9,$10,$11) RETURNING *`,
          [
            id,
            user.id,
            input.sender,
            input.recipients[i],
            input.subject,
            input.body,
            scheduledAt,
            `email-${id}`,
            id,
            input.hourlyLimitPerSender ?? null,
            input.requestId
          ]
        );
        records.push(inserted.rows[0]);
      }
    } else {
      records = (
        await client.query(
          'SELECT * FROM emails WHERE user_id=$1 AND schedule_request_key=$2 ORDER BY scheduled_at ASC',
          [user.id, input.requestId]
        )
      ).rows;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  await enqueueEmails(records as QueuedEmail[]);
  await indexEmails(records);
  res.status(created ? 201 : 200).json({ count: records.length, emails: records, idempotentReplay: !created });
});

app.get('/integrations/slack/status', auth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const row = await db.query('SELECT team_name, created_at FROM slack_connections WHERE user_id=$1 AND webhook_url IS NOT NULL', [user.id]);
  res.json({ connected: Boolean(row.rows[0]), teamName: row.rows[0]?.team_name ?? null });
});

app.delete('/integrations/slack', auth, async (req, res) => {
  const user = (req as AuthRequest).user;
  await db.query('DELETE FROM slack_connections WHERE user_id=$1', [user.id]);
  res.json({ ok: true });
});

app.post('/integrations/slack/connect', auth, (req, res) => {
  try {
    if (!env.SLACK_CLIENT_ID) return res.status(501).json({ error: 'Slack OAuth is not configured' });
    const user = (req as AuthRequest).user;
    const state = issueToken(user);
    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      redirect_uri: env.SLACK_CALLBACK_URL,
      scope: 'chat:write,incoming-webhook',
      state
    });
    res.json({ url: `https://slack.com/oauth/v2/authorize?${params}` });
  } catch {
    res.status(500).json({ error: 'Unable to start Slack connection' });
  }
});

app.get('/integrations/slack/callback', async (req, res) => {
  try {
    const state = z.string().parse(req.query.state);
    const user = verifyToken<{ id: string }>(state);
    const code = z.string().parse(req.query.code);
    const result = (await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.SLACK_CLIENT_ID!,
        client_secret: env.SLACK_CLIENT_SECRET!,
        redirect_uri: env.SLACK_CALLBACK_URL
      })
    }).then((r) => r.json())) as {
      ok: boolean;
      error?: string;
      access_token?: string;
      team?: { name: string };
      incoming_webhook?: { url: string; channel?: string; channel_id?: string };
    };
    if (!result.ok || !result.access_token || !result.incoming_webhook?.url) {
      throw new Error(result.error || 'Slack did not return an incoming webhook; reconnect and choose a channel');
    }
    await db.query(
      `INSERT INTO slack_connections(user_id,access_token,team_name,webhook_url,channel_id,channel_name)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(user_id) DO UPDATE SET access_token=excluded.access_token,team_name=excluded.team_name,
       webhook_url=excluded.webhook_url,channel_id=excluded.channel_id,channel_name=excluded.channel_name`,
      [user.id, result.access_token, result.team?.name, result.incoming_webhook.url, result.incoming_webhook.channel_id, result.incoming_webhook.channel]
    );
    res.redirect(`${env.WEB_ORIGIN}/?slack=connected`);
  } catch (error) {
    console.error('Slack OAuth callback failed', error);
    res.status(400).send(error instanceof Error ? `Slack connection failed: ${error.message}` : 'Slack connection failed');
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.issues.map((issue) => issue.message).join(', ') });
  }
  console.error('Unhandled API error', error);
  res.status(500).json({ error: 'Internal server error' });
});

migrate()
  .then(() => ensureSearchIndex().catch((error) => console.error('Elasticsearch initialization failed', error)))
  .then(reindexStoredEmails)
  .then(reconcileScheduledEmails)
  .then(verifyEmailTransport)
  .then(() => {
    startEmailWorker();
    app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
