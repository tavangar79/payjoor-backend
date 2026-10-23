// Wishlist (PRD §5.1 step 7, §6.3, §8): add or count a request.
import { Wishlist, type WishlistDoc } from '../models/Wishlist.js';
import type { WishlistSource } from '../models/enums.js';
import { HttpError } from '../lib/errorHandler.js';
import { normalizeHandle } from '../lib/handle.js';
import { isDuplicateKey } from '../lib/mongo.js';

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
