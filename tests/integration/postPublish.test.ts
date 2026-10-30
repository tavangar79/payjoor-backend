import { readFileSync } from 'node:fs';
import { UnrecoverableError } from 'bullmq';
import { Types } from 'mongoose';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { boxapiBody, dataCalls, dataRoute, fakeFetch, json, type Route } from '../setup/fakeFetch.js';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { ingestPosts } = await import('../../src/services/reviewerPosts.js');
const { processClassify } = await import('../../src/queues/workers/ai.worker.js');
const { publishPostCheck, publishReview } = await import('../../src/services/postPublish.js');
const { postPublishWorker } = await import('../../src/queues/workers/postPublish.worker.js');
const { workerDefinitions } = await import('../../src/queues/workers/index.js');
const { createShop, saveShopImage } = await import('../../src/services/shops.js');
const { addRequest } = await import('../../src/services/wishlist.js');
const { aiJobData } = await import('../../src/queues/jobData.js');
const { logger } = await import('../../src/lib/logger.js');
const { env } = await import('../../src/config/env.js');
const { QUEUES } = await import('../../src/queues/names.js');
const { IgnoredHandle, JobRun, PostCheck, Review, ReviewerSource, Shop, Wishlist, syncAllIndexes } = await import('../../src/models/index.js');

useMongo();

type Reply = Record<string, unknown> & { shops: { handle: string; role: string }[] };
type Post = { code: string; taken_at: number; caption: { text: string }; luna_reply: Reply };
const posts = JSON.parse(readFileSync(new URL('../fixtures/boxapi/trusted-posts.nulbox.json', import.meta.url), 'utf8')) as Post[];
const byShop = (handle: string) => posts.find((p) => p.luna_reply.shops.some((s) => s.handle === handle))!;
const botik = byShop('botik_jimbo');
const vebo = byShop('vebo.ir');
const ananas = byShop('ananas__collection');
const setShoe = byShop('set_shoe');
const cropShoop = byShop('crop_shoop');
const siamak = byShop('siamak_kala');

/** The post rewritten as a review of `handle` under a new shortcode, the caption naming it. */
function about(post: Post, handle: string, code: string): Post {
  return {
    ...post,
    code,
    caption: { text: `${post.caption.text} @${handle}` },
    luna_reply: { ...post.luna_reply, shops: [{ handle, role: 'reviewed_shop' }] },
  };
}

const profile = JSON.parse(readFileSync(new URL('../fixtures/boxapi/user-info.maashmamad.json', import.meta.url), 'utf8')).response.body.user;
const png = (tag: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)]);
const cdn: Route = [/cdninstagram\.com/, () => new Response(new Uint8Array(png('hd')))];
// Answers for whichever page was asked about.
const found = dataRoute('user/get_info_by_username', (_url, init) =>
  boxapiBody({ status: 'ok', user: { ...profile, username: JSON.parse(String(init?.body)).username } }),
);
const notFound = dataRoute('user/get_info_by_username', () => boxapiBody({ status: 'fail' }, 404));

function useFetch(routes: Route[]) {
  const f = fakeFetch(routes);
  vi.stubGlobal('fetch', f);
  return f;
}

const completion = (reply: unknown) =>
  fakeFetch([[/chat\/completions$/, () => json({ choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: 'stop' }] })]]);

const source = async (trusted = true) => (await ReviewerSource.create({ handle: 'nulbox', name: 'Nulbox', trusted })).toObject();

/** Runs the post through intake and the AI step, leaving a postCheck in `classified`. */
async function classified(post: Post, from: Awaited<ReturnType<typeof source>>) {
  await ingestPosts(from, [post], { onlyNewer: false });
  const [job] = take('ai');
  await processClassify(aiJobData.parse(job!.data) as never, logger, { token: 't', fetch: completion(post.luna_reply) });
  take('post-publish');
  return new Types.ObjectId(job!.data.postCheckId);
}

const shopNamed = (handle: string) => Shop.findOne({ handle }).lean();

beforeAll(async () => {
  await syncAllIndexes();
});
beforeEach(() => {
  resetQueues();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('publishPostCheck', () => {
  it('clear post: creates the shop and publishes with autoPublished true', async () => {
    useFetch([found, cdn]);
    const id = await classified(botik, await source());
    await publishPostCheck(id);

    const shop = await shopNamed('botik_jimbo');
    expect(shop).toMatchObject({ autoCreated: true, status: 'warning', statusManual: false });
    expect(shop?.categoryIds).toHaveLength(1);
    const reviews = await Review.find().lean();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      shopId: shop!._id,
      status: 'published',
      autoPublished: true,
      direction: 'negative',
      outcome: 'other_problem',
      summary: botik.luna_reply.summary,
      postShortcode: botik.code,
      postUrl: expect.stringContaining(botik.code),
      paidPartnership: false,
      caption: botik.caption.text,
    });
    expect(reviews[0]!.publishedAt).toBeInstanceOf(Date);
    const check = await PostCheck.findById(id).lean();
    expect(check).toMatchObject({ status: 'published', reasons: [] });
    expect(check?.shopIds.map(String)).toEqual([String(shop!._id)]);
    expect(check?.reviewIds.map(String)).toEqual([String(reviews[0]!._id)]);
    expect(await JobRun.findOne({ type: 'post_publish' }).lean()).toMatchObject({ counts: { published: 1 } });
  });

  it('crop_shoop: needs_person with reasons, no shop, adds wishlist demand', async () => {
    const f = useFetch([]);
    const id = await classified(cropShoop, await source());
    await publishPostCheck(id);

    const check = await PostCheck.findById(id).lean();
    expect(check?.status).toBe('needs_person');
    expect(check?.reasons).toEqual(expect.arrayContaining(['low_confidence', 'no_evidence', 'outcome_none']));
    expect(await Shop.countDocuments()).toBe(0);
    expect(await Review.countDocuments()).toBe(0);
    expect(await Wishlist.findOne({ handle: 'crop_shoop' }).lean()).toMatchObject({ requestCount: 1, sources: ['reviewer_post'], status: 'open' });
    expect(f).not.toHaveBeenCalled();
    expect(await JobRun.findOne({ type: 'post_publish' }).lean()).toMatchObject({ counts: { held: 1 } });
  });

  it('a low-confidence post is held, however complete the rest of it is', async () => {
    useFetch([]);
    const id = await classified(siamak, await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['low_confidence'] });
    expect(await Review.countDocuments()).toBe(0);
  });

  it('vebo.ir scam, profile found: published as scam_reported, tag scammer, serious_warning', async () => {
    useFetch([found, cdn]);
    const id = await classified(vebo, await source());
    await publishPostCheck(id);

    const shop = await shopNamed('vebo.ir');
    expect(shop).toMatchObject({ status: 'serious_warning', tags: ['scammer'], statusManual: false });
    expect(await Review.findOne().lean()).toMatchObject({ status: 'published', outcome: 'scam_reported', direction: 'negative', autoPublished: true });
    expect((await PostCheck.findById(id).lean())?.status).toBe('published');
    // The police accounts tagged on the post stay out of it.
    expect(await Shop.countDocuments()).toBe(1);
    expect(await Wishlist.countDocuments()).toBe(0);
  });

  it('vebo.ir scam, profile not found: needs_person with profile_not_found', async () => {
    useFetch([notFound]);
    const id = await classified(vebo, await source());
    await publishPostCheck(id);

    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['profile_not_found'] });
    expect(await Shop.countDocuments()).toBe(0);
    expect(await Review.countDocuments()).toBe(0);
    expect((await Wishlist.find().lean()).map((w) => [w.handle, w.requestCount])).toEqual([['vebo.ir', 1]]);
  });

  it('a scam claim on a shop with a manual status still ends in serious_warning, and the tag is added once', async () => {
    useFetch([]);
    const { imageId } = await saveShopImage(png('x'));
    await createShop({ handle: 'vebo.ir', displayName: 'Vebo', profileImageId: imageId, status: 'recommended', tags: ['old'] });
    const from = await source();
    await publishPostCheck(await classified(vebo, from));
    await publishPostCheck(await classified(about(vebo, 'vebo.ir', 'SCAM2'), from));

    expect(await shopNamed('vebo.ir')).toMatchObject({ status: 'serious_warning', statusManual: true, tags: ['old', 'scammer'] });
    expect(await Review.countDocuments({ status: 'published' })).toBe(2);
  });

  it('negative review sets warning, then a positive one sets mixed', async () => {
    useFetch([found, cdn]);
    const from = await source();
    await publishPostCheck(await classified(botik, from));
    expect((await shopNamed('botik_jimbo'))?.status).toBe('warning');
    await publishPostCheck(await classified(about(ananas, 'botik_jimbo', 'POS1'), from));
    expect((await shopNamed('botik_jimbo'))?.status).toBe('mixed');
  });

  it('two posts about one new shop: one shop, two reviews', async () => {
    const f = useFetch([found, cdn]);
    const from = await source();
    await publishPostCheck(await classified(setShoe, from));
    await publishPostCheck(await classified(about(setShoe, 'set_shoe', 'SHOE2'), from));

    expect(await Shop.countDocuments()).toBe(1);
    expect(await Review.countDocuments({ status: 'published' })).toBe(2);
    expect(dataCalls(f)).toHaveLength(1);
  });

  it('running the job twice: one review', async () => {
    useFetch([found, cdn]);
    const id = await classified(botik, await source());
    await publishPostCheck(id);
    await publishPostCheck(id);
    expect(await Review.countDocuments()).toBe(1);
    expect(await Shop.countDocuments()).toBe(1);
    expect(await JobRun.countDocuments({ type: 'post_publish' })).toBe(1);
  });

  it('shop created, crash before review: retry reuses the shop with no Data API call', async () => {
    useFetch([found, cdn]);
    const id = await classified(botik, await source());
    vi.spyOn(Review, 'create').mockRejectedValueOnce(new Error('crash'));
    await expect(publishPostCheck(id)).rejects.toThrow('crash');
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'classified', lastError: 'crash' });
    expect(await Shop.countDocuments()).toBe(1);

    const retry = useFetch([]);
    await publishPostCheck(id);
    expect(dataCalls(retry)).toHaveLength(0);
    expect(await Shop.countDocuments()).toBe(1);
    expect(await Review.countDocuments({ status: 'published' })).toBe(1);
    const check = await PostCheck.findById(id).lean();
    expect(check?.status).toBe('published');
    expect(check?.lastError).toBeUndefined();
  });

  it('review stored, crash before the final save: retry completes the postCheck with that review', async () => {
    useFetch([found, cdn]);
    const id = await classified(botik, await source());
    vi.spyOn(PostCheck, 'updateOne').mockRejectedValueOnce(new Error('crash'));
    await expect(publishPostCheck(id)).rejects.toThrow('crash');
    expect((await PostCheck.findById(id).lean())?.status).toBe('classified');
    const review = await Review.findOne().lean();

    await publishPostCheck(id);
    const check = await PostCheck.findById(id).lean();
    expect(check?.status).toBe('published');
    expect(check?.reviewIds.map(String)).toEqual([String(review!._id)]);
    expect(await Review.countDocuments()).toBe(1);
  });

  it('review stored, crash before the tag: retry still tags the shop and sets serious_warning', async () => {
    useFetch([found, cdn]);
    const id = await classified(vebo, await source());
    // Creating the shop doesn't load it by id, so the first load is the tag's.
    vi.spyOn(Shop, 'findById').mockImplementationOnce((() => ({ lean: () => Promise.reject(new Error('crash')) })) as never);
    await expect(publishPostCheck(id)).rejects.toThrow('crash');
    expect(await Review.countDocuments()).toBe(1);
    expect((await shopNamed('vebo.ir'))?.tags).toEqual([]);

    await publishPostCheck(id);
    expect(await shopNamed('vebo.ir')).toMatchObject({ status: 'serious_warning', tags: ['scammer'] });
    expect((await PostCheck.findById(id).lean())?.status).toBe('published');
  });

  it('a temporary Data API error leaves status classified and rethrows', async () => {
    useFetch([[/./, () => json({ success: false }, 503)]]);
    const id = await classified(botik, await source());
    const err = await publishPostCheck(id).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(UnrecoverableError);
    const check = await PostCheck.findById(id).lean();
    expect(check?.status).toBe('classified');
    expect(check?.lastError).toBeTruthy();
    expect(await Review.countDocuments()).toBe(0);
    expect(await Wishlist.countDocuments()).toBe(0);
  });

  it('a final Data API error stops the retries and leaves status classified with lastError', async () => {
    useFetch([[/./, () => json({ success: false }, 401)]]);
    const id = await classified(botik, await source());
    await expect(publishPostCheck(id)).rejects.toBeInstanceOf(UnrecoverableError);
    const check = await PostCheck.findById(id).lean();
    expect(check?.status).toBe('classified');
    expect(check?.lastError).toContain('401');
  });

  it('a post with no shop: needs_person with no_shop', async () => {
    useFetch([]);
    const noShop = { ...ananas, luna_reply: { ...ananas.luna_reply, shops: [] } };
    const id = await classified(noShop, await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['no_shop'] });
    expect(await Wishlist.countDocuments()).toBe(0);
  });

  it('a post that is not a review is kept for a person', async () => {
    useFetch([]);
    const id = await classified({ ...botik, luna_reply: { ...botik.luna_reply, is_review: false } }, await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['not_review'] });
    expect(await Review.countDocuments()).toBe(0);
  });

  it('several reviewed shops: held, with demand for each valid one', async () => {
    useFetch([]);
    const two = {
      ...ananas,
      caption: { text: `${ananas.caption.text} @first.shop @second.shop` },
      luna_reply: {
        ...ananas.luna_reply,
        shops: [
          { handle: 'first.shop', role: 'reviewed_shop' },
          { handle: '@Second.Shop', role: 'reviewed_shop' },
          { handle: 'not a handle!', role: 'reviewed_shop' },
          { handle: 'policefata_faraja', role: 'other' },
        ],
      },
    };
    const id = await classified(two, await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['several_shops'] });
    expect((await Wishlist.find().lean()).map((w) => w.handle).sort()).toEqual(['first.shop', 'second.shop']);
  });

  it('the source page itself is never a shop or wishlist entry', async () => {
    useFetch([]);
    const id = await classified(about(ananas, 'nulbox', 'SELF1'), await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['ignored_handle'] });
    expect(await Shop.countDocuments()).toBe(0);
    expect(await Wishlist.countDocuments()).toBe(0);
  });

  it('a handle in IgnoredHandle or REVIEW_IGNORE_HANDLES is held with no wishlist entry', async () => {
    useFetch([]);
    await IgnoredHandle.create({ handle: 'not.a.shop' });
    env.REVIEW_IGNORE_HANDLES.push('a.sponsor');
    try {
      const from = await source();
      for (const handle of ['not.a.shop', 'a.sponsor']) {
        const id = await classified(about(ananas, handle, `IGN${handle.length}`), from);
        await publishPostCheck(id);
        expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['ignored_handle'] });
      }
      expect(await Wishlist.countDocuments()).toBe(0);
    } finally {
      env.REVIEW_IGNORE_HANDLES.pop();
    }
  });

  it('a handle the model made up is held with no wishlist entry', async () => {
    useFetch([]);
    const invented = { ...ananas, luna_reply: { ...ananas.luna_reply, shops: [{ handle: 'made.up.shop', role: 'reviewed_shop' }] } };
    const id = await classified(invented, await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['handle_not_in_post'] });
    expect(await Wishlist.countDocuments()).toBe(0);
  });

  it('a held post about a shop we know adds no wishlist entry', async () => {
    useFetch([]);
    const { imageId } = await saveShopImage(png('x'));
    await createShop({ handle: 'crop_shoop', displayName: 'Crop', profileImageId: imageId });
    const id = await classified(cropShoop, await source());
    await publishPostCheck(id);
    expect((await PostCheck.findById(id).lean())?.status).toBe('needs_person');
    expect(await Wishlist.countDocuments()).toBe(0);
  });

  it('a source that stopped being trusted publishes nothing', async () => {
    const f = useFetch([]);
    const from = await source();
    const id = await classified(botik, from);
    await ReviewerSource.updateOne({ _id: from._id }, { trusted: false });
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['source_not_trusted'] });
    expect(await Review.countDocuments()).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it('a dismissed handle holds and still counts as demand', async () => {
    useFetch([]);
    const entry = await addRequest('botik_jimbo', 'dm');
    await Wishlist.updateOne({ _id: entry._id }, { status: 'dismissed' });
    const id = await classified(botik, await source());
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['dismissed_handle'] });
    expect(await Wishlist.findById(entry._id).lean()).toMatchObject({ requestCount: 2, status: 'dismissed' });
  });

  it("another page's pending review of the same post stays with the admin: held, no tag", async () => {
    useFetch([]);
    const { imageId } = await saveShopImage(png('x'));
    const shop = await createShop({ handle: 'vebo.ir', displayName: 'Vebo', profileImageId: imageId });
    const from = await source();
    const id = await classified(vebo, from);
    await Review.create({
      shopId: shop._id,
      reviewerSourceId: new Types.ObjectId(),
      postShortcode: vebo.code,
      postUrl: `https://www.instagram.com/p/${vebo.code}/`,
      occurredAt: new Date(),
    });
    await publishPostCheck(id);
    expect(await PostCheck.findById(id).lean()).toMatchObject({ status: 'needs_person', reasons: ['review_pending'] });
    expect(await Review.find().lean()).toMatchObject([{ status: 'pending' }]);
    expect(await shopNamed('vebo.ir')).toMatchObject({ tags: [], status: 'no_known_issues' });
  });

  it('a duplicate published by another trusted page completes the postCheck with that review', async () => {
    useFetch([found, cdn]);
    const id = await classified(botik, await source());
    await publishPostCheck(id);
    const review = await Review.findOne().lean();
    const other = (await ReviewerSource.create({ handle: 'other.page', name: 'Other', trusted: true })).toObject();
    const second = await classified(botik, other);
    await publishPostCheck(second);
    const check = await PostCheck.findById(second).lean();
    expect(check?.status).toBe('published');
    expect(check?.reviewIds.map(String)).toEqual([String(review!._id)]);
    expect(await Review.countDocuments()).toBe(1);
  });

  it('a postCheck someone already decided is left alone', async () => {
    const f = useFetch([]);
    const id = await classified(botik, await source());
    await PostCheck.updateOne({ _id: id }, { status: 'dismissed' });
    await publishPostCheck(id);
    expect((await PostCheck.findById(id).lean())?.status).toBe('dismissed');
    expect(await Review.countDocuments()).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it('a missing postCheck fails for good', async () => {
    await expect(publishPostCheck(new Types.ObjectId())).rejects.toBeInstanceOf(UnrecoverableError);
  });
});

describe('publishReview', () => {
  it('returns the new id, then null on a duplicate', async () => {
    useFetch([]);
    const { imageId } = await saveShopImage(png('x'));
    const shop = await createShop({ handle: 'botik_jimbo', displayName: 'Botik', profileImageId: imageId });
    const id = await classified(botik, await source());
    const check = (await PostCheck.findById(id).lean())!;
    const input = { shopId: shop._id, outcome: 'other_problem', direction: 'negative', summary: ' یک خط ', autoPublished: false, scamClaim: false } as const;

    const first = await publishReview(check, input);
    expect(first).toBeInstanceOf(Types.ObjectId);
    expect(await Review.findById(first).lean()).toMatchObject({ summary: 'یک خط', autoPublished: false, status: 'published' });
    expect(await publishReview(check, input)).toBeNull();
    expect(await Review.countDocuments()).toBe(1);
  });
});

describe('post-publish worker', () => {
  it('is registered, one job at a time', () => {
    expect(postPublishWorker).toMatchObject({ queue: QUEUES.postPublish, options: { concurrency: 1 } });
    expect(workerDefinitions).toContain(postPublishWorker);
  });

  it('the processor publishes the job, and rejects a bad id', async () => {
    useFetch([found, cdn]);
    const id = await classified(botik, await source());
    await postPublishWorker.processor({ data: { postCheckId: String(id) } } as never, logger);
    expect((await PostCheck.findById(id).lean())?.status).toBe('published');
    await expect(postPublishWorker.processor({ data: { postCheckId: 'nope' } } as never, logger)).rejects.toThrow();
  });
});
