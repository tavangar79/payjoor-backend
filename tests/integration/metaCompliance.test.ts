import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';
import { parseSignedRequest, signRequest } from '../../src/meta/signedRequest.js';
import { DeletionRequest, DmEvent, JobRun, MetaToken } from '../../src/models/index.js';
import { getDeletionStatus, hashIgsid, requestDeletion } from '../../src/services/deletion.js';
import { createLandingRouter, fillTemplate } from '../../src/routes/landing.js';
import { tokenRefreshWorker } from '../../src/queues/workers/tokenRefresh.worker.js';
import { env } from '../../src/config/env.js';
import { logger } from '../../src/lib/logger.js';

useMongo();

describe('signed_request', () => {
  it('verifies the HMAC and the algorithm', () => {
    const sr = signRequest({ algorithm: 'HMAC-SHA256', user_id: '1000000000000001', issued_at: 1761200000 }, 'secret');
    expect(parseSignedRequest(sr, 'secret')).toMatchObject({ user_id: '1000000000000001', issued_at: 1761200000 });
    expect(parseSignedRequest(sr, 'other')).toBeNull();
    const [sig, body] = sr.split('.');
    const tampered = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '2' })).toString('base64url');
    expect(parseSignedRequest(`${sig}.${tampered}`, 'secret')).toBeNull();
    expect(parseSignedRequest(signRequest({ algorithm: 'none', user_id: '1' }, 'secret'), 'secret')).toBeNull();
    expect(parseSignedRequest(signRequest({ algorithm: 'HMAC-SHA256' }, 'secret'), 'secret')).toBeNull();
    expect(parseSignedRequest(`${sig}`, 'secret')).toBeNull();
    expect(parseSignedRequest(undefined, 'secret')).toBeNull();
    expect(body).toBeTruthy();
  });
});

describe('data deletion', () => {
  const dm = (mid: string, senderIgsid: string) => DmEvent.create({ mid, senderIgsid, kind: 'text', result: 'found' });

  it('deletes only that user\'s DM logs and keeps a hashed status record', async () => {
    await dm('a', '111');
    await dm('b', '111');
    await dm('c', '222');
    const { code, deleted } = await requestDeletion('111');
    expect(deleted).toBe(2);
    expect(await DmEvent.countDocuments()).toBe(1);
    const record = await DeletionRequest.findOne().lean();
    expect(record).toMatchObject({ confirmationCode: code, status: 'done', igsidHash: hashIgsid('111') });
    expect(record?.igsidHash).not.toContain('111');
    expect(await getDeletionStatus(code)).toBe('done');
    expect(await getDeletionStatus('0'.repeat(16))).toBeNull();
    expect(await getDeletionStatus('not-a-code')).toBeNull();
  });

  it('POST /meta/data-deletion returns the status url and code; bad requests get 400', async () => {
    await dm('a', '111');
    const app = createApp();
    const res = await request(app)
      .post('/meta/data-deletion')
      .type('form')
      .send({ signed_request: signRequest({ algorithm: 'HMAC-SHA256', user_id: '111' }) });
    expect(res.status).toBe(200);
    expect(res.body.confirmation_code).toMatch(/^[0-9a-f]{16}$/);
    expect(res.body.url).toBe(`http://localhost:3000/en/data-deletion/status?code=${res.body.confirmation_code}`);
    expect(await DmEvent.countDocuments()).toBe(0);

    const bad = await request(app).post('/meta/data-deletion').type('form').send({ signed_request: signRequest({ algorithm: 'HMAC-SHA256', user_id: '1' }, 'wrong') });
    expect(bad.status).toBe(400);
    expect((await request(app).post('/meta/data-deletion').type('form').send({})).status).toBe(400);
  });

  it('POST /meta/deauthorize answers 200 for a valid request only', async () => {
    const app = createApp();
    const ok = await request(app).post('/meta/deauthorize').type('form').send({ signed_request: signRequest({ algorithm: 'HMAC-SHA256', user_id: '1' }) });
    expect(ok.status).toBe(200);
    expect((await request(app).post('/meta/deauthorize').type('form').send({ signed_request: 'x.y' })).status).toBe(400);
  });
});

describe('token-refresh worker', () => {
  it('records the refresh and fails loudly when it can\'t refresh', async () => {
    const job = { attemptsMade: 2, opts: { attempts: 3 } } as never;
    await expect(tokenRefreshWorker.processor(job, logger)).rejects.toThrow('no_meta_token');
    expect(await JobRun.findOne({ type: 'token_refresh' }).lean()).toMatchObject({ error: expect.stringContaining('no_meta_token') });
    expect(await MetaToken.countDocuments()).toBe(0);
    expect(env.IG_ACCESS_TOKEN).toBeUndefined();
  });
});

describe('landing render', () => {
  function fakeWebDist() {
    const dir = mkdtempSync(path.join(tmpdir(), 'web-dist-'));
    mkdirSync(path.join(dir, 'client/assets'), { recursive: true });
    mkdirSync(path.join(dir, 'server'));
    writeFileSync(
      path.join(dir, 'client/index.html'),
      '<html lang="<!--lang-->" dir="<!--dir-->"><title><!--title--></title><div id="root"><!--app-html--></div><!--ssr-data--></html>',
    );
    writeFileSync(path.join(dir, 'client/assets/app-abc.css'), 'body{}');
    writeFileSync(
      path.join(dir, 'server/entry-server.js'),
      `export function render(url, data = {}) {
        const locale = url.startsWith('/en') ? 'en' : 'fa';
        const known = /^\\/(fa|en)(\\/(privacy|terms|data-deletion(\\/status)?))?\\/?(\\?.*)?$/.test(url);
        return { html: '<main>' + url + ' ' + JSON.stringify(data) + '</main>', lang: locale, dir: locale === 'fa' ? 'rtl' : 'ltr',
          title: 'T & <x>', status: known ? 200 : 404 };
      }`,
    );
    return dir;
  }

  function app(dist: string) {
    const a = express();
    a.use('/', createLandingRouter(dist));
    return a;
  }

  it('redirects / by Accept-Language, default fa', async () => {
    const a = app(fakeWebDist());
    expect((await request(a).get('/')).headers.location).toBe('/fa');
    expect((await request(a).get('/').set('Accept-Language', 'en-US,en;q=0.9')).headers.location).toBe('/en');
    expect((await request(a).get('/').set('Accept-Language', 'fa-IR,en;q=0.5')).headers.location).toBe('/fa');
  });

  it('renders legal pages directly (200, no redirect) with lang, dir and escaped title', async () => {
    const a = app(fakeWebDist());
    const res = await request(a).get('/en/privacy');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="en" dir="ltr">');
    expect(res.text).toContain('<title>T &amp; &lt;x&gt;</title>');
    expect(res.text).toContain('<main>/en/privacy {}</main>');
    expect((await request(a).get('/fa/terms')).text).toContain('dir="rtl"');
    expect((await request(a).get('/en/nope')).status).toBe(404);
  });

  it('passes the deletion status to the status page', async () => {
    const { code } = await requestDeletion('999');
    const a = app(fakeWebDist());
    const res = await request(a).get(`/en/data-deletion/status?code=${code}`);
    expect(res.text).toContain('{"deletionStatus":"done"}');
    expect(res.text).toContain('<script id="ssr-data" type="application/json">{"deletionStatus":"done"}</script>');
    expect(res.headers['cache-control']).toBe('no-store');
    expect((await request(a).get('/en/data-deletion/status?code=nope')).text).toContain('{"deletionStatus":null}');
  });

  it('serves hashed assets with long caching, and says clearly when the build is missing', async () => {
    const a = app(fakeWebDist());
    const css = await request(a).get('/assets/app-abc.css');
    expect(css.status).toBe(200);
    expect(css.headers['cache-control']).toContain('immutable');
    const missing = await request(app(path.join(tmpdir(), 'no-such-web-dist'))).get('/en');
    expect(missing.status).toBe(503);
    expect(missing.text).toContain('npm run build -w web');
  });

  it('keeps </script> in data from closing the tag', () => {
    const html = fillTemplate('<!--ssr-data-->', { html: '', lang: 'en', dir: 'ltr', title: '', status: 200 }, { x: '</script><b>' });
    expect(html).not.toContain('</script><b>');
    expect(html).toContain('\\u003c/script>');
  });
});
