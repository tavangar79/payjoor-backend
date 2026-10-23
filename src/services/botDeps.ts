// MongoDB-backed dependencies for the pure bot (PRD §5.3–§5.4, §10.8).
import type { Types } from 'mongoose';
import type { BotDeps } from '../bot/index.js';
import type { ReviewSummary, ShopSummary } from '../bot/lookup.js';
import { Category } from '../models/Category.js';
import { PostOwner } from '../models/PostOwner.js';
import { Review } from '../models/Review.js';
import { ReviewerSource } from '../models/ReviewerSource.js';
import { findByHandle } from './shops.js';
import { addRequest } from './wishlist.js';

async function reviewerHandles(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  const sources = await ReviewerSource.find({ _id: { $in: ids } }, { handle: 1 }).lean();
  return new Map(sources.map((s) => [String(s._id), s.handle]));
}

export const botDeps: BotDeps = {
  // A reviewer post we store: its author is the reviewer (§5.3).
  async ownerFromReviews(shortcode) {
    const review = await Review.findOne({ postShortcode: shortcode }, { reviewerSourceId: 1 }).lean();
    if (!review) return null;
    const source = await ReviewerSource.findById(review.reviewerSourceId, { handle: 1 }).lean();
    return source?.handle ?? null;
  },

  async ownerFromCache(shortcode) {
    return (await PostOwner.findOne({ shortcode }, { ownerUsername: 1 }).lean())?.ownerUsername ?? null;
  },

  async findShop(handle): Promise<ShopSummary | null> {
    const shop = await findByHandle(handle);
    if (!shop) return null;
    return {
      id: String(shop._id),
      displayName: shop.displayName,
      handle: shop.handle,
      status: shop.status,
      tags: shop.tags,
      categoryIds: shop.categoryIds.map(String),
      contact: shop.contact ?? {},
    };
  },

  async publishedReviews(shopId, limit) {
    const filter = { shopId, status: 'published' as const };
    const [items, total] = await Promise.all([
      Review.find(filter, { reviewerSourceId: 1, occurredAt: 1, summary: 1, postUrl: 1 })
        .sort({ occurredAt: -1 })
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);
    const handles = await reviewerHandles(items.map((r) => r.reviewerSourceId));
    const summaries: ReviewSummary[] = items.map((r) => ({
      reviewerHandle: handles.get(String(r.reviewerSourceId)) ?? '?',
      occurredAt: r.occurredAt,
      summary: r.summary,
      postUrl: r.postUrl,
    }));
    return { items: summaries, total };
  },

  async categoryNames(ids, lang) {
    const categories = await Category.find({ _id: { $in: ids } }, { name: 1, nameEn: 1 }).lean();
    const byId = new Map(categories.map((c) => [String(c._id), lang === 'en' ? c.nameEn || c.name : c.name]));
    return ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n));
  },

  async addWishlistRequest(handle) {
    await addRequest(handle, 'dm');
  },
};
