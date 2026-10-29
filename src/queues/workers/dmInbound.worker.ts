// dm-inbound (PRD §5.1): log the DM, run the bot, queue the replies on dm-send. A post whose author we don't
// know yet goes to post-owner, which re-enqueues this job when it's done. 3 attempts, exponential backoff.
import type { Job } from 'bullmq';
import type { Logger } from 'pino';
import { env } from '../../config/env.js';
import { handleMessage, type BotDeps } from '../../bot/index.js';
import { DmEvent } from '../../models/DmEvent.js';
import { botDeps } from '../../services/botDeps.js';
import { dmInboundData, dmJobId, isFinalAttempt, type DmInboundData } from '../jobData.js';
import { QUEUES } from '../names.js';
import { getQueue } from '../queues.js';
import type { WorkerDefinition } from './index.js';

export async function processDmInbound(data: DmInboundData, log: Logger, deps: BotDeps = botDeps) {
  const event = await DmEvent.findOneAndUpdate(
    { mid: data.mid },
    {
      $setOnInsert: {
        mid: data.mid,
        senderIgsid: data.senderIgsid,
        receivedAt: new Date(data.receivedAt),
        ...(env.DM_STORE_TEXT && data.message.text && { text: data.message.text }),
      },
    },
    { upsert: true, new: true, lean: true },
  );
  // Already answered (a retry after the replies were queued): don't answer twice (§5.5).
  if (event?.result) return { skipped: 'already_handled' };

  const outcome = await handleMessage(data.message, deps, { ownerLookupDone: data.ownerLookupDone });
  log.debug({ debugText: data.message.text }, 'dm text');
  const sendQueue = getQueue(QUEUES.dmSend);

  if (outcome.needsOwnerLookup) {
    await sendQueue.add(
      'reply',
      { mid: data.mid, accountId: data.accountId, recipient: data.senderIgsid, text: outcome.replies[0]!, last: false },
      { jobId: dmJobId(data.mid, 'checking') },
    );
    await getQueue(QUEUES.postOwner).add(
      'lookup',
      { shortcode: outcome.needsOwnerLookup, dm: data },
      { jobId: dmJobId(data.mid, 'lookup') },
    );
    await DmEvent.updateOne({ mid: data.mid }, { $set: { kind: outcome.kind } });
    log.info({ kind: outcome.kind, shortcode: outcome.needsOwnerLookup }, 'dm waiting for post owner');
    return { pending: 'post_owner' };
  }

  // Deterministic job ids: if this job is retried after queuing some replies, they aren't queued twice.
  await Promise.all(
    outcome.replies.map((text, i) =>
      sendQueue.add(
        'reply',
        { mid: data.mid, accountId: data.accountId, recipient: data.senderIgsid, text, last: i === outcome.replies.length - 1 },
        { jobId: dmJobId(data.mid, `r${i}`) },
      ),
    ),
  );
  await DmEvent.updateOne(
    { mid: data.mid },
    { $set: { kind: outcome.kind, result: outcome.result, ...(outcome.targetHandle && { targetHandle: outcome.targetHandle }) } },
  );
  log.info({ kind: outcome.kind, result: outcome.result, targetHandle: outcome.targetHandle, parts: outcome.replies.length }, 'dm handled');
  return { result: outcome.result };
}

export const dmInboundWorker: WorkerDefinition = {
  queue: QUEUES.dmInbound,
  processor: async (job: Job, log) => {
    const data = dmInboundData.parse(job.data);
    try {
      return await processDmInbound(data, log);
    } catch (err) {
      if (isFinalAttempt(job, err)) {
        await DmEvent.updateOne({ mid: data.mid }, { $set: { error: err instanceof Error ? err.message : String(err) } });
      }
      throw err;
    }
  },
};
