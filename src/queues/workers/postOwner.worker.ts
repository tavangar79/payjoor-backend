// post-owner (PRD §5.1, §5.3): find a shared post's author, then re-enqueue the DM job to finish the reply.
// Low concurrency, so slow Data API calls don't hold up other lookups. When the lookup finally fails, the DM is
// still re-enqueued so the user gets "couldn't read this".
import { UnrecoverableError, type Job } from 'bullmq';
import type { Logger } from 'pino';
import { BoxApiError } from '../../boxapi/dm.js';
import type { DataOptions } from '../../boxapi/data.js';
import { lookupPostOwner } from '../../services/postOwners.js';
import { dmJobId, isFinalAttempt, postOwnerData, type PostOwnerData } from '../jobData.js';
import { QUEUES } from '../names.js';
import { getQueue } from '../queues.js';
import type { WorkerDefinition } from './index.js';

async function finishDm(data: PostOwnerData) {
  await getQueue(QUEUES.dmInbound).add('dm', { ...data.dm, ownerLookupDone: true }, { jobId: dmJobId(data.dm.mid, 'owner') });
}

export async function processPostOwner(
  job: Pick<Job, 'attemptsMade' | 'opts'>,
  data: PostOwnerData,
  log: Logger,
  opts: DataOptions = {},
) {
  try {
    const owner = await lookupPostOwner(data.shortcode, opts);
    log.info({ shortcode: data.shortcode, found: Boolean(owner) }, 'post owner lookup');
    await finishDm(data);
    return { owner };
  } catch (err) {
    // A 4xx (e.g. a bad token) won't fix itself; each retry spends another Data API request.
    const unrecoverable = err instanceof BoxApiError && !err.retryable;
    const final = unrecoverable ? new UnrecoverableError(err instanceof Error ? err.message : String(err)) : err;
    if (isFinalAttempt(job, final)) await finishDm(data);
    throw final;
  }
}

export const postOwnerWorker: WorkerDefinition = {
  queue: QUEUES.postOwner,
  processor: (job: Job, log) => processPostOwner(job, postOwnerData.parse(job.data), log),
  options: { concurrency: 2 },
};
