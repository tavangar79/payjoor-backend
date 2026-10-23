// Apify REST client (PRD §6.2): start a run, poll until it ends, read the dataset, read monthly usage.
// No run-sync (it times out after 300 s). The token goes in the Authorization header, never in a URL or a log.
import { env } from '../config/env.js';

const API = 'https://api.apify.com/v2';

export type ApifyRun = {
  id: string;
  actId?: string;
  status: string;
  defaultDatasetId: string;
  usageTotalUsd?: number;
};

export type ApifyUsage = { monthlyUsageUsd: number; maxMonthlyUsageUsd: number | null };

export class ApifyError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    // 429, 5xx and network errors can be retried; other 4xx can't.
    readonly retryable = status === undefined || status === 429 || status >= 500,
  ) {
    super(message);
    this.name = 'ApifyError';
  }
}

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);

type Fetch = typeof fetch;
export type ApifyClientOptions = { token?: string; fetch?: Fetch };

async function call<T>(path: string, init: RequestInit & { fetch?: Fetch; token?: string } = {}): Promise<T> {
  const { fetch: fetchImpl = fetch, token = env.APIFY_TOKEN, ...rest } = init;
  let res: Response;
  try {
    res = await fetchImpl(`${API}${path}`, {
      ...rest,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...rest.headers },
      signal: rest.signal ?? AbortSignal.timeout(90_000),
    });
  } catch (err) {
    throw new ApifyError(`apify request failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { type?: string; message?: string } } | null;
    throw new ApifyError(`apify ${res.status}: ${body?.error?.type ?? body?.error?.message ?? res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

/** `actor` is `user~name`, e.g. `apify~instagram-profile-scraper`. */
export async function startRun(actor: string, input: unknown, opts: ApifyClientOptions = {}): Promise<ApifyRun> {
  const { data } = await call<{ data: ApifyRun }>(`/acts/${encodeURIComponent(actor)}/runs`, {
    method: 'POST',
    body: JSON.stringify(input),
    ...opts,
  });
  return data;
}

/** Long-polls the run (60 s per request) until it ends. Throws unless it SUCCEEDED; the error carries the run. */
export async function waitForRun(
  runId: string,
  opts: ApifyClientOptions & { timeoutMs?: number } = {},
): Promise<ApifyRun> {
  const { timeoutMs = 15 * 60_000, ...clientOpts } = opts;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await call<{ data: ApifyRun }>(
      `/actor-runs/${encodeURIComponent(runId)}?waitForFinish=60`,
      clientOpts,
    );
    if (TERMINAL.has(data.status)) {
      if (data.status !== 'SUCCEEDED') throw Object.assign(new ApifyError(`apify run ${data.status}`, undefined, false), { run: data });
      return data;
    }
    if (Date.now() > deadline) throw new ApifyError(`apify run still ${data.status} after ${timeoutMs} ms`, undefined, false);
  }
}

export async function getDatasetItems<T = Record<string, unknown>>(
  datasetId: string,
  opts: ApifyClientOptions = {},
): Promise<T[]> {
  return call<T[]>(`/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`, opts);
}

/** This month's usage and the account's hard limit (`GET /v2/users/me/limits`). */
export async function getUsage(opts: ApifyClientOptions = {}): Promise<ApifyUsage> {
  const { data } = await call<{
    data: { current?: { monthlyUsageUsd?: number }; limits?: { maxMonthlyUsageUsd?: number } };
  }>('/users/me/limits', opts);
  return {
    monthlyUsageUsd: data.current?.monthlyUsageUsd ?? 0,
    maxMonthlyUsageUsd: data.limits?.maxMonthlyUsageUsd ?? null,
  };
}

/** Start, wait and read in one go. `onStart` lets the caller record the run id before waiting. */
export async function runActor<T = Record<string, unknown>>(
  actor: string,
  input: unknown,
  opts: ApifyClientOptions & { onStart?: (run: ApifyRun) => void; timeoutMs?: number } = {},
): Promise<{ run: ApifyRun; items: T[] }> {
  const { onStart, timeoutMs, ...clientOpts } = opts;
  const started = await startRun(actor, input, clientOpts);
  onStart?.(started);
  const run = await waitForRun(started.id, { ...clientOpts, timeoutMs });
  const items = await getDatasetItems<T>(run.defaultDatasetId, clientOpts);
  return { run, items };
}
