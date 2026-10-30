// Reviewer posts from the BoxAPI Data API (PRD §6.1, §6.2): first-run backfill, the daily check, and storing
// posts as pending reviews. One `user/get_media_by_username` call per page of 12; no "newer than" filter, so we
// dedupe by shortcode. Each run writes a jobRuns record.
import type { Types } from 'mongoose';
import { getUserMedia, type DataOptions } from '../boxapi/data.js';
import { isPinned, postTime, type BoxApiPost } from '../boxapi/posts.js';
import { withJobRun } from '../jobs/jobRun.js';
import { logger } from '../lib/logger.js';
import { ReviewerSource, type ReviewerSourceDoc } from '../models/ReviewerSource.js';
import { Review } from '../models/Review.js';
import { intakeTrustedPost } from './postChecks.js';
import { createPendingFromPost, emptyPostCounts, type PostCounts } from './reviews.js';

export const PAGE_SIZE = 12;
// The daily check pages back only while a whole page is new; this caps it if a source posted a lot.
export const MAX_DAILY_PAGES = 3;

type Source = Pick<ReviewerSourceDoc, '_id' | 'handle' | 'lastSeenPostAt'> & { trusted?: boolean };

export type IngestCounts = PostCounts & { postsFetched: number; postsNew: number; postsQueued: number };

/** `onlyNewer`: skip posts not newer than the source's lastSeenPostAt (the daily check). */
export async function ingestPosts(source: Source, posts: BoxApiPost[], opts: { onlyNewer: boolean }): Promise<IngestCounts> {
  const counts: IngestCounts = { ...emptyPostCounts(), postsFetched: posts.length, postsNew: 0, postsQueued: 0 };
  const byCode = new Map<string, BoxApiPost>();
  for (const p of posts) if (p.code && !byCode.has(p.code)) byCode.set(p.code, p);

  let newest: { shortcode: string; at: Date } | null = null;
  for (const [shortcode, post] of byCode) {
    const at = postTime(post);
    // Pinned posts come first whatever their date, so they never set "newest" (§6.1).
    if (at && !isPinned(post) && (!newest || at > newest.at)) newest = { shortcode, at };
    if (opts.onlyNewer && source.lastSeenPostAt && at && at <= source.lastSeenPostAt) continue;
    if (await Review.exists({ reviewerSourceId: source._id, postShortcode: shortcode })) continue;
    counts.postsNew++;
    if (source.trusted) {
      // Trusted sources skip the pending queue: the AI reads the post first (§6).
      if (!at) counts.skipped++;
      else if (await intakeTrustedPost(post, source, shortcode, at)) counts.postsQueued++;
      else counts.duplicates++;
      continue;
    }
    const c = await createPendingFromPost(post, source);
    counts.reviewsCreated += c.reviewsCreated;
    counts.wishlisted += c.wishlisted;
    counts.duplicates += c.duplicates;
    counts.skipped += c.skipped;
  }

  if (newest && (!source.lastSeenPostAt || newest.at > source.lastSeenPostAt)) {
    await ReviewerSource.updateOne(
      { _id: source._id },
      { $set: { lastSeenShortcode: newest.shortcode, lastSeenPostAt: newest.at } },
    );
  }
  return counts;
}

/** Posts by the source itself; collab posts by other accounts can show up on its grid. */
const ownPosts = (posts: BoxApiPost[], handle: string) =>
  posts.filter((p) => !p.user?.username || p.user.username.toLowerCase() === handle);

/** The source's newest page, plus older pages while every non-pinned post on the page is newer than lastSeenPostAt. */
async function fetchNewPosts(source: Source, opts: DataOptions): Promise<BoxApiPost[]> {
  const posts: BoxApiPost[] = [];
  let maxId: string | undefined;
  for (let page = 0; page < MAX_DAILY_PAGES; page++) {
    const res = await getUserMedia(source.handle, { ...opts, maxId });
    posts.push(...res.items);
    const seen = source.lastSeenPostAt;
    const allNew = Boolean(seen) && res.items.filter((p) => !isPinned(p)).every((p) => (postTime(p) ?? new Date(0)) > seen!);
    if (!allNew || !res.moreAvailable) break;
    maxId = res.nextMaxId;
  }
  return posts;
}

function addCounts(into: Record<string, number>, counts: Record<string, number>) {
  for (const [k, v] of Object.entries(counts)) into[k] = (into[k] ?? 0) + v;
}

/** The daily check of every followed source (§6.1 step 3). A failing source doesn't stop the others. */
export async function runDailyCheck(opts: DataOptions = {}) {
  return withJobRun('daily_check', async (ctx) => {
    const sources = await ReviewerSource.find({ follow: true }).lean();
    ctx.counts.sources = sources.length;
    let firstError: unknown;
    for (const source of sources) {
      try {
        const posts = ownPosts(await fetchNewPosts(source, opts), source.handle);
        addCounts(ctx.counts, await ingestPosts(source, posts, { onlyNewer: true }));
      } catch (err) {
        firstError ??= err;
        ctx.counts.sourceErrors = (ctx.counts.sourceErrors ?? 0) + 1;
        logger.warn({ source: source.handle, err: err instanceof Error ? err.message : String(err) }, 'daily check: source failed');
      }
    }
    // Nothing worked (bad token, BoxAPI down): fail the job so it shows up and can be retried.
    if (firstError && ctx.counts.sourceErrors === sources.length) throw firstError;
    return ctx.counts;
  });
}

/** First-run backfill for a followed source, up to its backfillLimit posts (§6.1 step 2). */
export async function runBackfill(sourceId: Types.ObjectId, opts: DataOptions & { force?: boolean } = {}) {
  const { force, ...dataOpts } = opts;
  return withJobRun('backfill', async (ctx) => {
    const source = await ReviewerSource.findById(sourceId).lean();
    if (!source) throw new Error('reviewer_source_not_found');
    ctx.counts.sources = 1;
    if ((source.backfillDone && !force) || source.backfillLimit === 0) {
      ctx.counts.alreadyDone = 1;
      return ctx.counts;
    }

    const posts: BoxApiPost[] = [];
    let maxId: string | undefined;
    for (let page = 0; page < Math.ceil(source.backfillLimit / PAGE_SIZE); page++) {
      const res = await getUserMedia(source.handle, { ...dataOpts, maxId });
      posts.push(...ownPosts(res.items, source.handle));
      if (posts.length >= source.backfillLimit || !res.moreAvailable) break;
      maxId = res.nextMaxId;
    }
    Object.assign(ctx.counts, await ingestPosts(source, posts.slice(0, source.backfillLimit), { onlyNewer: false }));
    await ReviewerSource.updateOne({ _id: source._id }, { $set: { backfillDone: true } });
    return ctx.counts;
  });
}
