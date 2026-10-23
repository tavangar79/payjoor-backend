// token-refresh (PRD §10.6): weekly refresh of the long-lived Instagram token, stored encrypted.
// A refresh that fails for good is logged at error level with `alert: true`, so log alerts can pick it up.
import type { Job } from 'bullmq';
import { withJobRun } from '../../jobs/jobRun.js';
import { refreshToken } from '../../meta/token.js';
import { isFinalAttempt } from '../jobData.js';
import { QUEUES } from '../names.js';
import type { WorkerDefinition } from './index.js';

export const tokenRefreshWorker: WorkerDefinition = {
  queue: QUEUES.tokenRefresh,
  processor: async (job: Job, log) => {
    try {
      const expiresAt = await withJobRun('token_refresh', () => refreshToken());
      log.info({ expiresAt }, 'meta token refreshed');
      return { expiresAt: expiresAt.toISOString() };
    } catch (err) {
      if (isFinalAttempt(job, err)) {
        log.error({ alert: true, err: err instanceof Error ? err.message : String(err) }, 'meta token refresh failed');
      }
      throw err;
    }
  },
};
