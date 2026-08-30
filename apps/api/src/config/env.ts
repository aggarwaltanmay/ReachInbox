import dotenv from 'dotenv';
import { z } from 'zod';

// The API runs with apps/api as its working directory; load the monorepo's shared
// environment file explicitly instead of inheriting unrelated local shell values.
dotenv.config({ path: new URL('../../../../.env', import.meta.url), override: true });

const schema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox'),
  REDIS_URL: z.string().default('redis://localhost:6379'), PORT: z.coerce.number().default(4000),
  ELASTICSEARCH_URL: z.string().url().optional(),
  WEB_ORIGIN: z.string().default('http://localhost:5173'), JWT_SECRET: z.string().default('development-secret-change-me'),
  GOOGLE_CLIENT_ID: z.string().optional(), GOOGLE_CLIENT_SECRET: z.string().optional(), GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/auth/google/callback'),
  SLACK_CLIENT_ID: z.string().optional(), SLACK_CLIENT_SECRET: z.string().optional(), SLACK_CALLBACK_URL: z.string().default('http://localhost:4000/integrations/slack/callback'),
  ETHEREAL_USER: z.string().optional(), ETHEREAL_PASS: z.string().optional(), WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MIN_SEND_INTERVAL_MS: z.coerce.number().int().nonnegative().default(2000), MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().int().positive().default(200)
});
export const env = schema.parse(process.env);
