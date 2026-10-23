// shopImages: our copies of shop profile pictures, served at /media/shop/{sha256} (PRD §5.6, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { IMAGE_MIMES } from './enums.js';

const shopImageSchema = new Schema(
  {
    // Checked with src/lib/imageCheck.ts before saving: JPEG, PNG or WebP, at most 2 MB.
    data: { type: Buffer, required: true },
    mime: { type: String, enum: IMAGE_MIMES, required: true },
    sha256: { type: String, required: true, unique: true, match: /^[0-9a-f]{64}$/ },
  },
  { timestamps: true, collection: 'shopImages' },
);

export type ShopImageDoc = InferSchemaType<typeof shopImageSchema> & { _id: mongoose.Types.ObjectId };
export const ShopImage =
  (mongoose.models.ShopImage as mongoose.Model<ShopImageDoc>) ||
  mongoose.model<ShopImageDoc>('ShopImage', shopImageSchema);
