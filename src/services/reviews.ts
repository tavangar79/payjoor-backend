// Reviews (PRD §6.3, §9.2.1). From reviewer posts: one pending review per tagged business, on the shop if we
// know it (by handle or previousHandles), else on a wishlist entry (`reviewer_post`); a live review already
// stored for that target and post is skipped (unique partial index). Then moderation: approve or reject.
import type { Types } from 'mongoose';
import { captionText, extractTagged, mediaUrls, postTime, postUrl, type BoxApiPost } from '../boxapi/posts.js';
import { HttpError } from '../lib/errorHandler.js';
import { isDuplicateKey } from '../lib/mongo.js';
import { logger } from '../lib/logger.js';
import type { Direction, Outcome } from '../models/enums.js';
import { Review } from '../models/Review.js';
import { Wishlist } from '../models/Wishlist.js';
import { findByHandle } from './shops.js';
import { addRequest } from './wishlist.js';

export type PostCounts = { reviewsCreated: number; wishlisted: number; duplicates: number; skipped: number };
export const emptyPostCounts = (): PostCounts => ({ reviewsCreated: 0, wishlisted: 0, duplicates: 0, skipped: 0 });

type Source = { _id: Types.ObjectId; handle: string };

function reviewFields(post: BoxApiPost, source: Source, shortcode: string, occurredAt: Date) {
  return {
    sourceType: 'reviewer_post' as const,
    reviewerSourceId: source._id,
    postShortcode: shortcode,
    postUrl: postUrl(shortcode),
    occurredAt,
    caption: captionText(post),
    media: mediaUrls(post),
    paidPartnership: Boolean(post.is_paid_partnership),
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

export async function createPendingFromPost(post: BoxApiPost, source: Source): Promise<PostCounts> {
  const counts = emptyPostCounts();
  const shortcode = post.code;
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

// Moderation (PRD §9.2.1): the admin sets outcome and direction (both required) before publishing.

export type ReviewListQuery = { status: 'pending' | 'published' | 'rejected'; page: number; limit: number };

export async function listReviews(query: ReviewListQuery) {
  const filter = { status: query.status };
  const [items, total] = await Promise.all([
    Review.find(filter, { raw: 0 })
      .sort(query.status === 'pending' ? { createdAt: 1, _id: 1 } : { updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('shopId', 'displayName handle slug')
      .populate('wishlistId', 'handle requestCount status')
      .populate('reviewerSourceId', 'handle name permission')
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getReview(id: Types.ObjectId) {
  const review = await Review.findById(id)
    .populate('shopId', 'displayName handle slug')
    .populate('wishlistId', 'handle requestCount status')
    .populate('reviewerSourceId', 'handle name permission')
    .lean();
  if (!review) throw new HttpError(404, 'not_found');
  return review;
}

export type ApproveInput = { outcome: Outcome; direction: Direction; summary?: string | null };

/** Publishes a pending review. It must be on a shop: promote or link its wishlist entry first. */
export async function approveReview(id: Types.ObjectId, input: ApproveInput) {
  const doc = await Review.findById(id);
  if (!doc) throw new HttpError(404, 'not_found');
  if (doc.status !== 'pending') throw new HttpError(409, 'not_pending');
  if (!doc.shopId) throw new HttpError(409, 'review_not_on_shop');
  doc.outcome = input.outcome;
  doc.direction = input.direction;
  doc.summary = input.summary?.trim() || undefined;
  doc.status = 'published';
  doc.publishedAt = new Date();
  doc.rejectReason = undefined;
  await doc.save();
  return doc.toObject();
}

/** Rejects a pending review, or takes a published one down. */
export async function rejectReview(id: Types.ObjectId, reason: string) {
  const doc = await Review.findById(id);
  if (!doc) throw new HttpError(404, 'not_found');
  if (doc.status === 'rejected') throw new HttpError(409, 'already_rejected');
  doc.status = 'rejected';
  doc.rejectReason = reason.trim();
  doc.publishedAt = undefined;
  await doc.save();
  return doc.toObject();
}
