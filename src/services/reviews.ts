// Pending reviews from reviewer posts (PRD §6.3). One pending review per tagged business: on the shop if we
// know it (by handle or previousHandles), else on a wishlist entry (`reviewer_post`). A live review already
// stored for that target and post is skipped (unique partial index).
import type { Types } from 'mongoose';
import { extractTagged } from '../apify/extractTagged.js';
import { postTime, postUrl, type ApifyPost } from '../apify/posts.js';
import { isDuplicateKey } from '../lib/mongo.js';
import { logger } from '../lib/logger.js';
import { Review } from '../models/Review.js';
import { Wishlist } from '../models/Wishlist.js';
import { findByHandle } from './shops.js';
import { addRequest } from './wishlist.js';

export type PostCounts = { reviewsCreated: number; wishlisted: number; duplicates: number; skipped: number };
export const emptyPostCounts = (): PostCounts => ({ reviewsCreated: 0, wishlisted: 0, duplicates: 0, skipped: 0 });

type Source = { _id: Types.ObjectId; handle: string };

function reviewFields(post: ApifyPost, source: Source, shortcode: string, occurredAt: Date) {
  return {
    sourceType: 'reviewer_post' as const,
    reviewerSourceId: source._id,
    postShortcode: shortcode,
    postUrl: postUrl(shortcode),
    occurredAt,
    caption: post.caption ?? '',
    media: { displayUrl: post.displayUrl, videoUrl: post.videoUrl },
    paidPartnership: Boolean(post.paidPartnership),
    raw: post,
    status: 'pending' as const,
  };
}

async function createOnce(doc: Record<string, unknown>): Promise<boolean> {
  try {
    await Review.create(doc);
    return true;
  } catch (err) {
    if (isDuplicateKey(err)) return false;
    throw err;
  }
}

export async function createPendingFromPost(post: ApifyPost, source: Source): Promise<PostCounts> {
  const counts = emptyPostCounts();
  const shortcode = post.shortCode;
  const occurredAt = postTime(post);
  if (!shortcode || !occurredAt) {
    counts.skipped++;
    return counts;
  }
  const handles = extractTagged(post, source.handle);
  if (handles.length === 0) {
    // No tagged business: nothing to review. Logged for audit (§6.1).
    logger.info({ source: source.handle, shortcode }, 'reviewer post skipped: no tagged business');
    counts.skipped++;
    return counts;
  }

  for (const handle of handles) {
    const fields = reviewFields(post, source, shortcode, occurredAt);
    const shop = await findByHandle(handle);
    if (shop) {
      if (await createOnce({ ...fields, shopId: shop._id })) counts.reviewsCreated++;
      else counts.duplicates++;
      continue;
    }
    // Don't count the same post twice towards a wishlist entry's demand.
    const existing = await Wishlist.findOne({ handle }, { _id: 1 }).lean();
    if (existing && (await Review.exists({ wishlistId: existing._id, postShortcode: shortcode, status: { $in: ['pending', 'published'] } }))) {
      counts.duplicates++;
      continue;
    }
    const entry = await addRequest(handle, 'reviewer_post');
    if (await createOnce({ ...fields, wishlistId: entry._id })) {
      counts.reviewsCreated++;
      counts.wishlisted++;
    } else counts.duplicates++;
  }
  return counts;
}
