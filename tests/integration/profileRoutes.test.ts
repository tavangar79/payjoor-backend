import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';

type FakeJob = { id: string; data: unknown; state: string; returnvalue?: unknown; failedReason?: string };
const jobs = new Map<string, FakeJob>();
const queue = {
  add: vi.fn(async (_name: string, data: unknown) => {
    const job = { id: String(jobs.size + 1), data, state: 'waiting' };
    jobs.set(job.id, job);
    return job;
  }),
  getJob: vi.fn(async (id: string) => {
    const job = jobs.get(id);
    return job && { ...job, getState: async () => job.state };
  }),
};
vi.mock('../../src/queues/queues.js', () => ({ getQueue: vi.fn(() => queue) }));

const { createApp } = await import('../../src/app.js');
const { createAdminAccount } = await import('../../src/auth/login.js');
const { totpCode } = await import('../../src/auth/totp.js');
const { syncAllIndexes } = await import('../../src/models/index.js');
const { createShop, saveShopImage } = await import('../../src/services/shops.js');

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

async function admin() {
  const { totpSecret } = await createAdminAccount('founder', 'a-long-enough-password');
  const agent = request.agent(createApp());
  const res = await agent
    .post('/admin/api/auth/login')
    .send({ username: 'founder', password: 'a-long-enough-password', code: totpCode(totpSecret, Math.floor(Date.now() / 1000)) });
  return { agent, csrf: res.body.csrfToken as string };
}

describe('profile fetch routes', () => {
  it('enqueues a preview for a normalised handle and reports the job state', async () => {
    const { agent, csrf } = await admin();
    const res = await agent.post('/admin/api/shops/profile-preview').set('X-CSRF-Token', csrf).send({ handle: '@MaashMamad/' });
    expect(res.status).toBe(202);
    const jobId = res.body.jobId as string;
    expect(jobs.get(jobId)?.data).toEqual({ handle: 'maashmamad' });

    expect((await agent.get(`/admin/api/shops/profile-jobs/${jobId}`)).body).toEqual({ state: 'waiting' });
    Object.assign(jobs.get(jobId)!, { state: 'completed', returnvalue: { handle: 'maashmamad' } });
    expect((await agent.get(`/admin/api/shops/profile-jobs/${jobId}`)).body).toEqual({ state: 'completed', result: { handle: 'maashmamad' } });
    Object.assign(jobs.get(jobId)!, { state: 'failed', failedReason: 'profile_not_found' });
    expect((await agent.get(`/admin/api/shops/profile-jobs/${jobId}`)).body).toEqual({ state: 'failed', error: 'profile_not_found' });
    expect((await agent.get('/admin/api/shops/profile-jobs/999')).status).toBe(404);

    const bad = await agent.post('/admin/api/shops/profile-preview').set('X-CSRF-Token', csrf).send({ handle: 'not a handle' });
    expect(bad).toMatchObject({ status: 400, body: { error: 'invalid_handle' } });
    expect((await agent.post('/admin/api/shops/profile-preview').send({ handle: 'x' })).status).toBe(403);
  });

  it('enqueues a refresh for an existing shop', async () => {
    const { agent, csrf } = await admin();
    const image = await saveShopImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]));
    const shop = await createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: image.imageId });
    const res = await agent.post(`/admin/api/shops/${shop._id}/refresh-profile`).set('X-CSRF-Token', csrf);
    expect(res.status).toBe(202);
    expect(jobs.get(res.body.jobId)?.data).toEqual({ handle: 'maashmamad', shopId: String(shop._id) });
    expect((await agent.post('/admin/api/shops/000000000000000000000000/refresh-profile').set('X-CSRF-Token', csrf)).status).toBe(404);
  });

  it('accepts profileFetchedAt from the draft when creating a shop', async () => {
    const { agent, csrf } = await admin();
    const image = await saveShopImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('y')]));
    const res = await agent
      .post('/admin/api/shops')
      .set('X-CSRF-Token', csrf)
      .send({ handle: 'kif', displayName: 'Kif', profileImageId: String(image.imageId), profileFetchedAt: '2026-10-23T10:00:00.000Z' });
    expect(res.status).toBe(201);
    expect(res.body.profileFetchedAt).toBe('2026-10-23T10:00:00.000Z');
  });
});
