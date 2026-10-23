// Security headers (PRD §12). Nothing here blocks crawlers or bots: Meta's reviewers and
// `facebookexternalhit` must reach the public pages (§7.3).
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

// The website and admin app load only their own built scripts, styles and fonts; images may come from the
// Instagram CDN in the admin panel (review thumbnails).
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

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

/** For HTML we build (website, admin app). Not on Bull Board, whose UI needs inline scripts. */
export const contentSecurityPolicy: RequestHandler = (_req, res, next) => {
  res.set('Content-Security-Policy', CSP);
  next();
};
