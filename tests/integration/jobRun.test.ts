import { describe, expect, it } from 'vitest';
import { useMongo } from '../setup/mongo.js';
import { finishJobRun, startJobRun, withJobRun } from '../../src/jobs/jobRun.js';
import { JobRun } from '../../src/models/JobRun.js';

useMongo();

describe('jobRun', () => {
  it('starts and finishes a run', async () => {
    const id = await startJobRun('daily_check');
    const started = (await JobRun.findById(id).lean())!;
    expect(started.finishedAt).toBeUndefined();
    await finishJobRun(id, { counts: { postsFetched: 3 } });
    const done = (await JobRun.findById(id).lean())!;
    expect(done).toMatchObject({ counts: { postsFetched: 3 } });
    expect(done.finishedAt).toBeInstanceOf(Date);
  });

  it('withJobRun saves counts on success', async () => {
    const out = await withJobRun('backfill', async (ctx) => {
      ctx.counts.reviewsCreated = 2;
      return 'ok';
    });
    expect(out).toBe('ok');
    const run = (await JobRun.findOne({ type: 'backfill' }).lean())!;
    expect(run).toMatchObject({ counts: { reviewsCreated: 2 } });
    expect(run.error).toBeUndefined();
  });

  it('withJobRun records the error and partial counts, then rethrows', async () => {
    await expect(
      withJobRun('post_owner_lookup', async (ctx) => {
        ctx.counts.tried = 1;
        throw new Error('boxapi timeout');
      }),
    ).rejects.toThrow('boxapi timeout');
    const run = (await JobRun.findOne({ type: 'post_owner_lookup' }).lean())!;
    expect(run).toMatchObject({ error: 'boxapi timeout', counts: { tried: 1 } });
    expect(run.finishedAt).toBeInstanceOf(Date);
  });
});
