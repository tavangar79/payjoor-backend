import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BoxApiError } from '../../src/boxapi/dm.js';
import { getMediaByShortcode, getQuota, getUserInfo, getUserMedia } from '../../src/boxapi/data.js';
import { extractTagged, isPinned, mediaUrls, postTime, type BoxApiPost } from '../../src/boxapi/posts.js';
import { mapProfile } from '../../src/boxapi/profile.js';
import { DownloadError, downloadImage } from '../../src/lib/download.js';
import { boxapiBody, dataRoute, fakeFetch, json } from '../setup/fakeFetch.js';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/boxapi/${name}`, import.meta.url), 'utf8'));
const media = fixture('user-media.sadegh.delicious.json');
const info = fixture('user-info.maashmamad.json');
const posts = media.response.body.items as BoxApiPost[];

describe('data api client', () => {
  it('POSTs to the Data API with the token in the Authorization header only', async () => {
    const f = fakeFetch([dataRoute('user/get_media_by_username', () => json(media))]);
    const page = await getUserMedia('sadegh.delicious', { fetch: f, token: 'tok', maxId: 'm1' });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe('https://instagram.boxpi.ir/api/instagram/user/get_media_by_username');
    expect(String(url)).not.toContain('tok');
    expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok' } });
    expect(JSON.parse(String(init!.body))).toEqual({ username: 'sadegh.delicious', count: 12, max_id: 'm1' });
    expect(page).toMatchObject({ nextMaxId: '4012147540932962273_5723188289', moreAvailable: true });
    expect(page.items.map((p) => p.code)).toEqual(['Deyc1w9hwTI', 'DYwJmuloBB4', 'DfEjYyloDYx', 'DeuAu5jxCfh']);
  });

  it('unwraps post and profile answers, and uses the configured host', async () => {
    const f = fakeFetch([
      dataRoute('media/get_info_by_shortcode', () => json(fixture('media-info.Deyc1w9hwTI.json'))),
      dataRoute('user/get_info_by_username', () => json(info)),
    ]);
    expect((await getMediaByShortcode('Deyc1w9hwTI', { fetch: f }))?.user?.username).toBe('sadegh.delicious');
    expect((await getUserInfo('maashmamad', { fetch: f, baseUrl: 'https://boxapi.ir' }))?.username).toBe('maashmamad');
    expect(String(f.mock.calls[1]![0])).toBe('https://boxapi.ir/api/instagram/user/get_info_by_username');
  });

  it('classifies errors: BoxAPI 4xx and Instagram 4xx are final, 5xx and network errors retryable', async () => {
    const bad = fakeFetch([[/./, () => json({ success: false, data: { message: 'Invalid username or password.' } }, 401)]]);
    const err = await getUserInfo('x', { fetch: bad }).catch((e) => e);
    expect(err).toBeInstanceOf(BoxApiError);
    expect(err).toMatchObject({ status: 401, retryable: false, message: 'data api 401: Invalid username or password.' });

    const gone = fakeFetch([[/./, () => boxapiBody({ status: 'fail' }, 404)]]);
    await expect(getMediaByShortcode('x', { fetch: gone })).rejects.toMatchObject({ status: 404, retryable: false });
    const e500 = fakeFetch([[/./, () => json({}, 502)]]);
    await expect(getUserInfo('x', { fetch: e500 })).rejects.toMatchObject({ retryable: true });
    const down = fakeFetch([[/./, () => Promise.reject(new Error('ECONNRESET'))]]);
    await expect(getUserInfo('x', { fetch: down })).rejects.toMatchObject({ retryable: true });
    await expect(getUserInfo('x', { fetch: down, token: '' })).rejects.toMatchObject({ status: 401 });
  });

  it('reads the request quota', async () => {
    const f = fakeFetch([[/\/api\/my$/, () => json({ username: 'u', request_used: 6, request_limit: 10, request_left: 4, plan_expiration: '2026-11-09 06:04:12' })]]);
    expect(await getQuota({ fetch: f })).toEqual({ requestUsed: 6, requestLimit: 10, requestLeft: 4, planExpiration: '2026-11-09 06:04:12' });
    expect(f.mock.calls[0]![1]).toMatchObject({ method: 'GET' });
  });
});

describe('posts', () => {
  it('reads time, pinned flag and media from a real page', () => {
    expect(postTime(posts[3]!)?.toISOString()).toBe('2026-10-20T14:43:50.000Z');
    expect(posts.map(isPinned)).toEqual([true, true, false, false]);
    expect(mediaUrls(posts[0]!)).toEqual({ displayUrl: expect.stringContaining('cdninstagram.com'), videoUrl: expect.stringContaining('.mp4') });
  });

  it('unions caption mentions and tagged users (carousel slides too), minus the reviewer and the ignore list', () => {
    expect(posts.map((p) => extractTagged(p, 'sadegh.delicious', []))).toEqual([['shiraz_drink'], ['matam_lari'], ['costcoiran'], ['maashmamad']]);
    expect(extractTagged(posts[0]!, 'sadegh.delicious', ['shiraz_drink'])).toEqual([]);
    const post: BoxApiPost = {
      caption: { text: 'try ‪@A.b‬. and @sadegh.delicious, also @c.' },
      carousel_media: [{ usertags: { in: [{ user: { username: 'd_shop' } }] } }],
    };
    expect(extractTagged(post, 'sadegh.delicious', [])).toEqual(['a.b', 'c', 'd_shop']);
  });
});

describe('mapProfile', () => {
  it('maps a real profile: HD picture, website, phone with country code', () => {
    expect(mapProfile(info.response.body.user, 'maashmamad')).toEqual({
      username: 'maashmamad',
      fullName: 'اَغذیه فُروشی مَش مَمَّد‌ | مش ممد',
      imageUrl: expect.stringMatching(/^https:\/\/scontent-cph2-1\.cdninstagram\.com\/.*efg=/),
      email: undefined,
      website: 'https://sepidz.menu/mashmamad/1',
      phone: '+987136311002',
    });
  });

  it('leaves out fields the page does not show, and invalid values', () => {
    const p = mapProfile(
      { username: 'Shop', bio_links: [{ url: 'shop.ir' }], public_email: 'nope', public_phone_number: '9121234567', public_phone_country_code: '98' },
      'shop',
    );
    expect(p).toEqual({ username: 'shop', website: 'https://shop.ir/', phone: '+989121234567' });
  });

  it('reads the phone from the bio when the contact fields have none', () => {
    const phoneIn = (biography: string, extra = {}) => mapProfile({ username: 'shop', biography, ...extra }, 'shop')?.phone;
    expect(phoneIn('سفارش در دایرکت\n☎️ ۰۹۱۲ ۳۴۵ ۶۷۸۹')).toBe('+989123456789');
    expect(phoneIn('📞 +98 912 345 6789')).toBe('+989123456789');
    // The first of several numbers, however they are separated.
    expect(phoneIn('☎️ ۰۷۱۳۶۳۱۱۰۰۲  -  ۰۹۱۷۰۵۴۱۰۰۲')).toBe('+987136311002');
    expect(phoneIn('۰۹۱۲۳۴۵۶۷۸۹ ۰۹۱۷۰۵۴۱۰۰۲')).toBe('+989123456789');
    expect(phoneIn('۰۷۱۳۶۲۷۳۰۰۷-۸')).toBe('+987136273007');
    // The page's contact button wins over the bio.
    expect(phoneIn('۰۹۱۲۳۴۵۶۷۸۹', { contact_phone_number: '+987136311002' })).toBe('+987136311002');
  });

  it('does not take other numbers in the bio for a phone', () => {
    const phoneIn = (biography: string) => mapProfile({ username: 'shop', biography }, 'shop')?.phone;
    expect(phoneIn('کدپستی ۷۱۳۴۶۸۵۹۱۲')).toBeUndefined();
    expect(phoneIn('از سال ۱۴۰۰ | ارسال ۳۵۰۰۰۰ تومان')).toBeUndefined();
    expect(phoneIn('تلفن ۳۶۳۱۱۰۰۲')).toBeUndefined();
    expect(phoneIn('شناسه ۱۲۳۰۹۱۲۳۴۵۶۷۸۹۰')).toBeUndefined();
    expect(mapProfile({ username: 'shop' }, 'shop')?.phone).toBeUndefined();
  });

  it('returns null when there is no user or it is someone else', () => {
    expect(mapProfile(null, 'maashmamad')).toBeNull();
    expect(mapProfile(info.response.body.user, 'someone.else')).toBeNull();
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
