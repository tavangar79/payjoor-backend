import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { boxapiBody, dataCalls, dataRoute, fakeFetch, json, type Route } from '../setup/fakeFetch.js';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { runBackfill, runDailyCheck } = await import('../../src/services/reviewerPosts.js');
const { BoxApiError } = await import('../../src/boxapi/dm.js');
const models = await import('../../src/models/index.js');
const { createShop, saveShopImage } = await import('../../src/services/shops.js');
const { createSource } = await import('../../src/services/reviewerSources.js');
const { createApp } = await import('../../src/app.js');
const { createAdminAccount } = await import('../../src/auth/login.js');
const { totpCode } = await import('../../src/auth/totp.js');

useMongo();

// A real page of @sadegh.delicious (trimmed to 4 posts; the first two are pinned).
const page = JSON.parse(readFileSync(new URL('../fixtures/boxapi/user-media.sadegh.delicious.json', import.meta.url), 'utf8'));
const lastPage = { items: [], more_available: false, next_max_id: null };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]);

/** get_media_by_username answered per username: a list of pages (the last repeats), or an HTTP status. */
function mediaRoute(byUser: Record<string, unknown[] | number>): Route {
  const served = new Map<string, number>();
  return dataRoute('user/get_media_by_username', (_url, init) => {
    const { username } = JSON.parse(String(init!.body)) as { username: string };
    const pages = byUser[username];
    if (pages === undefined) throw new Error(`unexpected user ${username}`);
    if (typeof pages === 'number') return boxapiBody({ status: 'fail' }, pages);
    const n = served.get(username) ?? 0;
    served.set(username, n + 1);
    const p = pages[Math.min(n, pages.length - 1)];
    return p && typeof p === 'object' && 'response' in p ? json(p) : boxapiBody(p);
  });
}

beforeAll(async () => {
  await models.syncAllIndexes();
});

beforeEach(async () => {
  resetQueues();
  const image = await saveShopImage(PNG);
  await createShop({ handle: 'maash.new', previousHandles: ['maashmamad'], displayName: 'Maash', profileImageId: image.imageId });
});

describe('backfill and daily check', () => {
  async function source() {
    const s = await createSource({ handle: '@Sadegh.Delicious', name: 'Sadegh' });
    expect(take('reviewer-backfill')).toHaveLength(1);
    return s;
  }

  it('backfills: pending reviews on shops and wishlist entries, newest non-pinned post remembered', async () => {
    const s = await source();
    const f = fakeFetch([mediaRoute({ 'sadegh.delicious': [page, lastPage] })]);
    const counts = await runBackfill(s._id, { fetch: f });
    expect(dataCalls(f)).toEqual([
      { username: 'sadegh.delicious', count: 12 },
      { username: 'sadegh.delicious', count: 12, max_id: '4012147540932962273_5723188289' },
    ]);
    expect(counts).toMatchObject({ postsFetched: 4, postsNew: 4, reviewsCreated: 4, wishlisted: 3, skipped: 0, duplicates: 0 });

    const onShop = await models.Review.findOne({ shopId: { $exists: true } }).lean();
    expect(onShop).toMatchObject({
      status: 'pending',
      postShortcode: 'DeuAu5jxCfh',
      postUrl: 'https://www.instagram.com/p/DeuAu5jxCfh/',
      occurredAt: new Date('2026-10-20T14:43:50Z'),
      caption: expect.stringContaining('@maashmamad'),
      paidPartnership: false,
      media: { displayUrl: expect.stringContaining('cdninstagram.com') },
      raw: { code: 'DeuAu5jxCfh' },
    });
    expect(onShop?.outcome).toBeUndefined();
    const wl = await models.Wishlist.find().sort({ handle: 1 }).lean();
    expect(wl.map((w) => [w.handle, w.sources])).toEqual([
      ['costcoiran', ['reviewer_post']],
      ['matam_lari', ['reviewer_post']],
      ['shiraz_drink', ['reviewer_post']],
    ]);
    // Pinned posts never count as the newest.
    const src = await models.ReviewerSource.findById(s._id).lean();
    expect(src).toMatchObject({ backfillDone: true, lastSeenShortcode: 'DfEjYyloDYx' });
    expect(await models.JobRun.findOne({ type: 'backfill' }).lean()).toMatchObject({ counts: { reviewsCreated: 4 } });

    // A second backfill is a no-op unless forced; forced, nothing is created twice.
    expect(await runBackfill(s._id, { fetch: f })).toMatchObject({ alreadyDone: 1 });
    const again = await runBackfill(s._id, { fetch: f, force: true });
    expect(again).toMatchObject({ postsNew: 0, reviewsCreated: 0 });
    expect(await models.Review.countDocuments()).toBe(4);
    expect((await models.Wishlist.findOne({ handle: 'costcoiran' }).lean())?.requestCount).toBe(1);
  });

  it('stops backfilling at backfillLimit', async () => {
    const s = await createSource({ handle: 'sadegh.delicious', name: 'Sadegh', backfillLimit: 2 });
    const f = fakeFetch([mediaRoute({ 'sadegh.delicious': [page] })]);
    expect(await runBackfill(s._id, { fetch: f })).toMatchObject({ postsFetched: 2 });
    expect(dataCalls(f)).toHaveLength(1);
  });

  it('daily check: one page per source, only posts newer than the last seen one', async () => {
    const a = await source();
    await models.ReviewerSource.updateOne({ _id: a._id }, { lastSeenPostAt: new Date('2026-10-20T14:43:50Z'), lastSeenShortcode: 'DeuAu5jxCfh', backfillDone: true });
    await models.ReviewerSource.create({ handle: 'other.reviewer', name: 'Other' });
    await models.ReviewerSource.create({ handle: 'paused', name: 'Paused', follow: false });
    const other = {
      items: [{ code: 'Other00001', taken_at: 1792915200, user: { pk: 1, username: 'other.reviewer' }, usertags: { in: [{ user: { username: 'maashmamad' } }] } }],
      more_available: false,
    };
    const f = fakeFetch([mediaRoute({ 'sadegh.delicious': [page], 'other.reviewer': [other] })]);
    const counts = await runDailyCheck({ fetch: f });
    expect(dataCalls(f)).toEqual([
      { username: 'sadegh.delicious', count: 12 },
      { username: 'other.reviewer', count: 12 },
    ]);
    // New: a pinned post from after the last check and one regular post; plus the other reviewer's post.
    expect(counts).toMatchObject({ sources: 2, postsFetched: 5, postsNew: 3, reviewsCreated: 3, wishlisted: 2 });
    expect((await models.ReviewerSource.findOne({ handle: 'other.reviewer' }).lean())?.lastSeenShortcode).toBe('Other00001');
    expect((await models.ReviewerSource.findById(a._id).lean())?.lastSeenShortcode).toBe('DfEjYyloDYx');
  });

  it('daily check pages back while every post on the page is new', async () => {
    const a = await source();
    await models.ReviewerSource.updateOne({ _id: a._id }, { lastSeenPostAt: new Date('2026-01-01T00:00:00Z'), backfillDone: true });
    const f = fakeFetch([mediaRoute({ 'sadegh.delicious': [page, lastPage] })]);
    await runDailyCheck({ fetch: f });
    expect(dataCalls(f).map((b) => b.max_id)).toEqual([undefined, '4012147540932962273_5723188289']);
  });

  it('daily check: a failing source does not stop the others; all failing fails the job', async () => {
    expect(await runDailyCheck({ fetch: fakeFetch([]) })).toEqual({ sources: 0 });
    await source();
    await models.ReviewerSource.create({ handle: 'renamed.page', name: 'Gone' });
    const f = fakeFetch([mediaRoute({ 'sadegh.delicious': [page], 'renamed.page': 404 })]);
    expect(await runDailyCheck({ fetch: f })).toMatchObject({ sources: 2, sourceErrors: 1, postsNew: 4 });

    await models.ReviewerSource.updateMany({}, { follow: false });
    await models.ReviewerSource.updateOne({ handle: 'renamed.page' }, { follow: true });
    await expect(runDailyCheck({ fetch: f })).rejects.toBeInstanceOf(BoxApiError);
    const failed = await models.JobRun.findOne({ type: 'daily_check', error: { $exists: true } }).lean();
    expect(failed?.error).toMatch(/^instagram 404/);
  });
});

describe('admin reviewer sources and jobs API', () => {
  async function admin() {
    const { totpSecret } = await createAdminAccount('founder', 'a-long-enough-password');
    const agent = request.agent(createApp());
    const res = await agent
      .post('/admin/api/auth/login')
      .send({ username: 'founder', password: 'a-long-enough-password', code: totpCode(totpSecret, Math.floor(Date.now() / 1000)) });
    return { agent, csrf: res.body.csrfToken as string };
  }

  it('creates (queuing a backfill), edits, lists and backfills sources', async () => {
    const { agent, csrf } = await admin();
    const created = await agent.post('/admin/api/reviewer-sources').set('X-CSRF-Token', csrf).send({ handle: '@Sadegh.Delicious', name: 'Sadegh', backfillLimit: 20 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ handle: 'sadegh.delicious', follow: true, backfillLimit: 20, permission: 'link_only' });
    expect(take('reviewer-backfill').map((j) => j.data)).toEqual([{ sourceId: created.body._id, force: false }]);
    expect((await agent.post('/admin/api/reviewer-sources').set('X-CSRF-Token', csrf).send({ handle: 'sadegh.delicious', name: 'x' })).status).toBe(409);

    const off = await agent.post('/admin/api/reviewer-sources').set('X-CSRF-Token', csrf).send({ handle: 'later', name: 'Later', follow: false });
    expect(take('reviewer-backfill')).toEqual([]);
    await agent.patch(`/admin/api/reviewer-sources/${off.body._id}`).set('X-CSRF-Token', csrf).send({ follow: true });
    expect(take('reviewer-backfill')).toHaveLength(1);
    expect((await agent.patch(`/admin/api/reviewer-sources/${off.body._id}`).set('X-CSRF-Token', csrf).send({ handle: 'x' })).status).toBe(400);

    expect((await agent.get('/admin/api/reviewer-sources')).body.items.map((s: { handle: string }) => s.handle)).toEqual(['later', 'sadegh.delicious']);
    const now = await agent.post(`/admin/api/reviewer-sources/${created.body._id}/backfill`).set('X-CSRF-Token', csrf);
    expect(now.status).toBe(202);
    expect(take('reviewer-backfill')[0]!.data).toEqual({ sourceId: created.body._id, force: true });
  });

  it('lists job runs, reports the Data API quota and queues a daily check', async () => {
    const { agent, csrf } = await admin();
    await models.JobRun.create({ type: 'daily_check' });
    await models.JobRun.create({ type: 'backfill' });
    expect((await agent.get('/admin/api/jobs/runs?type=backfill')).body.items).toHaveLength(1);
    vi.stubGlobal('fetch', fakeFetch([[/\/api\/my$/, () => json({ request_used: 6, request_limit: 10, request_left: 4, plan_expiration: '2026-11-09 06:04:12' })]]));
    try {
      expect((await agent.get('/admin/api/jobs/quota')).body).toEqual({
        reachable: true,
        requestUsed: 6,
        requestLimit: 10,
        requestLeft: 4,
        planExpiration: '2026-11-09 06:04:12',
      });
      vi.stubGlobal('fetch', fakeFetch([[/./, () => json({}, 503)]]));
      expect((await agent.get('/admin/api/jobs/quota')).body).toEqual({ reachable: false });
    } finally {
      vi.unstubAllGlobals();
    }
    expect((await agent.post('/admin/api/jobs/daily-check').set('X-CSRF-Token', csrf)).status).toBe(202);
    expect(take('reviewer-daily')).toHaveLength(1);
  });
});
