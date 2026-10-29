// reviewer-daily (PRD §6.1): the scheduled (or "run now") check of all followed reviewer sources.
import { UnrecoverableError, type Job } from 'bullmq';
import { BoxApiError } from '../../boxapi/dm.js';
import { runDailyCheck } from '../../services/reviewerPosts.js';
import { QUEUES } from '../names.js';
import type { WorkerDefinition } from './index.js';

/** A 4xx (bad token, unknown user) won't fix itself, and every retry spends Data API requests. */
export function noFinalRetry(err: unknown): never {
  if (err instanceof BoxApiError && !err.retryable) throw new UnrecoverableError(err.message);
  throw err;
}

export const reviewerDailyWorker: WorkerDefinition = {
  queue: QUEUES.reviewerDaily,
  processor: async (_job: Job, log) => {
    const counts = await runDailyCheck().catch(noFinalRetry);
    log.info({ counts }, 'daily check done');
    return counts;
  },
};
