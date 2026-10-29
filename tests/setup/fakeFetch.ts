// A fetch stand-in for BoxAPI and CDN calls: the first route whose pattern matches the URL answers.
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

/** A Data API answer, wrapped the way BoxAPI wraps Instagram's response. */
export const boxapiBody = (body: unknown, statusCode = 200) =>
  json({ status: 'done', response: { status_code: statusCode, content_type: 'application/json', body } });

/** A route for one Data API endpoint, e.g. `dataRoute('user/get_info_by_username', ...)`. */
export const dataRoute = (endpoint: string, reply: Route[1]): Route => [new RegExp(`/api/instagram/${endpoint}$`), reply];

/** The JSON body of each Data API call `f` made, in order. */
export const dataCalls = (f: ReturnType<typeof fakeFetch>) =>
  f.mock.calls.filter(([u]) => String(u).includes('/api/instagram/')).map(([, init]) => JSON.parse(String((init as RequestInit).body)));
