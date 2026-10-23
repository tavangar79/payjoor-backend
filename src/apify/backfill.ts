// First-run backfill for a followed source, up to its backfillLimit posts (PRD §6.1 step 2). Skipped with a
// warning when monthly usage is above APIFY_BUDGET_STOP_USD (§6.2). Writes a jobRuns record.
import type { Types } from 'mongoose';
import { env } from '../config/env.js';
import { withJobRun } from '../jobs/jobRun.js';
import { logger } from '../lib/logger.js';
import { ReviewerSource } from '../models/ReviewerSource.js';
import { canRun } from './budget.js';
import { runActor, type ApifyClientOptions } from './client.js';
import { ingestPosts } from './ingest.js';
import type { ApifyPost } from './posts.js';

/** `force`: run even if the backfill was done before (admin "run backfill now"). */
export async function runBackfill(sourceId: Types.ObjectId, opts: ApifyClientOptions & { force?: boolean } = {}) {
  return withJobRun('backfill', async (ctx) => {
    const source = await ReviewerSource.findById(sourceId).lean();
    if (!source) throw new Error('reviewer_source_not_found');
    ctx.counts.sources = 1;
    if ((source.backfillDone && !opts.force) || source.backfillLimit === 0) {
      ctx.counts.alreadyDone = 1;
      return ctx.counts;
    }

    const budget = await canRun('backfill', opts);
    if (!budget.ok) {
      // Not marked done, so it can run next month or from the admin panel.
      logger.warn({ source: source.handle, usageUsd: budget.usageUsd, reason: budget.reason }, 'apify budget: backfill skipped');
      ctx.counts.skippedBudget = 1;
      return ctx.counts;
    }

    const { run, items } = await runActor<ApifyPost>(
      env.APIFY_POST_ACTOR,
      { username: [source.handle], resultsLimit: source.backfillLimit },
      { ...opts, onStart: (r) => (ctx.apifyRunId = r.id) },
    );
    ctx.costUsd = run.usageTotalUsd;
    const own = items.filter((i) => !i.ownerUsername || i.ownerUsername.toLowerCase() === source.handle);
    Object.assign(ctx.counts, await ingestPosts(source, own, { onlyNewer: false }));
    await ReviewerSource.updateOne({ _id: source._id }, { $set: { backfillDone: true } });
    return ctx.counts;
  });
}
