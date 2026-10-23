// BullMQ queue instances (PRD §5.1, §11). Created on first use, so importing this module doesn't touch Redis.
import { Queue, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { createRedis } from '../lib/redis.js';
import { QUEUES, type QueueName } from './names.js';

// 3 attempts with exponential backoff for temporary failures (§5.1). Failed jobs stay in the failed set.
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { count: 1_000, age: 7 * 24 * 3600 },
  removeOnFail: { count: 5_000 },
};

let connection: Redis | undefined;
const queues = new Map<QueueName, Queue>();

/** One shared, lazily connecting Redis connection for all Queue instances in this process. */
export function queueConnection(): Redis {
  connection ??= createRedis(undefined, { lazyConnect: true });
  return connection;
}

export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: queueConnection(), defaultJobOptions });
    queues.set(name, queue);
  }
  return queue;
}

export function allQueues(): Queue[] {
  return Object.values(QUEUES).map(getQueue);
}

/** Closes the queues first, then the shared connection (BullMQ doesn't close shared connections). */
export async function closeQueues() {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
  if (connection) {
    await connection.quit().catch(() => connection?.disconnect());
    connection = undefined;
  }
}
