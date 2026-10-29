// Instagram webhook (PRD §5.1, §5.5): BoxAPI forwards every DM here.
import express, { Router } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { BOXAPI_SIGNATURE_HEADER, BOXAPI_TIMESTAMP_HEADER, verifyBoxApiSignature } from '../boxapi/signature.js';
import { dmInboundData, dmJobId, type DmInboundData } from '../queues/jobData.js';
import { QUEUES } from '../queues/names.js';
import { getQueue } from '../queues/queues.js';

export const webhooksRouter = Router();

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean; attachments?: unknown };
};

/**
 * One dm-inbound job per incoming user message; echoes and other event types are skipped.
 * BoxAPI envelope: `{ event_id, event_type, account_id, data }`. Only `messaging` events carry DMs.
 * The docs show `data.messaging[]` on one page and a single event in `data` on another, so accept both.
 */
export function boxApiMessagesFrom(body: unknown): DmInboundData[] {
  const payload = body as { event_type?: string; account_id?: string; data?: { messaging?: MessagingEvent[] } & MessagingEvent };
  if (payload?.event_type !== 'messaging' || !payload.data || typeof payload.data !== 'object') return [];
  const data = payload.data;
  return fromEvents(payload.account_id, Array.isArray(data.messaging) ? data.messaging : [data]);
}

function fromEvents(accountId: string | undefined, events: MessagingEvent[]): DmInboundData[] {
  const out: DmInboundData[] = [];
  for (const event of events) {
    const msg = event?.message;
    const sender = event?.sender?.id;
    if (!msg?.mid || !sender || msg.is_echo || msg.is_deleted || sender === event?.recipient?.id) continue;
    const parsed = dmInboundData.safeParse({
      mid: msg.mid,
      accountId,
      senderIgsid: sender,
      receivedAt: new Date(event.timestamp ?? Date.now()).toISOString(),
      message: { text: msg.text, attachments: msg.attachments },
    });
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// BoxAPI forwards every DM here (PRD §5.1). Signed with the webhook secret from the BoxAPI panel;
// with no secret set we refuse everything rather than accept unsigned requests.
webhooksRouter.post('/boxapi', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const secret = env.BOXAPI_WEBHOOK_SECRET ?? '';
  if (!verifyBoxApiSignature(raw, req.get(BOXAPI_SIGNATURE_HEADER), req.get(BOXAPI_TIMESTAMP_HEADER), secret)) {
    logger.warn({ secretSet: Boolean(secret) }, 'boxapi webhook signature check failed');
    res.sendStatus(401);
    return;
  }
  let body: unknown;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    res.sendStatus(400);
    return;
  }
  const messages = boxApiMessagesFrom(body);
  // jobId = mid, so BoxAPI's retries (3 × 60 s) don't create a second job (§5.5).
  await Promise.all(
    messages.map((m) => getQueue(QUEUES.dmInbound).add('dm', m, { jobId: dmJobId(m.mid) })),
  );
  res.status(200).json({ ok: true });
});
