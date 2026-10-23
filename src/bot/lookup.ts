// Look a handle up (PRD §5.1 step 5): the shop by handle or previousHandles, and its newest published
// reviews. Pure; the repository functions are injected.
import type { ShopStatus } from '../models/enums.js';

export type ShopSummary = {
  id: string;
  displayName: string;
  handle: string;
  status: ShopStatus;
  tags: string[];
  categoryIds: string[];
  contact: { email?: string | null; website?: string | null; phone?: string | null };
};

export type ReviewSummary = { reviewerHandle: string; occurredAt: Date; summary?: string | null; postUrl: string };

export type LookupDeps = {
  findShop(handle: string): Promise<ShopSummary | null>;
  /** Published reviews of the shop, newest first, at most `limit`, plus the total count. */
  publishedReviews(shopId: string, limit: number): Promise<{ items: ReviewSummary[]; total: number }>;
};

export type LookupResult =
  | { found: true; shop: ShopSummary; reviews: ReviewSummary[]; total: number }
  | { found: false };

export const REVIEWS_IN_REPLY = 5;

export async function lookupHandle(handle: string, deps: LookupDeps, limit = REVIEWS_IN_REPLY): Promise<LookupResult> {
  const shop = await deps.findShop(handle);
  if (!shop) return { found: false };
  const { items, total } = await deps.publishedReviews(shop.id, limit);
  return { found: true, shop, reviews: items, total };
}
