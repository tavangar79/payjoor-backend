// dm-send (PRD §5.1, §5.5): rate-limited sends through BoxAPI's send_message. A global BullMQ limiter keeps
// us well under BoxAPI's limits, and each recipient gets at most SENDS_PER_MINUTE messages a minute (abuse guard).
import { UnrecoverableError, type Job } from 'bullmq';
import type { Logger } from 'pino';
import { BoxApiError, sendMessage } from '../../boxapi/dm.js';
import { DmEvent } from '../../models/DmEvent.js';
import { dmSendData, isFinalAttempt, type DmSendData } from '../jobData.js';
import { QUEUES } from '../names.js';
import { queueConnection } from '../queues.js';
import type { WorkerDefinition } from './index.js';

export const SENDS_PER_MINUTE = 10;

/** True if `recipient` may get another message this minute. */
export type SendLimiter = (recipient: string) => Promise<boolean>;

export const redisSendLimiter: SendLimiter = async (recipient) => {
  const redis = queueConnection();
  const key = `dm-rate:${recipient}:${Math.floor(Date.now() / 60_000)}`;
  const [[, count]] = (await redis.multi().incr(key).expire(key, 120).exec()) as [[unknown, number]];
  return count <= SENDS_PER_MINUTE;
};

export type DmSendDeps = { limiter?: SendLimiter; fetch?: typeof fetch };

export async function processDmSend(data: DmSendData, log: Logger, deps: DmSendDeps = {}) {
  if (!(await (deps.limiter ?? redisSendLimiter)(data.recipient))) {
    log.warn({ mid: data.mid }, 'per-sender rate limit: reply dropped');
    await DmEvent.updateOne({ mid: data.mid }, { $set: { error: 'rate_limited' } });
    return { dropped: 'rate_limited' };
  }
  try {
    await sendMessage(data.accountId, data.recipient, data.text, { fetch: deps.fetch });
  } catch (err) {
    if (err instanceof BoxApiError && !err.retryable) throw new UnrecoverableError(err.message);
    throw err;
  }
  if (data.last) await DmEvent.updateOne({ mid: data.mid }, { $set: { replySentAt: new Date() } });
  return { sent: true };
}

export const dmSendWorker: WorkerDefinition = {
  queue: QUEUES.dmSend,
  processor: async (job: Job, log) => {
    const data = dmSendData.parse(job.data);
    try {
      return await processDmSend(data, log);
    } catch (err) {
      if (isFinalAttempt(job, err)) {
        await DmEvent.updateOne({ mid: data.mid }, { $set: { error: err instanceof Error ? err.message : String(err) } });
      }
      throw err;
    }
  },
  // Global: at most 10 sends a second across all workers.
  options: { limiter: { max: 10, duration: 1_000 } },
};
