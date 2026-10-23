// Reviews: list (pending first), approve, reject (PRD §9.2.1).
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/errorHandler.js';
import { toObjectId } from '../../lib/mongo.js';
import { DIRECTIONS, OUTCOMES, REVIEW_STATUSES } from '../../models/enums.js';
import { approveReview, getReview, listReviews, rejectReview } from '../../services/reviews.js';

export const reviewsRouter = Router();

const listQuery = z.object({
  status: z.enum(REVIEW_STATUSES).default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const approveBody = z
  .object({ outcome: z.enum(OUTCOMES), direction: z.enum(DIRECTIONS), summary: z.string().trim().max(200).nullish() })
  .strict();
const rejectBody = z.object({ reason: z.string().trim().min(1).max(200) }).strict();

function idParam(id: string) {
  const oid = toObjectId(id);
  if (!oid) throw new HttpError(404, 'not_found');
  return oid;
}

reviewsRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  res.json({ ...(await listReviews(query)), page: query.page, limit: query.limit });
});

reviewsRouter.get('/:id', async (req, res) => {
  res.json(await getReview(idParam(req.params.id)));
});

reviewsRouter.post('/:id/approve', async (req, res) => {
  res.json(await approveReview(idParam(req.params.id), approveBody.parse(req.body)));
});

reviewsRouter.post('/:id/reject', async (req, res) => {
  res.json(await rejectReview(idParam(req.params.id), rejectBody.parse(req.body).reason));
});
