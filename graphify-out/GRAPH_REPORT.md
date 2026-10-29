# Graph Report - backend  (2026-10-29)

## Corpus Check
- 133 files · ~37,059 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 637 nodes · 1627 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b22f3d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_reviews.ts|reviews.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_wishlist.ts|wishlist.ts]]
- [[_COMMUNITY_wishlist.ts|wishlist.ts]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_signedRequest.ts|signedRequest.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 27 edges
2. `normalizeHandle()` - 20 edges
3. `logger` - 19 edges
4. `createShop()` - 18 edges
5. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
6. `createApp()` - 16 edges
7. `getQueue()` - 16 edges
8. `useMongo()` - 16 edges
9. `updateShop()` - 15 edges
10. `createAdminAccount()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `ingestPosts()` --indirect_call--> `post()`  [INFERRED]
  backend/src/apify/ingest.ts → backend/tests/unit/boxapi.test.ts
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --indirect_call--> `serializeReq()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/logger.ts
- `createApp()` --indirect_call--> `contentSecurityPolicy()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/securityHeaders.ts
- `createApp()` --indirect_call--> `securityHeaders()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/securityHeaders.ts

## Import Cycles
- None detected.

## Communities (23 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (41): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+33 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.07
Nodes (45): worker, BoxApiError, sendMessage(), SendOptions, signBoxApiBody(), verifyBoxApiSignature(), jobLogger(), logger (+37 more)

### Community 4 - "shops.ts"
Cohesion: 0.24
Nodes (12): REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, createBody, fields, updateBody, createSource(), enqueueBackfill() (+4 more)

### Community 5 - "reviews.ts"
Cohesion: 0.14
Nodes (16): HttpError, Direction, Outcome, approveBody, listQuery, rejectBody, ApproveInput, approveReview() (+8 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+29 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 9 - "wishlist.ts"
Cohesion: 0.11
Nodes (19): toObjectId(), ProfileJobData, categoriesRouter, createBody, idParam(), name, updateBody, idParam() (+11 more)

### Community 10 - "wishlist.ts"
Cohesion: 0.15
Nodes (18): WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistSource, WishlistDoc, wishlistSchema, promoteBody, linkBody, listQuery (+10 more)

### Community 11 - "shops.ts"
Cohesion: 0.08
Nodes (52): first(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite() (+44 more)

### Community 12 - "server.ts"
Cohesion: 0.31
Nodes (7): username, connectDb(), disconnectDb(), isDbConnected(), app, server, shutdown()

### Community 13 - "webhook-spike.ts"
Cohesion: 0.12
Nodes (18): fixture, allow(), drainSends(), PNG, samples, PNG, posts, apifyRoutes() (+10 more)

### Community 15 - "budget.ts"
Cohesion: 0.08
Nodes (52): handle, out, runBackfill(), BudgetCheck, BudgetError, canRun(), RunKind, ApifyClientOptions (+44 more)

### Community 17 - "Shop.ts"
Cohesion: 0.10
Nodes (21): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, ADMIN_ROLES, DELETION_STATUSES, DIRECTIONS, DM_KINDS (+13 more)

### Community 22 - "Shop.ts"
Cohesion: 0.22
Nodes (7): IMAGE_MIMES, SHOP_STATUSES, handleField, ShopDoc, shopSchema, ShopImageDoc, shopImageSchema

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (38): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+30 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.07
Nodes (47): RFC-4648, RFC-6238, createApp(), importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+39 more)

### Community 43 - "signedRequest.ts"
Cohesion: 0.17
Nodes (15): Request, DeletionStatus, createLandingRouter(), DEFAULT_WEB_DIST, escapeHtml(), fillTemplate(), landingRouter, pageData() (+7 more)

## Knowledge Gaps
- **195 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `worker` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `scripts` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07402031930333818 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06502732240437159 - nodes in this community are weakly interconnected._
- **Should `reviews.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._