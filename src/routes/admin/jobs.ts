// Job runs, BoxAPI Data API request quota, run daily check now (PRD §9.2.6).
import { Router } from 'express';
import { z } from 'zod';
import { getQuota } from '../../boxapi/data.js';
import { JOB_TYPES } from '../../models/enums.js';
import { JobRun } from '../../models/JobRun.js';
import { QUEUES } from '../../queues/names.js';
import { getQueue } from '../../queues/queues.js';

export const jobsRouter = Router();

const runsQuery = z.object({
  type: z.enum(JOB_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

jobsRouter.get('/runs', async (req, res) => {
  const { type, limit } = runsQuery.parse(req.query);
  const items = await JobRun.find(type ? { type } : {}).sort({ startedAt: -1 }).limit(limit).lean();
  res.json({ items });
});

/** The plan's request quota as BoxAPI reports it; `reachable: false` if BoxAPI didn't answer. */
jobsRouter.get('/quota', async (_req, res) => {
  const quota = await getQuota().catch(() => null);
  res.json(quota ? { reachable: true, ...quota } : { reachable: false });
});

jobsRouter.post('/daily-check', async (_req, res) => {
  const job = await getQueue(QUEUES.reviewerDaily).add('daily-check-manual', {});
  res.status(202).json({ jobId: job.id });
});
