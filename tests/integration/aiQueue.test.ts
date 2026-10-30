import { readFileSync } from 'node:fs';
import { UnrecoverableError } from 'bullmq';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { fakeFetch, json } from '../setup/fakeFetch.js';
import { fakeQueuesModule, resetQueues, take } from '../setup/fakeQueues.js';

vi.mock('../../src/queues/queues.js', () => fakeQueuesModule());

const { ingestPosts } = await import('../../src/services/reviewerPosts.js');
const { processClassify } = await import('../../src/queues/workers/ai.worker.js');
const { aiJobData } = await import('../../src/queues/jobData.js');
const { logger } = await import('../../src/lib/logger.js');
const models = await import('../../src/models/index.js');

useMongo();

type Post = { code: string; taken_at: number; caption: { text: string }; luna_reply: Record<string, unknown> };
const posts = JSON.parse(readFileSync(new URL('../fixtures/boxapi/trusted-posts.nulbox.json', import.meta.url), 'utf8')) as Post[];
const post = posts.find((p) => p.caption.text.includes('@'))!;

const completion = (content: unknown) => json({ choices: [{ message: { content }, finish_reason: 'stop' }] });
const ai = (reply: () => Response) => ({ token: 't', fetch: fakeFetch([[/chat\/completions$/, reply]]) });

beforeAll(async () => {
  await models.syncAllIndexes();
});
beforeEach(() => resetQueues());

async function source(trusted: boolean) {
  const s = await models.ReviewerSource.create({ handle: 'nulbox', name: 'Nulbox', trusted });
  return s.toObject();
}

describe('trusted intake', () => {
  it('a trusted source stores a postCheck and queues one ai job, and creates no review or wishlist entry', async () => {
    const s = await source(true);
    const counts = await ingestPosts(s, [post], { onlyNewer: false });
    expect(counts).toMatchObject({ postsNew: 1, postsQueued: 1, reviewsCreated: 0 });
    const check = await models.PostCheck.findOne().lean();
    expect(check).toMatchObject({ postShortcode: post.code, status: 'queued' });
    expect(await models.Review.countDocuments()).toBe(0);
    expect(await models.Wishlist.countDocuments()).toBe(0);
    const jobs = take('ai');
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.data).toEqual({ task: 'classify_post', postCheckId: String(check!._id) });
    expect(jobs[0]!.id).toBe(`classify-${check!._id}`);
  });

  it('a non-trusted source still creates pending reviews', async () => {
    const s = await source(false);
    const counts = await ingestPosts(s, [post], { onlyNewer: false });
    expect(counts.reviewsCreated).toBeGreaterThan(0);
    expect(counts.postsQueued).toBe(0);
    expect(await models.PostCheck.countDocuments()).toBe(0);
    expect(take('ai')).toHaveLength(0);
  });

  it('a post seen twice gives one postCheck', async () => {
    const s = await source(true);
    await ingestPosts(s, [post], { onlyNewer: false });
    await ingestPosts(s, [post], { onlyNewer: false });
    expect(await models.PostCheck.countDocuments()).toBe(1);
    expect(take('ai')).toHaveLength(1);
  });

  it('a post that already has a review is skipped', async () => {
    const s = await source(false);
    await ingestPosts(s, [post], { onlyNewer: false });
    const counts = await ingestPosts({ ...s, trusted: true }, [post], { onlyNewer: false });
    expect(counts.postsQueued).toBe(0);
    expect(await models.PostCheck.countDocuments()).toBe(0);
  });

  it('a post with no tags still gets a postCheck', async () => {
    const s = await source(true);
    const bare = { code: 'BARE1', taken_at: 1784633924, caption: { text: 'no tags here' } };
    await ingestPosts(s, [bare], { onlyNewer: false });
    expect(await models.PostCheck.findOne({ postShortcode: 'BARE1' }).lean()).toMatchObject({ tagged: [], status: 'queued' });
    expect(take('ai')).toHaveLength(1);
  });
});

describe('classify job', () => {
  async function queued() {
    const s = await source(true);
    await ingestPosts(s, [post], { onlyNewer: false });
    const [job] = take('ai');
    return { job: aiJobData.parse(job!.data) as Extract<ReturnType<typeof aiJobData.parse>, { task: 'classify_post' }>, id: job!.data.postCheckId };
  }

  it('classify saves the analysis, sets classified and queues post-publish', async () => {
    const { job, id } = await queued();
    await processClassify(job, logger, ai(() => completion(JSON.stringify(post.luna_reply))));
    const check = await models.PostCheck.findById(id).lean();
    expect(check?.status).toBe('classified');
    expect(check?.analysis).toMatchObject({ confidence: expect.any(Number), model: expect.any(String) });
    const publish = take('post-publish');
    expect(publish).toHaveLength(1);
    expect(publish[0]!.id).toBe(`publish-${id}`);
    expect(await models.JobRun.findOne({ type: 'ai_classify' }).lean()).toMatchObject({ counts: { classified: 1 } });
  });

  it('a final BoxApiError keeps status queued and saves lastError', async () => {
    const { job, id } = await queued();
    const bad = ai(() => json({ error: { message: 'bad key' } }, 401));
    await expect(processClassify(job, logger, bad)).rejects.toBeInstanceOf(UnrecoverableError);
    const check = await models.PostCheck.findById(id).lean();
    expect(check?.status).toBe('queued');
    expect(check?.lastError).toContain('401');
    expect(take('post-publish')).toHaveLength(0);
  });

  it('a temporary error rethrows so BullMQ retries', async () => {
    const { job, id } = await queued();
    const down = ai(() => json({ error: { message: 'overloaded' } }, 503));
    const err = await processClassify(job, logger, down).catch((e) => e);
    expect(err).not.toBeInstanceOf(UnrecoverableError);
    expect(err).toMatchObject({ name: 'BoxApiError', retryable: true });
    expect((await models.PostCheck.findById(id).lean())?.status).toBe('queued');
  });
});
