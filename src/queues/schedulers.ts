// BullMQ job schedulers in Asia/Tehran time (PRD §6.1, §11).
// Upserting is idempotent and each scheduled job runs once even with several workers, so every worker process may call this.
import { env } from '../config/env.js';
import { QUEUES } from './names.js';
import { getQueue } from './queues.js';

export const SCHEDULER_TZ = 'Asia/Tehran';

export const SCHEDULERS = [
  { queue: QUEUES.reviewerDaily, id: 'daily-check', pattern: env.DAILY_CHECK_CRON, jobName: 'daily-check' },
] as const;

export async function registerSchedulers() {
  for (const s of SCHEDULERS) {
    await getQueue(s.queue).upsertJobScheduler(s.id, { pattern: s.pattern, tz: SCHEDULER_TZ }, { name: s.jobName });
  }
}
