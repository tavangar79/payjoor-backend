// deletionRequests: data deletion requests from Meta's callback (PRD §7.3, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { DELETION_STATUSES } from './enums.js';

const deletionRequestSchema = new Schema(
  {
    confirmationCode: { type: String, required: true, unique: true },
    // Hash of the IGSID: enough to find the user's data without keeping the ID itself.
    igsidHash: { type: String, required: true, index: true },
    status: { type: String, enum: DELETION_STATUSES, required: true, default: 'pending' },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, collection: 'deletionRequests' },
);

export type DeletionRequestDoc = InferSchemaType<typeof deletionRequestSchema> & { _id: mongoose.Types.ObjectId };
export const DeletionRequest =
  (mongoose.models.DeletionRequest as mongoose.Model<DeletionRequestDoc>) ||
  mongoose.model<DeletionRequestDoc>('DeletionRequest', deletionRequestSchema);
