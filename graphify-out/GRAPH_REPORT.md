# Graph Report - backend  (2026-10-23)

## Corpus Check
- 115 files · ~18,575 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 415 nodes · 798 edges · 51 communities (50 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bce61ca4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_names.ts|names.ts]]
- [[_COMMUNITY_DmEvent.ts|DmEvent.ts]]
- [[_COMMUNITY_Wishlist.ts|Wishlist.ts]]
- [[_COMMUNITY_admin-import.ts|admin-import.ts]]
- [[_COMMUNITY_DeletionRequest.ts|DeletionRequest.ts]]
- [[_COMMUNITY_ReviewerSource.ts|ReviewerSource.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_Admin.ts|Admin.ts]]

## God Nodes (most connected - your core abstractions)
1. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
2. `createShop()` - 13 edges
3. `scripts` - 12 edges
4. `createAdminAccount()` - 12 edges
5. `totpCode()` - 12 edges
6. `Env` - 12 edges
7. `compilerOptions` - 12 edges
8. `createApp()` - 10 edges
9. `logger` - 10 edges
10. `updateShop()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `loggedInAgent()` --calls--> `createApp()`  [EXTRACTED]
  backend/tests/integration/adminAuthRoutes.test.ts → backend/src/app.ts
- `admin()` --calls--> `createApp()`  [EXTRACTED]
  backend/tests/integration/shopsRoutes.test.ts → backend/src/app.ts

## Import Cycles
- None detected.

## Communities (51 total, 1 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.10
Nodes (31): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+23 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.10
Nodes (33): username, createApp(), Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler() (+25 more)

### Community 4 - "index.ts"
Cohesion: 0.20
Nodes (7): syncAllIndexes(), MetaTokenDoc, metaTokenSchema, PostOwnerDoc, postOwnerSchema, admin(), PNG

### Community 5 - "Shop.ts"
Cohesion: 0.22
Nodes (7): IMAGE_MIMES, SHOP_STATUSES, handleField, ShopDoc, shopSchema, ShopImageDoc, shopImageSchema

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (38): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+30 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 9 - "names.ts"
Cohesion: 0.43
Nodes (6): allModels, DUP, oid(), reviewInput(), sha(), shopInput()

### Community 10 - "DmEvent.ts"
Cohesion: 0.40
Nodes (4): DmEventDoc, dmEventSchema, DM_KINDS, DM_RESULTS

### Community 11 - "Wishlist.ts"
Cohesion: 0.40
Nodes (4): WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistDoc, wishlistSchema

### Community 12 - "admin-import.ts"
Cohesion: 0.26
Nodes (9): finishJobRun(), JobRunContext, JobRunResult, startJobRun(), withJobRun(), JOB_TYPES, JobType, JobRunDoc (+1 more)

### Community 21 - "DeletionRequest.ts"
Cohesion: 0.50
Nodes (3): DeletionRequestDoc, deletionRequestSchema, DELETION_STATUSES

### Community 22 - "ReviewerSource.ts"
Cohesion: 0.50
Nodes (3): REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.11
Nodes (33): RFC-4648, RFC-6238, importAdmin(), trustMeAdmin, authenticateAdmin(), AuthResult, createAdminAccount(), reserveAttempt() (+25 more)

### Community 38 - "imageCheck.ts"
Cohesion: 0.06
Nodes (65): normalizeEmail(), normalizePhone(), normalizeWebsite(), HttpError, normalizeHandle(), checkImage(), ImageCheck, ImageMime (+57 more)

### Community 45 - "Admin.ts"
Cohesion: 0.19
Nodes (12): Direction, DIRECTIONS, Outcome, OUTCOMES, REVIEW_SOURCE_TYPES, REVIEW_STATUSES, ReviewStatus, ShopStatus (+4 more)

## Knowledge Gaps
- **146 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09878048780487805 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0965166908563135 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._