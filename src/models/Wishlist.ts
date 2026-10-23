// wishlist: pages people asked about that we haven't reviewed yet (PRD §5.1, §6.3, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { HANDLE_MATCH, WISHLIST_SOURCES, WISHLIST_STATUSES } from './enums.js';

const wishlistSchema = new Schema(
  {
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true, match: HANDLE_MATCH },
    requestCount: { type: Number, required: true, default: 1, min: 0 },
    sources: { type: [{ type: String, enum: WISHLIST_SOURCES }], default: [] },
    firstRequestedAt: { type: Date, required: true, default: () => new Date() },
    lastRequestedAt: { type: Date, required: true, default: () => new Date() },
    status: { type: String, enum: WISHLIST_STATUSES, required: true, default: 'open' },
    promotedShopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
  },
  { timestamps: true, collection: 'wishlist' },
);

// Admin wishlist screen: open entries sorted by demand (§9.2).
wishlistSchema.index({ status: 1, requestCount: -1 });

export type WishlistDoc = InferSchemaType<typeof wishlistSchema> & { _id: mongoose.Types.ObjectId };
export const Wishlist =
  (mongoose.models.Wishlist as mongoose.Model<WishlistDoc>) ||
  mongoose.model<WishlistDoc>('Wishlist', wishlistSchema);
