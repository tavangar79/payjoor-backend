import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';
import { createAdminAccount } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';
import { syncAllIndexes } from '../../src/models/index.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-body')]);

async function admin() {
  const { totpSecret } = await createAdminAccount('founder', 'a-long-enough-password');
  const agent = request.agent(createApp());
  const res = await agent
    .post('/admin/api/auth/login')
    .send({ username: 'founder', password: 'a-long-enough-password', code: totpCode(totpSecret, Math.floor(Date.now() / 1000)) });
  return { agent, csrf: res.body.csrfToken as string };
}

describe('admin categories API', () => {
  it('creates, lists with counts, renames and deletes', async () => {
    const { agent, csrf } = await admin();
    const created = await agent.post('/admin/api/categories').set('X-CSRF-Token', csrf).send({ name: 'پوشاک', nameEn: 'Clothing' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'پوشاک', slug: 'clothing' });
    const dup = await agent.post('/admin/api/categories').set('X-CSRF-Token', csrf).send({ name: 'پوشاك' });
    expect(dup).toMatchObject({ status: 409, body: { error: 'category_exists' } });
    expect((await agent.post('/admin/api/categories').set('X-CSRF-Token', csrf).send({})).status).toBe(400);

    const list = await agent.get('/admin/api/categories');
    expect(list.body.items).toMatchObject([{ name: 'پوشاک', shopCount: 0 }]);

    const id = created.body._id;
    const renamed = await agent.patch(`/admin/api/categories/${id}`).set('X-CSRF-Token', csrf).send({ name: 'لباس' });
    expect(renamed.body).toMatchObject({ name: 'لباس', slug: 'clothing' });
    expect((await agent.patch(`/admin/api/categories/${id}`).set('X-CSRF-Token', csrf).send({})).status).toBe(400);
    expect((await agent.delete(`/admin/api/categories/${id}`).set('X-CSRF-Token', csrf)).status).toBe(204);
    expect((await agent.delete('/admin/api/categories/bad-id').set('X-CSRF-Token', csrf)).status).toBe(404);
  });
});

describe('admin shops API and media', () => {
  it('uploads an image, creates, reads, updates and lists a shop', async () => {
    const { agent, csrf } = await admin();
    const upload = await agent
      .post('/admin/api/shops/images')
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/octet-stream')
      .send(PNG);
    expect(upload.status).toBe(201);
    expect(upload.body).toMatchObject({ mime: 'image/png', url: `/media/shop/${upload.body.sha256}` });

    const cat = await agent.post('/admin/api/categories').set('X-CSRF-Token', csrf).send({ name: 'پوشاک' });
    const created = await agent
      .post('/admin/api/shops')
      .set('X-CSRF-Token', csrf)
      .send({
        handle: '@MaashMamad',
        displayName: 'Maash Mamad',
        profileImageId: upload.body.imageId,
        categoryIds: [cat.body._id],
        contact: { phone: '09121234567' },
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ handle: 'maashmamad', contact: { phone: '+989121234567' } });
    const id = created.body._id;

    expect((await agent.get(`/admin/api/shops/${id}`)).body.displayName).toBe('Maash Mamad');
    expect((await agent.get('/admin/api/shops/000000000000000000000000')).status).toBe(404);

    const updated = await agent.patch(`/admin/api/shops/${id}`).set('X-CSRF-Token', csrf).send({ status: 'recommended' });
    expect(updated.body.status).toBe('recommended');
    expect((await agent.patch(`/admin/api/shops/${id}`).set('X-CSRF-Token', csrf).send({ slug: 'x' })).status).toBe(400);

    const list = await agent.get('/admin/api/shops?q=maash&limit=5');
    expect(list.body).toMatchObject({ total: 1, page: 1, limit: 5, items: [{ handle: 'maashmamad' }] });
    expect((await agent.get('/admin/api/categories')).body.items[0].shopCount).toBe(1);

    const dup = await agent
      .post('/admin/api/shops')
      .set('X-CSRF-Token', csrf)
      .send({ handle: 'maashmamad', displayName: 'Again', profileImageId: upload.body.imageId });
    expect(dup).toMatchObject({ status: 409, body: { error: 'handle_in_use' } });
  });

  it('rejects non-image and oversized uploads, and uploads without CSRF', async () => {
    const { agent, csrf } = await admin();
    const bad = await agent.post('/admin/api/shops/images').set('X-CSRF-Token', csrf).set('Content-Type', 'image/png').send(Buffer.from('<svg/>'));
    expect(bad).toMatchObject({ status: 400, body: { error: 'image_unsupported_type' } });
    const big = await agent
      .post('/admin/api/shops/images')
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'image/png')
      .send(Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]));
    expect(big.status).toBe(413);
    expect((await agent.post('/admin/api/shops/images').set('Content-Type', 'image/png').send(PNG)).status).toBe(403);
  });

  it('serves images by hash with nosniff and immutable caching', async () => {
    const { agent, csrf } = await admin();
    const upload = await agent.post('/admin/api/shops/images').set('X-CSRF-Token', csrf).set('Content-Type', 'image/png').send(PNG);
    const app = createApp();
    const res = await request(app).get(upload.body.url).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0);

    const cached = await request(app).get(upload.body.url).set('If-None-Match', `"${upload.body.sha256}"`);
    expect(cached.status).toBe(304);
    expect((await request(app).get(`/media/shop/${'0'.repeat(64)}`)).status).toBe(404);
    expect((await request(app).get('/media/shop/nope')).status).toBe(404);
  });
});
