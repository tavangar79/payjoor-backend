// Wishlist: list by demand, promote to shop, link to an existing shop, dismiss (PRD §9.2.2).
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { toObjectId } from '../../lib/mongo.js';
import { WISHLIST_STATUSES } from '../../models/enums.js';
import { dismiss, linkToShop, listWishlist, promote } from '../../services/wishlist.js';
import { promoteBody } from './shops.js';

export const wishlistRouter = Router();

const listQuery = z.object({
  status: z.enum(WISHLIST_STATUSES).default('open'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const linkBody = z.object({ shopId: z.string().regex(/^[0-9a-f]{24}$/i) }).strict();

function idParam(id: string) {
  const oid = toObjectId(id);
  if (!oid) throw new HttpError(404, 'not_found');
  return oid;
}

wishlistRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ ...(await listWishlist(query)), page: query.page, limit: query.limit });
});

wishlistRouter.post('/:id/promote', async (req, res) => {
  res.status(201).json(await promote(idParam(req.params.id), promoteBody.parse(req.body)));
});

wishlistRouter.post('/:id/link', async (req, res) => {
  const { shopId } = linkBody.parse(req.body);
  res.json(await linkToShop(idParam(req.params.id), toObjectId(shopId)!));
});

wishlistRouter.post('/:id/dismiss', async (req, res) => {
  res.json(await dismiss(idParam(req.params.id)));
});
