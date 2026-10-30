import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';
import { createAdminAccount } from '../../src/auth/login.js';
import { totpCode } from '../../src/auth/totp.js';

// These tests are about access, not queues. Real ones would connect to Redis, and with no Redis running the rejected
// connection can land as an unhandled rejection that fails the whole run with every test green.
vi.mock('../../src/queues/queues.js', async () => ({ ...(await import('../setup/fakeQueues.js')).fakeQueuesModule(), allQueues: () => [] }));

useMongo();

const PW = 'a-long-enough-password';

describe('/admin/queues (Bull Board)', () => {
  it('redirects a signed-out browser to the login page and gives API calls a 401', async () => {
    const app = createApp();
    const page = await request(app).get('/admin/queues').set('Accept', 'text/html');
    expect(page.status).toBe(302);
    expect(page.headers.location).toBe('/admin/login');
    const api = await request(app).get('/admin/queues/api/queues').set('Accept', 'application/json');
    expect(api.status).toBe(401);
  });

  it('serves the dashboard to a signed-in admin and blocks cross-origin writes', async () => {
    const { totpSecret } = await createAdminAccount('founder', PW);
    const agent = request.agent(createApp());
    await agent
      .post('/admin/api/auth/login')
      .send({ username: 'founder', password: PW, code: totpCode(totpSecret, Math.floor(Date.now() / 1000)) })
      .expect(200);

    const page = await agent.get('/admin/queues').set('Accept', 'text/html');
    expect(page.status).toBe(200);
    expect(page.text).toMatch(/<html/i);

    const write = await agent.put('/admin/queues/api/queues/dm-inbound/retry/failed').set('Origin', 'https://evil.example');
    expect(write.status).toBe(403);
    const fetchSite = await agent.put('/admin/queues/api/queues/dm-inbound/retry/failed').set('Sec-Fetch-Site', 'cross-site');
    expect(fetchSite.status).toBe(403);
  });
});
