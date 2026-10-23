# backend/

Express web process (`src/server.ts`) and BullMQ worker process (`src/worker.ts`). See the root `CLAUDE.md` and PRD §5, §6, §8, §10, §11, §12.

## Structure

- `src/bot/`: parse, resolve, lookup, reply. **Pure and transport-agnostic**: no Express, BullMQ or Graph API imports here (PRD §10.8).
- `src/meta/`, `src/apify/`: external integrations. `src/services/`: domain logic shared by routes and workers.
- `src/models/`: one Mongoose model per collection in PRD §8. `src/queues/`: queue names, instances, schedulers, `workers/`.
- `src/routes/`: webhooks, meta callbacks, media, landing (renders `../web/dist`), `admin/` JSON API (serves `../admin/dist`).
- `src/auth/`, `src/lib/encryptField.ts`: copied from trust-me; keep formats byte-compatible (PRD §9.1).

## Rules

- ESM with NodeNext: relative imports end in `.js`.
- Config only via `src/config/env.ts` (zod). Add new variables there and to `.env.example`.
- Log with `logger` / `jobLogger` from `src/lib/logger.ts`. Never log tokens or message text at info; message bodies go under `debugText` at debug.
- Webhook routes read the raw body for HMAC checks; don't put a JSON parser in front of them.
- Every Apify call goes through `src/apify/client.ts` and the budget guard, and records a `jobRuns` entry.
- Tests: vitest in `tests/` (`unit/`, `integration/` with mongodb-memory-server). Build parsers from real payloads in `tests/fixtures/`.

## Commands

`npm run dev`, `npm run dev:worker`, `npm run typecheck`, `npm test` (run inside `backend/` or with `-w backend`).

## graphify

Graph: `backend/graphify-out/`. Rebuild after changes with `graphify update backend` from the repo root.
