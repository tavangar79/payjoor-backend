// jobRuns: history of background jobs, for the admin Jobs screen and Apify cost tracking (PRD §6.1, §8).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { JOB_TYPES } from './enums.js';

const jobRunSchema = new Schema(
  {
    type: { type: String, enum: JOB_TYPES, required: true },
    startedAt: { type: Date, required: true, default: () => new Date() },
    finishedAt: Date,
    apifyRunId: String,
    costUsd: { type: Number, min: 0 },
    // e.g. { postsFetched, reviewsCreated, wishlisted, skipped }
    counts: { type: Schema.Types.Mixed, default: {} },
    error: String,
  },
  { timestamps: true, collection: 'jobRuns', minimize: false },
);

jobRunSchema.index({ startedAt: -1 });
jobRunSchema.index({ type: 1, startedAt: -1 });

export type JobRunDoc = InferSchemaType<typeof jobRunSchema> & { _id: mongoose.Types.ObjectId };
export const JobRun =
  (mongoose.models.JobRun as mongoose.Model<JobRunDoc>) || mongoose.model<JobRunDoc>('JobRun', jobRunSchema);
