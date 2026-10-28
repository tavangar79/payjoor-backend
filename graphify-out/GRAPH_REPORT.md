# Graph Report - backend  (2026-10-23)

## Corpus Check
- 139 files · ~38,380 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 655 nodes · 1715 edges · 28 communities (27 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d6ea73d`
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
- [[_COMMUNITY_shopsServices.test.ts|shopsServices.test.ts]]
- [[_COMMUNITY_shops.ts|shops.ts]]
- [[_COMMUNITY_reviewerSources.ts|reviewerSources.ts]]
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_categories.ts|categories.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_extractTagged.ts|extractTagged.ts]]
- [[_COMMUNITY_ReviewerSource.ts|ReviewerSource.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_DeletionRequest.ts|DeletionRequest.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_signedRequest.ts|signedRequest.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 33 edges
2. `logger` - 21 edges
3. `normalizeHandle()` - 20 edges
4. `createApp()` - 18 edges
5. `createShop()` - 18 edges
6. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
7. `useMongo()` - 17 edges
8. `getQueue()` - 16 edges
9. `updateShop()` - 15 edges
10. `createAdminAccount()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `runBackfill()` --indirect_call--> `source()`  [INFERRED]
  backend/src/apify/backfill.ts → backend/tests/integration/reviewerPosts.test.ts
- `runDailyCheck()` --indirect_call--> `source()`  [INFERRED]
  backend/src/apify/dailyCheck.ts → backend/tests/integration/reviewerPosts.test.ts
- `createApp()` --indirect_call--> `serializeReq()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/logger.ts

## Import Cycles
- None detected.

## Communities (28 total, 1 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.11
Nodes (32): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+24 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.07
Nodes (53): lookupPostOwner(), jobLogger(), createRedis(), DmInboundData, dmJobId(), dmMessage, DmSendData, isFinalAttempt() (+45 more)

### Community 4 - "shops.ts"
Cohesion: 0.19
Nodes (21): escapeRegex(), deleteCategory(), listCategories(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), findByHandle() (+13 more)

### Community 5 - "reviews.ts"
Cohesion: 0.25
Nodes (7): DIRECTIONS, OUTCOMES, REVIEW_SOURCE_TYPES, REVIEW_STATUSES, LIVE, ReviewDoc, reviewSchema

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (39): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+31 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 9 - "wishlist.ts"
Cohesion: 0.33
Nodes (9): getShop(), ShopInput, dismiss(), entryOrThrow(), linkToShop(), listWishlist(), moveReviews(), promote() (+1 more)

### Community 10 - "shopsServices.test.ts"
Cohesion: 0.31
Nodes (10): first(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite() (+2 more)

### Community 11 - "shops.ts"
Cohesion: 0.10
Nodes (23): HttpError, toObjectId(), fetchProfile(), ProfileJobData, categoriesRouter, createBody, idParam(), name (+15 more)

### Community 12 - "reviewerSources.ts"
Cohesion: 0.33
Nodes (5): handle, out, extractTagged(), normalizeHandle(), addRequest()

### Community 13 - "webhook-spike.ts"
Cohesion: 0.13
Nodes (18): fixture, allow(), drainSends(), PNG, samples, PNG, posts, source() (+10 more)

### Community 14 - "categories.ts"
Cohesion: 0.24
Nodes (14): isDuplicateKey(), LETTER_MAP, normalizeFa(), toLatinDigits(), toPersianDigits(), slugify(), uniqueSlug(), CategoryDoc (+6 more)

### Community 15 - "budget.ts"
Cohesion: 0.09
Nodes (39): runBackfill(), BudgetCheck, BudgetError, canRun(), RunKind, ApifyClientOptions, ApifyError, ApifyRun (+31 more)

### Community 16 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 17 - "Shop.ts"
Cohesion: 0.14
Nodes (14): DmEventDoc, dmEventSchema, ADMIN_ROLES, DeletionStatus, Direction, DM_KINDS, DM_RESULTS, DmKind (+6 more)

### Community 18 - "extractTagged.ts"
Cohesion: 0.15
Nodes (15): postUrl(), Outcome, approveBody, listQuery, rejectBody, ApproveInput, approveReview(), createOnce() (+7 more)

### Community 19 - "ReviewerSource.ts"
Cohesion: 0.40
Nodes (4): WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistDoc, wishlistSchema

### Community 20 - "PostOwner.ts"
Cohesion: 0.24
Nodes (9): allModels, syncAllIndexes(), PostOwnerDoc, postOwnerSchema, DUP, oid(), reviewInput(), sha() (+1 more)

### Community 21 - "DeletionRequest.ts"
Cohesion: 0.50
Nodes (3): DeletionRequestDoc, deletionRequestSchema, DELETION_STATUSES

### Community 22 - "Shop.ts"
Cohesion: 0.22
Nodes (7): IMAGE_MIMES, SHOP_STATUSES, handleField, ShopDoc, shopSchema, ShopImageDoc, shopImageSchema

### Community 25 - "index.ts"
Cohesion: 0.10
Nodes (36): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+28 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.07
Nodes (46): RFC-4648, RFC-6238, createApp(), importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+38 more)

### Community 43 - "signedRequest.ts"
Cohesion: 0.06
Nodes (49): username, app, dir, Env, schema, connectDb(), disconnectDb(), isDbConnected() (+41 more)

## Knowledge Gaps
- **201 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `createApp()` (e.g. with `errorHandler()` and `serializeReq()`) actually correct?**
  _`createApp()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06807511737089202 - nodes in this community are weakly interconnected._