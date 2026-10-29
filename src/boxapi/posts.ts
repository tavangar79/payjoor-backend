// BoxAPI Data API post items (PRD §6.1, §6.2): the fields we read, checked against a real response
// (tests/fixtures/boxapi/user-media.sadegh.delicious.json). The full item is also kept in reviews.raw.
import { env } from '../config/env.js';
import { normalizeHandle } from '../lib/handle.js';

type UserTags = { in?: { user?: { username?: string } }[] };

export type BoxApiPost = {
  code?: string;
  taken_at?: number;
  caption?: { text?: string } | null;
  usertags?: UserTags;
  carousel_media?: { usertags?: UserTags; image_versions2?: ImageVersions; video_versions?: { url?: string }[] }[];
  user?: { pk?: number | string; username?: string };
  timeline_pinned_user_ids?: (number | string)[];
  is_paid_partnership?: boolean;
  image_versions2?: ImageVersions;
  video_versions?: { url?: string }[];
  [key: string]: unknown;
};

type ImageVersions = { candidates?: { url?: string; width?: number }[] };

/** Canonical post link stored on reviews and shown in replies (§6.3). */
export const postUrl = (shortcode: string) => `https://www.instagram.com/p/${shortcode}/`;

export function postTime(post: BoxApiPost): Date | null {
  return typeof post.taken_at === 'number' && post.taken_at > 0 ? new Date(post.taken_at * 1000) : null;
}

export const captionText = (post: BoxApiPost) => post.caption?.text ?? '';

/** Pinned by its author: pinned posts come first whatever their date (§6.1). */
export function isPinned(post: BoxApiPost): boolean {
  const ids = post.timeline_pinned_user_ids ?? [];
  const owner = post.user?.pk;
  return owner === undefined ? ids.length > 0 : ids.some((id) => String(id) === String(owner));
}

/** First image and video URL; Instagram links expire, so they're for the admin panel only. */
export function mediaUrls(post: BoxApiPost): { displayUrl?: string; videoUrl?: string } {
  const first = post.carousel_media?.[0];
  return {
    displayUrl: (post.image_versions2 ?? first?.image_versions2)?.candidates?.[0]?.url,
    videoUrl: (post.video_versions ?? first?.video_versions)?.[0]?.url,
  };
}

// `@handle` in the caption. Instagram wraps some in bidi marks, which aren't part of the handle.
const MENTION_RE = /@([A-Za-z0-9._]{1,30})/g;

/**
 * The businesses a reviewer post is about: caption mentions plus tagged users (also on carousel slides), minus
 * the reviewer's own handle and the ignore list (REVIEW_IGNORE_HANDLES, e.g. sponsors that aren't shops).
 */
export function extractTagged(post: BoxApiPost, reviewerHandle: string, ignore: string[] = env.REVIEW_IGNORE_HANDLES): string[] {
  const mentions = [...captionText(post).matchAll(MENTION_RE)].map((m) => m[1]!.replace(/\.+$/, ''));
  const tags = [post.usertags, ...(post.carousel_media ?? []).map((c) => c.usertags)].flatMap(
    (t) => t?.in?.map((u) => u.user?.username) ?? [],
  );
  const skip = new Set([reviewerHandle, ...ignore].map((h) => normalizeHandle(h)).filter(Boolean));
  const out = new Set<string>();
  for (const raw of [...mentions, ...tags]) {
    const handle = typeof raw === 'string' ? normalizeHandle(raw) : null;
    if (handle && !skip.has(handle)) out.add(handle);
  }
  return [...out];
}
