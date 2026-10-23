// Instagram webhooks (PRD §5.1, §10.3).
import { Router } from 'express';
import { env } from '../config/env.js';

export const webhooksRouter = Router();

// Subscription check: echo hub.challenge when the verify token matches.
webhooksRouter.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN && typeof challenge === 'string') {
    res.type('text/plain').send(challenge);
    return;
  }
  res.sendStatus(403);
});
