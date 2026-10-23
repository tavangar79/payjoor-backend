// Categories CRUD with shop counts (PRD §9.2.4).
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { toObjectId } from '../../lib/mongo.js';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../services/categories.js';

export const categoriesRouter = Router();

const name = z.string().trim().min(1).max(80);
const createBody = z.object({
  name,
  nameEn: name.nullish(),
  slug: z.string().trim().min(1).max(80).optional(),
});
const updateBody = z
  .object({ name: name.optional(), nameEn: name.nullish() })
  .refine((b) => b.name !== undefined || b.nameEn !== undefined, 'nothing_to_update');

function idParam(id: string) {
  const oid = toObjectId(id);
  if (!oid) throw new HttpError(404, 'not_found');
  return oid;
}

categoriesRouter.get('/', async (_req, res) => {
  res.json({ items: await listCategories() });
});

categoriesRouter.post('/', async (req, res) => {
  res.status(201).json(await createCategory(createBody.parse(req.body)));
});

categoriesRouter.patch('/:id', async (req, res) => {
  res.json(await updateCategory(idParam(req.params.id), updateBody.parse(req.body)));
});

categoriesRouter.delete('/:id', async (req, res) => {
  await deleteCategory(idParam(req.params.id));
  res.status(204).end();
});
