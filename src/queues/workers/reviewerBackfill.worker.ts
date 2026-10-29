// reviewer-backfill (PRD §6.1): first-run history fetch for one reviewer source.
import type { Job } from 'bullmq';
import { z } from 'zod';
import { toObjectId } from '../../lib/mongo.js';
import { runBackfill } from '../../services/reviewerPosts.js';
import { QUEUES } from '../names.js';
import { noFinalRetry } from './reviewerDaily.worker.js';
import type { WorkerDefinition } from './index.js';

export const backfillJobData = z.object({ sourceId: z.string().regex(/^[0-9a-f]{24}$/i), force: z.boolean().optional() });
export type BackfillJobData = z.infer<typeof backfillJobData>;

export const reviewerBackfillWorker: WorkerDefinition = {
  queue: QUEUES.reviewerBackfill,
  processor: async (job: Job, log) => {
    const data = backfillJobData.parse(job.data);
    const counts = await runBackfill(toObjectId(data.sourceId)!, { force: data.force }).catch(noFinalRetry);
    log.info({ sourceId: data.sourceId, counts }, 'backfill done');
    return counts;
  },
};
