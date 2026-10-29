// Worker registry (PRD §11): every worker the worker process starts. Each phase adds its worker here.
import type { Job, WorkerOptions } from 'bullmq';
import type { Logger } from 'pino';
import type { QueueName } from '../names.js';
import { apifyBackfillWorker } from './apifyBackfill.worker.js';
import { apifyDailyWorker } from './apifyDaily.worker.js';
import { apifyProfileWorker } from './apifyProfile.worker.js';
import { dmInboundWorker } from './dmInbound.worker.js';
import { dmSendWorker } from './dmSend.worker.js';
import { postOwnerWorker } from './postOwner.worker.js';

export type WorkerDefinition = {
  queue: QueueName;
  processor: (job: Job, log: Logger) => Promise<unknown>;
  // e.g. concurrency (post-owner: 2, §5.1) or a rate limiter (dm-send, §5.1).
  options?: Pick<WorkerOptions, 'concurrency' | 'limiter'>;
};

export const workerDefinitions: WorkerDefinition[] = [
  dmInboundWorker,
  postOwnerWorker,
  dmSendWorker,
  apifyDailyWorker,
  apifyBackfillWorker,
  apifyProfileWorker,
];
