import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { createApp } = await import('../../src/app.js');
const { env } = await import('../../src/config/env.js');
const { signBoxApiBody, verifyBoxApiSignature } = await import('../../src/boxapi/signature.js');
const { boxApiMessagesFrom } = await import('../../src/routes/webhooks.js');

const SECRET = 'boxapi-secret';
const nowSec = () => String(Math.floor(Date.now() / 1000));

// Shape from boxapi.ir/docs/instagram/dm/webhook/ (placeholder ids).
const dmEvent = (mid: string, extra: object = {}) => ({
  event_id: `client_ig_${mid}`,
  event_type: 'messaging',
  account_id: '00000000-0000-0000-0000-000000000001',
  data: {
    time: 1_761_000_000_000,
    id: '17841400000000000',
    messaging: [
      {
        sender: { id: '1111111111111111' },
        recipient: { id: '17841400000000000' },
        timestamp: 1_761_000_000_000,
        message: { mid, text: '@maashmamad', ...extra },
      },
    ],
  },
});

describe('BoxAPI webhook signature', () => {
  const body = Buffer.from('{"event_type":"messaging"}');

  it('accepts the right HMAC over "{timestamp}.{body}" and rejects anything else', () => {
    const ts = nowSec();
    const sig = signBoxApiBody(body, ts, SECRET);
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(verifyBoxApiSignature(body, sig, ts, SECRET)).toBe(true);
    expect(verifyBoxApiSignature(body, sig, ts, 'other')).toBe(false);
    expect(verifyBoxApiSignature(body, sig, String(Number(ts) + 1), SECRET)).toBe(false);
    expect(verifyBoxApiSignature(Buffer.from('{}'), sig, ts, SECRET)).toBe(false);
    expect(verifyBoxApiSignature(body, undefined, ts, SECRET)).toBe(false);
    expect(verifyBoxApiSignature(body, sig, undefined, SECRET)).toBe(false);
    expect(verifyBoxApiSignature(body, sig, ts, '')).toBe(false);
  });

  it('rejects timestamps more than 5 minutes off', () => {
    const old = String(Math.floor(Date.now() / 1000) - 301);
    expect(verifyBoxApiSignature(body, signBoxApiBody(body, old, SECRET), old, SECRET)).toBe(false);
    expect(verifyBoxApiSignature(body, signBoxApiBody(body, 'abc', SECRET), 'abc', SECRET)).toBe(false);
  });
});

describe('boxApiMessagesFrom', () => {
  it('reads data.messaging[] and a single event in data', () => {
    expect(boxApiMessagesFrom(dmEvent('m1'))).toMatchObject([
      { mid: 'm1', accountId: '00000000-0000-0000-0000-000000000001', senderIgsid: '1111111111111111' },
    ]);
    const single = { event_type: 'messaging', account_id: 'acc', data: dmEvent('m2').data.messaging[0] };
    expect(boxApiMessagesFrom(single)).toMatchObject([{ mid: 'm2' }]);
  });

  it('skips action results, echoes and other event types', () => {
    expect(boxApiMessagesFrom({ ...dmEvent('m3'), event_type: 'action.send_message' })).toEqual([]);
    expect(boxApiMessagesFrom({ ...dmEvent('m4'), event_type: 'comments' })).toEqual([]);
    expect(boxApiMessagesFrom(dmEvent('m5', { is_echo: true }))).toEqual([]);
    expect(boxApiMessagesFrom(null)).toEqual([]);
  });
});

describe('POST /webhooks/boxapi', () => {
  beforeEach(() => {
    resetQueues();
    env.BOXAPI_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    env.BOXAPI_WEBHOOK_SECRET = undefined;
  });

  function post(body: unknown, { ts = nowSec(), secret = SECRET } = {}) {
    const raw = JSON.stringify(body);
    return request(createApp())
      .post('/webhooks/boxapi')
      .set('Content-Type', 'application/json')
      .set('X-BoxApi-Signature', signBoxApiBody(Buffer.from(raw), ts, secret))
      .set('X-BoxApi-Timestamp', ts)
      .send(raw);
  }

  it('queues one dm-inbound job per message and dedupes retries by mid', async () => {
    expect((await post(dmEvent('mid.1'))).status).toBe(200);
    expect((await post(dmEvent('mid.1'))).status).toBe(200);
    const jobs = take('dm-inbound');
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.data).toMatchObject({ mid: 'mid.1', message: { text: '@maashmamad' } });
  });

  it('returns 401 on a bad signature or when no secret is configured', async () => {
    expect((await post(dmEvent('mid.2'), { secret: 'wrong' })).status).toBe(401);
    env.BOXAPI_WEBHOOK_SECRET = undefined;
    expect((await post(dmEvent('mid.3'))).status).toBe(401);
    expect(take('dm-inbound')).toHaveLength(0);
  });
});
