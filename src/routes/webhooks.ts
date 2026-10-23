// Instagram webhooks (PRD §5.1, §10.3).
import { Router } from 'express';

export const webhooksRouter = Router();

// TODO GET /webhooks/instagram: verify hub.mode, hub.verify_token, echo hub.challenge.
// TODO POST /webhooks/instagram: express.raw() body, check X-Hub-Signature-256,
// enqueue one dm-inbound job per message with jobId = mid, return 200 at once.
