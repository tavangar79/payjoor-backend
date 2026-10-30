import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { createApp } = await import('../../src/app.js');
const { createAdminAccount } = await import('../../src/auth/login.js');
const { totpCode } = await import('../../src/auth/totp.js');
const { createShop, saveShopImage } = await import('../../src/services/shops.js');
const { getQueue } = await import('../../src/queues/queues.js');
const { IgnoredHandle, PostCheck, Review, ReviewerSource, Shop, Wishlist, syncAllIndexes } = await import('../../src/models/index.js');

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});
beforeEach(() => {
  resetQueues();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-body')]);

async function admin() {
  const { totpSecret } = await createAdminAccount('founder', 'a-long-enough-password');
  const agent = request.agent(createApp());
  const res = await agent
    .post('/admin/api/auth/login')
    .send({ username: 'founder', password: 'a-long-enough-password', code: totpCode(totpSecret, Math.floor(Date.now() / 1000)) });
  return { agent, csrf: res.body.csrfToken as string };
}

const shop = async (handle: string, autoCreated = false) =>
  createShop({ handle, displayName: handle, profileImageId: (await saveShopImage(png)).imageId, autoCreated });

let n = 0;
async function check(status: string, extra: Record<string, unknown> = {}) {
  const src = (await ReviewerSource.findOne().lean()) ?? (await ReviewerSource.create({ handle: 'nulbox', name: 'Nulbox', trusted: true }));
  n++;
  return PostCheck.create({
    reviewerSourceId: src._id,
    postShortcode: `code${n}`,
    postUrl: `https://www.instagram.com/p/code${n}/`,
    occurredAt: new Date(),
    caption: 'caption',
    raw: { big: 'payload' },
    status,
    ...extra,
  });
}

const body = { outcome: 'other_problem', direction: 'negative', summary: 'late delivery' };

/** A row whose job was lost: no update for over 6 hours, and no lastError. */
async function stale(status: string) {
  const pc = await check(status);
  await PostCheck.updateOne({ _id: pc._id }, { $set: { updatedAt: new Date(Date.now() - 6 * 3600_000 - 1000) } }, { timestamps: false });
  return pc;
}

describe('GET /post-checks', () => {
  it('lists needs_person posts without raw', async () => {
    const { agent } = await admin();
    await check('needs_person');
    await check('published');
    const res = await agent.get('/admin/api/post-checks');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ status: 'needs_person', postShortcode: expect.any(String) });
    expect(res.body.items[0].raw).toBeUndefined();
  });

  it('status=failed lists queued and classified rows with lastError', async () => {
    const { agent } = await admin();
    await check('queued', { lastError: 'boom' });
    await check('classified', { lastError: 'boom' });
    await check('queued');
    await check('needs_person', { lastError: 'old' });
    const res = await agent.get('/admin/api/post-checks?status=failed');
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { status: string }) => i.status).sort()).toEqual(['classified', 'queued']);
  });
});

describe('GET /post-checks?status=failed: lost jobs', () => {
  it('lists rows with no update for over 6 hours, but not fresh ones or decided ones', async () => {
    const { agent } = await admin();
    const q = await stale('queued');
    const c = await stale('classified');
    await stale('needs_person');
    await check('queued');
    const res = await agent.get('/admin/api/post-checks?status=failed');
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { _id: string }) => i._id).sort()).toEqual([String(q._id), String(c._id)].sort());
  });
});

describe('POST /post-checks/:id/publish', () => {
  it('creates one review per shop, sets status, and applies the tag when scamClaim', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const b = await shop('shop_b');
    const pc = await check('needs_person');
    const res = await agent
      .post(`/admin/api/post-checks/${pc._id}/publish`)
      .set('X-CSRF-Token', csrf)
      .send({ ...body, shopIds: [String(a._id), String(b._id)], scamClaim: true });
    expect(res.status).toBe(200);
    const reviews = await Review.find().lean();
    expect(reviews).toHaveLength(2);
    expect(reviews[0]).toMatchObject({ status: 'published', autoPublished: false, outcome: 'other_problem', summary: 'late delivery' });
    const after = await PostCheck.findById(pc._id).lean();
    expect(after).toMatchObject({ status: 'published' });
    expect(after!.reviewIds).toHaveLength(2);
    expect(await Shop.findById(a._id).lean()).toMatchObject({ tags: ['scammer'], status: 'serious_warning' });
  });

  it('refuses a post that is not needs_person', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const pc = await check('published');
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/publish`).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(a._id)] });
    expect(res).toMatchObject({ status: 409, body: { error: 'not_needs_person' } });
    expect(await Review.countDocuments()).toBe(0);
  });

  it('publishes a failed row (queued with lastError)', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const pc = await check('queued', { lastError: 'boom' });
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/publish`).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(a._id)] });
    expect(res.status).toBe(200);
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'published' });
  });

  it('publishes a stale row with no lastError, and refuses a fresh one', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const fresh = await check('queued');
    const send = (id: unknown) => agent.post(`/admin/api/post-checks/${id}/publish`).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(a._id)] });
    expect(await send(fresh._id)).toMatchObject({ status: 409, body: { error: 'not_needs_person' } });
    const pc = await stale('classified');
    expect((await send(pc._id)).status).toBe(200);
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'published' });
  });

  it('promotes an open wishlist entry for the shop, moving its pending reviews', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const pc = await check('needs_person');
    const entry = await Wishlist.create({ handle: 'shop_a', status: 'open' });
    const waiting = await Review.create({
      reviewerSourceId: pc.reviewerSourceId,
      postShortcode: 'other-post',
      postUrl: pc.postUrl,
      occurredAt: pc.occurredAt,
      wishlistId: entry._id,
      status: 'pending',
    });
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/publish`).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(a._id)] });
    expect(res.status).toBe(200);
    expect(await Wishlist.findById(entry._id).lean()).toMatchObject({ status: 'promoted', promotedShopId: a._id });
    expect(await Review.findById(waiting._id).lean()).toMatchObject({ status: 'pending', shopId: a._id });
  });

  it('applies the scam tag when it publishes an existing pending review', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const pc = await check('needs_person');
    const pending = await Review.create({
      reviewerSourceId: pc.reviewerSourceId,
      postShortcode: pc.postShortcode,
      postUrl: pc.postUrl,
      occurredAt: pc.occurredAt,
      shopId: a._id,
      status: 'pending',
    });
    const res = await agent
      .post(`/admin/api/post-checks/${pc._id}/publish`)
      .set('X-CSRF-Token', csrf)
      .send({ ...body, shopIds: [String(a._id)], scamClaim: true });
    expect(res.status).toBe(200);
    expect(await Review.findById(pending._id).lean()).toMatchObject({ status: 'published' });
    expect(await Shop.findById(a._id).lean()).toMatchObject({ tags: ['scammer'], status: 'serious_warning' });
  });

  it('creates the category for a shop with none, and validates the body', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const pc = await check('needs_person');
    const url = `/admin/api/post-checks/${pc._id}/publish`;
    expect((await agent.post(url).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [] })).status).toBe(400);
    expect((await agent.post(url).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(new Types.ObjectId())] })).status).toBe(404);
    const res = await agent.post(url).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(a._id)], category: 'پوشاک' });
    expect(res.status).toBe(200);
    expect((await Shop.findById(a._id).lean())!.categoryIds).toHaveLength(1);
  });

  it('counts an existing published review as done and publishes an existing pending one', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const b = await shop('shop_b');
    const pc = await check('needs_person');
    const common = {
      reviewerSourceId: pc.reviewerSourceId,
      postShortcode: pc.postShortcode,
      postUrl: pc.postUrl,
      occurredAt: pc.occurredAt,
    };
    const done = await Review.create({ ...common, shopId: a._id, status: 'published', outcome: 'delivered_ok', direction: 'positive', publishedAt: new Date() });
    const pending = await Review.create({ ...common, shopId: b._id, status: 'pending' });
    const res = await agent
      .post(`/admin/api/post-checks/${pc._id}/publish`)
      .set('X-CSRF-Token', csrf)
      .send({ ...body, shopIds: [String(a._id), String(b._id)] });
    expect(res.status).toBe(200);
    expect(await Review.countDocuments()).toBe(2);
    expect(await Review.findById(pending._id).lean()).toMatchObject({ status: 'published', outcome: 'other_problem' });
    const after = await PostCheck.findById(pc._id).lean();
    expect(after!.reviewIds.map(String).sort()).toEqual([String(done._id), String(pending._id)].sort());
  });

  it('overrides an earlier takedown', async () => {
    const { agent, csrf } = await admin();
    const a = await shop('shop_a');
    const pc = await check('needs_person');
    await Review.create({
      reviewerSourceId: pc.reviewerSourceId,
      postShortcode: pc.postShortcode,
      postUrl: pc.postUrl,
      occurredAt: pc.occurredAt,
      shopId: a._id,
      status: 'rejected',
      rejectReason: 'takedown',
    });
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/publish`).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(a._id)] });
    expect(res.status).toBe(200);
    expect(await Review.countDocuments({ status: 'published' })).toBe(1);
  });
});

describe('dismiss and rerun', () => {
  it('dismiss works, and only from a person-actionable state', async () => {
    const { agent, csrf } = await admin();
    const pc = await check('needs_person');
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/dismiss`).set('X-CSRF-Token', csrf)).status).toBe(200);
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'dismissed' });
    const again = await agent.post(`/admin/api/post-checks/${pc._id}/dismiss`).set('X-CSRF-Token', csrf);
    expect(again).toMatchObject({ status: 409, body: { error: 'not_needs_person' } });
  });

  it('dismiss works on a stale row with no lastError, and refuses a fresh one', async () => {
    const { agent, csrf } = await admin();
    const fresh = await check('classified');
    expect((await agent.post(`/admin/api/post-checks/${fresh._id}/dismiss`).set('X-CSRF-Token', csrf)).status).toBe(409);
    const pc = await stale('queued');
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/dismiss`).set('X-CSRF-Token', csrf)).status).toBe(200);
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'dismissed' });
  });

  it.each([
    ['queued', 'ai'],
    ['classified', 'post-publish'],
  ])('rerun works on a stale %s row with no lastError', async (status, queue) => {
    const { agent, csrf } = await admin();
    const pc = await stale(status);
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf)).status).toBe(202);
    expect(take(queue)).toHaveLength(1);
    // Back to waiting: it leaves the failed tab until it fails or stalls again.
    expect((await agent.get('/admin/api/post-checks?status=failed')).body.total).toBe(0);
  });

  it('rerun refuses a row that is still running, and a second click on the same row', async () => {
    const { agent, csrf } = await admin();
    const fresh = await check('queued');
    expect(await agent.post(`/admin/api/post-checks/${fresh._id}/rerun`).set('X-CSRF-Token', csrf)).toMatchObject({ status: 409, body: { error: 'not_rerunnable' } });
    const pc = await check('queued', { lastError: 'boom' });
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf)).status).toBe(202);
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf)).status).toBe(409);
    expect(take('ai')).toHaveLength(1);
  });

  it('rerun clears lastError before enqueueing, so a job that fails fast keeps its own error', async () => {
    const { agent, csrf } = await admin();
    const pc = await check('queued', { lastError: 'old' });
    const queue = getQueue('ai');
    const add = queue.add.bind(queue);
    vi.spyOn(queue, 'add').mockImplementationOnce((async (...args: Parameters<typeof add>) => {
      await PostCheck.updateOne({ _id: pc._id }, { $set: { lastError: 'new' } });
      return add(...args);
    }) as never);
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf)).status).toBe(202);
    expect((await PostCheck.findById(pc._id).lean())!.lastError).toBe('new');
  });

  it('a rerun that cannot be queued leaves the row on the failed tab', async () => {
    const { agent, csrf } = await admin();
    const pc = await check('queued', { lastError: 'old' });
    vi.spyOn(getQueue('ai'), 'add').mockRejectedValueOnce(new Error('redis down'));
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf)).status).toBe(500);
    expect((await PostCheck.findById(pc._id).lean())!.lastError).toBe('redis down');
  });

  it('rerun queues a new ai job for a queued post and clears lastError', async () => {
    const { agent, csrf } = await admin();
    const pc = await check('queued', { lastError: 'boom' });
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf);
    expect(res.status).toBe(202);
    const [job] = take('ai');
    expect(job!.id).toMatch(new RegExp(`^classify-${pc._id}-\\d+$`));
    expect((await PostCheck.findById(pc._id).lean())!.lastError).toBeUndefined();
  });

  it('rerun of a classified post re-queues publish only, under a new job id', async () => {
    const { agent, csrf } = await admin();
    const pc = await check('classified', { lastError: 'boom' });
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf);
    expect(res.status).toBe(202);
    expect(take('ai')).toHaveLength(0);
    const [job] = take('post-publish');
    expect(job!.id).toMatch(new RegExp(`^publish-${pc._id}-\\d+$`));
    expect(job!.opts).toMatchObject({ attempts: 8, backoff: { type: 'exponential', delay: 60_000 } });
    expect((await PostCheck.findById(pc._id).lean())!.lastError).toBeUndefined();
  });

  it('rerun is refused for other states', async () => {
    const { agent, csrf } = await admin();
    const pc = await check('needs_person');
    const res = await agent.post(`/admin/api/post-checks/${pc._id}/rerun`).set('X-CSRF-Token', csrf);
    expect(res).toMatchObject({ status: 409, body: { error: 'not_rerunnable' } });
  });
});

describe('POST /shops/:id/not-a-shop', () => {
  it('removes an auto shop, rejects its reviews and blocks the handle', async () => {
    const { agent, csrf } = await admin();
    const s = await shop('not_a_shop_x', true);
    const pc = await check('published');
    const common = { reviewerSourceId: pc.reviewerSourceId, postUrl: pc.postUrl, occurredAt: pc.occurredAt };
    await Review.create({ ...common, postShortcode: 'a1', shopId: s._id, status: 'published', autoPublished: true, outcome: 'delivered_ok', direction: 'positive', publishedAt: new Date() });
    await Review.create({ ...common, postShortcode: 'a2', shopId: s._id, status: 'pending' });
    await Wishlist.create({ handle: 'not_a_shop_x', status: 'promoted', promotedShopId: s._id });

    const res = await agent.post(`/admin/api/shops/${s._id}/not-a-shop`).set('X-CSRF-Token', csrf);
    expect(res.status).toBe(200);
    expect(await Shop.findById(s._id)).toBeNull();
    expect(await IgnoredHandle.exists({ handle: 'not_a_shop_x' })).toBeTruthy();
    const reviews = await Review.find().lean();
    expect(reviews).toHaveLength(2);
    expect(reviews.every((r) => r.status === 'rejected' && r.rejectReason === 'not_a_shop')).toBe(true);
    const entry = await Wishlist.findOne({ handle: 'not_a_shop_x' }).lean();
    expect(entry?.status).toBe('dismissed');
    expect(entry?.promotedShopId).toBeUndefined();
  });

  it('sends the post back to a person, so it can go to the right shop', async () => {
    const { agent, csrf } = await admin();
    const s = await shop('police_page', true);
    const right = await shop('real_shop');
    const pc = await check('published');
    const review = await Review.create({
      reviewerSourceId: pc.reviewerSourceId,
      postShortcode: pc.postShortcode,
      postUrl: pc.postUrl,
      occurredAt: pc.occurredAt,
      shopId: s._id,
      status: 'published',
      autoPublished: true,
      outcome: 'other_problem',
      direction: 'negative',
      publishedAt: new Date(),
    });
    await PostCheck.updateOne({ _id: pc._id }, { $set: { shopIds: [s._id], reviewIds: [review._id] } });

    expect((await agent.post(`/admin/api/shops/${s._id}/not-a-shop`).set('X-CSRF-Token', csrf)).status).toBe(200);
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'needs_person', reasons: ['not_a_shop'], shopIds: [], reviewIds: [] });
    expect((await agent.get('/admin/api/post-checks')).body.total).toBe(1);

    const res = await agent.post(`/admin/api/post-checks/${pc._id}/publish`).set('X-CSRF-Token', csrf).send({ ...body, shopIds: [String(right._id)] });
    expect(res.status).toBe(200);
    expect(await Review.countDocuments({ shopId: right._id, status: 'published' })).toBe(1);
  });

  it('keeps a post published that also has another shop, without the removed one', async () => {
    const { agent, csrf } = await admin();
    const s = await shop('police_page', true);
    const other = await shop('real_shop');
    const pc = await check('published');
    const common = { reviewerSourceId: pc.reviewerSourceId, postShortcode: pc.postShortcode, postUrl: pc.postUrl, occurredAt: pc.occurredAt };
    const gone = await Review.create({ ...common, shopId: s._id, status: 'rejected', rejectReason: 'takedown' });
    const kept = await Review.create({ ...common, shopId: other._id, status: 'published', outcome: 'other_problem', direction: 'negative', publishedAt: new Date() });
    await PostCheck.updateOne({ _id: pc._id }, { $set: { shopIds: [s._id, other._id], reviewIds: [gone._id, kept._id] } });

    expect((await agent.post(`/admin/api/shops/${s._id}/not-a-shop`).set('X-CSRF-Token', csrf)).status).toBe(200);
    const after = await PostCheck.findById(pc._id).lean();
    expect(after).toMatchObject({ status: 'published', reasons: [] });
    expect(after!.shopIds.map(String)).toEqual([String(other._id)]);
    expect(after!.reviewIds.map(String)).toEqual([String(kept._id)]);
  });

  it('can run again after a crash before the shop is deleted', async () => {
    const { agent, csrf } = await admin();
    const s = await shop('police_page', true);
    const pc = await check('published', { shopIds: [s._id] });
    vi.spyOn(Shop, 'deleteOne').mockImplementationOnce((() => Promise.reject(new Error('crash'))) as never);
    expect((await agent.post(`/admin/api/shops/${s._id}/not-a-shop`).set('X-CSRF-Token', csrf)).status).toBe(500);
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'needs_person', reasons: ['not_a_shop'] });
    expect((await agent.post(`/admin/api/shops/${s._id}/not-a-shop`).set('X-CSRF-Token', csrf)).status).toBe(200);
    expect(await Shop.exists({ _id: s._id })).toBeNull();
    expect(await PostCheck.findById(pc._id).lean()).toMatchObject({ status: 'needs_person', reasons: ['not_a_shop'] });
  });

  it('refuses a hand-made shop, and one with a non-auto published review', async () => {
    const { agent, csrf } = await admin();
    const manual = await shop('hand_made');
    expect(await agent.post(`/admin/api/shops/${manual._id}/not-a-shop`).set('X-CSRF-Token', csrf)).toMatchObject({
      status: 409,
      body: { error: 'not_auto_created' },
    });
    const auto = await shop('auto_one', true);
    const pc = await check('published');
    await Review.create({
      reviewerSourceId: pc.reviewerSourceId,
      postShortcode: 'h1',
      postUrl: pc.postUrl,
      occurredAt: pc.occurredAt,
      shopId: auto._id,
      status: 'published',
      autoPublished: false,
      outcome: 'delivered_ok',
      direction: 'positive',
      publishedAt: new Date(),
    });
    expect(await agent.post(`/admin/api/shops/${auto._id}/not-a-shop`).set('X-CSRF-Token', csrf)).toMatchObject({
      status: 409,
      body: { error: 'shop_has_reviews' },
    });
    expect(await Shop.exists({ _id: auto._id })).toBeTruthy();
    expect(await IgnoredHandle.countDocuments()).toBe(0);
  });
});

describe('reviewer sources: trusted and profile', () => {
  it('accepts trusted and profile on create and trusted on patch', async () => {
    const { agent, csrf } = await admin();
    const profile = { sha256: 'a'.repeat(64), displayName: 'Nul', biography: 'bio', postCount: 10, followerCount: 5, isPrivate: false, fetchedAt: new Date().toISOString() };
    const created = await agent
      .post('/admin/api/reviewer-sources')
      .set('X-CSRF-Token', csrf)
      .send({ handle: 'newsrc', name: 'New', trusted: true, follow: false, profile });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ trusted: true, profile: { sha256: profile.sha256, followerCount: 5 } });
    const patched = await agent.patch(`/admin/api/reviewer-sources/${created.body._id}`).set('X-CSRF-Token', csrf).send({ trusted: false });
    expect(patched.body.trusted).toBe(false);
    expect((await agent.patch(`/admin/api/reviewer-sources/${created.body._id}`).set('X-CSRF-Token', csrf).send({ profile })).status).toBe(400);
  });
});

describe('CSRF', () => {
  it('writes need the CSRF token', async () => {
    const { agent } = await admin();
    const pc = await check('needs_person');
    expect((await agent.post(`/admin/api/post-checks/${pc._id}/dismiss`)).status).toBe(403);
    expect((await agent.post(`/admin/api/shops/${new Types.ObjectId()}/not-a-shop`)).status).toBe(403);
  });
});
