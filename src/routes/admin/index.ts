// Admin panel: built admin/ app, JSON API and Bull Board (PRD §9, §11).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Router } from 'express';
import { requireAdmin } from '../../auth/session.js';
import { requireCsrf } from '../../auth/csrf.js';
import { authRouter } from './auth.js';
import { reviewsRouter } from './reviews.js';
import { wishlistRouter } from './wishlist.js';
import { shopsRouter } from './shops.js';
import { categoriesRouter } from './categories.js';
import { reviewerSourcesRouter } from './reviewerSources.js';
import { jobsRouter } from './jobs.js';
import { queuesBoard, requireAdminPage, requireSameOrigin } from './queuesBoard.js';

export const adminRouter = Router();

// JSON only: a cross-site HTML form can't send application/json, which also guards the login form.
adminRouter.use('/api', express.json({ limit: '100kb' }));

// Login, logout and /me handle their own session and CSRF checks.
adminRouter.use('/api/auth', authRouter);

// Everything else needs a session, and a CSRF token on writes.
adminRouter.use('/api', requireAdmin, requireCsrf);
adminRouter.use('/api/reviews', reviewsRouter);
adminRouter.use('/api/wishlist', wishlistRouter);
adminRouter.use('/api/shops', shopsRouter);
adminRouter.use('/api/categories', categoriesRouter);
adminRouter.use('/api/reviewer-sources', reviewerSourcesRouter);
adminRouter.use('/api/jobs', jobsRouter);
adminRouter.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Bull Board, behind the admin login (§11).
adminRouter.use('/queues', requireAdminPage, requireSameOrigin, queuesBoard);

// The built admin/ app (§9): hashed assets cached forever, index.html for every client route.
export const ADMIN_DIST = fileURLToPath(new URL('../../../../admin/dist', import.meta.url));
adminRouter.use('/assets', express.static(path.join(ADMIN_DIST, 'assets'), { immutable: true, maxAge: '1y', index: false }));
adminRouter.use(express.static(ADMIN_DIST, { index: false }));
adminRouter.get(/.*/, (_req, res) => {
  res.set({ 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex' });
  res.sendFile(path.join(ADMIN_DIST, 'index.html'), (err) => {
    if (err && !res.headersSent) res.status(503).type('text/plain').send('Admin build not found. Run `npm run build -w admin`.');
  });
});
