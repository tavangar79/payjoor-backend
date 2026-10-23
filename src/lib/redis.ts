// Redis (ioredis) connection for BullMQ (PRD §11).
// BullMQ needs maxRetriesPerRequest: null, and the server must run with maxmemory-policy noeviction.
import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export function createRedis(url: string = env.REDIS_URL, options: RedisOptions = {}) {
  const redis = new Redis(url, { ...options, maxRetriesPerRequest: null });
  redis.on('error', (err) => logger.error({ err: err.message }, 'redis error'));
  return redis;
}
