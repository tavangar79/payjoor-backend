// Post shortcode -> ownerUsername via the post scraper (PRD §5.3), cached forever in postOwners.
// Goes through the budget guard and writes a jobRuns record.
import { env } from '../config/env.js';
import { withJobRun } from '../jobs/jobRun.js';
import { normalizeHandle } from '../lib/handle.js';
import { PostOwner } from '../models/PostOwner.js';
import { canRun } from './budget.js';
import { runActor, type ApifyClientOptions } from './client.js';

export const postUrl = (shortcode: string) => `https://www.instagram.com/p/${shortcode}/`;

export class BudgetError extends Error {}

/** The cached owner, else one Apify run. Returns null if the post can't be read (private, deleted). */
export async function lookupPostOwner(shortcode: string, opts: ApifyClientOptions = {}): Promise<string | null> {
  const cached = await PostOwner.findOne({ shortcode }, { ownerUsername: 1 }).lean();
  if (cached) return cached.ownerUsername;

  return withJobRun('post_owner_lookup', async (ctx) => {
    const budget = await canRun('post_owner', opts);
    if (!budget.ok) throw new BudgetError(`apify_${budget.reason}`);
    const { run, items } = await runActor<{ shortCode?: string; ownerUsername?: string }>(
      env.APIFY_POST_ACTOR,
      { username: [postUrl(shortcode)], resultsLimit: 1 },
      { ...opts, onStart: (r) => (ctx.apifyRunId = r.id) },
    );
    ctx.costUsd = run.usageTotalUsd;
    ctx.counts.items = items.length;
    const item = items.find((i) => i.shortCode === shortcode) ?? (items.length === 1 ? items[0] : undefined);
    const owner = item?.ownerUsername ? normalizeHandle(item.ownerUsername) : null;
    ctx.counts.found = owner ? 1 : 0;
    if (owner) {
      await PostOwner.updateOne(
        { shortcode },
        { $setOnInsert: { shortcode, ownerUsername: owner, fetchedAt: new Date() } },
        { upsert: true },
      );
    }
    return owner;
  });
}
