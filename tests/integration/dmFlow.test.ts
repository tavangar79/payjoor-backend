// End to end without Redis (plan 8.6): signed BoxAPI webhook -> dm-inbound -> (post-owner) -> dm-send -> BoxAPI send_message.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { UnrecoverableError } from 'bullmq';
import { useMongo } from '../setup/mongo.js';
import { boxapiBody, dataRoute, fakeFetch, json } from '../setup/fakeFetch.js';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { createApp } = await import('../../src/app.js');
const { env } = await import('../../src/config/env.js');
const { logger } = await import('../../src/lib/logger.js');
const { signBoxApiBody } = await import('../../src/boxapi/signature.js');
const models = await import('../../src/models/index.js');
const { createShop, saveShopImage } = await import('../../src/services/shops.js');
const { createCategory } = await import('../../src/services/categories.js');
const { processDmInbound } = await import('../../src/queues/workers/dmInbound.worker.js');
const { processDmSend } = await import('../../src/queues/workers/dmSend.worker.js');
const { processPostOwner } = await import('../../src/queues/workers/postOwner.worker.js');

useMongo();

const samples = JSON.parse(readFileSync(new URL('../fixtures/webhooks/docs-samples.json', import.meta.url), 'utf8'));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]);
const allow = async () => true;
const SECRET = 'boxapi-secret';
const ACCOUNT = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  await models.syncAllIndexes();
});

beforeEach(async () => {
  resetQueues();
  env.BOXAPI_INSTAGRAM_DM_TOKEN = 'box-dm-test';
  env.BOXAPI_WEBHOOK_SECRET = SECRET;
  const image = await saveShopImage(PNG);
  const cat = await createCategory({ name: 'کیف', nameEn: 'Bags' });
  const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash Mamad', profileImageId: image.imageId, categoryIds: [cat._id], status: 'recommended' });
  const source = await models.ReviewerSource.create({ handle: 'sadegh.delicious', name: 'Sadegh' });
  await models.Review.create({
    shopId: shop._id,
    reviewerSourceId: source._id,
    postShortcode: 'Rev1abcde',
    postUrl: 'https://www.instagram.com/p/Rev1abcde/',
    occurredAt: new Date('2026-10-01'),
    status: 'published',
    outcome: 'delivered_ok',
    direction: 'positive',
    summary: 'Arrived on time',
    publishedAt: new Date(),
  });
});

afterEach(() => {
  env.BOXAPI_INSTAGRAM_DM_TOKEN = undefined;
  env.BOXAPI_WEBHOOK_SECRET = undefined;
});

/** Wraps a Meta-shaped docs sample in BoxAPI's envelope and posts it signed. */
function postWebhook(sample: { entry: { messaging: unknown[] }[] }, secret = SECRET) {
  const body = { event_id: 'evt', event_type: 'messaging', account_id: ACCOUNT, data: { messaging: sample.entry[0]!.messaging } };
  // Sent as a string: superagent would JSON-encode a Buffer.
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  return request(createApp())
    .post('/webhooks/boxapi')
    .set('Content-Type', 'application/json')
    .set('X-BoxApi-Signature', signBoxApiBody(Buffer.from(raw), ts, secret))
    .set('X-BoxApi-Timestamp', ts)
    .send(raw);
}

async function drainSends() {
  const box = fakeFetch([[/^https:\/\/api\.sendbox\.chat\/api\/v1\/service\/actions\/send_message$/, () => json({ ok: true })]]);
  for (const job of take('dm-send')) await processDmSend(job.data, logger, { limiter: allow, fetch: box });
  return box.mock.calls.map(([, init]) => {
    expect((init?.headers as Record<string, string>)['X-Api-Key']).toBe('box-dm-test');
    const b = JSON.parse(String(init?.body)) as { account_id: string; recipient_id: string; message: string };
    expect(b.account_id).toBe(ACCOUNT);
    return { recipient: { id: b.recipient_id }, message: { text: b.message } };
  });
}

describe('DM flow', () => {
  it('answers a found shop once, even when BoxAPI retries the webhook', async () => {
    expect((await postWebhook(samples.text_handle)).status).toBe(200);
    expect((await postWebhook(samples.text_handle)).status).toBe(200);
    const inbound = take('dm-inbound');
    expect(inbound).toHaveLength(1);
    expect(inbound[0]!.id).toBe(samples.text_handle.entry[0].messaging[0].message.mid);

    await processDmInbound(inbound[0]!.data, logger);
    const sent = await drainSends();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.recipient.id).toBe('1000000000000001');
    expect(sent[0]!.message.text).toContain('Maash Mamad (@maashmamad)');
    expect(sent[0]!.message.text).toContain('دسته‌بندی: کیف');
    expect(sent[0]!.message.text).toContain('Arrived on time');

    const event = await models.DmEvent.findOne().lean();
    expect(event).toMatchObject({ kind: 'text', targetHandle: 'maashmamad', result: 'found' });
    expect(event?.replySentAt).toBeInstanceOf(Date);
    expect(event?.text).toBeUndefined();

    // A worker retry of the same job doesn't reply again.
    expect(await processDmInbound(inbound[0]!.data, logger)).toEqual({ skipped: 'already_handled' });
    expect(take('dm-send')).toEqual([]);
  });

  it('rejects a bad signature and skips echoes', async () => {
    expect((await postWebhook(samples.text_handle, 'wrong-secret')).status).toBe(401);
    expect((await postWebhook(samples.echo)).status).toBe(200);
    expect(take('dm-inbound')).toEqual([]);
  });

  it('looks up a post author, says "checking", then answers', async () => {
    await postWebhook(samples.post_link);
    const [job] = take('dm-inbound');
    expect(await processDmInbound(job!.data, logger)).toEqual({ pending: 'post_owner' });
    const checking = await drainSends();
    expect(checking.map((m) => m.message.text)).toEqual(['Checking… one moment.']);
    expect((await models.DmEvent.findOne().lean())?.replySentAt).toBeUndefined();

    const [lookup] = take('post-owner');
    const boxapi = fakeFetch([
      dataRoute('media/get_info_by_shortcode', () => boxapiBody({ items: [{ code: 'Deyc1w9hwTI', user: { username: 'MaashMamad' } }] })),
    ]);
    await processPostOwner(lookup!, lookup!.data, logger, { fetch: boxapi });
    expect(JSON.parse(String(boxapi.mock.calls[0]![1]!.body))).toEqual({ shortcode: 'Deyc1w9hwTI' });
    expect((await models.PostOwner.findOne().lean())?.ownerUsername).toBe('maashmamad');
    expect(await models.JobRun.findOne({ type: 'post_owner_lookup' }).lean()).toMatchObject({ counts: { found: 1 } });

    const [again] = take('dm-inbound');
    expect(again!.data.ownerLookupDone).toBe(true);
    await processDmInbound(again!.data, logger);
    const [answer] = await drainSends();
    expect(answer!.message.text).toContain('Status: Recommended (tested)');
    expect(await models.DmEvent.findOne().lean()).toMatchObject({ kind: 'post', result: 'found', targetHandle: 'maashmamad' });
  });

  it('answers "couldn\'t read this" when the post lookup gives up', async () => {
    await postWebhook(samples.post_link);
    await processDmInbound(take('dm-inbound')[0]!.data, logger);
    take('dm-send');
    const [lookup] = take('post-owner');
    const broke = fakeFetch([[/\/api\/instagram\//, () => json({ success: false, data: { message: 'Invalid username or password.' } }, 401)]]);
    await expect(processPostOwner(lookup!, lookup!.data, logger, { fetch: broke })).rejects.toBeInstanceOf(UnrecoverableError);
    await processDmInbound(take('dm-inbound')[0]!.data, logger);
    const [reply] = await drainSends();
    expect(reply!.message.text).toBe("We couldn't read this. Please share the page's profile instead.");
  });

  it('wishlists an unknown page and counts repeat requests', async () => {
    const dm = (mid: string) => ({
      mid,
      accountId: ACCOUNT,
      senderIgsid: '1000000000000009',
      receivedAt: new Date().toISOString(),
      message: { text: 'این پیج؟ @New.Shop' },
    });
    await processDmInbound(dm('m1'), logger);
    await processDmInbound(dm('m2'), logger);
    expect(await models.Wishlist.findOne().lean()).toMatchObject({ handle: 'new.shop', requestCount: 2, sources: ['dm'], status: 'open' });
    const [first] = await drainSends();
    expect(first!.message.text).toContain('این پیج را هنوز بررسی نکرده‌ایم');
  });

  it('drops replies over the per-sender limit and stops on a permanent BoxAPI error', async () => {
    await processDmInbound({ mid: 'm3', accountId: ACCOUNT, senderIgsid: '42', receivedAt: new Date().toISOString(), message: { text: 'hello there' } }, logger);
    const [job] = take('dm-send');
    expect(await processDmSend(job!.data, logger, { limiter: async () => false })).toEqual({ dropped: 'rate_limited' });
    expect((await models.DmEvent.findOne({ mid: 'm3' }).lean())?.error).toBe('rate_limited');

    const bad = fakeFetch([[/./, () => json({ error: 'recipient not found' }, 400)]]);
    await expect(processDmSend(job!.data, logger, { limiter: allow, fetch: bad })).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
