# Graph Report - backend  (2026-10-23)

## Corpus Check
- 109 files · ~14,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 359 nodes · 607 edges · 49 communities (47 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d832a645`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_names.ts|names.ts]]
- [[_COMMUNITY_admin-import.ts|admin-import.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_handle.ts|handle.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_normalizeFa.ts|normalizeFa.ts]]
- [[_COMMUNITY_Admin.ts|Admin.ts]]

## God Nodes (most connected - your core abstractions)
1. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
2. `scripts` - 12 edges
3. `Env` - 12 edges
4. `compilerOptions` - 12 edges
5. `createAdminAccount()` - 10 edges
6. `totpCode()` - 10 edges
7. `logger` - 10 edges
8. `createApp()` - 8 edges
9. `authenticateAdmin()` - 8 edges
10. `useMongo()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `loggedInAgent()` --calls--> `createApp()`  [EXTRACTED]
  backend/tests/integration/adminAuthRoutes.test.ts → backend/src/app.ts
- `code()` --calls--> `totpCode()`  [EXTRACTED]
  backend/tests/integration/login.test.ts → backend/src/auth/totp.ts
- `shutdown()` --calls--> `disconnectDb()`  [EXTRACTED]
  backend/src/server.ts → backend/src/lib/db.ts

## Import Cycles
- None detected.

## Communities (49 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.09
Nodes (33): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+25 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.15
Nodes (17): username, createApp(), Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler() (+9 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+29 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 9 - "names.ts"
Cohesion: 0.18
Nodes (18): worker, jobLogger(), createRedis(), QueueName, QUEUES, closeQueues(), defaultJobOptions, getQueue() (+10 more)

### Community 12 - "admin-import.ts"
Cohesion: 0.26
Nodes (9): finishJobRun(), JobRunContext, JobRunResult, startJobRun(), withJobRun(), JOB_TYPES, JobType, JobRunDoc (+1 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.11
Nodes (33): RFC-4648, RFC-6238, importAdmin(), trustMeAdmin, authenticateAdmin(), AuthResult, createAdminAccount(), reserveAttempt() (+25 more)

### Community 38 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 39 - "normalizeFa.ts"
Cohesion: 0.36
Nodes (6): LETTER_MAP, normalizeFa(), toLatinDigits(), toPersianDigits(), CategoryDoc, categorySchema

### Community 45 - "Admin.ts"
Cohesion: 0.05
Nodes (44): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, DELETION_STATUSES, Direction, DIRECTIONS, DM_KINDS (+36 more)

## Knowledge Gaps
- **133 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `devDependencies` to `names.ts`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `worker` connect `names.ts` to `devDependencies`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08787878787878788 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14623655913978495 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._