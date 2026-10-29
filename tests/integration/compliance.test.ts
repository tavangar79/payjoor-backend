import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { DeletionRequest, DmEvent } from '../../src/models/index.js';
import { getDeletionStatus, hashIgsid, requestDeletion } from '../../src/services/deletion.js';
import { createLandingRouter, fillTemplate } from '../../src/routes/landing.js';

useMongo();

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
    expect(res.text).toContain('<main>/en/privacy {"contactEmail":"test@example.com"}</main>');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect((await request(a).get('/fa/terms')).text).toContain('dir="rtl"');
    expect((await request(a).get('/en/nope')).status).toBe(404);
  });

  it('passes the deletion status to the status page', async () => {
    const { code } = await requestDeletion('999');
    const a = app(fakeWebDist());
    const res = await request(a).get(`/en/data-deletion/status?code=${code}`);
    expect(res.text).toContain('"deletionStatus":"done"');
    expect(res.text).toContain('<script id="ssr-data" type="application/json">{"contactEmail":"test@example.com","deletionStatus":"done"}</script>');
    expect(res.headers['cache-control']).toBe('no-store');
    expect((await request(a).get('/en/data-deletion/status?code=nope')).text).toContain('"deletionStatus":null');
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
