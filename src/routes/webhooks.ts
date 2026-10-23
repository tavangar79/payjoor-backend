// Instagram webhooks (PRD §5.1, §5.5, §10.3).
import express, { Router } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { SIGNATURE_HEADER, verifySignature } from '../meta/signature.js';
import { dmInboundData, dmJobId, type DmInboundData } from '../queues/jobData.js';
import { QUEUES } from '../queues/names.js';
import { getQueue } from '../queues/queues.js';

export const webhooksRouter = Router();

// Subscription check: echo hub.challenge when the verify token matches.
webhooksRouter.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN && typeof challenge === 'string') {
    res.type('text/plain').send(challenge);
    return;
  }
  res.sendStatus(403);
});

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean; attachments?: unknown };
};

/** One dm-inbound job per incoming user message; echoes, our own account and non-message events are skipped. */
export function messagesFrom(body: unknown): DmInboundData[] {
  const payload = body as { object?: string; entry?: { messaging?: MessagingEvent[] }[] };
  if (payload?.object !== 'instagram' || !Array.isArray(payload.entry)) return [];
  const out: DmInboundData[] = [];
  for (const entry of payload.entry) {
    for (const event of entry?.messaging ?? []) {
      const msg = event?.message;
      const sender = event?.sender?.id;
      if (!msg?.mid || !sender || msg.is_echo || msg.is_deleted || sender === env.IG_ACCOUNT_ID) continue;
      const parsed = dmInboundData.safeParse({
        mid: msg.mid,
        senderIgsid: sender,
        receivedAt: new Date(event.timestamp ?? Date.now()).toISOString(),
        message: { text: msg.text, attachments: msg.attachments },
      });
      if (parsed.success) out.push(parsed.data);
    }
  }
  return out;
}

// Raw body: the HMAC is over the exact bytes Meta sent, so no JSON parser runs first.
webhooksRouter.post('/instagram', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!verifySignature(raw, req.get(SIGNATURE_HEADER))) {
    logger.warn('webhook signature check failed');
    res.sendStatus(403);
    return;
  }
  let body: unknown;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    res.sendStatus(400);
    return;
  }
  const messages = messagesFrom(body);
  // jobId = mid, so Meta's retries of the same webhook don't create a second job (§5.5).
  await Promise.all(
    messages.map((m) => getQueue(QUEUES.dmInbound).add('dm', m, { jobId: dmJobId(m.mid) })),
  );
  res.status(200).send('EVENT_RECEIVED');
});
