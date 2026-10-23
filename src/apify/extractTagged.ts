// The businesses a reviewer post is about (PRD §6.1): caption mentions plus tagged users, minus the
// reviewer's own handle and the ignore list (APIFY_IGNORE_HANDLES, e.g. sponsors that aren't shops).
import { env } from '../config/env.js';
import { normalizeHandle } from '../lib/handle.js';
import type { ApifyPost } from './posts.js';

export function extractTagged(post: ApifyPost, reviewerHandle: string, ignore: string[] = env.APIFY_IGNORE_HANDLES): string[] {
  const tagged = (post.taggedUsers ?? []).map((u) => (typeof u === 'string' ? u : u?.username));
  const skip = new Set([reviewerHandle, ...ignore].map((h) => normalizeHandle(h)).filter(Boolean));
  const out = new Set<string>();
  for (const raw of [...(post.mentions ?? []), ...tagged]) {
    const handle = typeof raw === 'string' ? normalizeHandle(raw) : null;
    if (handle && !skip.has(handle)) out.add(handle);
  }
  return [...out];
}
