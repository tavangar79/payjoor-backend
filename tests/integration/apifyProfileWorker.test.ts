import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { useMongo } from '../setup/mongo.js';
import { apifyRoutes, fakeFetch } from '../setup/fakeFetch.js';
import { logger } from '../../src/lib/logger.js';
import { JobRun, Shop, syncAllIndexes } from '../../src/models/index.js';
import { createShop, saveShopImage } from '../../src/services/shops.js';
import { fetchProfile } from '../../src/queues/workers/apifyProfile.worker.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const fixture = JSON.parse(readFileSync(new URL('../fixtures/apify/profile.docs-sample.json', import.meta.url), 'utf8'));
const png = (tag: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)]);
const cdn = (body: Buffer | null) =>
  [/cdninstagram\.com/, () => (body ? new Response(new Uint8Array(body)) : new Response('', { status: 403 }))] as const;

describe('apify-profile worker', () => {
  it('returns a draft for a new shop and records the run', async () => {
    const f = fakeFetch([...apifyRoutes(fixture, { costUsd: 0.0026 }), [...cdn(png('hd'))]]);
    const draft = await fetchProfile({ handle: '@MaashMamad' }, logger, { fetch: f });
    expect(draft).toMatchObject({
      handle: 'maashmamad',
      displayName: 'Maash Mamad | ماش ممد',
      image: { mime: 'image/png', url: expect.stringMatching(/^\/media\/shop\/[0-9a-f]{64}$/) },
      contact: { email: 'hello@maash.ir', website: 'https://maash.ir/shop', phone: '+989121234567' },
    });
    expect(draft.imageError).toBeUndefined();
    const run = await JobRun.findOne().lean();
    expect(run).toMatchObject({ type: 'profile_fetch', apifyRunId: 'run1', costUsd: 0.0026, counts: { items: 1, imageStored: 1 } });
    expect(run?.finishedAt).toBeInstanceOf(Date);
    expect(run?.error).toBeUndefined();
  });

  it('returns a draft without an image when the download fails', async () => {
    const f = fakeFetch([...apifyRoutes(fixture), [...cdn(null)]]);
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
    const item = { ...fixture[0], businessPhoneNumber: undefined, externalUrl: undefined, externalUrls: [] };
    const f = fakeFetch([...apifyRoutes([item]), [...cdn(png('new'))]]);
    await fetchProfile({ handle: 'maashmamad', shopId: String(shop._id) }, logger, { fetch: f });
    const after = await Shop.findById(shop._id).lean();
    expect(after?.profileImage.sha256).not.toBe(old.sha256);
    expect(after?.contact).toEqual({ email: 'hello@maash.ir' });
    expect(after?.profileFetchedAt).toBeInstanceOf(Date);
    expect(after?.displayName).toBe('Maash');
  });

  it('keeps the old image on refresh when the download fails', async () => {
    const old = await saveShopImage(png('old'));
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: old.imageId });
    const f = fakeFetch([...apifyRoutes(fixture), [...cdn(null)]]);
    await fetchProfile({ handle: 'maashmamad', shopId: String(shop._id) }, logger, { fetch: f });
    expect((await Shop.findById(shop._id).lean())?.profileImage.sha256).toBe(old.sha256);
  });

  it('does not retry a missing profile or a budget stop, and records the error', async () => {
    const missing = fakeFetch(apifyRoutes([]));
    const err = await fetchProfile({ handle: 'ghost' }, logger, { fetch: missing }).catch((e) => e);
    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(err.message).toBe('profile_not_found');

    const broke = fakeFetch(apifyRoutes(fixture, { usageUsd: 5, maxUsd: 5 }));
    await expect(fetchProfile({ handle: 'maashmamad' }, logger, { fetch: broke })).rejects.toThrow('apify_hard_limit');
    expect(broke.mock.calls.some(([u]) => /\/runs$/.test(String(u)))).toBe(false);
    expect((await JobRun.find().sort({ startedAt: 1 }).lean()).map((r) => r.error)).toEqual([
      'profile_not_found',
      'apify_hard_limit',
    ]);
  });
});
