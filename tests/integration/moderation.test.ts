import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Types } from 'mongoose';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';
import { createAdminAccount } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';
import { Review, ReviewerSource, Shop, Wishlist, syncAllIndexes } from '../../src/models/index.js';
import { createShop, saveShopImage } from '../../src/services/shops.js';
import { addRequest } from '../../src/services/wishlist.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]);
let sourceId: Types.ObjectId;
let imageId: string;

beforeEach(async () => {
  sourceId = (await ReviewerSource.create({ handle: 'sadegh.delicious', name: 'Sadegh' }))._id;
  imageId = String((await saveShopImage(PNG)).imageId);
});

const pending = (target: { shopId?: Types.ObjectId; wishlistId?: Types.ObjectId }, code = 'Code00001') =>
  Review.create({
    ...target,
    reviewerSourceId: sourceId,
    postShortcode: code,
    postUrl: `https://www.instagram.com/p/${code}/`,
    occurredAt: new Date('2026-10-01'),
    caption: 'خرید از پیج',
    raw: { big: 'x'.repeat(100) },
  });

async function admin() {
  const { totpSecret } = await createAdminAccount('founder', 'a-long-enough-password');
  const agent = request.agent(createApp());
  const res = await agent
    .post('/admin/api/auth/login')
    .send({ username: 'founder', password: 'a-long-enough-password', code: totpCode(totpSecret, Math.floor(Date.now() / 1000)) });
  const csrf = res.body.csrfToken as string;
  return {
    get: (url: string) => agent.get(url),
    post: (url: string, body: object = {}) => agent.post(url).set('X-CSRF-Token', csrf).send(body),
  };
}

describe('review moderation API', () => {
  it('lists pending reviews with their targets, without raw', async () => {
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: (await saveShopImage(PNG)).imageId });
    await pending({ shopId: shop._id });
    const wl = await addRequest('new.shop', 'reviewer_post');
    await pending({ wishlistId: wl._id }, 'Code00002');
    const a = await admin();
    const res = await a.get('/admin/api/reviews');
    expect(res.body).toMatchObject({ total: 2, page: 1 });
    expect(res.body.items[0]).toMatchObject({ shopId: { handle: 'maashmamad' }, reviewerSourceId: { handle: 'sadegh.delicious' } });
    expect(res.body.items[1]).toMatchObject({ wishlistId: { handle: 'new.shop' } });
    expect(res.body.items[0].raw).toBeUndefined();
    expect((await a.get(`/admin/api/reviews/${res.body.items[0]._id}`)).body.raw).toEqual({ big: 'x'.repeat(100) });
  });

  it('approves only with outcome and direction, only on a shop, only once', async () => {
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: (await saveShopImage(PNG)).imageId });
    const r = await pending({ shopId: shop._id });
    const a = await admin();
    expect((await a.post(`/admin/api/reviews/${r._id}/approve`, { outcome: 'delivered_ok' })).status).toBe(400);
    const ok = await a.post(`/admin/api/reviews/${r._id}/approve`, { outcome: 'delivered_ok', direction: 'positive', summary: ' Arrived on time ' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: 'published', outcome: 'delivered_ok', direction: 'positive', summary: 'Arrived on time' });
    expect(ok.body.publishedAt).toEqual(expect.any(String));
    expect((await a.post(`/admin/api/reviews/${r._id}/approve`, { outcome: 'delivered_ok', direction: 'positive' })).body).toEqual({ error: 'not_pending' });

    const wl = await addRequest('new.shop', 'reviewer_post');
    const onWishlist = await pending({ wishlistId: wl._id }, 'Code00002');
    const blocked = await a.post(`/admin/api/reviews/${onWishlist._id}/approve`, { outcome: 'delivered_ok', direction: 'positive' });
    expect(blocked).toMatchObject({ status: 409, body: { error: 'review_not_on_shop' } });
  });

  it('rejects with a reason, also taking a published review down', async () => {
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: (await saveShopImage(PNG)).imageId });
    const r = await pending({ shopId: shop._id });
    const a = await admin();
    expect((await a.post(`/admin/api/reviews/${r._id}/reject`, {})).status).toBe(400);
    await a.post(`/admin/api/reviews/${r._id}/approve`, { outcome: 'not_delivered', direction: 'negative' });
    const rej = await a.post(`/admin/api/reviews/${r._id}/reject`, { reason: 'ad' });
    expect(rej.body).toMatchObject({ status: 'rejected', rejectReason: 'ad' });
    expect(rej.body.publishedAt).toBeUndefined();
    expect((await a.post(`/admin/api/reviews/${r._id}/reject`, { reason: 'again' })).status).toBe(409);
    // A rejected review frees the (shop, post) slot, so the same post can come in again.
    await expect(pending({ shopId: shop._id })).resolves.toBeTruthy();
  });
});

describe('wishlist API', () => {
  it('lists open entries by demand with pending review counts', async () => {
    await addRequest('a.shop', 'dm');
    const b = await addRequest('b.shop', 'dm');
    await addRequest('b.shop', 'reviewer_post');
    await pending({ wishlistId: b._id });
    const dismissed = await addRequest('c.shop', 'dm');
    await Wishlist.updateOne({ _id: dismissed._id }, { status: 'dismissed' });
    const a = await admin();
    const res = await a.get('/admin/api/wishlist');
    expect(res.body.items.map((e: { handle: string; requestCount: number; pendingReviews: number; sources: string[] }) => [e.handle, e.requestCount, e.pendingReviews, e.sources])).toEqual([
      ['b.shop', 2, 1, ['dm', 'reviewer_post']],
      ['a.shop', 1, 0, ['dm']],
    ]);
    expect((await a.get('/admin/api/wishlist?status=dismissed')).body.items).toHaveLength(1);
  });

  it('promotes an entry to a shop and moves its pending reviews', async () => {
    const wl = await addRequest('new.shop', 'reviewer_post');
    const r = await pending({ wishlistId: wl._id });
    const a = await admin();
    const res = await a.post(`/admin/api/wishlist/${wl._id}/promote`, { displayName: 'New Shop', profileImageId: imageId });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ shop: { handle: 'new.shop', displayName: 'New Shop' }, reviews: { moved: 1, duplicates: 0 } });
    const moved = await Review.findById(r._id).lean();
    expect(String(moved?.shopId)).toBe(res.body.shop._id);
    expect(moved?.wishlistId).toBeUndefined();
    expect(await Wishlist.findById(wl._id).lean()).toMatchObject({ status: 'promoted' });
    expect((await a.post(`/admin/api/wishlist/${wl._id}/promote`, { displayName: 'x', profileImageId: imageId })).status).toBe(409);
    expect((await a.post(`/admin/api/wishlist/${wl._id}/promote`, { handle: 'x', displayName: 'x', profileImageId: imageId })).status).toBe(400);
  });

  it('links an entry to an existing shop: previous handle added, duplicate post rejected', async () => {
    const shop = await createShop({ handle: 'maash.new', displayName: 'Maash', profileImageId: (await saveShopImage(PNG)).imageId });
    await pending({ shopId: shop._id }, 'SamePost1');
    const wl = await addRequest('maashmamad', 'dm');
    const dup = await pending({ wishlistId: wl._id }, 'SamePost1');
    const other = await pending({ wishlistId: wl._id }, 'Other0001');
    const a = await admin();
    const res = await a.post(`/admin/api/wishlist/${wl._id}/link`, { shopId: String(shop._id) });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ shop: { previousHandles: ['maashmamad'] }, reviews: { moved: 1, duplicates: 1 } });
    expect(await Review.findById(dup._id).lean()).toMatchObject({ status: 'rejected', rejectReason: 'duplicate' });
    expect(String((await Review.findById(other._id).lean())?.shopId)).toBe(String(shop._id));
    expect((await Wishlist.findById(wl._id).lean())?.promotedShopId?.toString()).toBe(String(shop._id));
    expect((await Shop.findOne({ previousHandles: 'maashmamad' }).lean())?.handle).toBe('maash.new');
  });

  it('dismisses an entry', async () => {
    const wl = await addRequest('spam.page', 'dm');
    const a = await admin();
    expect((await a.post(`/admin/api/wishlist/${wl._id}/dismiss`)).body.status).toBe('dismissed');
    expect((await Wishlist.findById(wl._id).lean())?.status).toBe('dismissed');
    expect((await a.post('/admin/api/wishlist/000000000000000000000000/dismiss')).status).toBe(404);
  });
});
