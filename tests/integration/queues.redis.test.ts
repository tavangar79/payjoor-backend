// Needs a real Redis at REDIS_URL (BullMQ runs Lua scripts, so there's no in-memory stand-in).
// Skipped when none is reachable; start one with: docker run -d -p 6379:6379 redis:7 --maxmemory-policy noeviction
import { afterAll, describe, expect, it } from 'vitest';
import { connect } from 'node:net';
import type { Job } from 'bullmq';
import { closeQueues, getQueue } from '../../src/queues/queues.js';
import { registerSchedulers } from '../../src/queues/schedulers.js';
import { closeWorkers, startWorkers } from '../../src/queues/startWorkers.js';

const redisUp = await new Promise<boolean>((resolve) => {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const socket = connect(Number(url.port || 6379), url.hostname);
  socket.once('connect', () => (socket.end(), resolve(true)));
  socket.once('error', () => resolve(false));
});

describe.skipIf(!redisUp)('queues on Redis', () => {
  afterAll(async () => {
    await closeQueues();
  });

  it('dedupes jobs by jobId (Meta webhook retries, §5.1)', async () => {
    const q = getQueue('dm-inbound');
    await q.obliterate({ force: true });
    await q.add('dm', { mid: 'm1' }, { jobId: 'm1' });
    await q.add('dm', { mid: 'm1' }, { jobId: 'm1' });
    expect(await q.getJobCountByTypes('waiting', 'delayed', 'active')).toBe(1);
    await q.obliterate({ force: true });
  });

  it('runs a job through a started worker with retries configured', async () => {
    const q = getQueue('post-owner');
    await q.obliterate({ force: true });
    let seen: Job | undefined;
    const done = new Promise<void>((resolve) => {
      const workers = startWorkers([
        {
          queue: 'post-owner',
          processor: async (job) => {
            seen = job;
            setImmediate(() => void closeWorkers(workers).then(resolve));
            return 'ok';
          },
        },
      ]);
    });
    await q.add('lookup', { shortcode: 'abc' });
    await done;
    expect(seen?.data).toEqual({ shortcode: 'abc' });
    expect(seen?.opts.attempts).toBe(3);
    await q.obliterate({ force: true });
  });

  it('registers both schedulers in Asia/Tehran', async () => {
    await registerSchedulers();
    const daily = await getQueue('apify-daily').getJobScheduler('daily-check');
    const token = await getQueue('token-refresh').getJobScheduler('token-refresh');
    expect(daily).toMatchObject({ pattern: '0 9 * * *', tz: 'Asia/Tehran' });
    expect(token).toMatchObject({ tz: 'Asia/Tehran' });
    await getQueue('apify-daily').removeJobScheduler('daily-check');
    await getQueue('token-refresh').removeJobScheduler('token-refresh');
  });
});
