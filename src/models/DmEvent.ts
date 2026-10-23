// dmEvents: log of each incoming DM and how the bot handled it, deleted after 90 days (PRD §5.1, §8, §12).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { DM_KINDS, DM_RESULTS } from './enums.js';

export const DM_EVENT_TTL_SECONDS = 90 * 24 * 60 * 60;

const dmEventSchema = new Schema(
  {
    // Meta's message ID; also the BullMQ job ID.
    mid: { type: String, required: true, unique: true },
    senderIgsid: { type: String, required: true, index: true },
    receivedAt: { type: Date, required: true, default: () => new Date(), expires: DM_EVENT_TTL_SECONDS },
    kind: { type: String, enum: DM_KINDS, required: true, default: 'unknown' },
    targetHandle: { type: String, lowercase: true, trim: true },
    // Empty until the worker has decided what to answer.
    result: { type: String, enum: DM_RESULTS },
    replySentAt: Date,
    error: String,
    // Only stored when debugging is on (§8).
    text: String,
  },
  { timestamps: true, collection: 'dmEvents' },
);

export type DmEventDoc = InferSchemaType<typeof dmEventSchema> & { _id: mongoose.Types.ObjectId };
export const DmEvent =
  (mongoose.models.DmEvent as mongoose.Model<DmEventDoc>) || mongoose.model<DmEventDoc>('DmEvent', dmEventSchema);
