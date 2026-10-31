import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { createAdminAccount } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';
import { Admin } from '../../src/models/Admin.js';
import { REDACT_PATHS } from '../../src/lib/logger.js';

useMongo();

const TOKEN = 't'.repeat(32);
const PW = 'a-long-enough-password';
const body = { username: 'Founder', password: PW };
const now = () => Math.floor(Date.now() / 1000);

function setup(token?: string) {
  const req = request(createApp()).post('/admin/api/auth/setup');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

describe('POST /admin/api/auth/setup', () => {
  beforeEach(() => {
    env.ADMIN_SETUP_TOKEN = TOKEN;
  });
  afterEach(() => {
    env.ADMIN_SETUP_TOKEN = undefined;
  });

  it('creates the first admin, who can then log in with the returned secret', async () => {
    const res = await setup(TOKEN).send(body);
    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.otpauthUrl).toMatch(/^otpauth:\/\//);

    const login = await request(createApp())
      .post('/admin/api/auth/login')
      .send({ username: 'founder', password: PW, code: totpCode(res.body.totpSecret, now()) });
    expect(login.status).toBe(200);
    expect(login.body.admin).toMatchObject({ username: 'founder', role: 'owner' });
  });

  it('looks like any unknown route without the right token, and creates nothing', async () => {
    const unknown = await request(createApp()).post('/admin/api/nope').send(body);
    for (const res of [await setup().send(body), await setup('w'.repeat(32)).send(body), await setup('short').send(body)]) {
      expect(res.status).toBe(unknown.status);
      expect(res.body).toEqual(unknown.body);
    }
    expect(await Admin.countDocuments()).toBe(0);
  });

  it('stays off when the token is unset or empty, even if one is sent', async () => {
    for (const value of [undefined, '']) {
      env.ADMIN_SETUP_TOKEN = value;
      expect((await setup('').send(body)).status).toBe(401);
      expect((await setup(TOKEN).send(body)).status).toBe(401);
    }
    expect(await Admin.countDocuments()).toBe(0);
  });

  it('refuses once any admin exists', async () => {
    await createAdminAccount('existing', PW);
    const res = await setup(TOKEN).send(body);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'admin_exists' });
    expect(await Admin.countDocuments()).toBe(1);
  });

  it('rejects a short password', async () => {
    const res = await setup(TOKEN).send({ username: 'founder', password: 'too-short' });
    expect(res.status).toBe(400);
    expect(await Admin.countDocuments()).toBe(0);
  });

  it('keeps the token out of the request logs', () => {
    expect(REDACT_PATHS).toContain('req.headers.authorization');
  });
});
