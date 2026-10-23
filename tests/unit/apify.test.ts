import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ApifyError, getUsage, runActor, startRun, waitForRun } from '../../src/apify/client.js';
import { canRun } from '../../src/apify/budget.js';
import { mapProfile, type ProfileItem } from '../../src/apify/profile.js';
import { DownloadError, downloadImage } from '../../src/lib/download.js';
import { apifyRoutes, fakeFetch, json } from '../setup/fakeFetch.js';

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/apify/profile.docs-sample.json', import.meta.url), 'utf8'),
) as ProfileItem[];

describe('apify client', () => {
  it('starts a run with the token in the header only', async () => {
    const f = fakeFetch(apifyRoutes([]));
    await startRun('apify~instagram-profile-scraper', { usernames: ['x'] }, { fetch: f, token: 'tok' });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs');
    expect(String(url)).not.toContain('tok');
    expect(init).toMatchObject({ method: 'POST', body: '{"usernames":["x"]}', headers: { Authorization: 'Bearer tok' } });
  });

  it('polls until the run ends and reads the dataset', async () => {
    let polls = 0;
    const f = fakeFetch([
      [/\/actor-runs\/r1/, () => json({ data: { id: 'r1', status: ++polls < 3 ? 'RUNNING' : 'SUCCEEDED', defaultDatasetId: 'd' } })],
      [/\/acts\//, () => json({ data: { id: 'r1', status: 'READY', defaultDatasetId: 'd' } }, 201)],
      [/\/datasets\/d\/items\?clean=true&format=json$/, () => json([{ a: 1 }])],
    ]);
    const started: string[] = [];
    const { run, items } = await runActor('a~b', {}, { fetch: f, onStart: (r) => started.push(r.id) });
    expect(started).toEqual(['r1']);
    expect(polls).toBe(3);
    expect(run.status).toBe('SUCCEEDED');
    expect(items).toEqual([{ a: 1 }]);
  });

  it('throws a non-retryable error for a failed run, and classifies HTTP errors', async () => {
    const failed = fakeFetch([[/actor-runs/, () => json({ data: { id: 'r', status: 'FAILED', defaultDatasetId: 'd' } })]]);
    await expect(waitForRun('r', { fetch: failed })).rejects.toMatchObject({ message: 'apify run FAILED', retryable: false });

    const e500 = fakeFetch([[/acts/, () => json({ error: { type: 'internal' } }, 500)]]);
    await expect(startRun('a~b', {}, { fetch: e500 })).rejects.toMatchObject({ status: 500, retryable: true });
    const e401 = fakeFetch([[/acts/, () => json({ error: { type: 'token-not-valid' } }, 401)]]);
    const err = await startRun('a~b', {}, { fetch: e401 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApifyError);
    expect(err).toMatchObject({ status: 401, retryable: false, message: 'apify 401: token-not-valid' });
    const down = fakeFetch([[/acts/, () => Promise.reject(new Error('ECONNRESET'))]]);
    await expect(startRun('a~b', {}, { fetch: down })).rejects.toMatchObject({ retryable: true });
  });
});

describe('budget guard', () => {
  const at = (usageUsd: number, maxUsd = 5) => ({ fetch: fakeFetch(apifyRoutes([], { usageUsd, maxUsd })) });

  it('reads monthly usage', async () => {
    expect(await getUsage(at(1.25))).toEqual({ monthlyUsageUsd: 1.25, maxMonthlyUsageUsd: 5 });
  });

  it('stops backfills above APIFY_BUDGET_STOP_USD and everything at the hard limit', async () => {
    expect(await canRun('backfill', at(4.5))).toEqual({ ok: true, usageUsd: 4.5 });
    expect(await canRun('backfill', at(4.51))).toEqual({ ok: false, usageUsd: 4.51, reason: 'budget_stop' });
    expect(await canRun('daily', at(4.9))).toEqual({ ok: true, usageUsd: 4.9 });
    expect(await canRun('profile', at(5))).toEqual({ ok: false, usageUsd: 5, reason: 'hard_limit' });
  });
});

describe('mapProfile', () => {
  it('maps the documented output, preferring the HD picture and normalising contact', () => {
    expect(mapProfile(fixture, 'maashmamad')).toEqual({
      username: 'maashmamad',
      fullName: 'Maash Mamad | ماش ممد',
      imageUrl: 'https://scontent-lga3-2.cdninstagram.com/v/t51.2885-19/hd.jpg',
      email: 'hello@maash.ir',
      website: 'https://maash.ir/shop',
      phone: '+989121234567',
    });
  });

  it('leaves out fields the page does not show, and invalid values', () => {
    const p = mapProfile(
      [{ username: 'Shop', externalUrls: [{ url: 'shop.ir' }], businessEmail: 'nope', publicPhoneNumber: '9121234567', publicPhoneCountryCode: '98' }],
      'shop',
    );
    expect(p).toEqual({ username: 'shop', website: 'https://shop.ir/', phone: '+989121234567' });
  });

  it('returns null when the profile is missing or the actor reports an error', () => {
    expect(mapProfile([], 'maashmamad')).toBeNull();
    expect(mapProfile(fixture, 'someone.else')).toBeNull();
    expect(mapProfile([{ username: 'x', error: 'not_found' }], 'x')).toBeNull();
  });
});

describe('downloadImage', () => {
  it('only fetches https Instagram/Facebook CDN URLs', async () => {
    const f = fakeFetch([[/./, () => new Response(Buffer.from('img'))]]);
    for (const url of ['http://scontent.cdninstagram.com/a.jpg', 'https://evil.com/a.jpg', 'https://cdninstagram.com.evil.com/a', 'not a url']) {
      await expect(downloadImage(url, f)).rejects.toBeInstanceOf(DownloadError);
    }
    expect(f).not.toHaveBeenCalled();
    expect(String(await downloadImage('https://scontent.xx.fbcdn.net/a.jpg', f))).toBe('img');
  });

  it('caps the size and fails on HTTP errors', async () => {
    const big = fakeFetch([[/./, () => new Response(Buffer.alloc(2 * 1024 * 1024 + 1))]]);
    await expect(downloadImage('https://a.cdninstagram.com/x.jpg', big)).rejects.toThrow('too_large');
    const gone = fakeFetch([[/./, () => new Response('', { status: 403 })]]);
    await expect(downloadImage('https://a.cdninstagram.com/x.jpg', gone)).rejects.toThrow('http_403');
  });
});
