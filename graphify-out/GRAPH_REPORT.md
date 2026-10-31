# Graph Report - backend  (2026-10-31)

## Corpus Check
- 150 files · ~59,628 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 781 nodes · 2112 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `711da57d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_shopProfile.worker.ts|shopProfile.worker.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_categories.ts|categories.ts]]
- [[_COMMUNITY_wishlist.ts|wishlist.ts]]
- [[_COMMUNITY_shopsServices.test.ts|shopsServices.test.ts]]
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_reviewerSources.ts|reviewerSources.ts]]
- [[_COMMUNITY_reviews.ts|reviews.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_jobs.ts|jobs.ts]]
- [[_COMMUNITY_Review.ts|Review.ts]]
- [[_COMMUNITY_Wishlist.ts|Wishlist.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_DeletionRequest.ts|DeletionRequest.ts]]
- [[_COMMUNITY_PostCheck.ts|PostCheck.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]

## God Nodes (most connected - your core abstractions)
1. `normalizeHandle()` - 25 edges
2. `Env` - 24 edges
3. `logger` - 23 edges
4. `createShop()` - 23 edges
5. `updateShop()` - 22 edges
6. `useMongo()` - 22 edges
7. `getQueue()` - 21 edges
8. `toObjectId()` - 19 edges
9. `createApp()` - 18 edges
10. `isDuplicateKey()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --indirect_call--> `serializeReq()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/logger.ts
- `createApp()` --indirect_call--> `securityHeaders()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/securityHeaders.ts

## Import Cycles
- None detected.

## Communities (29 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.09
Nodes (34): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+26 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.06
Nodes (63): handleMessage(), AiOptions, chatJson(), ChatJsonRequest, Completion, BoxApiError, sendMessage(), SendOptions (+55 more)

### Community 4 - "shops.ts"
Cohesion: 0.31
Nodes (11): bioPhone(), count(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone() (+3 more)

### Community 5 - "shopProfile.worker.ts"
Cohesion: 0.10
Nodes (22): toObjectId(), ProfileDeps, ProfileDraft, ProfileJobData, shopProfileWorker, idParam(), idParam(), idParam() (+14 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+29 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 9 - "shops.ts"
Cohesion: 0.15
Nodes (24): deleteCategory(), listCategories(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), findByHandle(), handleOrThrow() (+16 more)

### Community 10 - "categories.ts"
Cohesion: 0.18
Nodes (17): isDuplicateKey(), LETTER_MAP, normalizeFa(), toPersianDigits(), slugify(), uniqueSlug(), CategoryDoc, categorySchema (+9 more)

### Community 11 - "wishlist.ts"
Cohesion: 0.17
Nodes (17): HttpError, WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistSource, WishlistDoc, wishlistSchema, linkBody, listQuery (+9 more)

### Community 12 - "shopsServices.test.ts"
Cohesion: 0.11
Nodes (28): username, Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler(), jobLogger() (+20 more)

### Community 13 - "webhook-spike.ts"
Cohesion: 0.19
Nodes (12): completion(), Post, posts, queued(), source(), FakeJob, fakeQueue(), fakeQueuesModule() (+4 more)

### Community 15 - "budget.ts"
Cohesion: 0.06
Nodes (66): DataOptions, DataQuota, getQuota(), getUserInfo(), getUserMedia(), MediaPage, Wrapped, BoxApiPost (+58 more)

### Community 16 - "reviewerSources.ts"
Cohesion: 0.07
Nodes (46): getMediaByShortcode(), finishJobRun(), JobRunContext, JobRunResult, startJobRun(), withJobRun(), normalizeHandle(), escapeRegex() (+38 more)

### Community 17 - "reviews.ts"
Cohesion: 0.26
Nodes (11): SHOP_STATUSES, handleField, ShopDoc, shopSchema, fetchProfile(), adopt(), ensureShop(), EnsureShopResult (+3 more)

### Community 18 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 19 - "jobs.ts"
Cohesion: 0.11
Nodes (15): ananas, botik, cdn, classified(), completion(), cropShoop, found, notFound (+7 more)

### Community 20 - "Review.ts"
Cohesion: 0.20
Nodes (9): fixture, info(), mediaRoute(), fixture, info(), boxapiBody(), dataCalls(), dataRoute() (+1 more)

### Community 21 - "Wishlist.ts"
Cohesion: 0.28
Nodes (7): ai(), allow(), drainSends(), PNG, samples, useFetch(), fakeFetch()

### Community 22 - "Shop.ts"
Cohesion: 0.06
Nodes (36): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, ADMIN_ROLES, DELETION_STATUSES, DeletionStatus, DIRECTIONS (+28 more)

### Community 23 - "DeletionRequest.ts"
Cohesion: 0.33
Nodes (4): body, check(), png, stale()

### Community 24 - "PostCheck.ts"
Cohesion: 0.29
Nodes (5): lastPage, page, PNG, source(), Route

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (36): BotDeps, BotOutcome, detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult, ReviewSummary (+28 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.07
Nodes (50): RFC-4648, RFC-6238, createApp(), importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+42 more)

## Knowledge Gaps
- **242 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+237 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `shopsServices.test.ts` to `devDependencies`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `shopsServices.test.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _242 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09407665505226481 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05553923009109609 - nodes in this community are weakly interconnected._
- **Should `shopProfile.worker.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09782608695652174 - nodes in this community are weakly interconnected._