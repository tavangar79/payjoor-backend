// Store a reviewer source's scraped posts (PRD §6.1 steps 4–5): dedupe by shortcode, skip posts we've seen,
// create pending reviews, and move lastSeenShortcode/lastSeenPostAt to the newest non-pinned post.
import { ReviewerSource, type ReviewerSourceDoc } from '../models/ReviewerSource.js';
import { Review } from '../models/Review.js';
import { createPendingFromPost, emptyPostCounts, type PostCounts } from '../services/reviews.js';
import { postTime, type ApifyPost } from './posts.js';

export type IngestCounts = PostCounts & { postsFetched: number; postsNew: number };

/** `onlyNewer`: skip posts not newer than the source's lastSeenPostAt (the daily check). */
export async function ingestPosts(
  source: Pick<ReviewerSourceDoc, '_id' | 'handle' | 'lastSeenPostAt'>,
  posts: ApifyPost[],
  opts: { onlyNewer: boolean },
): Promise<IngestCounts> {
  const counts: IngestCounts = { ...emptyPostCounts(), postsFetched: posts.length, postsNew: 0 };
  const byCode = new Map<string, ApifyPost>();
  for (const p of posts) if (p.shortCode && !p.error && !byCode.has(p.shortCode)) byCode.set(p.shortCode, p);

  let newest: { shortcode: string; at: Date } | null = null;
  for (const [shortcode, post] of byCode) {
    const at = postTime(post);
    // Pinned posts come first whatever their date, so they never set "newest" (§6.1).
    if (at && !post.isPinned && (!newest || at > newest.at)) newest = { shortcode, at };
    if (opts.onlyNewer && source.lastSeenPostAt && at && at <= source.lastSeenPostAt) continue;
    if (await Review.exists({ reviewerSourceId: source._id, postShortcode: shortcode })) continue;
    counts.postsNew++;
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
