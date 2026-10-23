// One combined daily run for all followed sources (PRD §6.1 step 3): `resultsLimit` 10 per source, dedupe by
// shortcode on our side. Daily checks run until Apify's hard limit (§6.2). Writes a jobRuns record.
import { env } from '../config/env.js';
import { withJobRun } from '../jobs/jobRun.js';
import { ReviewerSource } from '../models/ReviewerSource.js';
import { BudgetError, canRun } from './budget.js';
import { runActor, type ApifyClientOptions } from './client.js';
import { ingestPosts } from './ingest.js';
import type { ApifyPost } from './posts.js';

export const DAILY_RESULTS_LIMIT = 10;

export async function runDailyCheck(opts: ApifyClientOptions = {}) {
  return withJobRun('daily_check', async (ctx) => {
    const sources = await ReviewerSource.find({ follow: true }).lean();
    ctx.counts.sources = sources.length;
    if (sources.length === 0) return ctx.counts;

    const budget = await canRun('daily', opts);
    if (!budget.ok) throw new BudgetError(`apify_${budget.reason}`);

    const { run, items } = await runActor<ApifyPost>(
      env.APIFY_POST_ACTOR,
      { username: sources.map((s) => s.handle), resultsLimit: DAILY_RESULTS_LIMIT },
      { ...opts, onStart: (r) => (ctx.apifyRunId = r.id) },
    );
    ctx.costUsd = run.usageTotalUsd;

    const byOwner = new Map<string, ApifyPost[]>();
    for (const item of items) {
      const owner = item.ownerUsername?.toLowerCase();
      if (owner) byOwner.set(owner, [...(byOwner.get(owner) ?? []), item]);
    }
    const totals: Record<string, number> = { postsFetched: items.length };
    for (const source of sources) {
      const counts = await ingestPosts(source, byOwner.get(source.handle) ?? [], { onlyNewer: true });
      for (const [k, v] of Object.entries(counts)) if (k !== 'postsFetched') totals[k] = (totals[k] ?? 0) + v;
    }
    Object.assign(ctx.counts, totals);
    return ctx.counts;
  });
}
