// BullMQ job schedulers in Asia/Tehran time (PRD §6.1, §10.6, §11).
// Upserting is idempotent and each scheduled job runs once even with several workers, so every worker process may call this.
import { env } from '../config/env.js';
import { QUEUES } from './names.js';
import { getQueue } from './queues.js';

export const SCHEDULER_TZ = 'Asia/Tehran';
// Weekly, Monday 04:00 Tehran time; long-lived tokens last 60 days (§10.6).
export const TOKEN_REFRESH_CRON = '0 4 * * 1';

export const SCHEDULERS = [
  { queue: QUEUES.apifyDaily, id: 'daily-check', pattern: env.DAILY_CHECK_CRON, jobName: 'daily-check' },
  { queue: QUEUES.tokenRefresh, id: 'token-refresh', pattern: TOKEN_REFRESH_CRON, jobName: 'token-refresh' },
] as const;

export async function registerSchedulers() {
  for (const s of SCHEDULERS) {
    await getQueue(s.queue).upsertJobScheduler(s.id, { pattern: s.pattern, tz: SCHEDULER_TZ }, { name: s.jobName });
  }
}
