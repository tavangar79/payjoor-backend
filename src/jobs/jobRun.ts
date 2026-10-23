// jobRuns records for background jobs (PRD §6.1, §8): start, finish, and a wrapper that does both.
import type { Types } from 'mongoose';
import { JobRun } from '../models/JobRun.js';
import type { JobType } from '../models/enums.js';

export type JobRunResult = {
  counts?: Record<string, number>;
  costUsd?: number;
  apifyRunId?: string;
  error?: string;
};

export async function startJobRun(type: JobType): Promise<Types.ObjectId> {
  const run = await JobRun.create({ type, startedAt: new Date() });
  return run._id;
}

export async function finishJobRun(id: Types.ObjectId, result: JobRunResult = {}) {
  const set: Record<string, unknown> = { finishedAt: new Date() };
  if (result.counts) set.counts = result.counts;
  if (result.costUsd !== undefined) set.costUsd = result.costUsd;
  if (result.apifyRunId) set.apifyRunId = result.apifyRunId;
  if (result.error) set.error = result.error.slice(0, 2_000);
  await JobRun.updateOne({ _id: id }, { $set: set });
}

/** What a job fills in while it runs; saved to the jobRuns record when it ends, even if it throws. */
export type JobRunContext = {
  runId: Types.ObjectId;
  counts: Record<string, number>;
  costUsd?: number;
  apifyRunId?: string;
};

export async function withJobRun<T>(type: JobType, fn: (ctx: JobRunContext) => Promise<T>): Promise<T> {
  const ctx: JobRunContext = { runId: await startJobRun(type), counts: {} };
  try {
    const result = await fn(ctx);
    await finishJobRun(ctx.runId, ctx);
    return result;
  } catch (err) {
    await finishJobRun(ctx.runId, { ...ctx, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
