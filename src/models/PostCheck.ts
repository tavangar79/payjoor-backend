// postChecks: one row per post of a trusted reviewer page, from intake through AI analysis to publish (PRD §6, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { POST_CHECK_STATUSES } from './enums.js';

const postCheckSchema = new Schema(
  {
    reviewerSourceId: { type: Schema.Types.ObjectId, ref: 'ReviewerSource', required: true },
    postShortcode: { type: String, required: true },
    postUrl: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    caption: { type: String, default: '' },
    media: {
      displayUrl: String,
      videoUrl: String,
    },
    paidPartnership: { type: Boolean, required: true, default: false },
    tagged: { type: [String], default: [] },
    // The full BoxAPI Data API item.
    raw: { type: Schema.Types.Mixed },
    status: { type: String, enum: POST_CHECK_STATUSES, required: true, default: 'queued' },
    // Why the gate left the post for a person.
    reasons: { type: [String], default: [] },
    // PostAnalysis from services/postClassify.ts.
    analysis: { type: Schema.Types.Mixed },
    lastError: String,
    shopIds: [{ type: Schema.Types.ObjectId, ref: 'Shop' }],
    reviewIds: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
  },
  { timestamps: true, collection: 'postChecks' },
);

postCheckSchema.index({ reviewerSourceId: 1, postShortcode: 1 }, { unique: true });
postCheckSchema.index({ status: 1, createdAt: 1 });

export type PostCheckDoc = InferSchemaType<typeof postCheckSchema> & { _id: mongoose.Types.ObjectId };
export const PostCheck =
  (mongoose.models.PostCheck as mongoose.Model<PostCheckDoc>) ||
  mongoose.model<PostCheckDoc>('PostCheck', postCheckSchema);
