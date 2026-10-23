# Backend build plan (pagesanj) — micro-task todo list

## Context

The repo has a skeleton only: every file under `backend/src/` is a 2–10 line stub (header comment + `export {}` or TODOs). Only `config/env.ts`, `lib/logger.ts`, `app.ts`, `server.ts` and `queues/names.ts` contain real code. The goal is to build the whole backend first (PRD §5–§12), before the admin and web UIs, in small verifiable steps that follow the PRD milestones (M0–M4).

Reuse source: the trust-me repo is at `E:\Projects\trust-me`. Copy byte-compatible from it:
- `src/server/crypto.ts` (+ test) → `backend/src/lib/encryptField.ts`
- `src/server/auth/{totp,password,login,session,cookie,client-ip}.ts` (+ tests) → `backend/src/auth/`
- `src/domain/normalize.ts` → `backend/src/lib/normalizeFa.ts`
- `OUTCOMES` enum from `src/domain/types.ts`
trust-me is Next.js, so strip Next-specific bits (cookies() API, server actions) and adapt to Express; keep formats identical.

## Conventions for every task

- One task = one small module (+ its test) and must leave `npm run typecheck` and `npm test` green.
- Header comment naming the PRD section, `.js` import extensions, zod at boundaries, `jobLogger` in workers.
- Unit tests in `backend/tests/unit/`, DB tests in `backend/tests/integration/` with mongodb-memory-server.
- Commit after each phase; `graphify update backend` at the end of each phase.

---

## Phase 0 — Foundations

- [x] 0.1 Add deps: `ioredis` (have), `cookie-parser` or own cookie helper, `zod` (have), dev: `supertest`, `@types/supertest`. Decide `nanoid`/`crypto.randomUUID` for codes (prefer `node:crypto`). *Done: added supertest + @types/supertest; no cookie-parser (cookie helper comes from trust-me in 2.3); codes use `node:crypto`.*
- [x] 0.2 `tests/setup/mongo.ts`: mongodb-memory-server helper (start, connect mongoose, clear collections, stop); wire as vitest `globalSetup`/helper. Test env vars via `vitest.config.ts` `env` so `config/env.ts` parses in tests.
- [x] 0.3 `lib/db.ts`: `connectDb()` / `disconnectDb()` with mongoose, logs host only.
- [x] 0.4 `lib/redis.ts`: `createRedis()` ioredis connection with `maxRetriesPerRequest: null` (BullMQ requirement).
- [x] 0.5 `server.ts`: connect DB before listen; graceful shutdown on SIGTERM/SIGINT.
- [x] 0.6 `app.ts` + `lib/errorHandler.ts` (with `HttpError`): error handler middleware (zod error → 400, unknown → 500, no stack in prod); `/healthz` checks mongo state.
- [x] 0.7 `lib/handle.ts` + test: `normalizeHandle()` (lowercase, strip `@`, trailing `/`, query string, validate `[a-z0-9._]{1,30}`).
- [x] 0.8 `lib/normalizeFa.ts` + test: copy from trust-me.
- [x] 0.9 `lib/encryptField.ts` + test: copy trust-me `crypto.ts` (AES-256-GCM, `v1:<iv>:<tag>:<ct>`, AAD). Add test that decrypts a fixture produced by trust-me. *Also: `DATA_ENCRYPTION_KEY` in `env.ts` now parses to a 32-byte Buffer, as in trust-me.*
- [x] 0.10 `lib/imageCheck.ts` + test: sniff JPEG/PNG/WebP magic bytes, enforce ≤2 MB, return `{ mime, sha256 }`.

## Phase 1 — Models (PRD §8), one task each, with an integration test for indexes/validation

*Done: shared enums in `models/enums.ts`; all model tests in `tests/integration/models.test.ts`. `jobRuns.type` gained `profile_fetch` (PRD §8 updated). `npm run typecheck` now also checks `tests/` and `scripts/` (`tsconfig.test.json`). `vitest.config.ts` pins `MONGOMS_DOWNLOAD_DIR` so tests reuse one mongod binary from the root or from `backend/`.*

- [x] 1.1 `Category` (unique `nameNormalized`, `slug`).
- [x] 1.2 `ShopImage` (binary `data`, `mime`, unique `sha256`).
- [x] 1.3 `Shop` (unique `slug`, `handle`; index `previousHandles`; `status` enum; `profileImage` required; `contact`).
- [x] 1.4 `ReviewerSource`.
- [x] 1.5 `Wishlist` (unique `handle`, `sources` enum[], `status`).
- [x] 1.6 `Review` (exactly one of `shopId`/`wishlistId` validator; unique partial index on (`shopId`,`postShortcode`) and (`wishlistId`,`postShortcode`) where status ∈ pending|published; `OUTCOMES` enum).
- [x] 1.7 `PostOwner` (unique `shortcode`).
- [x] 1.8 `DmEvent` (unique `mid`, TTL 90 days on `receivedAt`).
- [x] 1.9 `JobRun`.
- [x] 1.10 `DeletionRequest` (unique `confirmationCode`, index `igsidHash`).
- [x] 1.11 `MetaToken` (singleton).
- [x] 1.12 `Admin` + `LoginAttempt` (match trust-me field names/formats).
- [x] 1.13 `models/index.ts` barrel + `syncIndexes()` call at startup in dev.

## Phase 2 — Admin auth (PRD §9.1)

*Done. Differences from the task list: trust-me's `client-ip.ts` is replaced by Express `trust proxy` behind a new `TRUST_PROXY` env var (lockout keys on `req.ip`); there is no separate `/csrf` route, the CSRF token comes back from `POST /login` and `GET /me`; the import logic lives in `src/auth/importAdmin.ts` so it can be tested; logins are logged with pino instead of trust-me's audit collection. Session cookie is `ps_admin` (path `/admin`, httpOnly, sameSite strict, secure in production, 12 h). The admin API only accepts JSON.*

- [x] 2.1 `auth/password.ts` + test: copy trust-me scrypt (`scrypt$N$r$p$salt$hash`).
- [x] 2.2 `auth/totp.ts` + test: copy trust-me (SHA-1, 6 digits, ±1 step, constant-time, returns step).
- [x] 2.3 `auth/session.ts` + test: copy trust-me signed-cookie session; Express `requireAdmin` middleware sets `req.admin`.
- [x] 2.4 `auth/csrf.ts` + test: per-session token (HMAC of session id), `GET /admin/api/auth/csrf`, middleware checks `X-CSRF-Token` on non-GET.
- [x] 2.5 `auth/login.ts` + integration test: copy trust-me lockout (reserve attempt before check, 5/15min, same error message), atomic `lastTotpStep` update.
- [x] 2.6 `routes/admin/auth.ts`: `POST /login`, `POST /logout`, `GET /me`; supertest test.
- [x] 2.7 `routes/admin/index.ts`: mount `requireAdmin` + CSRF on all `/api/*` except login/csrf.
- [x] 2.8 `scripts/admin-create.ts`: reads `ADMIN_PASSWORD`, prints `otpauth://` (issuer `TrustMe`) once.
- [x] 2.9 `scripts/admin-import.ts`: read-only connect to `TRUSTME_MONGODB_URI`, copy `username, passwordHash, totpSecretEnc, role`.

## Phase 3 — Queues infrastructure (PRD §5.1, §11)

- [ ] 3.1 `queues/queues.ts`: one `Queue` per name with default job opts (3 attempts, exponential backoff, removeOnComplete limits).
- [ ] 3.2 `jobs/jobRun.ts` + test: `startJobRun(type)` / `finishJobRun(id, {counts, costUsd, apifyRunId, error})`.
- [ ] 3.3 `worker.ts`: connect DB + Redis, start workers from a registry, graceful close.
- [ ] 3.4 `queues/schedulers.ts`: `upsertJobScheduler` for `apify-daily` (`DAILY_CHECK_CRON`, `Asia/Tehran`) and weekly `token-refresh`.
- [ ] 3.5 Bull Board at `/admin/queues` behind `requireAdmin`.

## Phase 4 — Shops, categories, images (M1)

- [ ] 4.1 `services/categories.ts` + test: create (normalise, slug), rename, delete-if-unused, list with shop counts.
- [ ] 4.2 `routes/admin/categories.ts` (zod) + supertest.
- [ ] 4.3 `services/shops.ts` + test: create/update (normalise handles, slug, category ids exist, image required), `findByHandle` (handle or previousHandles), contact normalisation (email lower, `https://` URL, `+98` phone).
- [ ] 4.4 Image upload: `POST /admin/api/shops/images` (raw body ≤2 MB → `imageCheck` → upsert `ShopImage` by sha256).
- [ ] 4.5 `routes/media.ts`: `GET /media/shop/:sha256` with `nosniff`, immutable cache headers.
- [ ] 4.6 `routes/admin/shops.ts`: list/search, get, create, update + supertest.

## Phase 5 — Apify client + profile fetch (PRD §5.6, §6.2)

- [ ] 5.1 `apify/client.ts` + test (mocked fetch): `startRun(actor, input)`, `waitForRun(runId)` polling, `getDatasetItems(datasetId)`, `getUsage()` (`/v2/users/me/limits`); token from env, never logged.
- [ ] 5.2 `apify/budget.ts` + test: `canRun(kind)` — backfill blocked above `APIFY_BUDGET_STOP_USD`, daily allowed.
- [ ] 5.3 **Spike (manual):** one real profile-scraper run, save output to `tests/fixtures/apify/profile.json`; confirm field names; record price in PRD §6.2 / §15.4.
- [ ] 5.4 `apify/profile.ts` + test from fixture: map output → `{ imageUrl, email?, website?, phone? }`.
- [ ] 5.5 `apify-profile` worker: run profile, download image, `imageCheck`, store, return draft profile (for "new shop") or apply to shop (refresh, clearing missing fields, `profileFetchedAt`); writes `jobRuns`.
- [ ] 5.6 Admin endpoints: `POST /shops/profile-preview` (handle → enqueue + wait/poll job) and `POST /shops/:id/refresh-profile`.

## Phase 6 — Webhook spike + Meta plumbing (M0, PRD §5.3, §10)

- [ ] 6.1 `meta/signature.ts` + test: verify `X-Hub-Signature-256` with timing-safe compare.
- [ ] 6.2 `routes/webhooks.ts` GET verify (`hub.mode`, `hub.verify_token`, echo challenge) + test.
- [ ] 6.3 `scripts/webhook-spike.ts`: logs raw bodies to `tests/fixtures/webhooks/` (dev only).
- [ ] 6.4 **Spike (manual):** send profile, post, reel, plain link, text, from a tester account; commit sanitised fixtures (IGSIDs replaced).
- [ ] 6.5 `meta/token.ts` + test: `getAccessToken()` (decrypt from `MetaToken`, seed from `IG_ACCESS_TOKEN`), `refreshToken()`.
- [ ] 6.6 `meta/sendApi.ts` + test (mocked fetch): `sendText(igsid, text)` to pinned `GRAPH_API_VERSION`; classifies 5xx as retryable.

## Phase 7 — DM bot core, pure (M2, PRD §5.2–§5.4)

- [ ] 7.1 `bot/parse.ts` + tests from webhook fixtures: message → `{ kind: profile|post|text|unknown, handle?, shortcode? }` (URLs, `@handle`, attachments; post → shortcode, never tagged accounts).
- [ ] 7.2 `bot/language.ts` + test: Latin-majority → `en`, else `fa`.
- [ ] 7.3 `i18n/fa.ts`, `i18n/en.ts`, `i18n/index.ts`: reply strings, status labels, help, unresolved, not-found (trust-me copy), "checking…", "+N more".
- [ ] 7.4 `bot/resolve.ts` + test: shortcode → owner via injected deps (reviews cache → `postOwners` cache → "needs lookup").
- [ ] 7.5 `bot/lookup.ts` + test: handle → `found(shop, reviews, total)` | `not_found`, via injected repo fns (published reviews, newest first, limit 5).
- [ ] 7.6 `bot/reply.ts` + tests: build plain-text reply (name, handle, categories in lang, contact lines only if set, status + tags, reviews, "+N more", optional `link` param unused); split if too long; "on our list, not reviewed yet" when no published reviews.
- [ ] 7.7 `bot/index.ts` + test: `handleMessage(msg, deps)` orchestration returning `{ result, replies[], needsOwnerLookup? }` — transport-agnostic (PRD §10.8).

## Phase 8 — DM bot wiring (M2, PRD §5.1, §5.5)

- [ ] 8.1 `POST /webhooks/instagram`: `express.raw()`, verify signature (403 on fail), skip `is_echo`/own account, enqueue `dm-inbound` with `jobId = mid`, 200 at once + supertest with fixture.
- [ ] 8.2 `services/wishlist.ts` + test: `addRequest(handle, source)` upsert, increment `requestCount`, add to `sources`, timestamps.
- [ ] 8.3 `dm-inbound` worker: create/upsert `DmEvent`, call `handleMessage`, wishlist on not-found, enqueue replies to `dm-send`; on `needsOwnerLookup` send "checking…" and enqueue `post-owner`.
- [ ] 8.4 `apify/postOwner.ts` + `post-owner` worker (concurrency 2): Apify post scraper → `ownerUsername`, cache in `PostOwner`, `jobRuns`, re-enqueue DM job.
- [ ] 8.5 `dm-send` worker: BullMQ limiter (global) + per-sender 10/min check in Redis; `sendText`; set `replySentAt`; on final failure write `dmEvents.error`.
- [ ] 8.6 Integration test: fixture webhook → jobs → mocked Graph send produces expected reply; retried webhook does not double-reply.

## Phase 9 — Reviewer sources + daily check (M3, PRD §6)

- [ ] 9.1 Save a real post-scraper fixture (`tests/fixtures/apify/posts.json`, from discovery run).
- [ ] 9.2 `apify/extractTagged.ts` + test: union of `mentions` + `taggedUsers`, minus reviewer, minus ignore list (env `APIFY_IGNORE_HANDLES`, add to env + `.env.example`).
- [ ] 9.3 `services/reviews.ts` + test: `createPendingFromPost(post, source)` → per tagged handle: shop found → pending review on shop, else wishlist (`reviewer_post`) + review on wishlist; duplicate-key = skip; `skipped` audit for no tags.
- [ ] 9.4 `apify/dailyCheck.ts` + test: one combined run for followed sources (`resultsLimit` 10), dedupe by shortcode, update `lastSeenShortcode/At` ignoring `isPinned`, counts.
- [ ] 9.5 `apify/backfill.ts` + test: per source, budget guard, `backfillLimit`, mark `backfillDone`.
- [ ] 9.6 `apify-daily` and `apify-backfill` workers; enqueue backfill when a source is created with `follow: true`.
- [ ] 9.7 `routes/admin/reviewerSources.ts`: CRUD, toggle follow, "run backfill now".
- [ ] 9.8 `routes/admin/jobs.ts`: recent `jobRuns`, Apify usage this month, "run daily check now".

## Phase 10 — Moderation + wishlist admin (M3, PRD §9.2)

- [ ] 10.1 Reviews service: `approve(id, {outcome, direction, summary})` (both required, sets `publishedAt`), `reject(id, reason)`.
- [ ] 10.2 `routes/admin/reviews.ts`: list pending (with target shop/wishlist populated), approve, reject + supertest.
- [ ] 10.3 Wishlist service: `promote(id, shopInput)` (create shop, move pending reviews `wishlistId → shopId`, status `promoted`) in a transaction-safe order; `linkToShop(id, shopId)` (add handle to `previousHandles`, move reviews); `dismiss(id)`.
- [ ] 10.4 `routes/admin/wishlist.ts`: list sorted by `requestCount`, promote, link, dismiss + supertest.

## Phase 11 — Meta compliance + landing render (M4, PRD §7, §10)

- [ ] 11.1 `meta/signedRequest.ts` + test: parse/verify `signed_request` (base64url, HMAC-SHA256, timing-safe).
- [ ] 11.2 `services/deletion.ts` + test: hash IGSID, delete `dmEvents` for that sender, create `DeletionRequest` (code), mark `done`; `getStatus(code)`.
- [ ] 11.3 `routes/meta.ts`: `POST /meta/data-deletion` (returns `{url, confirmation_code}`), `POST /meta/deauthorize` (200) + supertest.
- [ ] 11.4 `token-refresh` worker: refresh, store encrypted, `jobRuns`, log error-level alert on failure.
- [ ] 11.5 `routes/landing.ts`: `/` → redirect by `Accept-Language` (default `fa`); `/:lang(fa|en)/*` → `render(url, data)` from `../web/dist/server/entry-server.js` (deletion status data for `/data-deletion/status`), serve `web/dist/client` assets; 404 page; no redirects on legal pages. Tolerate missing build in dev with a clear error.
- [ ] 11.6 `routes/admin/index.ts`: serve `../admin/dist` statically with `index.html` fallback.

## Phase 12 — Hardening

- [ ] 12.1 Logger redact review (`signed_request`, message text, tokens) + test that a logged payload is redacted.
- [ ] 12.2 Security headers on public routes (no bot-blocking of `facebookexternalhit`), body size limits.
- [ ] 12.3 Full `npm run build` + start web and worker against local Mongo/Redis; smoke test.
- [ ] 12.4 Update PRD with any decisions changed during build; `graphify update backend`.

---

## Critical files

`backend/src/{config/env.ts, app.ts, server.ts, worker.ts}`, `backend/src/models/*`, `backend/src/bot/*`, `backend/src/queues/*`, `backend/src/routes/**`, `backend/src/apify/*`, `backend/src/meta/*`, `backend/src/auth/*`, `backend/.env.example`, `backend/vitest.config.ts`, `PRD.md`.

## Verification

- Per task: `npm run typecheck` and `npm test` from the repo root.
- Per phase: run `npm run dev` + `npm run dev:worker` against local Mongo/Redis; hit `/healthz`; for Phase 2 log in via curl with a TOTP from `admin:create`; for Phase 8 replay a fixture webhook with a valid signature via curl and watch the Bull Board at `/admin/queues`; for Phase 9 trigger "run daily check now" with a real `APIFY_TOKEN` (small `resultsLimit`); for Phase 11 POST a self-signed `signed_request` to `/meta/data-deletion` and open the returned status URL.
- Manual spikes (5.3, 6.4) need the owner's Apify account and the Meta dev app; they block 5.4 and 7.1 respectively, so other phases can proceed in parallel.
