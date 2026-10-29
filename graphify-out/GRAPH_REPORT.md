# Graph Report - backend  (2026-10-29)

## Corpus Check
- 129 files · ~42,474 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 630 nodes · 1583 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0141ae77`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_wishlist.ts|wishlist.ts]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_reviewerSources.ts|reviewerSources.ts]]
- [[_COMMUNITY_wishlist.ts|wishlist.ts]]
- [[_COMMUNITY_shopsServices.test.ts|shopsServices.test.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_signedRequest.ts|signedRequest.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 19 edges
2. `normalizeHandle()` - 19 edges
3. `logger` - 18 edges
4. `createShop()` - 18 edges
5. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
6. `createApp()` - 16 edges
7. `getQueue()` - 16 edges
8. `useMongo()` - 16 edges
9. `updateShop()` - 15 edges
10. `createAdminAccount()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `ingestPosts()` --indirect_call--> `post()`  [INFERRED]
  backend/src/services/reviewerPosts.ts → backend/tests/unit/boxapi.test.ts
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --indirect_call--> `serializeReq()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/logger.ts

## Import Cycles
- None detected.

## Communities (23 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.13
Nodes (27): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+19 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.07
Nodes (46): BotDeps, BoxApiError, sendMessage(), SendOptions, sendUrl(), jobLogger(), createRedis(), DmInboundData (+38 more)

### Community 4 - "shops.ts"
Cohesion: 0.19
Nodes (14): mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite(), LETTER_MAP (+6 more)

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
Cohesion: 0.25
Nodes (17): escapeRegex(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), getShop(), handleOrThrow(), imageOrThrow() (+9 more)

### Community 11 - "shops.ts"
Cohesion: 0.09
Nodes (21): toObjectId(), idParam(), idParam(), approveBody, idParam(), listQuery, rejectBody, reviewsRouter (+13 more)

### Community 12 - "server.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 13 - "webhook-spike.ts"
Cohesion: 0.12
Nodes (23): allow(), drainSends(), PNG, samples, lastPage, mediaRoute(), page, PNG (+15 more)

### Community 15 - "budget.ts"
Cohesion: 0.06
Nodes (56): DataOptions, DataQuota, getMediaByShortcode(), getQuota(), getUserInfo(), getUserMedia(), MediaPage, Wrapped (+48 more)

### Community 16 - "reviewerSources.ts"
Cohesion: 0.17
Nodes (15): errorHandler(), HttpError, REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, createBody, fields, reviewerSourcesRouter (+7 more)

### Community 18 - "wishlist.ts"
Cohesion: 0.20
Nodes (14): WishlistSource, WishlistDoc, promoteBody, linkBody, listQuery, wishlistRouter, ShopInput, dismiss() (+6 more)

### Community 19 - "shopsServices.test.ts"
Cohesion: 0.19
Nodes (17): isDuplicateKey(), uniqueSlug(), categoriesRouter, createBody, name, updateBody, assertNameFree(), CategoryInput (+9 more)

### Community 22 - "Shop.ts"
Cohesion: 0.05
Nodes (47): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, ADMIN_ROLES, DELETION_STATUSES, DeletionStatus, Direction (+39 more)

### Community 25 - "index.ts"
Cohesion: 0.11
Nodes (34): BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult, ReviewSummary (+26 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.09
Nodes (40): RFC-4648, RFC-6238, createApp(), importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+32 more)

### Community 43 - "signedRequest.ts"
Cohesion: 0.11
Nodes (25): username, signBoxApiBody(), verifyBoxApiSignature(), Env, schema, connectDb(), disconnectDb(), isDbConnected() (+17 more)

## Knowledge Gaps
- **192 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13068181818181818 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07490079365079365 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._