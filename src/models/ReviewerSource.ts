// reviewerSources: reviewer pages we follow, e.g. @sadegh.delicious (PRD §6.1, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { HANDLE_MATCH, REVIEWER_PERMISSIONS } from './enums.js';

const reviewerSourceSchema = new Schema(
  {
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true, match: HANDLE_MATCH },
    name: { type: String, required: true, trim: true },
    follow: { type: Boolean, required: true, default: true },
    backfillLimit: { type: Number, required: true, default: 50, min: 0 },
    backfillDone: { type: Boolean, required: true, default: false },
    lastSeenShortcode: String,
    lastSeenPostAt: Date,
    permission: { type: String, enum: REVIEWER_PERMISSIONS, required: true, default: 'link_only' },
  },
  { timestamps: true, collection: 'reviewerSources' },
);

export type ReviewerSourceDoc = InferSchemaType<typeof reviewerSourceSchema> & { _id: mongoose.Types.ObjectId };
export const ReviewerSource =
  (mongoose.models.ReviewerSource as mongoose.Model<ReviewerSourceDoc>) ||
  mongoose.model<ReviewerSourceDoc>('ReviewerSource', reviewerSourceSchema);
