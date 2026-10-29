// Public JSON API for the website (PRD §7.3): the data-deletion status page reads a request's status here.
import { Router } from 'express';
import { getDeletionStatus } from '../services/deletion.js';

export const publicRouter = Router();

publicRouter.get('/deletion-status', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  res.set('Cache-Control', 'no-store').json({ status: code ? await getDeletionStatus(code) : null });
});
