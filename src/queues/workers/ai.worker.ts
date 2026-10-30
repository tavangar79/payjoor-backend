// ai worker (PRD §6): classifies one trusted reviewer post, then hands it to post-publish. Key limits: one request
// at a time, 20 a minute. A final failure leaves the postCheck `queued` with lastError for the admin to see.
import { UnrecoverableError, type Job } from 'bullmq';
import type { Logger } from 'pino';
import type { AiOptions } from '../../boxapi/ai.js';
import { BoxApiError } from '../../boxapi/dm.js';
import { withJobRun } from '../../jobs/jobRun.js';
import { toObjectId } from '../../lib/mongo.js';
import { Category } from '../../models/Category.js';
import { PostCheck } from '../../models/PostCheck.js';
import { classifyPost } from '../../services/postClassify.js';
import { aiJobData, type AiJobData } from '../jobData.js';
import { QUEUES } from '../names.js';
import { getQueue } from '../queues.js';
import type { WorkerDefinition } from './index.js';

const MAX_CATEGORIES = 100;
// The only statuses this job may act on or overwrite; anything else was decided by the gate or a person.
const UNDECIDED = ['queued', 'classified'];

export async function processClassify(data: Extract<AiJobData, { task: 'classify_post' }>, log: Logger, opts: AiOptions = {}) {
  const id = toObjectId(data.postCheckId);
  const check = id && (await PostCheck.findById(id).lean());
  if (!check) throw new UnrecoverableError('post_check_not_found');
  // A stale job must not undo a decision.
  if (!UNDECIDED.includes(check.status)) return { skipped: true };

  return withJobRun('ai_classify', async (ctx) => {
    try {
      const categories = (await Category.find({}, { name: 1 }).limit(MAX_CATEGORIES).lean()).map((c) => c.name);
      const analysis = await classifyPost({ caption: check.caption ?? '', tagged: check.tagged, categories }, opts);
      // Filtered too: the post can be decided while the AI call runs.
      const { matchedCount } = await PostCheck.updateOne(
        { _id: check._id, status: { $in: UNDECIDED } },
        { $set: { analysis, status: 'classified' }, $unset: { lastError: '' } },
      );
      if (!matchedCount) return { skipped: true };
      await getQueue(QUEUES.postPublish).add(
        'post_publish',
        { postCheckId: String(check._id) },
        { jobId: `publish-${check._id}`, attempts: 8, backoff: { type: 'exponential', delay: 60_000 } },
      );
      ctx.counts.classified = 1;
      log.info({ postCheckId: String(check._id), confidence: analysis.confidence }, 'post classified');
      return { classified: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await PostCheck.updateOne({ _id: check._id }, { $set: { lastError: message.slice(0, 500) } });
      // A 4xx (bad token, bad request) won't fix itself and each retry is a paid call.
      if (err instanceof BoxApiError && !err.retryable) throw new UnrecoverableError(message);
      throw err;
    }
  });
}

export const aiWorker: WorkerDefinition = {
  queue: QUEUES.ai,
  processor: (job: Job, log) => processClassify(aiJobData.parse(job.data), log),
  options: { concurrency: 1, limiter: { max: 20, duration: 60_000 } },
};
