// Admin panel: built admin/ app, JSON API and Bull Board (PRD §9, §11).
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

// TODO mount Bull Board at /queues behind the admin login.
// TODO serve ../admin/dist statically, falling back to index.html for client routes.
