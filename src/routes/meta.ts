// Meta callbacks (PRD §7.3).
import { Router } from 'express';

export const metaRouter = Router();

// TODO POST /meta/deauthorize: verify signed_request, respond 200.
// TODO POST /meta/data-deletion: verify signed_request, delete the user's data,
// store a deletionRequests record, return { url, confirmation_code }.
