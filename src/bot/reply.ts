// Build the plain-text reply for a found shop (PRD §5.4): name and handle, categories, only the contact
// lines the shop has, status and tags, newest published reviews, "+N more". Split if too long. Pure.
import { strings } from '../i18n/index.js';
import type { Lang } from './language.js';
import type { ReviewSummary, ShopSummary } from './lookup.js';

// Instagram text messages must be under 1,000 characters.
export const MAX_MESSAGE_CHARS = 950;

export type ShopReplyInput = {
  shop: ShopSummary;
  reviews: ReviewSummary[];
  total: number;
  categoryNames: string[];
  // Not used in v1 (no website yet, §5.4); the reply ends with it once there is one.
  link?: string;
};

export function buildShopReply(input: ShopReplyInput, lang: Lang): string[] {
  const t = strings[lang];
  const { shop, reviews, total, categoryNames, link } = input;
  const head = [`${shop.displayName} (@${shop.handle})`];
  if (categoryNames.length) head.push(`${t.labels.categories}: ${categoryNames.join(t.listSeparator)}`);
  for (const key of ['email', 'website', 'phone'] as const) {
    const value = shop.contact[key];
    if (value) head.push(`${t.labels[key]}: ${value}`);
  }

  const blocks = [head.join('\n')];
  if (reviews.length === 0) {
    // No published reviews: no status or tags (§5.4).
    blocks.push(t.notReviewedYet);
  } else {
    const tags = [shop.tags.length ? `${t.labels.tags}: ${shop.tags.join(t.listSeparator)}` : null];
    blocks.push([`${t.labels.status}: ${t.status[shop.status]}`, ...tags].filter(Boolean).join('\n'));
    const lines = reviews.map((r) =>
      [`• @${r.reviewerHandle} — ${t.date(r.occurredAt)}`, r.summary ? `  ${r.summary}` : null, `  ${r.postUrl}`]
        .filter(Boolean)
        .join('\n'),
    );
    blocks.push(`${t.labels.reviews}:\n${lines.join('\n')}`);
    if (total > reviews.length) blocks.push(t.more(total - reviews.length));
  }
  if (link) blocks.push(link);
  return splitMessage(blocks.join('\n\n'));
}

/** Splits on blank lines, then lines, then hard-wraps, so each part is at most `max` characters. */
export function splitMessage(text: string, max = MAX_MESSAGE_CHARS): string[] {
  const parts: string[] = [];
  let current = '';
  const push = (piece: string, sep: string) => {
    if (!current) current = piece;
    else if (current.length + sep.length + piece.length <= max) current += sep + piece;
    else {
      parts.push(current);
      current = piece;
    }
  };
  for (const block of text.split('\n\n')) {
    if (block.length <= max) {
      push(block, '\n\n');
      continue;
    }
    for (const line of block.split('\n')) {
      for (let i = 0; i < line.length || i === 0; i += max) push(line.slice(i, i + max), '\n');
    }
  }
  if (current) parts.push(current);
  return parts;
}
