// reviews: one reviewer post about one shop or wishlist entry (PRD §6.3, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { DIRECTIONS, OUTCOMES, REVIEW_SOURCE_TYPES, REVIEW_STATUSES } from './enums.js';

const LIVE = { $in: ['pending', 'published'] };

const reviewSchema = new Schema(
  {
    // Exactly one of shopId and wishlistId is set (validated below).
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    wishlistId: { type: Schema.Types.ObjectId, ref: 'Wishlist' },
    sourceType: { type: String, enum: REVIEW_SOURCE_TYPES, required: true, default: 'reviewer_post' },
    reviewerSourceId: { type: Schema.Types.ObjectId, ref: 'ReviewerSource', required: true, index: true },
    postShortcode: { type: String, required: true },
    postUrl: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    caption: { type: String, default: '' },
    media: {
      displayUrl: String,
      videoUrl: String,
    },
    paidPartnership: { type: Boolean, required: true, default: false },
    // The full Apify item, so we can re-parse later without paying again.
    raw: { type: Schema.Types.Mixed },
    status: { type: String, enum: REVIEW_STATUSES, required: true, default: 'pending' },
    // Set by the admin; both required to publish (§6.3).
    outcome: { type: String, enum: OUTCOMES },
    direction: { type: String, enum: DIRECTIONS },
    summary: { type: String, trim: true },
    rejectReason: { type: String, trim: true },
    publishedAt: Date,
  },
  { timestamps: true, collection: 'reviews', minimize: false },
);

reviewSchema.pre('validate', function () {
  if (Boolean(this.shopId) === Boolean(this.wishlistId)) {
    this.invalidate('shopId', 'Exactly one of shopId and wishlistId must be set');
  }
  if (this.status === 'published' && (!this.outcome || !this.direction)) {
    this.invalidate('status', 'outcome and direction are required to publish');
  }
});

// Only one live (pending or published) review per (target, postShortcode), as in pagesanj.
reviewSchema.index(
  { shopId: 1, postShortcode: 1 },
  { unique: true, partialFilterExpression: { shopId: { $exists: true }, status: LIVE } },
);
reviewSchema.index(
  { wishlistId: 1, postShortcode: 1 },
  { unique: true, partialFilterExpression: { wishlistId: { $exists: true }, status: LIVE } },
);
// DM replies: published reviews of a shop, newest first (§5.4). Moderation queue (§9.2).
reviewSchema.index({ shopId: 1, status: 1, occurredAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
// Post-owner shortcut: a stored post tells us its owner for free (§5.3).
reviewSchema.index({ postShortcode: 1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema> & { _id: mongoose.Types.ObjectId };
export const Review =
  (mongoose.models.Review as mongoose.Model<ReviewDoc>) || mongoose.model<ReviewDoc>('Review', reviewSchema);
