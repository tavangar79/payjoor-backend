// Admin panel: built admin/ app, JSON API and Bull Board (PRD §9, §11).
import { Router } from 'express';
import { authRouter } from './auth.js';
import { reviewsRouter } from './reviews.js';
import { wishlistRouter } from './wishlist.js';
import { shopsRouter } from './shops.js';
import { categoriesRouter } from './categories.js';
import { reviewerSourcesRouter } from './reviewerSources.js';
import { jobsRouter } from './jobs.js';

export const adminRouter = Router();

// TODO session + CSRF middleware on /api (writes) and /queues.
adminRouter.use('/api/auth', authRouter);
adminRouter.use('/api/reviews', reviewsRouter);
adminRouter.use('/api/wishlist', wishlistRouter);
adminRouter.use('/api/shops', shopsRouter);
adminRouter.use('/api/categories', categoriesRouter);
adminRouter.use('/api/reviewer-sources', reviewerSourcesRouter);
adminRouter.use('/api/jobs', jobsRouter);

// TODO mount Bull Board at /queues behind the admin login.
// TODO serve ../admin/dist statically, falling back to index.html for client routes.
