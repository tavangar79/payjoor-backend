// In-memory stand-in for BullMQ queues: `add` keeps one job per jobId, as BullMQ does.
// Use with: vi.mock('../../src/queues/queues.js', () => fakeQueuesModule()).
type FakeJob = { id: string; name: string; data: any; opts: { attempts: number }; attemptsMade: number };

export const queued = new Map<string, FakeJob[]>();
let counter = 0;

export function fakeQueue(name: string) {
  return {
    name,
    add: async (jobName: string, data: unknown, opts: { jobId?: string } = {}) => {
      const jobs = queued.get(name) ?? [];
      queued.set(name, jobs);
      const id = opts.jobId ?? `auto-${++counter}`;
      const existing = jobs.find((j) => j.id === id);
      if (existing) return existing;
      const job = { id, name: jobName, data: structuredClone(data), opts: { attempts: 3 }, attemptsMade: 0 };
      jobs.push(job);
      return job;
    },
    getJob: async (id: string) => (queued.get(name) ?? []).find((j) => j.id === id),
  };
}

export function fakeQueuesModule() {
  const queues = new Map<string, ReturnType<typeof fakeQueue>>();
  return {
    getQueue: (name: string) => {
      if (!queues.has(name)) queues.set(name, fakeQueue(name));
      return queues.get(name)!;
    },
    queueConnection: () => {
      throw new Error('no redis in tests');
    },
    closeQueues: async () => {},
  };
}

/** Removes and returns the jobs queued on `name`. */
export function take(name: string): FakeJob[] {
  const jobs = queued.get(name) ?? [];
  queued.set(name, []);
  return jobs;
}

export function resetQueues() {
  queued.clear();
}
