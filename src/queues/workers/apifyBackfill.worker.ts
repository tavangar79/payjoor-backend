// apify-backfill (PRD §6.1): first-run history fetch for one reviewer source.
import type { Job } from 'bullmq';
import { z } from 'zod';
import { runBackfill } from '../../apify/backfill.js';
import { toObjectId } from '../../lib/mongo.js';
import { QUEUES } from '../names.js';
import { noPaidRetry } from './apifyDaily.worker.js';
import type { WorkerDefinition } from './index.js';

export const backfillJobData = z.object({ sourceId: z.string().regex(/^[0-9a-f]{24}$/i), force: z.boolean().optional() });
export type BackfillJobData = z.infer<typeof backfillJobData>;

export const apifyBackfillWorker: WorkerDefinition = {
  queue: QUEUES.apifyBackfill,
  processor: async (job: Job, log) => {
    const data = backfillJobData.parse(job.data);
    const counts = await runBackfill(toObjectId(data.sourceId)!, { force: data.force }).catch(noPaidRetry);
    log.info({ sourceId: data.sourceId, counts }, 'backfill done');
    return counts;
  },
};
