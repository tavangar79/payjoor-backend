// Reviewer sources (PRD §6.1, §8, §9.2.5): add, edit, follow. A followed source that hasn't been backfilled
// gets a backfill job.
import type { Types } from 'mongoose';
import { HttpError } from '../lib/errorHandler.js';
import { normalizeHandle } from '../lib/handle.js';
import { isDuplicateKey } from '../lib/mongo.js';
import { ReviewerSource, type ReviewerSourceDoc } from '../models/ReviewerSource.js';
import { QUEUES } from '../queues/names.js';
import { getQueue } from '../queues/queues.js';
import type { BackfillJobData } from '../queues/workers/reviewerBackfill.worker.js';

export type SourceInput = {
  handle: string;
  name: string;
  follow?: boolean;
  backfillLimit?: number;
  permission?: ReviewerSourceDoc['permission'];
};

export async function enqueueBackfill(sourceId: Types.ObjectId, force = false) {
  const data: BackfillJobData = { sourceId: String(sourceId), force };
  const job = await getQueue(QUEUES.reviewerBackfill).add('backfill', data);
  return { jobId: job.id };
}

const needsBackfill = (s: Pick<ReviewerSourceDoc, 'follow' | 'backfillDone' | 'backfillLimit'>) =>
  s.follow && !s.backfillDone && s.backfillLimit > 0;

export async function createSource(input: SourceInput): Promise<ReviewerSourceDoc> {
  const handle = normalizeHandle(input.handle);
  if (!handle) throw new HttpError(400, 'invalid_handle');
  let doc;
  try {
    doc = await ReviewerSource.create({ ...input, handle });
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, 'source_exists');
    throw err;
  }
  if (needsBackfill(doc)) await enqueueBackfill(doc._id);
  return doc.toObject();
}

/** The handle can't change: posts are matched to a source by its handle. Add a new source instead. */
export async function updateSource(id: Types.ObjectId, patch: Partial<Omit<SourceInput, 'handle'>>): Promise<ReviewerSourceDoc> {
  const before = await ReviewerSource.findById(id).lean();
  if (!before) throw new HttpError(404, 'not_found');
  const doc = await ReviewerSource.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
  if (doc && needsBackfill(doc) && !before.follow) await enqueueBackfill(doc._id);
  return doc!;
}

export async function listSources(): Promise<ReviewerSourceDoc[]> {
  return ReviewerSource.find().sort({ follow: -1, handle: 1 }).lean();
}
