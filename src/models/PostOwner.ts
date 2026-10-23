// postOwners: permanent cache of who posted a given post, so a post never costs twice (PRD §5.3, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { HANDLE_MATCH } from './enums.js';

const postOwnerSchema = new Schema(
  {
    shortcode: { type: String, required: true, unique: true },
    ownerUsername: { type: String, required: true, lowercase: true, trim: true, match: HANDLE_MATCH },
    fetchedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, collection: 'postOwners' },
);

export type PostOwnerDoc = InferSchemaType<typeof postOwnerSchema> & { _id: mongoose.Types.ObjectId };
export const PostOwner =
  (mongoose.models.PostOwner as mongoose.Model<PostOwnerDoc>) ||
  mongoose.model<PostOwnerDoc>('PostOwner', postOwnerSchema);
