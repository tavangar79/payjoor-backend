// post-publish worker (PRD §6): runs one classified trusted post through the gate. One job at a time, so two posts
// about a new shop can't race to create it.
import type { Job } from 'bullmq';
import { z } from 'zod';
import { toObjectId } from '../../lib/mongo.js';
import { recordFailure } from '../../services/postChecks.js';
import { publishPostCheck } from '../../services/postPublish.js';
import { isFinalAttempt } from '../jobData.js';
import { QUEUES } from '../names.js';
import type { WorkerDefinition } from './index.js';

export const postPublishData = z.object({ postCheckId: z.string().regex(/^[0-9a-f]{24}$/i) });

export const postPublishWorker: WorkerDefinition = {
  queue: QUEUES.postPublish,
  processor: async (job: Job, log) => {
    const id = toObjectId(postPublishData.parse(job.data).postCheckId)!;
    try {
      return await publishPostCheck(id, log);
    } catch (err) {
      if (isFinalAttempt(job, err)) await recordFailure(id, err);
      throw err;
    }
  },
  options: { concurrency: 1 },
};
