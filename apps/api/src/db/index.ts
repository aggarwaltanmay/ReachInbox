import { Pool } from 'pg';
import { env } from '../config/env.js';
export const db = new Pool({ connectionString: env.DATABASE_URL });

export async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, avatar_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS slack_connections (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, access_token TEXT NOT NULL, team_name TEXT, webhook_url TEXT, channel_id TEXT, channel_name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS schedule_requests (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, idempotency_key TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id, idempotency_key));
CREATE TABLE IF NOT EXISTS emails (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), sender TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, scheduled_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, status TEXT NOT NULL CHECK (status IN ('scheduled','processing','sent','failed')), bull_job_id TEXT UNIQUE, idempotency_key TEXT NOT NULL UNIQUE, message_id TEXT, error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS emails_user_status_idx ON emails(user_id, status, scheduled_at);`);
  await db.query(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS hourly_limit_per_sender INT`);
  await db.query(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS schedule_request_key TEXT`);
  await db.query(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS send_attempted_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE slack_connections ADD COLUMN IF NOT EXISTS webhook_url TEXT`);
  await db.query(`ALTER TABLE slack_connections ADD COLUMN IF NOT EXISTS channel_id TEXT`);
  await db.query(`ALTER TABLE slack_connections ADD COLUMN IF NOT EXISTS channel_name TEXT`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS emails_schedule_recipient_idx ON emails(user_id, schedule_request_key, recipient) WHERE schedule_request_key IS NOT NULL`);
}
