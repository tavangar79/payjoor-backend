import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { apifyRoutes, fakeFetch } from '../setup/fakeFetch.js';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { extractTagged } = await import('../../src/apify/extractTagged.js');
const { runDailyCheck } = await import('../../src/apify/dailyCheck.js');
const { runBackfill } = await import('../../src/apify/backfill.js');
const { BudgetError } = await import('../../src/apify/budget.js');
const models = await import('../../src/models/index.js');
const { createShop, saveShopImage } = await import('../../src/services/shops.js');
const { createSource } = await import('../../src/services/reviewerSources.js');
const { createApp } = await import('../../src/app.js');
const { createAdminAccount } = await import('../../src/auth/login.js');
const { totpCode } = await import('../../src/auth/totp.js');

useMongo();

const posts = JSON.parse(readFileSync(new URL('../fixtures/apify/posts.docs-sample.json', import.meta.url), 'utf8'));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]);

beforeAll(async () => {
  await models.syncAllIndexes();
});

beforeEach(async () => {
  resetQueues();
  const image = await saveShopImage(PNG);
  await createShop({ handle: 'maash.new', previousHandles: ['maashmamad'], displayName: 'Maash', profileImageId: image.imageId });
});

describe('extractTagged', () => {
  it('unions mentions and tagged users, minus the reviewer and the ignore list', () => {
    expect(extractTagged(posts[1], 'sadegh.delicious', ['snappfood'])).toEqual(['maashmamad']);
    expect(extractTagged(posts[2], 'sadegh.delicious', [])).toEqual(['new.bag.shop', 'kif_shop']);
    expect(extractTagged(posts[3], 'sadegh.delicious', [])).toEqual([]);
    expect(extractTagged({ mentions: ['@A.b', 'a.b', 'bad handle!'], taggedUsers: ['c'] }, 'x', [])).toEqual(['a.b', 'c']);
  });
});

describe('backfill and daily check', () => {
  async function source() {
    const s = await createSource({ handle: '@Sadegh.Delicious', name: 'Sadegh' });
    expect(take('apify-backfill')).toHaveLength(1);
    return s;
  }

  it('backfills: pending reviews on shops and wishlist entries, newest non-pinned post remembered', async () => {
    const s = await source();
    const f = fakeFetch(apifyRoutes(posts, { costUsd: 0.0081 }));
    const counts = await runBackfill(s._id, { fetch: f });
    const input = JSON.parse(String(f.mock.calls.find(([u]) => /\/runs$/.test(String(u)))![1]!.body));
    expect(input).toEqual({ username: ['sadegh.delicious'], resultsLimit: 50 });
    // snappfood isn't in the test ignore list, so it becomes a wishlist entry too.
    expect(counts).toMatchObject({ postsFetched: 4, postsNew: 4, reviewsCreated: 5, wishlisted: 4, skipped: 1, duplicates: 0 });

    const onShop = await models.Review.findOne({ shopId: { $exists: true } }).lean();
    expect(onShop).toMatchObject({
      status: 'pending',
      postShortcode: 'PostShop01',
      postUrl: 'https://www.instagram.com/p/PostShop01/',
      paidPartnership: true,
      media: { displayUrl: 'https://scontent.cdninstagram.com/v/shop.jpg' },
      raw: { shortCode: 'PostShop01' },
    });
    expect(onShop?.outcome).toBeUndefined();
    const wl = await models.Wishlist.find().sort({ handle: 1 }).lean();
    expect(wl.map((w) => [w.handle, w.sources])).toEqual([
      ['kif_shop', ['reviewer_post']],
      ['new.bag.shop', ['reviewer_post']],
      ['old.sponsor', ['reviewer_post']],
      ['snappfood', ['reviewer_post']],
    ]);
    const src = await models.ReviewerSource.findById(s._id).lean();
    expect(src).toMatchObject({ backfillDone: true, lastSeenShortcode: 'PostNew001' });
    expect(await models.JobRun.findOne({ type: 'backfill' }).lean()).toMatchObject({ costUsd: 0.0081, apifyRunId: 'run1' });

    // A second backfill is a no-op unless forced; forced, nothing is created twice.
    expect(await runBackfill(s._id, { fetch: f })).toMatchObject({ alreadyDone: 1 });
    const again = await runBackfill(s._id, { fetch: f, force: true });
    expect(again).toMatchObject({ postsNew: 1, reviewsCreated: 0 });
    expect(await models.Review.countDocuments()).toBe(5);
    expect((await models.Wishlist.findOne({ handle: 'kif_shop' }).lean())?.requestCount).toBe(1);
  });

  it('skips a backfill above the budget stop without marking it done', async () => {
    const s = await source();
    const f = fakeFetch(apifyRoutes(posts, { usageUsd: 4.6 }));
    expect(await runBackfill(s._id, { fetch: f })).toMatchObject({ skippedBudget: 1 });
    expect((await models.ReviewerSource.findById(s._id).lean())?.backfillDone).toBe(false);
  });

  it('daily check: one combined run, only posts newer than the last seen one', async () => {
    const a = await source();
    await models.ReviewerSource.updateOne({ _id: a._id }, { lastSeenPostAt: new Date('2026-10-20T09:00:00Z'), lastSeenShortcode: 'PostShop01', backfillDone: true });
    await models.ReviewerSource.create({ handle: 'other.reviewer', name: 'Other' });
    await models.ReviewerSource.create({ handle: 'paused', name: 'Paused', follow: false });
    const newer = { ...posts[2], shortCode: 'Other00001', ownerUsername: 'Other.Reviewer', timestamp: '2026-10-22T08:00:00.000Z', taggedUsers: [{ username: 'maashmamad' }] };
    const f = fakeFetch(apifyRoutes([...posts, posts[2], newer]));
    const counts = await runDailyCheck({ fetch: f });
    const input = JSON.parse(String(f.mock.calls.find(([u]) => /\/runs$/.test(String(u)))![1]!.body));
    expect(input).toEqual({ username: ['sadegh.delicious', 'other.reviewer'], resultsLimit: 10 });
    expect(counts).toMatchObject({ sources: 2, postsFetched: 6, postsNew: 2, reviewsCreated: 3, wishlisted: 2 });
    expect((await models.ReviewerSource.findOne({ handle: 'other.reviewer' }).lean())?.lastSeenShortcode).toBe('Other00001');
    expect((await models.ReviewerSource.findById(a._id).lean())?.lastSeenShortcode).toBe('PostNew001');
  });

  it('daily check stops at the hard limit and does nothing without followed sources', async () => {
    expect(await runDailyCheck({ fetch: fakeFetch([]) })).toEqual({ sources: 0 });
    await source();
    await expect(runDailyCheck({ fetch: fakeFetch(apifyRoutes([], { usageUsd: 5, maxUsd: 5 })) })).rejects.toBeInstanceOf(BudgetError);
    expect((await models.JobRun.findOne({ type: 'daily_check', error: { $exists: true } }).lean())?.error).toBe('apify_hard_limit');
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
    expect(take('apify-backfill').map((j) => j.data)).toEqual([{ sourceId: created.body._id, force: false }]);
    expect((await agent.post('/admin/api/reviewer-sources').set('X-CSRF-Token', csrf).send({ handle: 'sadegh.delicious', name: 'x' })).status).toBe(409);

    const off = await agent.post('/admin/api/reviewer-sources').set('X-CSRF-Token', csrf).send({ handle: 'later', name: 'Later', follow: false });
    expect(take('apify-backfill')).toEqual([]);
    await agent.patch(`/admin/api/reviewer-sources/${off.body._id}`).set('X-CSRF-Token', csrf).send({ follow: true });
    expect(take('apify-backfill')).toHaveLength(1);
    expect((await agent.patch(`/admin/api/reviewer-sources/${off.body._id}`).set('X-CSRF-Token', csrf).send({ handle: 'x' })).status).toBe(400);

    expect((await agent.get('/admin/api/reviewer-sources')).body.items.map((s: { handle: string }) => s.handle)).toEqual(['later', 'sadegh.delicious']);
    const now = await agent.post(`/admin/api/reviewer-sources/${created.body._id}/backfill`).set('X-CSRF-Token', csrf);
    expect(now.status).toBe(202);
    expect(take('apify-backfill')[0]!.data).toEqual({ sourceId: created.body._id, force: true });
  });

  it('lists job runs, reports usage and queues a daily check', async () => {
    const { agent, csrf } = await admin();
    await models.JobRun.create({ type: 'daily_check', costUsd: 0.01 });
    await models.JobRun.create({ type: 'backfill', costUsd: 0.05 });
    expect((await agent.get('/admin/api/jobs/runs?type=backfill')).body.items).toHaveLength(1);
    vi.stubGlobal('fetch', fakeFetch(apifyRoutes([], { usageUsd: 1.5, maxUsd: 5 })));
    try {
      const usage = await agent.get('/admin/api/jobs/usage');
      expect(usage.body).toMatchObject({ monthlyUsageUsd: 1.5, maxMonthlyUsageUsd: 5, budgetStopUsd: 4.5, apifyReachable: true });
      expect(usage.body.recordedThisMonthUsd).toBeCloseTo(0.06);
    } finally {
      vi.unstubAllGlobals();
    }
    expect((await agent.post('/admin/api/jobs/daily-check').set('X-CSRF-Token', csrf)).status).toBe(202);
    expect(take('apify-daily')).toHaveLength(1);
  });
});
