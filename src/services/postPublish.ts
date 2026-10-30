// Publishes a classified trusted post (PRD §6, §6.3): the gate, then the shop, the review, the scammer tag and the
// shop status. Anything else goes to a person with the reasons. Every step can run again: a job that crashed anywhere
// retries from the top, and the postCheck leaves `classified` only as the last step.
import { UnrecoverableError } from 'bullmq';
import type { Types } from 'mongoose';
import type { Logger } from 'pino';
import { BoxApiError } from '../boxapi/dm.js';
import { env } from '../config/env.js';
import { withJobRun } from '../jobs/jobRun.js';
import { normalizeHandle } from '../lib/handle.js';
import { logger } from '../lib/logger.js';
import { isDuplicateKey } from '../lib/mongo.js';
import type { Direction, Outcome } from '../models/enums.js';
import { IgnoredHandle } from '../models/IgnoredHandle.js';
import { PostCheck, type PostCheckDoc } from '../models/PostCheck.js';
import { Review } from '../models/Review.js';
import { ReviewerSource } from '../models/ReviewerSource.js';
import { ensureShop } from './autoShops.js';
import type { PostAnalysis } from './postClassify.js';
import { evaluateGate, handleInPost } from './postGate.js';
import { reviewFields, type StoredPost } from './reviews.js';
import { findByHandle, getShop, updateShop } from './shops.js';
import { SCAMMER_TAG, syncShopStatus } from './shopStatus.js';
import { addRequest } from './wishlist.js';

export type PublishInput = {
  shopId: Types.ObjectId;
  outcome: Outcome;
  direction: Direction;
  summary: string;
  autoPublished: boolean;
  scamClaim: boolean;
};

const publishedReviewId = async (shopId: Types.ObjectId, postShortcode: string) =>
  (await Review.findOne({ shopId, postShortcode, status: 'published' }, { _id: 1 }).lean())?._id ?? null;

/**
 * Publishes the post as a review of the shop, then applies a scam claim's tag and the shop status. Returns null on a
 * duplicate. A duplicate that is published still gets the tag and status, since a crash may have stopped short of them;
 * one that is pending is the admin's to decide, so it changes nothing.
 */
export async function publishReview(check: StoredPost, input: PublishInput): Promise<Types.ObjectId | null> {
  const { shopId, outcome, direction, summary, autoPublished, scamClaim } = input;
  let id: Types.ObjectId | null = null;
  try {
    const review = await Review.create({
      ...reviewFields(check),
      shopId,
      outcome,
      direction,
      summary: summary.trim() || undefined,
      autoPublished,
      status: 'published',
      publishedAt: new Date(),
    });
    id = review._id;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
  if (!id && !(await publishedReviewId(shopId, check.postShortcode))) return null;

  if (scamClaim) await tagScammer(shopId);
  await syncShopStatus(shopId);
  return id;
}

export async function tagScammer(shopId: Types.ObjectId): Promise<void> {
  const shop = await getShop(shopId);
  if (!shop.tags.includes(SCAMMER_TAG)) await updateShop(shopId, { tags: [...shop.tags, SCAMMER_TAG] });
}

/** Includes every reviewer page: a reviewer is never a shop, whichever page's post names it. */
async function ignoredHandles(): Promise<Set<string>> {
  const [rows, sources] = await Promise.all([IgnoredHandle.find({}, { handle: 1 }).lean(), ReviewerSource.find({}, { handle: 1 }).lean()]);
  return new Set([...env.REVIEW_IGNORE_HANDLES, ...rows.map((r) => r.handle), ...sources.map((s) => s.handle)]);
}

/** Leaves the post for a person. Demand is counted first: if we crash in between, a repeat count beats a lost one. */
async function hold(check: PostCheckDoc, analysis: PostAnalysis, reasons: string[], ignored: Set<string>) {
  const reviewed = analysis.shops.filter((s) => s.role === 'reviewed_shop').map((s) => normalizeHandle(s.handle));
  for (const handle of new Set(reviewed)) {
    if (!handle || ignored.has(handle) || !handleInPost(handle, check.caption ?? '', check.tagged)) continue;
    if (!(await findByHandle(handle))) await addRequest(handle, 'reviewer_post');
  }
  await PostCheck.updateOne({ _id: check._id, status: 'classified' }, { $set: { status: 'needs_person', reasons }, $unset: { lastError: '' } });
}

/** True when the post went public, false when it was left for a person. */
async function runGate(check: PostCheckDoc, log: Logger): Promise<boolean> {
  const analysis = check.analysis as PostAnalysis;
  const source = await ReviewerSource.findById(check.reviewerSourceId, { trusted: 1 }).lean();
  const ignored = await ignoredHandles();
  const gate = evaluateGate({
    analysis,
    caption: check.caption ?? '',
    tagged: check.tagged,
    paidPartnership: check.paidPartnership,
    ignored,
    minConfidence: env.AI_PUBLISH_MIN_CONFIDENCE,
  });

  const held = async (reasons: string[]) => {
    await hold(check, analysis, reasons, ignored);
    log.info({ postCheckId: String(check._id), reasons }, 'post held for a person');
    return false;
  };

  // The gate is pure and can't see the source; its first rule still applies if an admin changed it after intake.
  const reasons = [...gate.reasons, ...(source?.trusted ? [] : ['source_not_trusted'])];
  if (reasons.length) return held(reasons);

  const ensured = await ensureShop(gate.handle!, analysis.category, log);
  if ('held' in ensured) return held([ensured.held]);
  const shopId = ensured.shop._id;

  // A takedown sticks: the unique index doesn't see rejected reviews, so a retry would publish this post again.
  if (await Review.exists({ shopId, postShortcode: check.postShortcode, status: 'rejected' })) return held(['review_rejected']);

  const created = await publishReview(check, {
    shopId,
    outcome: gate.outcome!,
    direction: analysis.direction as Direction,
    summary: analysis.summary,
    autoPublished: true,
    scamClaim: analysis.scamClaim,
  });
  const reviewId = created ?? (await publishedReviewId(shopId, check.postShortcode));
  if (!reviewId) return held(['review_pending']);

  await PostCheck.updateOne(
    { _id: check._id, status: 'classified' },
    { $set: { status: 'published', reasons: [], shopIds: [shopId], reviewIds: [reviewId] }, $unset: { lastError: '' } },
  );
  log.info({ postCheckId: String(check._id), shopId: String(shopId) }, 'post published');
  return true;
}

export async function publishPostCheck(id: Types.ObjectId, log: Logger = logger): Promise<void> {
  const check = await PostCheck.findById(id).lean<PostCheckDoc>();
  if (!check) throw new UnrecoverableError('post_check_not_found');
  // Already decided by this job's earlier run or a person.
  if (check.status !== 'classified') return;

  await withJobRun('post_publish', async (ctx) => {
    try {
      ctx.counts[(await runGate(check, log)) ? 'published' : 'held'] = 1;
    } catch (err) {
      // A 4xx (bad token, bad request) won't fix itself and each retry spends a Data API request.
      if (err instanceof BoxApiError && !err.retryable) throw new UnrecoverableError(err.message);
      throw err;
    }
  });
}
