// A fetch stand-in for Apify and CDN calls: the first route whose pattern matches the URL answers.
import { vi } from 'vitest';

export type Route = [pattern: RegExp, reply: (url: string, init?: RequestInit) => Response | Promise<Response>];

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function fakeFetch(routes: Route[]) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const route = routes.find(([pattern]) => pattern.test(url));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return route[1](url, init);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

/** Routes for one successful actor run that returns `items`. */
export function apifyRoutes(items: unknown[], opts: { usageUsd?: number; maxUsd?: number; costUsd?: number } = {}): Route[] {
  const run = { id: 'run1', status: 'SUCCEEDED', defaultDatasetId: 'ds1', usageTotalUsd: opts.costUsd ?? 0.0026 };
  return [
    [/\/users\/me\/limits$/, () => json({ data: { current: { monthlyUsageUsd: opts.usageUsd ?? 1 }, limits: { maxMonthlyUsageUsd: opts.maxUsd ?? 5 } } })],
    [/\/acts\/[^/]+\/runs$/, () => json({ data: { ...run, status: 'READY' } }, 201)],
    [/\/actor-runs\/run1/, () => json({ data: run })],
    [/\/datasets\/ds1\/items/, () => json(items)],
  ];
}
