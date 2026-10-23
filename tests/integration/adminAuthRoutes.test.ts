import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';
import { createAdminAccount } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';
import { Admin } from '../../src/models/Admin.js';

useMongo();

const PW = 'a-long-enough-password';
const now = () => Math.floor(Date.now() / 1000);

async function loggedInAgent() {
  const { totpSecret } = await createAdminAccount('founder', PW);
  const agent = request.agent(createApp());
  const res = await agent
    .post('/admin/api/auth/login')
    .send({ username: 'founder', password: PW, code: totpCode(totpSecret, now()) });
  return { agent, res, csrf: res.body.csrfToken as string };
}

describe('admin auth routes', () => {
  it('logs in, sets a strict httpOnly cookie on /admin and returns the admin and a CSRF token', async () => {
    const { res } = await loggedInAgent();
    expect(res.status).toBe(200);
    expect(res.body.admin).toMatchObject({ username: 'founder', role: 'owner' });
    expect(res.body.csrfToken).toEqual(expect.any(String));
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^ps_admin=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/admin/);
  });

  it('gives the same 401 for a bad body, wrong password and unknown user', async () => {
    await createAdminAccount('founder', PW);
    const app = createApp();
    const bodies = [
      { username: 'founder' },
      { username: 'founder', password: 'wrong-password', code: '123456' },
      { username: 'ghost', password: PW, code: '123456' },
    ];
    for (const body of bodies) {
      const res = await request(app).post('/admin/api/auth/login').send(body);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'invalid_credentials' });
    }
  });

  it('/me needs a session and returns the same CSRF token', async () => {
    expect((await request(createApp()).get('/admin/api/auth/me')).status).toBe(401);
    const { agent, csrf } = await loggedInAgent();
    const me = await agent.get('/admin/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ admin: { username: 'founder' }, csrfToken: csrf });
  });

  it('protects other API routes with the session, and writes with CSRF', async () => {
    const app = createApp();
    expect((await request(app).get('/admin/api/shops')).status).toBe(401);
    expect((await request(app).post('/admin/api/shops').send({})).status).toBe(401);
    const { agent, csrf } = await loggedInAgent();
    expect((await agent.post('/admin/api/nope').send({})).status).toBe(403);
    expect((await agent.post('/admin/api/nope').set('X-CSRF-Token', 'wrong').send({})).status).toBe(403);
    expect((await agent.post('/admin/api/nope').set('X-CSRF-Token', csrf).send({})).status).toBe(404);
  });

  it('logout needs CSRF and clears the cookie', async () => {
    const { agent, csrf } = await loggedInAgent();
    expect((await agent.post('/admin/api/auth/logout')).status).toBe(403);
    const out = await agent.post('/admin/api/auth/logout').set('X-CSRF-Token', csrf);
    expect(out.status).toBe(204);
    expect(String(out.headers['set-cookie'])).toMatch(/ps_admin=;/);
    expect((await agent.get('/admin/api/auth/me')).status).toBe(401);
  });

  it('rejects a session whose admin was deleted', async () => {
    const { agent } = await loggedInAgent();
    await Admin.deleteMany({});
    expect((await agent.get('/admin/api/auth/me')).status).toBe(401);
  });
});
