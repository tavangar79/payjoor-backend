// Trusted-reviewer post intake (PRD §6): store each post as a postCheck and queue it for AI analysis.
import type { Types } from 'mongoose';
import { captionText, extractTagged, mediaUrls, postUrl, type BoxApiPost } from '../boxapi/posts.js';
import { isDuplicateKey } from '../lib/mongo.js';
import { PostCheck } from '../models/PostCheck.js';
import { QUEUES } from '../queues/names.js';
import { getQueue } from '../queues/queues.js';

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
