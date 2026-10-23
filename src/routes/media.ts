// Shop profile images (PRD §8 shopImages, §12).
import { Router } from 'express';

export const mediaRouter = Router();

// TODO GET /media/shop/:sha256: serve from shopImages with the stored mime,
// X-Content-Type-Options: nosniff and an immutable cache header.
