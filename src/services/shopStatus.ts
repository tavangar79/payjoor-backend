// Shop status derived from its published reviews (PRD §6.3, §8). The `scammer` tag wins over everything,
// including a manual status. Writes with updateOne, so it never sets `statusManual`.
import type { Types } from 'mongoose';
import { Review } from '../models/Review.js';
import { Shop } from '../models/Shop.js';
import type { Direction, ShopStatus } from '../models/enums.js';

export const SCAMMER_TAG = 'scammer';

/** `null` means "no opinion": keep the current status. */
export function deriveShopStatus(directions: Direction[], tags: string[]): ShopStatus | null {
  if (tags.includes(SCAMMER_TAG)) return 'serious_warning';
  if (directions.length === 0) return null;
  const positive = directions.every((d) => d === 'positive');
  if (positive) return 'recommended';
  if (directions.every((d) => d === 'negative')) return 'warning';
  return 'mixed';
}

export async function syncShopStatus(shopId: Types.ObjectId): Promise<void> {
  const shop = await Shop.findById(shopId, { tags: 1, statusManual: 1, status: 1 }).lean();
  if (!shop) return;
  const scammer = shop.tags.includes(SCAMMER_TAG);
  if (shop.statusManual && !scammer) return;
  const reviews = await Review.find({ shopId, status: 'published' }, { direction: 1 }).lean();
  const directions = reviews.flatMap((r) => (r.direction ? [r.direction] : []));
  // No published review and no scammer tag: back to the default, so a takedown leaves no stale status.
  const next = deriveShopStatus(directions, shop.tags) ?? 'no_known_issues';
  if (next !== shop.status) await Shop.updateOne({ _id: shopId }, { status: next });
}
