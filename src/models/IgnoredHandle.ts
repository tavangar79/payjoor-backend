// ignoredHandles: accounts the trusted-post gate never publishes about (PRD §6, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { HANDLE_MATCH } from './enums.js';

const ignoredHandleSchema = new Schema(
  { handle: { type: String, required: true, unique: true, lowercase: true, trim: true, match: HANDLE_MATCH } },
  { timestamps: true, collection: 'ignoredHandles' },
);

export type IgnoredHandleDoc = InferSchemaType<typeof ignoredHandleSchema> & { _id: mongoose.Types.ObjectId };
export const IgnoredHandle =
  (mongoose.models.IgnoredHandle as mongoose.Model<IgnoredHandleDoc>) ||
  mongoose.model<IgnoredHandleDoc>('IgnoredHandle', ignoredHandleSchema);
