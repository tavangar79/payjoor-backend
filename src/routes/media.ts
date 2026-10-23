// Shop profile images (PRD §8 shopImages, §12). The URL is the content hash, so it can be cached forever.
import { Router } from 'express';
import { ShopImage } from '../models/ShopImage.js';

export const mediaRouter = Router();

mediaRouter.get('/shop/:sha256', async (req, res) => {
  const { sha256 } = req.params;
  const image = /^[0-9a-f]{64}$/.test(sha256) ? await ShopImage.findOne({ sha256 }) : null;
  res.set('X-Content-Type-Options', 'nosniff');
  if (!image) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.set({
    'Content-Type': image.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'",
    ETag: `"${sha256}"`,
  });
  if (req.get('If-None-Match') === `"${sha256}"`) {
    res.status(304).end();
    return;
  }
  res.send(Buffer.from(image.data));
});
