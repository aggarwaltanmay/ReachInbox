import { Queue } from 'bullmq'; import { Redis } from 'ioredis'; import { env } from '../config/env.js';
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const emailQueue = new Queue('email-send', { connection: redis, defaultJobOptions: { attempts: 4, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 1000 } });
