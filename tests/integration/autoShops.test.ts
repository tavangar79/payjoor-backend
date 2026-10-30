import { readFileSync } from 'node:fs';
import { Types } from 'mongoose';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { boxapiBody, dataCalls, dataRoute, fakeFetch, json } from '../setup/fakeFetch.js';
import { Category, Review, Shop, Wishlist, syncAllIndexes } from '../../src/models/index.js';
import { saveShopImage, createShop } from '../../src/services/shops.js';
import { createCategory, findOrCreateCategory } from '../../src/services/categories.js';
import { absorbWishlist, addRequest, dismiss } from '../../src/services/wishlist.js';
import { ensureShop } from '../../src/services/autoShops.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const fixture = JSON.parse(readFileSync(new URL('../fixtures/boxapi/user-info.maashmamad.json', import.meta.url), 'utf8'));
const user = fixture.response.body.user;
const png = (tag: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)]);
const cdn = (body: Buffer | null) =>
  [/cdninstagram\.com/, () => (body ? new Response(new Uint8Array(body)) : new Response('', { status: 403 }))] as const;
const info = (u: unknown = user) => dataRoute('user/get_info_by_username', () => boxapiBody({ status: 'ok', user: u }));

// ensureShop reaches the Data API through the global fetch, which each test replaces.
const useFetch = (f: typeof fetch) => vi.stubGlobal('fetch', f);

const reviewFor = (target: Record<string, unknown>, shortcode: string) =>
  Review.create({
    ...target,
    reviewerSourceId: new Types.ObjectId(),
    postShortcode: shortcode,
    postUrl: `https://instagram.com/p/${shortcode}`,
    occurredAt: new Date(),
  });

describe('findOrCreateCategory', () => {
  it('creates, then matches on the normalised name; empty gives null', async () => {
    expect(await findOrCreateCategory('  ')).toBeNull();
    const a = await findOrCreateCategory('رستوران');
    const b = await findOrCreateCategory('رستوران');
    const c = await findOrCreateCategory(' رستوران ');
    expect(a).not.toBeNull();
    expect(String(b)).toBe(String(a));
    expect(String(c)).toBe(String(a));
    expect(await Category.countDocuments()).toBe(1);
  });

  it('survives two creates at once', async () => {
    const ids = await Promise.all([findOrCreateCategory('کافه'), findOrCreateCategory('کافه')]);
    expect(String(ids[0])).toBe(String(ids[1]));
    expect(await Category.countDocuments()).toBe(1);
  });

  it('matches a category an admin created', async () => {
    const c = await createCategory({ name: 'نانوایی' });
    expect(String(await findOrCreateCategory('نانوایی'))).toBe(String(c._id));
  });
});

describe('ensureShop', () => {
  it('returns an existing shop with no Data API call, and gives it the category if it has none', async () => {
    const img = await saveShopImage(png('x'));
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: img.imageId });
    const f = fakeFetch([]);
    useFetch(f);
    const res = await ensureShop('@MaashMamad', 'رستوران');
    expect('shop' in res && String(res.shop._id)).toBe(String(shop._id));
    expect(f).not.toHaveBeenCalled();
    expect((await Shop.findById(shop._id).lean())?.categoryIds).toHaveLength(1);

    // A shop that has categories is left alone.
    await ensureShop('maashmamad', 'کافه');
    expect((await Shop.findById(shop._id).lean())?.categoryIds).toHaveLength(1);
    expect(await Category.countDocuments()).toBe(1);
  });

  it('a new handle fetches the profile and creates an autoCreated shop with image, contact and category', async () => {
    const f = fakeFetch([info(), [...cdn(png('hd'))]]);
    useFetch(f);
    const res = await ensureShop('maashmamad', 'رستوران');
    expect('shop' in res).toBe(true);
    const shop = await Shop.findOne({ handle: 'maashmamad' }).lean();
    expect(shop).toMatchObject({
      autoCreated: true,
      statusManual: false,
      status: 'no_known_issues',
      displayName: 'اَغذیه فُروشی مَش مَمَّد‌ | مش ممد',
      contact: { website: 'https://sepidz.menu/mashmamad/1', phone: '+987136311002' },
    });
    expect(shop?.profileImage.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(shop?.categoryIds).toHaveLength(1);
    expect(dataCalls(f)).toHaveLength(1);
  });

  it('profile not found holds', async () => {
    useFetch(fakeFetch([dataRoute('user/get_info_by_username', () => boxapiBody({ status: 'fail' }, 404))]));
    expect(await ensureShop('ghost', 'رستوران')).toEqual({ held: 'profile_not_found' });
    expect(await Shop.countDocuments()).toBe(0);
  });

  it('a private page holds', async () => {
    useFetch(fakeFetch([info({ ...user, is_private: true }), [...cdn(png('hd'))]]));
    expect(await ensureShop('maashmamad', 'رستوران')).toEqual({ held: 'profile_private' });
    expect(await Shop.countDocuments()).toBe(0);
  });

  it('no image holds', async () => {
    useFetch(fakeFetch([info(), [...cdn(null)]]));
    expect(await ensureShop('maashmamad', 'رستوران')).toEqual({ held: 'no_image' });
    expect(await Shop.countDocuments()).toBe(0);
  });

  it('a temporary image failure is rethrown, not held', async () => {
    const cdn503 = [/cdninstagram\.com/, () => new Response('', { status: 503 })] as const;
    useFetch(fakeFetch([info(), [...cdn503]]));
    await expect(ensureShop('maashmamad', 'رستوران')).rejects.toThrow(/http_503/);
    useFetch(fakeFetch([info(), [/cdninstagram\.com/, () => Promise.reject(new Error('socket hang up'))]]));
    await expect(ensureShop('maashmamad', 'رستوران')).rejects.toThrow(/fetch_failed/);
    expect(await Shop.countDocuments()).toBe(0);
  });

  it('an existing shop still absorbs an open wishlist entry left by an interrupted attempt', async () => {
    const img = await saveShopImage(png('x'));
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: img.imageId });
    const entry = await addRequest('maashmamad', 'dm');
    await reviewFor({ wishlistId: entry._id }, 'BBB');
    useFetch(fakeFetch([]));
    await ensureShop('maashmamad', 'رستوران');
    expect(await Review.countDocuments({ shopId: shop._id, status: 'pending' })).toBe(1);
    expect((await Wishlist.findById(entry._id).lean())?.status).toBe('promoted');
    await expect(ensureShop('maashmamad', 'رستوران')).resolves.toHaveProperty('shop');
  });

  it('a dismissed wishlist handle holds with no Data API call', async () => {
    const entry = await addRequest('maashmamad', 'dm');
    await dismiss(entry._id);
    const f = fakeFetch([]);
    useFetch(f);
    expect(await ensureShop('maashmamad', 'رستوران')).toEqual({ held: 'dismissed_handle' });
    expect(f).not.toHaveBeenCalled();
  });

  it('a temporary Data API error is rethrown', async () => {
    useFetch(fakeFetch([[/./, () => json({ success: false }, 503)]]));
    await expect(ensureShop('maashmamad', 'رستوران')).rejects.toThrow();
    expect(await Shop.countDocuments()).toBe(0);
  });

  it('an open wishlist entry is promoted and its reviews move to the shop, still pending', async () => {
    const entry = await addRequest('maashmamad', 'dm');
    await reviewFor({ wishlistId: entry._id }, 'AAA');
    useFetch(fakeFetch([info(), [...cdn(png('hd'))]]));
    const res = await ensureShop('maashmamad', 'رستوران');
    if (!('shop' in res)) throw new Error('held');
    const reviews = await Review.find({ shopId: res.shop._id }).lean();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ status: 'pending' });
    expect(reviews[0]!.wishlistId).toBeUndefined();
    expect(await Wishlist.findById(entry._id).lean()).toMatchObject({ status: 'promoted', promotedShopId: res.shop._id });
  });
});

describe('absorbWishlist', () => {
  it('does nothing when there is no open entry', async () => {
    const img = await saveShopImage(png('x'));
    const shop = await createShop({ handle: 'a.shop', displayName: 'A', profileImageId: img.imageId });
    await expect(absorbWishlist('a.shop', shop._id)).resolves.toBeUndefined();
    const entry = await addRequest('a.shop', 'dm');
    await dismiss(entry._id);
    await absorbWishlist('a.shop', shop._id);
    expect((await Wishlist.findById(entry._id).lean())?.status).toBe('dismissed');
  });
});
