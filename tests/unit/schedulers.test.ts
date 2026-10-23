import { describe, expect, it, vi } from 'vitest';

const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
const getQueue = vi.fn(() => ({ upsertJobScheduler }));
vi.mock('../../src/queues/queues.js', () => ({ getQueue }));

const { registerSchedulers, SCHEDULER_TZ, TOKEN_REFRESH_CRON } = await import('../../src/queues/schedulers.js');

describe('registerSchedulers', () => {
  it('upserts the daily check and the weekly token refresh in Tehran time', async () => {
    await registerSchedulers();
    expect(SCHEDULER_TZ).toBe('Asia/Tehran');
    expect(getQueue).toHaveBeenCalledWith('apify-daily');
    expect(getQueue).toHaveBeenCalledWith('token-refresh');
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      'daily-check',
      { pattern: '0 9 * * *', tz: 'Asia/Tehran' },
      { name: 'daily-check' },
    );
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      'token-refresh',
      { pattern: TOKEN_REFRESH_CRON, tz: 'Asia/Tehran' },
      { name: 'token-refresh' },
    );
  });
});
