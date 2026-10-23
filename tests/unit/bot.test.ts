import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseMessage, targetFromUrl, type IncomingMessage } from '../../src/bot/parse.js';
import { detectLang } from '../../src/bot/language.js';
import { resolveTarget } from '../../src/bot/resolve.js';
import { buildShopReply, splitMessage } from '../../src/bot/reply.js';
import { handleMessage, type BotDeps } from '../../src/bot/index.js';
import type { ShopSummary } from '../../src/bot/lookup.js';

const samples = JSON.parse(readFileSync(new URL('../fixtures/webhooks/docs-samples.json', import.meta.url), 'utf8'));
const messageOf = (name: string): IncomingMessage => samples[name].entry[0].messaging[0].message;

describe('parseMessage', () => {
  it('reads the webhook samples', () => {
    expect(parseMessage(messageOf('text_handle'))).toEqual({ kind: 'text', handle: 'maashmamad' });
    expect(parseMessage(messageOf('profile_link'))).toEqual({ kind: 'profile', handle: 'maashmamad' });
    expect(parseMessage(messageOf('post_link'))).toEqual({ kind: 'post', shortcode: 'Deyc1w9hwTI' });
    expect(parseMessage(messageOf('share_attachment'))).toEqual({ kind: 'post', shortcode: 'Deyc1w9hwTI' });
    // A reel attachment only carries a CDN link, so there's nothing to look up.
    expect(parseMessage(messageOf('reel_attachment'))).toEqual({ kind: 'unknown' });
  });

  it('understands Instagram URL forms', () => {
    expect(targetFromUrl('instagram.com/reel/C9xYz12AbC/')).toEqual({ kind: 'post', shortcode: 'C9xYz12AbC' });
    expect(targetFromUrl('https://instagram.com/tv/ABCDE12')).toEqual({ kind: 'post', shortcode: 'ABCDE12' });
    expect(targetFromUrl('https://www.instagram.com/maashmamad/p/Deyc1w9hwTI/')).toEqual({ kind: 'post', shortcode: 'Deyc1w9hwTI' });
    expect(targetFromUrl('https://www.instagram.com/stories/Kif.Shop/3456/')).toEqual({ kind: 'profile', handle: 'kif.shop' });
    expect(targetFromUrl('https://m.instagram.com/Kif.Shop/')).toEqual({ kind: 'profile', handle: 'kif.shop' });
    expect(targetFromUrl('https://instagr.am/kif_shop')).toEqual({ kind: 'profile', handle: 'kif_shop' });
    expect(targetFromUrl('https://www.instagram.com/explore/tags/food/')).toBeNull();
    expect(targetFromUrl('https://www.instagram.com/share/BAxyz123')).toBeNull();
    expect(targetFromUrl('https://www.instagram.com/')).toBeNull();
  });

  it('never looks at tagged accounts in a post link, and ignores emails', () => {
    expect(parseMessage({ text: 'https://www.instagram.com/p/Deyc1w9hwTI/ @tagged.shop' })).toEqual({
      kind: 'post',
      shortcode: 'Deyc1w9hwTI',
    });
    expect(parseMessage({ text: 'email me at a@b.com' })).toEqual({ kind: 'unknown' });
    expect(parseMessage({ text: 'سلام' })).toEqual({ kind: 'unknown' });
    expect(parseMessage({})).toEqual({ kind: 'unknown' });
  });
});

describe('detectLang', () => {
  it('picks English for mostly Latin prose, else Persian', () => {
    expect(detectLang('Is this page legit? @maashmamad')).toBe('en');
    expect(detectLang('این پیج چطوره؟ @MaashMamad')).toBe('fa');
    expect(detectLang('https://www.instagram.com/maashmamad')).toBe('fa');
    expect(detectLang('ok')).toBe('fa');
    expect(detectLang(undefined)).toBe('fa');
  });
});

describe('resolveTarget', () => {
  const deps = (reviews: string | null, cache: string | null) => ({
    ownerFromReviews: vi.fn(async () => reviews),
    ownerFromCache: vi.fn(async () => cache),
  });

  it('resolves posts from stored reviews first, then the cache, else asks for a lookup', async () => {
    const post = { kind: 'post', shortcode: 'Deyc1w9hwTI' } as const;
    const fromReviews = deps('sadegh.delicious', 'other');
    expect(await resolveTarget(post, fromReviews)).toEqual({ handle: 'sadegh.delicious' });
    expect(fromReviews.ownerFromCache).not.toHaveBeenCalled();
    expect(await resolveTarget(post, deps(null, 'maashmamad'))).toEqual({ handle: 'maashmamad' });
    expect(await resolveTarget(post, deps(null, null))).toEqual({ needsLookup: 'Deyc1w9hwTI' });
    expect(await resolveTarget(post, deps(null, null), { ownerLookupDone: true })).toEqual({ unresolved: true });
    expect(await resolveTarget({ kind: 'unknown' }, deps(null, null))).toEqual({ none: true });
  });
});

const shop: ShopSummary = {
  id: 's1',
  displayName: 'Maash Mamad',
  handle: 'maashmamad',
  status: 'warning',
  tags: ['ارسال کند'],
  categoryIds: ['c1'],
  contact: { email: 'hi@maash.ir', website: null, phone: '+989121234567' },
};
const review = (n: number) => ({
  reviewerHandle: 'sadegh.delicious',
  occurredAt: new Date(Date.UTC(2026, 9, n)),
  summary: `خلاصه ${n}`,
  postUrl: `https://www.instagram.com/p/code${n}/`,
});

describe('buildShopReply', () => {
  it('shows only the contact lines the shop has, status, tags, reviews and +N more', () => {
    const [text, ...rest] = buildShopReply({ shop, reviews: [review(2), review(1)], total: 4, categoryNames: ['پوشاک', 'کیف'] }, 'fa');
    expect(rest).toEqual([]);
    expect(text).toContain('Maash Mamad (@maashmamad)');
    expect(text).toContain('دسته‌بندی: پوشاک، کیف');
    expect(text).toContain('ایمیل: hi@maash.ir');
    expect(text).toContain('تلفن: +989121234567');
    expect(text).not.toContain('وب‌سایت');
    expect(text).toContain('وضعیت: هشدار');
    expect(text).toContain('برچسب‌ها: ارسال کند');
    expect(text).toContain('• @sadegh.delicious — ');
    expect(text).toContain('https://www.instagram.com/p/code2/');
    expect(text!.indexOf('code2')).toBeLessThan(text!.indexOf('code1'));
    expect(text).toContain('+۲ نقد دیگر');
    expect(text).not.toMatch(/[*_`]/);
  });

  it('says "on our list" and hides status and tags when nothing is published', () => {
    const [text] = buildShopReply({ shop, reviews: [], total: 0, categoryNames: [] }, 'en');
    expect(text).toContain("This page is on our list, but we haven't published a review of it yet.");
    expect(text).not.toContain('Status');
    expect(text).not.toContain('Tags');
    expect(text).not.toContain('Categories');
  });

  it('appends an optional link (unused in v1)', () => {
    const [text] = buildShopReply({ shop, reviews: [], total: 0, categoryNames: [], link: 'https://example.com/shop/x' }, 'en');
    expect(text?.endsWith('https://example.com/shop/x')).toBe(true);
  });
});

describe('splitMessage', () => {
  it('keeps every part under the limit, splitting on blocks, then lines', () => {
    const text = ['a'.repeat(30), 'b'.repeat(30), `${'c'.repeat(20)}\n${'d'.repeat(20)}`, 'e'.repeat(90)].join('\n\n');
    const parts = splitMessage(text, 50);
    expect(parts.every((p) => p.length <= 50)).toBe(true);
    expect(parts.join('')).toContain('c'.repeat(20));
    expect(parts[0]).toBe('a'.repeat(30));
    expect(splitMessage('short')).toEqual(['short']);
  });
});

describe('handleMessage', () => {
  function deps(over: Partial<BotDeps> = {}): BotDeps {
    return {
      ownerFromReviews: vi.fn(async () => null),
      ownerFromCache: vi.fn(async () => null),
      findShop: vi.fn(async (h: string) => (h === 'maashmamad' ? shop : null)),
      publishedReviews: vi.fn(async () => ({ items: [review(1)], total: 1 })),
      categoryNames: vi.fn(async (_ids: string[], lang: string) => [lang === 'en' ? 'Clothing' : 'پوشاک']),
      addWishlistRequest: vi.fn(async () => {}),
      ...over,
    };
  }

  it('answers a found shop in the message language', async () => {
    const out = await handleMessage({ text: 'Is @MaashMamad legit?' }, deps());
    expect(out).toMatchObject({ kind: 'text', lang: 'en', targetHandle: 'maashmamad', result: 'found' });
    expect(out.replies[0]).toContain('Categories: Clothing');
  });

  it('wishlists an unknown page', async () => {
    const d = deps();
    const out = await handleMessage(messageOf('profile_link'), d);
    expect(out).toMatchObject({ kind: 'profile', result: 'found' });
    const unknown = await handleMessage({ text: '@new.shop' }, d);
    expect(unknown).toMatchObject({ result: 'wishlisted', targetHandle: 'new.shop', lang: 'fa' });
    expect(unknown.replies[0]).toContain('اگر تجربه‌ای از خرید از این پیج دارید یا می‌خواهید بررسی شود');
    expect(d.addWishlistRequest).toHaveBeenCalledWith('new.shop');
  });

  it('asks for an owner lookup, then answers or gives up', async () => {
    const pending = await handleMessage(messageOf('post_link'), deps());
    expect(pending).toMatchObject({ kind: 'post', lang: 'en', needsOwnerLookup: 'Deyc1w9hwTI', replies: ['Checking… one moment.'] });
    expect(pending.result).toBeUndefined();

    const cached = await handleMessage(messageOf('post_link'), deps({ ownerFromCache: vi.fn(async () => 'maashmamad') }), { ownerLookupDone: true });
    expect(cached).toMatchObject({ result: 'found', targetHandle: 'maashmamad' });
    const gone = await handleMessage(messageOf('post_link'), deps(), { ownerLookupDone: true });
    expect(gone).toMatchObject({ result: 'unresolved', replies: ["We couldn't read this. Please share the page's profile instead."] });
  });

  it('sends help when there is nothing to look up', async () => {
    const out = await handleMessage({ text: 'سلام' }, deps());
    expect(out).toMatchObject({ kind: 'unknown', result: 'help' });
    expect(out.replies[0]).toContain('@maashmamad');
  });
});
