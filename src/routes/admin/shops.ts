// Shops CRUD and profile image upload (PRD §9.2.3). Refresh profile comes with the Apify profile fetch (§5.6).
import express, { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { MAX_IMAGE_BYTES } from '../../lib/imageCheck.js';
import { toObjectId } from '../../lib/mongo.js';
import { SHOP_STATUSES } from '../../models/enums.js';
import { createShop, getShop, listShops, saveShopImage, updateShop } from '../../services/shops.js';

export const shopsRouter = Router();

const objectId = z
  .string()
  .regex(/^[0-9a-f]{24}$/i)
  .transform((s) => toObjectId(s)!);
const contactField = z.string().trim().max(300).nullish();

const shopBody = z.object({
  handle: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(120),
  previousHandles: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  status: z.enum(SHOP_STATUSES).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  categoryIds: z.array(objectId).max(20).optional(),
  bio: z.string().trim().max(1000).nullish(),
  profileImageId: objectId,
  contact: z.object({ email: contactField, website: contactField, phone: contactField }).strict().optional(),
});
const createBody = shopBody.strict();
const updateBody = shopBody.partial().strict();

const listQuery = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(SHOP_STATUSES).optional(),
  categoryId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

function idParam(id: string) {
  const oid = toObjectId(id);
  if (!oid) throw new HttpError(404, 'not_found');
  return oid;
}

shopsRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  const { items, total } = await listShops(query);
  res.json({ items, total, page: query.page, limit: query.limit });
});

// Raw image bytes, checked from the bytes themselves (§5.6). Mounted before /:id.
shopsRouter.post(
  '/images',
  express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new HttpError(400, 'image_empty');
    const image = await saveShopImage(req.body);
    res.status(201).json({ ...image, url: `/media/shop/${image.sha256}` });
  },
);

shopsRouter.get('/:id', async (req, res) => {
  res.json(await getShop(idParam(req.params.id)));
});

shopsRouter.post('/', async (req, res) => {
  res.status(201).json(await createShop(createBody.parse(req.body)));
});

shopsRouter.patch('/:id', async (req, res) => {
  res.json(await updateShop(idParam(req.params.id), updateBody.parse(req.body)));
});
