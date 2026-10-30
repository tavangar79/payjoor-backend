// shops: businesses we know about, the answer source for the DM bot (PRD §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { HANDLE_MATCH, IMAGE_MIMES, SHOP_STATUSES } from './enums.js';

const handleField = { type: String, lowercase: true, trim: true, match: HANDLE_MATCH };

const shopSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    handle: { ...handleField, required: true, unique: true },
    // Old handles after a rename; DM lookups check these too.
    previousHandles: { type: [handleField], default: [], index: true },
    status: { type: String, enum: SHOP_STATUSES, required: true, default: 'no_known_issues' },
    tags: { type: [String], default: [] },
    categoryIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [], index: true },
    bio: { type: String, trim: true },
    // Every shop has one; we keep our own copy because Instagram image links expire (§5.6).
    profileImage: {
      type: new Schema(
        {
          imageId: { type: Schema.Types.ObjectId, ref: 'ShopImage', required: true },
          sha256: { type: String, required: true },
          mime: { type: String, enum: IMAGE_MIMES, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    // Only what the shop shows on its own Instagram page (§5.6). Normalised by services/shops.ts.
    contact: {
      email: { type: String, lowercase: true, trim: true },
      website: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    // Created by the publish gate rather than by an admin.
    autoCreated: { type: Boolean, required: true, default: false },
    // An admin set the status by hand; syncShopStatus leaves it alone unless the shop has the scammer tag.
    statusManual: { type: Boolean, required: true, default: false },
    profileFetchedAt: Date,
  },
  { timestamps: true, collection: 'shops' },
);

export type ShopDoc = InferSchemaType<typeof shopSchema> & { _id: mongoose.Types.ObjectId };
export const Shop = (mongoose.models.Shop as mongoose.Model<ShopDoc>) || mongoose.model<ShopDoc>('Shop', shopSchema);
