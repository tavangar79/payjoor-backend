// Job runs, Apify usage this month, run daily check now (PRD §9.2.6).
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getUsage } from '../../apify/client.js';
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

/** Apify's own monthly figure, plus what our jobRuns recorded since the 1st (UTC). */
jobsRouter.get('/usage', async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [usage, recorded] = await Promise.all([
    getUsage().catch(() => null),
    JobRun.aggregate<{ total: number }>([
      { $match: { startedAt: { $gte: monthStart }, costUsd: { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$costUsd' } } },
    ]),
  ]);
  res.json({
    monthlyUsageUsd: usage?.monthlyUsageUsd ?? null,
    maxMonthlyUsageUsd: usage?.maxMonthlyUsageUsd ?? null,
    budgetStopUsd: env.APIFY_BUDGET_STOP_USD,
    recordedThisMonthUsd: recorded[0]?.total ?? 0,
    apifyReachable: usage !== null,
  });
});

jobsRouter.post('/daily-check', async (_req, res) => {
  const job = await getQueue(QUEUES.apifyDaily).add('daily-check-manual', {});
  res.status(202).json({ jobId: job.id });
});
