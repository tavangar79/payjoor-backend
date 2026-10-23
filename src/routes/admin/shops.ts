// Shops CRUD, profile image upload, and profile fetch from Instagram via the apify-profile queue (PRD §5.6, §9.2.3).
import express, { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { MAX_IMAGE_BYTES } from '../../lib/imageCheck.js';
import { normalizeHandle } from '../../lib/handle.js';
import { toObjectId } from '../../lib/mongo.js';
import { SHOP_STATUSES } from '../../models/enums.js';
import { createShop, getShop, listShops, saveShopImage, updateShop } from '../../services/shops.js';
import { QUEUES } from '../../queues/names.js';
import { getQueue } from '../../queues/queues.js';
import type { ProfileJobData } from '../../queues/workers/apifyProfile.worker.js';

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
// profileFetchedAt comes from the profile-preview draft the form was filled from.
const createBody = shopBody.extend({ profileFetchedAt: z.coerce.date().optional() }).strict();
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

// Profile fetch (§5.6): the job runs in the worker; the admin app polls GET /profile-jobs/:jobId.
async function enqueueProfile(data: ProfileJobData) {
  const job = await getQueue(QUEUES.apifyProfile).add('profile', data);
  return { jobId: job.id };
}

shopsRouter.post('/profile-preview', async (req, res) => {
  const { handle } = z.object({ handle: z.string().trim().min(1).max(64) }).parse(req.body);
  const normalized = normalizeHandle(handle);
  if (!normalized) throw new HttpError(400, 'invalid_handle');
  res.status(202).json(await enqueueProfile({ handle: normalized }));
});

shopsRouter.get('/profile-jobs/:jobId', async (req, res) => {
  const job = await getQueue(QUEUES.apifyProfile).getJob(req.params.jobId);
  if (!job) throw new HttpError(404, 'not_found');
  const state = await job.getState();
  res.json({
    state,
    ...(state === 'completed' && { result: job.returnvalue }),
    ...(state === 'failed' && { error: job.failedReason }),
  });
});

shopsRouter.post('/:id/refresh-profile', async (req, res) => {
  const shop = await getShop(idParam(req.params.id));
  res.status(202).json(await enqueueProfile({ handle: shop.handle, shopId: String(shop._id) }));
});

shopsRouter.get('/:id', async (req, res) => {
  res.json(await getShop(idParam(req.params.id)));
});

shopsRouter.post('/', async (req, res) => {
  res.status(201).json(await createShop(createBody.parse(req.body)));
});

shopsRouter.patch('/:id', async (req, res) => {
  res.json(await updateShop(idParam(req.params.id), updateBody.parse(req.body)));
});
