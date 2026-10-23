// instagram-post-scraper items (PRD §6.2): the fields we use. The full item is also kept in reviews.raw.
export type ApifyPost = {
  shortCode?: string;
  url?: string;
  type?: string;
  timestamp?: string;
  caption?: string;
  mentions?: string[];
  taggedUsers?: ({ username?: string } | string)[];
  hashtags?: string[];
  ownerUsername?: string;
  ownerFullName?: string;
  displayUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  isPinned?: boolean;
  paidPartnership?: boolean;
  error?: string;
  [key: string]: unknown;
};

/** Canonical post link stored on reviews and shown in replies (§6.3). */
export const postUrl = (shortcode: string) => `https://www.instagram.com/p/${shortcode}/`;

export function postTime(post: ApifyPost): Date | null {
  const t = post.timestamp ? new Date(post.timestamp) : null;
  return t && !Number.isNaN(t.getTime()) ? t : null;
}
