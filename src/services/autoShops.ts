// Shop creation from a trusted post (PRD §6.3): the publish gate needs a shop for the post's author. An existing
// shop is reused; otherwise one is built from the Data API profile, or the post is held for an admin.
import { UnrecoverableError } from 'bullmq';
import type { Logger } from 'pino';
import { logger } from '../lib/logger.js';
import { normalizeHandle } from '../lib/handle.js';
import { HttpError } from '../lib/errorHandler.js';
import type { ShopDoc } from '../models/Shop.js';
import { Wishlist } from '../models/Wishlist.js';
import { fetchProfile } from '../queues/workers/shopProfile.worker.js';
import { findOrCreateCategory } from './categories.js';
import { createShop, findByHandle, updateShop } from './shops.js';
import { absorbWishlist } from './wishlist.js';

export type EnsureShopResult =
  | { shop: ShopDoc }
  | { held: 'profile_not_found' | 'profile_private' | 'no_image' | 'dismissed_handle' };

// Reasons the picture can't be had, as opposed to a network or server hiccup that a retry may fix.
const PERMANENT_IMAGE_ERROR = /^(no_image_url|image_\w+|host_not_allowed|bad_url|too_large|http_4(?!29)\d\d)$/;

/** A shop with no category yet gets this one; one that has categories is left alone. */
async function withCategory(shop: ShopDoc, category: string): Promise<ShopDoc> {
  if (shop.categoryIds.length) return shop;
  const categoryId = await findOrCreateCategory(category);
  return categoryId ? updateShop(shop._id, { categoryIds: [categoryId] }) : shop;
}

/** Reuses a shop; also finishes a wishlist move that an earlier, interrupted attempt left open (a no-op otherwise). */
async function adopt(shop: ShopDoc, category: string): Promise<ShopDoc> {
  await absorbWishlist(shop.handle, shop._id);
  return withCategory(shop, category);
}

export async function ensureShop(handleInput: string, category: string, log: Logger = logger): Promise<EnsureShopResult> {
  const handle = normalizeHandle(handleInput);
  if (!handle) throw new UnrecoverableError('invalid_handle');

  const existing = await findByHandle(handle);
  if (existing) return { shop: await adopt(existing, category) };

  // An admin dismissed this page: don't spend a Data API call or recreate it.
  if (await Wishlist.exists({ handle, status: 'dismissed' })) return { held: 'dismissed_handle' };

  let draft;
  try {
    draft = await fetchProfile({ handle }, log);
  } catch (err) {
    if (err instanceof UnrecoverableError && err.message === 'profile_not_found') return { held: 'profile_not_found' };
    throw err;
  }
  if (draft.isPrivate) return { held: 'profile_private' };
  if (!draft.image) {
    // Only a picture we can't get holds; a network or 5xx failure is retried by the queue.
    if (draft.imageError && !PERMANENT_IMAGE_ERROR.test(draft.imageError)) throw new Error(`profile_image_unavailable: ${draft.imageError}`);
    return { held: 'no_image' };
  }

  const categoryId = await findOrCreateCategory(category);
  let shop: ShopDoc;
  try {
    shop = await createShop({
      handle,
      displayName: draft.displayName ?? handle,
      profileImageId: draft.image.imageId,
      contact: draft.contact,
      categoryIds: categoryId ? [categoryId] : [],
      profileFetchedAt: new Date(draft.fetchedAt),
      autoCreated: true,
    });
  } catch (err) {
    // Another job created it between our lookup and insert.
    if (err instanceof HttpError && err.message === 'handle_in_use') {
      const winner = await findByHandle(handle);
      if (winner) return { shop: await adopt(winner, category) };
    }
    throw err;
  }
  await absorbWishlist(handle, shop._id);
  return { shop };
}
