// Starts BullMQ workers from definitions, each with its own Redis connection and a child logger (PRD §11).
import { Worker } from 'bullmq';
import { createRedis } from '../lib/redis.js';
import { jobLogger, logger } from '../lib/logger.js';
import type { WorkerDefinition } from './workers/index.js';

export function startWorkers(definitions: WorkerDefinition[], redisUrl?: string): Worker[] {
  return definitions.map((def) => {
    const worker = new Worker(def.queue, (job) => def.processor(job, jobLogger(def.queue, job.id)), {
      connection: createRedis(redisUrl),
      ...def.options,
    });
    worker.on('failed', (job, err) => {
      const final = job ? job.attemptsMade >= (job.opts.attempts ?? 1) : true;
      jobLogger(def.queue, job?.id).warn({ err: err.message, attemptsMade: job?.attemptsMade, final }, 'job failed');
    });
    worker.on('error', (err) => logger.error({ queue: def.queue, err: err.message }, 'worker error'));
    return worker;
  });
}

export async function closeWorkers(workers: Worker[]) {
  // close() stops taking new jobs and waits for running ones to finish (BullMQ graceful shutdown).
  await Promise.all(workers.map((w) => w.close()));
}
