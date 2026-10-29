import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { useMongo } from '../setup/mongo.js';
import { boxapiBody, dataRoute, fakeFetch, json } from '../setup/fakeFetch.js';
import { logger } from '../../src/lib/logger.js';
import { JobRun, Shop, syncAllIndexes } from '../../src/models/index.js';
import { createShop, saveShopImage } from '../../src/services/shops.js';
import { fetchProfile } from '../../src/queues/workers/shopProfile.worker.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const fixture = JSON.parse(readFileSync(new URL('../fixtures/boxapi/user-info.maashmamad.json', import.meta.url), 'utf8'));
const user = fixture.response.body.user;
const png = (tag: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)]);
const cdn = (body: Buffer | null) =>
  [/cdninstagram\.com/, () => (body ? new Response(new Uint8Array(body)) : new Response('', { status: 403 }))] as const;
const info = (u: unknown = user) => dataRoute('user/get_info_by_username', () => boxapiBody({ status: 'ok', user: u }));

describe('shop-profile worker', () => {
  it('returns a draft for a new shop and records the run', async () => {
    const f = fakeFetch([info(), [...cdn(png('hd'))]]);
    const draft = await fetchProfile({ handle: '@MaashMamad' }, logger, { fetch: f });
    expect(draft).toMatchObject({
      handle: 'maashmamad',
      displayName: 'اَغذیه فُروشی مَش مَمَّد‌ | مش ممد',
      image: { mime: 'image/png', url: expect.stringMatching(/^\/media\/shop\/[0-9a-f]{64}$/) },
      contact: { email: null, website: 'https://sepidz.menu/mashmamad/1', phone: '+987136311002' },
    });
    expect(draft.imageError).toBeUndefined();
    expect(JSON.parse(String(f.mock.calls[0]![1]!.body))).toEqual({ username: 'maashmamad' });
    const run = await JobRun.findOne().lean();
    expect(run).toMatchObject({ type: 'profile_fetch', counts: { imageStored: 1 } });
    expect(run?.finishedAt).toBeInstanceOf(Date);
    expect(run?.error).toBeUndefined();
  });

  it('returns a draft without an image when the download fails', async () => {
    const f = fakeFetch([info(), [...cdn(null)]]);
    const draft = await fetchProfile({ handle: 'maashmamad' }, logger, { fetch: f });
    expect(draft.image).toBeNull();
    expect(draft.imageError).toBe('http_403');
  });

  it('refreshes a shop: new image, contact replaced, missing fields cleared', async () => {
    const old = await saveShopImage(png('old'));
    const shop = await createShop({
      handle: 'maashmamad',
      displayName: 'Maash',
      profileImageId: old.imageId,
      contact: { email: 'old@maash.ir', website: 'old.ir', phone: '02112345678' },
    });
    const f = fakeFetch([info({ ...user, external_url: null, bio_links: [], public_email: 'Hello@Maash.ir' }), [...cdn(png('new'))]]);
    await fetchProfile({ handle: 'maashmamad', shopId: String(shop._id) }, logger, { fetch: f });
    const after = await Shop.findById(shop._id).lean();
    expect(after?.profileImage.sha256).not.toBe(old.sha256);
    expect(after?.contact).toEqual({ email: 'hello@maash.ir', phone: '+987136311002' });
    expect(after?.profileFetchedAt).toBeInstanceOf(Date);
    expect(after?.displayName).toBe('Maash');
  });

  it('keeps the old image on refresh when the download fails', async () => {
    const old = await saveShopImage(png('old'));
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: old.imageId });
    const f = fakeFetch([info(), [...cdn(null)]]);
    await fetchProfile({ handle: 'maashmamad', shopId: String(shop._id) }, logger, { fetch: f });
    expect((await Shop.findById(shop._id).lean())?.profileImage.sha256).toBe(old.sha256);
  });

  it('does not retry a missing profile, and records the error', async () => {
    const missing = fakeFetch([dataRoute('user/get_info_by_username', () => boxapiBody({ status: 'fail' }, 404))]);
    const err = await fetchProfile({ handle: 'ghost' }, logger, { fetch: missing }).catch((e) => e);
    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(err.message).toBe('profile_not_found');

    const badToken = fakeFetch([[/./, () => json({ success: false, data: { message: 'Invalid username or password.' } }, 401)]]);
    await expect(fetchProfile({ handle: 'maashmamad' }, logger, { fetch: badToken })).rejects.toMatchObject({ status: 401, retryable: false });
    expect((await JobRun.find().sort({ startedAt: 1 }).lean()).map((r) => r.error)).toEqual([
      'profile_not_found',
      'data api 401: Invalid username or password.',
    ]);
  });
});
