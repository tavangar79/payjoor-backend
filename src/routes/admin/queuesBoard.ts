// Bull Board at /admin/queues, behind the admin login (PRD §9.1, §11).
import type { RequestHandler } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getAdmin } from '../../auth/session.js';
import { allQueues } from '../../queues/queues.js';

export const QUEUES_BASE_PATH = '/admin/queues';

/** Sends a signed-out browser to the admin login page; API calls get a 401. */
export const requireAdminPage: RequestHandler = async (req, res, next) => {
  const admin = await getAdmin(req);
  if (admin) {
    req.admin = admin;
    return next();
  }
  if (req.method === 'GET' && req.accepts(['html', 'json']) === 'html') {
    res.redirect('/admin/login');
    return;
  }
  res.status(401).json({ error: 'unauthorized' });
};

/**
 * Bull Board's own API can't send our CSRF header, so its writes (retry, clean, ...) must come from
 * our own origin. This backs up the sameSite=strict session cookie.
 */
export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const site = req.get('sec-fetch-site');
  const origin = req.get('origin');
  const sameSite = site ? site === 'same-origin' : origin ? originHost(origin) === req.get('host') : false;
  if (!sameSite) {
    res.status(403).json({ error: 'cross_origin' });
    return;
  }
  next();
};

function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

// Built on first use, so creating the app doesn't open Redis connections.
let boardRouter: ReturnType<ExpressAdapter['getRouter']> | undefined;

export const queuesBoard: RequestHandler = (req, res, next) => {
  if (!boardRouter) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(QUEUES_BASE_PATH);
    createBullBoard({ queues: allQueues().map((q) => new BullMQAdapter(q)), serverAdapter });
    boardRouter = serverAdapter.getRouter();
  }
  boardRouter(req, res, next);
};
