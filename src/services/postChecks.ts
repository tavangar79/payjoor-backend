// Trusted-reviewer post intake (PRD §6): store each post as a postCheck and queue it for AI analysis.
import type { Types } from 'mongoose';
import { captionText, extractTagged, mediaUrls, postUrl, type BoxApiPost } from '../boxapi/posts.js';
import { HttpError } from '../lib/errorHandler.js';
import { isDuplicateKey } from '../lib/mongo.js';
import type { Direction, Outcome } from '../models/enums.js';
import { PostCheck, type PostCheckDoc } from '../models/PostCheck.js';
import { Review } from '../models/Review.js';
import { QUEUES } from '../queues/names.js';
import { getQueue } from '../queues/queues.js';
import { findOrCreateCategory } from './categories.js';
import { publishReview, tagScammer } from './postPublish.js';
import { approveReview } from './reviews.js';
import { getShop, updateShop } from './shops.js';
import { syncShopStatus } from './shopStatus.js';

/** Queues the AI analysis of a postCheck. A bad reply is a paid retry, so 8 attempts with a slow backoff. */
export async function enqueueClassify(id: Types.ObjectId, opts: { rerun?: boolean } = {}): Promise<void> {
  const jobId = opts.rerun ? `classify-${id}-${Date.now()}` : `classify-${id}`;
  await getQueue(QUEUES.ai).add(
    'classify_post',
    { task: 'classify_post', postCheckId: String(id) },
    { jobId, attempts: 8, backoff: { type: 'exponential', delay: 60_000 } },
  );
}

/**
 * Stores a trusted source's post (also one with no tags, so nothing disappears silently) and queues it.
 * Returns false when the post is already stored (a still-`queued` one is queued again).
 */
export async function intakeTrustedPost(
  post: BoxApiPost,
  source: { _id: Types.ObjectId; handle: string },
  shortcode: string,
  occurredAt: Date,
): Promise<boolean> {
  let created;
  try {
    created = await PostCheck.create({
      reviewerSourceId: source._id,
      postShortcode: shortcode,
      postUrl: postUrl(shortcode),
      occurredAt,
      caption: captionText(post),
      media: mediaUrls(post),
      paidPartnership: Boolean(post.is_paid_partnership),
      tagged: extractTagged(post, source.handle),
      raw: post,
      status: 'queued',
    });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    // Stored earlier but maybe never queued (Redis down right after the insert); the jobId drops a true duplicate.
    const existing = await PostCheck.findOne({ reviewerSourceId: source._id, postShortcode: shortcode }, { status: 1 }).lean();
    if (existing?.status === 'queued') await enqueueClassify(existing._id);
    return false;
  }
  await enqueueClassify(created._id);
  return true;
}

/** Queues the publish step of a classified postCheck. A rerun gets a new job id: BullMQ ignores a retained one. */
export async function enqueuePublish(id: Types.ObjectId, opts: { rerun?: boolean } = {}): Promise<void> {
  const jobId = opts.rerun ? `publish-${id}-${Date.now()}` : `publish-${id}`;
  await getQueue(QUEUES.postPublish).add(
    'post_publish',
    { postCheckId: String(id) },
    { jobId, attempts: 8, backoff: { type: 'exponential', delay: 60_000 } },
  );
}

// Admin actions (PRD §9.2.1): a person decides the posts the gate held, and sees the ones that failed.

export type PostCheckListQuery = { status: PostCheckDoc['status'] | 'failed'; page: number; limit: number };

// A job that gave up leaves the row `queued` or `classified` with lastError.
const failedFilter = { status: { $in: ['queued', 'classified'] }, lastError: { $exists: true } };

export async function listPostChecks(query: PostCheckListQuery) {
  const filter = query.status === 'failed' ? failedFilter : { status: query.status };
  const [items, total] = await Promise.all([
    PostCheck.find(filter, { raw: 0 })
      .sort(query.status === 'needs_person' ? { createdAt: 1, _id: 1 } : { updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('reviewerSourceId', 'handle name')
      .lean(),
    PostCheck.countDocuments(filter),
  ]);
  return { items, total };
}

async function loadOrThrow(id: Types.ObjectId): Promise<PostCheckDoc> {
  const check = await PostCheck.findById(id).lean<PostCheckDoc>();
  if (!check) throw new HttpError(404, 'not_found');
  return check;
}

/** A person may act on a post the gate held, or on one a job gave up on. */
const person = (c: Pick<PostCheckDoc, 'status' | 'lastError'>) =>
  c.status === 'needs_person' || ((c.status === 'queued' || c.status === 'classified') && Boolean(c.lastError));
const personFilter = (id: Types.ObjectId) => ({ _id: id, $or: [{ status: 'needs_person' }, failedFilter] });

export type PersonPublishInput = {
  shopIds: Types.ObjectId[];
  outcome: Outcome;
  direction: Direction;
  summary?: string;
  scamClaim?: boolean;
  category?: string;
};

/**
 * Publishes the post as a review of one shop and returns its id. A person decided, so an earlier takedown doesn't
 * block it. A published duplicate counts as done; a pending one is published instead of failing.
 */
async function publishFor(check: PostCheckDoc, shopId: Types.ObjectId, input: PersonPublishInput): Promise<Types.ObjectId> {
  const { outcome, direction } = input;
  const summary = input.summary ?? '';
  const scamClaim = input.scamClaim === true;
  const created = await publishReview(check, { shopId, outcome, direction, summary, autoPublished: false, scamClaim });
  if (created) return created;
  const live = await Review.findOne({ shopId, postShortcode: check.postShortcode, status: { $in: ['pending', 'published'] } }, { _id: 1, status: 1 }).lean();
  if (!live) throw new HttpError(409, 'review_conflict');
  if (live.status === 'pending') {
    await approveReview(live._id, { outcome, direction, summary });
    if (scamClaim) await tagScammer(shopId);
    await syncShopStatus(shopId);
  }
  return live._id;
}

export async function publishByPerson(id: Types.ObjectId, input: PersonPublishInput) {
  const check = await loadOrThrow(id);
  if (!person(check)) throw new HttpError(409, 'not_needs_person');
  const shopIds = [...new Map(input.shopIds.map((s) => [String(s), s])).values()];
  const shops = await Promise.all(shopIds.map((s) => getShop(s)));

  const categoryId = input.category ? await findOrCreateCategory(input.category) : null;
  const reviewIds: Types.ObjectId[] = [];
  for (const shop of shops) {
    if (categoryId && shop.categoryIds.length === 0) await updateShop(shop._id, { categoryIds: [categoryId] });
    reviewIds.push(await publishFor(check, shop._id, input));
  }
  const { matchedCount } = await PostCheck.updateOne(personFilter(id), {
    $set: { status: 'published', reasons: [], shopIds, reviewIds },
    $unset: { lastError: '' },
  });
  if (!matchedCount) throw new HttpError(409, 'not_needs_person');
  return PostCheck.findById(id, { raw: 0 }).lean();
}

export async function dismissPostCheck(id: Types.ObjectId) {
  const check = await loadOrThrow(id);
  if (!person(check)) throw new HttpError(409, 'not_needs_person');
  const { matchedCount } = await PostCheck.updateOne(personFilter(id), { $set: { status: 'dismissed' }, $unset: { lastError: '' } });
  if (!matchedCount) throw new HttpError(409, 'not_needs_person');
  return PostCheck.findById(id, { raw: 0 }).lean();
}

/** `queued` gets a new AI job; `classified` only a new publish job (the AI answer is kept). */
export async function rerunPostCheck(id: Types.ObjectId) {
  const check = await loadOrThrow(id);
  if (check.status === 'queued') await enqueueClassify(id, { rerun: true });
  else if (check.status === 'classified') await enqueuePublish(id, { rerun: true });
  else throw new HttpError(409, 'not_rerunnable');
  await PostCheck.updateOne({ _id: id }, { $unset: { lastError: '' } });
  return { status: check.status };
}
