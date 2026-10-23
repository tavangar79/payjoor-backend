// URL-safe IDs for shop and category pages (PRD §8 `slug`). Persian letters are kept (normalised), so a
// Persian-only category still gets a readable slug; everything else becomes `-`.
import { normalizeFa } from './normalizeFa.js';

export function slugify(input: string): string {
  return normalizeFa(input)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

/** `base`, or `base-2`, `base-3`, ... until `taken()` says no. */
export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || 'item';
  if (!(await taken(root))) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
}
