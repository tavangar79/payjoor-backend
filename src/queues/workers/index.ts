// Worker registry (PRD §11): every worker the worker process starts. Each phase adds its worker here.
import type { Job, WorkerOptions } from 'bullmq';
import type { Logger } from 'pino';
import type { QueueName } from '../names.js';
import { apifyProfileWorker } from './apifyProfile.worker.js';

export type WorkerDefinition = {
  queue: QueueName;
  processor: (job: Job, log: Logger) => Promise<unknown>;
  // e.g. concurrency (post-owner: 2, §5.1) or a rate limiter (dm-send, §5.1).
  options?: Pick<WorkerOptions, 'concurrency' | 'limiter'>;
};

export const workerDefinitions: WorkerDefinition[] = [apifyProfileWorker];
