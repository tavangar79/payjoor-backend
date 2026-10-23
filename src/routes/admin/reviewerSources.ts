// Reviewer sources: add, edit, follow, run backfill (PRD §9.2.5).
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { toObjectId } from '../../lib/mongo.js';
import { REVIEWER_PERMISSIONS } from '../../models/enums.js';
import { ReviewerSource } from '../../models/ReviewerSource.js';
import { createSource, enqueueBackfill, listSources, updateSource } from '../../services/reviewerSources.js';

export const reviewerSourcesRouter = Router();

const fields = {
  name: z.string().trim().min(1).max(120),
  follow: z.boolean(),
  backfillLimit: z.number().int().min(0).max(500),
  permission: z.enum(REVIEWER_PERMISSIONS),
};
const createBody = z
  .object({ handle: z.string().trim().min(1).max(64), ...fields })
  .partial({ follow: true, backfillLimit: true, permission: true })
  .strict();
const updateBody = z.object(fields).partial().strict();

function idParam(id: string) {
  const oid = toObjectId(id);
  if (!oid) throw new HttpError(404, 'not_found');
  return oid;
}

reviewerSourcesRouter.get('/', async (_req, res) => {
  res.json({ items: await listSources() });
});

reviewerSourcesRouter.post('/', async (req, res) => {
  res.status(201).json(await createSource(createBody.parse(req.body)));
});

reviewerSourcesRouter.patch('/:id', async (req, res) => {
  res.json(await updateSource(idParam(req.params.id), updateBody.parse(req.body)));
});

reviewerSourcesRouter.post('/:id/backfill', async (req, res) => {
  const id = idParam(req.params.id);
  if (!(await ReviewerSource.exists({ _id: id }))) throw new HttpError(404, 'not_found');
  res.status(202).json(await enqueueBackfill(id, true));
});
