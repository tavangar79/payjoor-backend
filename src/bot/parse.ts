// Extract the target of a DM (PRD §5.2, §5.3): a shared or linked profile, a post or reel (looked up by its
// author, never its tagged accounts), or an @handle in the text. Pure.
// Attachment shapes follow Meta's docs until the webhook spike (plan 6.4) gives real samples.
import { normalizeHandle } from '../lib/handle.js';

export type IncomingAttachment = { type?: string; payload?: { url?: string; title?: string } };
export type IncomingMessage = { text?: string; attachments?: IncomingAttachment[] };

export type Target =
  | { kind: 'profile'; handle: string }
  | { kind: 'post'; shortcode: string }
  | { kind: 'text'; handle: string }
  | { kind: 'unknown' };

const IG_URL_SOURCE = String.raw`(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^\s#]*)`;
// A fresh regex per use: a shared global regex keeps `lastIndex` between calls.
const igUrl = (flags = 'i') => new RegExp(IG_URL_SOURCE, flags);
const POST_PATHS = new Set(['p', 'reel', 'reels', 'tv']);
// First path segments that aren't profiles.
const RESERVED = new Set([
  'accounts', 'about', 'api', 'challenge', 'developer', 'direct', 'emails', 'explore', 'legal', 'privacy',
  's', 'share', 'stories', 'terms', 'web', '_u', ...POST_PATHS,
]);
const SHORTCODE = /^[A-Za-z0-9_-]{5,64}$/;
const AT_HANDLE = /(?:^|[^\w.@/])@([A-Za-z0-9._]{1,30})/u;

/** The target an instagram.com URL points to, or null (e.g. an explore or share link). */
export function targetFromUrl(url: string): Exclude<Target, { kind: 'text' } | { kind: 'unknown' }> | null {
  const m = igUrl().exec(url);
  if (!m) return null;
  const segments = (m[1] ?? '').split(/[?]/)[0]!.split('/').filter(Boolean);
  const [a, b, c] = segments;
  if (!a) return null;
  if (POST_PATHS.has(a.toLowerCase())) return b && SHORTCODE.test(b) ? { kind: 'post', shortcode: b } : null;
  // instagram.com/<handle>/p/<code> (newer share links)
  if (b && POST_PATHS.has(b.toLowerCase())) return c && SHORTCODE.test(c) ? { kind: 'post', shortcode: c } : null;
  if ((a === 'stories' || a === '_u') && b) {
    const handle = normalizeHandle(b);
    return handle ? { kind: 'profile', handle } : null;
  }
  if (RESERVED.has(a.toLowerCase())) return null;
  const handle = normalizeHandle(a);
  return handle ? { kind: 'profile', handle } : null;
}

function urlsIn(text: string): string[] {
  return [...text.matchAll(igUrl('gi'))].map((m) => m[0]);
}

export function parseMessage(msg: IncomingMessage): Target {
  for (const att of msg.attachments ?? []) {
    const url = att.payload?.url;
    const target = url ? targetFromUrl(url) : null;
    if (target) return target;
  }
  const text = msg.text ?? '';
  for (const url of urlsIn(text)) {
    const target = targetFromUrl(url);
    if (target) return target;
  }
  const at = AT_HANDLE.exec(text.replace(igUrl('gi'), ' '));
  const handle = at ? normalizeHandle(at[1]!) : null;
  if (handle) return { kind: 'text', handle };
  return { kind: 'unknown' };
}

/** Text without Instagram URLs and @handles, for language detection. */
export function proseOf(text: string): string {
  return text.replace(igUrl('gi'), ' ').replace(/https?:\/\/\S+/g, ' ').replace(/@[A-Za-z0-9._]+/g, ' ');
}
