# Graph Report - backend  (2026-10-23)

## Corpus Check
- 130 files · ~30,196 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 559 nodes · 1314 edges · 25 communities (24 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9175fbde`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_Admin.ts|Admin.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 24 edges
2. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
3. `normalizeHandle()` - 16 edges
4. `logger` - 16 edges
5. `createShop()` - 15 edges
6. `useMongo()` - 14 edges
7. `scripts` - 13 edges
8. `getQueue()` - 13 edges
9. `updateShop()` - 13 edges
10. `createAdminAccount()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `fetchProfile()` --calls--> `canRun()`  [EXTRACTED]
  backend/src/queues/workers/apifyProfile.worker.ts → backend/src/apify/budget.ts
- `lookupPostOwner()` --calls--> `normalizeHandle()`  [EXTRACTED]
  backend/src/apify/postOwner.ts → backend/src/lib/handle.ts
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts

## Import Cycles
- None detected.

## Communities (25 total, 1 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.10
Nodes (32): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+24 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.06
Nodes (50): username, app, dir, createApp(), Env, schema, connectDb(), disconnectDb() (+42 more)

### Community 4 - "index.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (39): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+31 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 13 - "webhook-spike.ts"
Cohesion: 0.15
Nodes (15): fixture, allow(), drainSends(), PNG, samples, apifyRoutes(), fakeFetch(), json() (+7 more)

### Community 15 - "budget.ts"
Cohesion: 0.08
Nodes (36): BudgetCheck, canRun(), RunKind, ApifyClientOptions, ApifyError, ApifyRun, ApifyUsage, call() (+28 more)

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (37): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+29 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.08
Nodes (42): RFC-4648, RFC-6238, importAdmin(), trustMeAdmin, authenticateAdmin(), AuthResult, createAdminAccount(), reserveAttempt() (+34 more)

### Community 38 - "imageCheck.ts"
Cohesion: 0.06
Nodes (71): handle, out, first(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail() (+63 more)

### Community 45 - "Admin.ts"
Cohesion: 0.05
Nodes (47): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, ADMIN_ROLES, DELETION_STATUSES, Direction, DIRECTIONS (+39 more)

## Knowledge Gaps
- **179 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06322624743677376 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._