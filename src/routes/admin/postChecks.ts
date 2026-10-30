// Trusted-post review queue: list, publish by a person, dismiss, rerun (PRD §6, §9.2.1).
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { toObjectId } from '../../lib/mongo.js';
import { DIRECTIONS, OUTCOMES, POST_CHECK_STATUSES } from '../../models/enums.js';
import { dismissPostCheck, listPostChecks, publishByPerson, rerunPostCheck } from '../../services/postChecks.js';

export const postChecksRouter = Router();

const objectId = z
  .string()
  .regex(/^[0-9a-f]{24}$/i)
  .transform((s) => toObjectId(s)!);

const listQuery = z.object({
  status: z.enum([...POST_CHECK_STATUSES, 'failed']).default('needs_person'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const publishBody = z
  .object({
    shopIds: z.array(objectId).min(1).max(10),
    outcome: z.enum(OUTCOMES),
    direction: z.enum(DIRECTIONS),
    summary: z.string().trim().max(1000).optional(),
    scamClaim: z.boolean().optional(),
    category: z.string().trim().max(80).optional(),
  })
  .strict();

function idParam(id: string) {
  const oid = toObjectId(id);
  if (!oid) throw new HttpError(404, 'not_found');
  return oid;
}

postChecksRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  const { items, total } = await listPostChecks(query);
  res.json({ items, total, page: query.page, limit: query.limit });
});

postChecksRouter.post('/:id/publish', async (req, res) => {
  res.json(await publishByPerson(idParam(req.params.id), publishBody.parse(req.body)));
});

postChecksRouter.post('/:id/dismiss', async (req, res) => {
  res.json(await dismissPostCheck(idParam(req.params.id)));
});

postChecksRouter.post('/:id/rerun', async (req, res) => {
  res.status(202).json(await rerunPostCheck(idParam(req.params.id)));
});
