// Wishlist (PRD §5.1 step 7, §6.3, §8, §9.2.2): add or count a request, and the admin actions.
import type { Types } from 'mongoose';
import { Wishlist, type WishlistDoc } from '../models/Wishlist.js';
import { Review } from '../models/Review.js';
import type { WishlistSource } from '../models/enums.js';
import { HttpError } from '../lib/errorHandler.js';
import { normalizeHandle } from '../lib/handle.js';
import { isDuplicateKey } from '../lib/mongo.js';
import { createShop, getShop, updateShop, type ShopInput } from './shops.js';

type WishlistStatus = WishlistDoc['status'];

/** Creates the entry or bumps `requestCount`, adds the source and sets `lastRequestedAt`. Keeps the status. */
export async function addRequest(input: string, source: WishlistSource): Promise<WishlistDoc> {
  const handle = normalizeHandle(input);
  if (!handle) throw new HttpError(400, 'invalid_handle');
  const now = new Date();
  const upsert = () =>
    Wishlist.findOneAndUpdate(
      { handle },
      {
        $inc: { requestCount: 1 },
        $addToSet: { sources: source },
        $set: { lastRequestedAt: now },
        $setOnInsert: { handle, firstRequestedAt: now, status: 'open' },
      },
      { upsert: true, new: true, lean: true },
    );
  // Two first requests at once: the loser's upsert hits the unique index; the retry updates.
  const doc = await upsert().catch((err) => (isDuplicateKey(err) ? upsert() : Promise.reject(err)));
  return doc as WishlistDoc;
}

// Admin actions (PRD §9.2.2): list by demand, promote to a shop, link to an existing shop, dismiss.

export async function listWishlist(query: { status: WishlistStatus; page: number; limit: number }) {
  const filter = { status: query.status };
  const [entries, total] = await Promise.all([
    Wishlist.find(filter)
      .sort({ requestCount: -1, lastRequestedAt: -1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Wishlist.countDocuments(filter),
  ]);
  const pending = await Review.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { wishlistId: { $in: entries.map((e) => e._id) }, status: 'pending' } },
    { $group: { _id: '$wishlistId', n: { $sum: 1 } } },
  ]);
  const byId = new Map(pending.map((p) => [String(p._id), p.n]));
  return { items: entries.map((e) => ({ ...e, pendingReviews: byId.get(String(e._id)) ?? 0 })), total };
}

async function entryOrThrow(id: Types.ObjectId) {
  const entry = await Wishlist.findById(id).lean();
  if (!entry) throw new HttpError(404, 'not_found');
  if (entry.status === 'promoted') throw new HttpError(409, 'already_promoted');
  return entry;
}

/**
 * Moves the entry's reviews to the shop. A live review the shop already has for the same post (unique
 * index) is rejected as a duplicate instead of moved.
 */
async function moveReviews(wishlistId: Types.ObjectId, shopId: Types.ObjectId) {
  let moved = 0;
  let duplicates = 0;
  for (const review of await Review.find({ wishlistId }, { _id: 1 }).lean()) {
    try {
      await Review.updateOne({ _id: review._id }, { $set: { shopId }, $unset: { wishlistId: 1 } });
      moved++;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      await Review.updateOne({ _id: review._id }, { $set: { status: 'rejected', rejectReason: 'duplicate' } });
      duplicates++;
    }
  }
  return { moved, duplicates };
}

/**
 * Creates the shop from the entry's handle, then moves its reviews, then marks the entry promoted.
 * In that order, a crash leaves at worst a shop the admin can link the entry to.
 */
export async function promote(id: Types.ObjectId, shopInput: Omit<ShopInput, 'handle'>) {
  const entry = await entryOrThrow(id);
  const shop = await createShop({ ...shopInput, handle: entry.handle });
  const reviews = await moveReviews(entry._id, shop._id);
  await Wishlist.updateOne({ _id: entry._id }, { $set: { status: 'promoted', promotedShopId: shop._id } });
  return { shop, reviews };
}

/** E.g. after a rename: the entry's handle becomes one of the shop's previousHandles. */
export async function linkToShop(id: Types.ObjectId, shopId: Types.ObjectId) {
  const entry = await entryOrThrow(id);
  const shop = await getShop(shopId);
  if (shop.handle !== entry.handle && !shop.previousHandles.includes(entry.handle)) {
    await updateShop(shopId, { previousHandles: [...shop.previousHandles, entry.handle] });
  }
  const reviews = await moveReviews(entry._id, shop._id);
  await Wishlist.updateOne({ _id: entry._id }, { $set: { status: 'promoted', promotedShopId: shop._id } });
  return { shop: await getShop(shopId), reviews };
}

export async function dismiss(id: Types.ObjectId) {
  const entry = await entryOrThrow(id);
  await Wishlist.updateOne({ _id: entry._id }, { $set: { status: 'dismissed' } });
  return { ...entry, status: 'dismissed' as const };
}
