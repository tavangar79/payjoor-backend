// apify-daily (PRD §6.1): the scheduled (or "run now") combined check of all followed reviewer sources.
import { UnrecoverableError, type Job } from 'bullmq';
import { BudgetError } from '../../apify/budget.js';
import { ApifyError } from '../../apify/client.js';
import { runDailyCheck } from '../../apify/dailyCheck.js';
import { QUEUES } from '../names.js';
import type { WorkerDefinition } from './index.js';

/** Budget stops, 4xx and failed runs won't fix themselves, and every retry is another paid run. */
export function noPaidRetry(err: unknown): never {
  if (err instanceof BudgetError || (err instanceof ApifyError && !err.retryable)) {
    throw new UnrecoverableError(err.message);
  }
  throw err;
}

export const apifyDailyWorker: WorkerDefinition = {
  queue: QUEUES.apifyDaily,
  processor: async (_job: Job, log) => {
    const counts = await runDailyCheck().catch(noPaidRetry);
    log.info({ counts }, 'daily check done');
    return counts;
  },
};
