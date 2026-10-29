// Security headers (PRD §12). Nothing here blocks crawlers or bots: Meta's reviewers and
// `facebookexternalhit` must reach the public pages (§7.3). This is an API: the website (web/) and the
// admin app (admin/) set their own Content-Security-Policy.
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};
