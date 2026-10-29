import { describe, expect, it, vi } from 'vitest';

const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
const getQueue = vi.fn(() => ({ upsertJobScheduler }));
vi.mock('../../src/queues/queues.js', () => ({ getQueue }));

const { registerSchedulers, SCHEDULER_TZ } = await import('../../src/queues/schedulers.js');

describe('registerSchedulers', () => {
  it('upserts the daily check in Tehran time', async () => {
    await registerSchedulers();
    expect(SCHEDULER_TZ).toBe('Asia/Tehran');
    expect(getQueue).toHaveBeenCalledWith('apify-daily');
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      'daily-check',
      { pattern: '0 9 * * *', tz: 'Asia/Tehran' },
      { name: 'daily-check' },
    );
  });
});
