# backend/

API only: Express web process (`src/server.ts`) and BullMQ worker process (`src/worker.ts`). The website (`web/`) and admin app (`admin/`) run as their own services. See the root `CLAUDE.md` and PRD §5, §6, §8, §10, §11, §12.

## Structure

- `src/bot/`: parse, resolve, lookup, reply. **Pure and transport-agnostic**: no Express, BullMQ or Graph API imports here (PRD §10.8).
- `src/boxapi/`: **the** Instagram and AI integration (BoxAPI: DM, Data and AI APIs, webhook signature). Use the `boxapi` skill. `src/services/`: domain logic shared by routes and workers (e.g. `reviewerPosts.ts` for the backfill and daily check, `postOwners.ts`).
- `src/models/`: one Mongoose model per collection in PRD §8. `src/queues/`: queue names, instances, schedulers, `workers/`.
- `src/routes/`: webhooks, media, `public.ts` (`/api/deletion-status` for the website), `admin/` JSON API and Bull Board. No HTML pages.
- `src/auth/`, `src/lib/encryptField.ts`: copied from pagesanj; keep formats byte-compatible (PRD §9.1).

## Rules

- ESM with NodeNext: relative imports end in `.js`.
- Config only via `src/config/env.ts` (zod). Add new variables there and to `.env.example`.
- Log with `logger` / `jobLogger` from `src/lib/logger.ts`. Never log tokens or message text at info; message bodies go under `debugText` at debug.
- Webhook routes read the raw body for HMAC checks; don't put a JSON parser in front of them. BoxAPI DMs arrive on `POST /webhooks/boxapi` (`X-BoxApi-Signature`, `BOXAPI_WEBHOOK_SECRET`).
- No cost or budget tracking for external APIs.
- Tests: vitest in `tests/` (`unit/`, `integration/` with mongodb-memory-server). Build parsers from real payloads in `tests/fixtures/` (`boxapi/` holds real Data API responses).

## Commands

`npm run dev`, `npm run dev:worker`, `npm run typecheck`, `npm test` (run inside `backend/` or with `-w backend`).

## graphify

Graph: `backend/graphify-out/`. Rebuild after changes with `graphify update backend` from the repo root.
