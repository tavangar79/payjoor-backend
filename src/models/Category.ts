// categories: the list of product categories (PRD §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { normalizeFa } from '../lib/normalizeFa.js';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    // Derived from `name` on validate, so the same category can't be added twice with different spellings.
    nameNormalized: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true, collection: 'categories' },
);

categorySchema.pre('validate', function () {
  if (this.name) this.nameNormalized = normalizeFa(this.name);
});

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: mongoose.Types.ObjectId };
export const Category =
  (mongoose.models.Category as mongoose.Model<CategoryDoc>) ||
  mongoose.model<CategoryDoc>('Category', categorySchema);
