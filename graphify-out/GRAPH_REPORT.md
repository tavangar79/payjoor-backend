# Graph Report - backend  (2026-11-05)

## Corpus Check
- 148 files · ~58,887 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 774 nodes · 2071 edges · 38 communities (35 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `44baa83b`
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
- [[_COMMUNITY_mongo.ts|mongo.ts]]
- [[_COMMUNITY_postChecks.ts|postChecks.ts]]
- [[_COMMUNITY_jobRun.ts|jobRun.ts]]
- [[_COMMUNITY_reviews.ts|reviews.ts]]
- [[_COMMUNITY_aiQueue.test.ts|aiQueue.test.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_Wishlist.ts|Wishlist.ts]]
- [[_COMMUNITY_DeletionRequest.ts|DeletionRequest.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 24 edges
2. `normalizeHandle()` - 23 edges
3. `createShop()` - 23 edges
4. `logger` - 22 edges
5. `updateShop()` - 22 edges
6. `useMongo()` - 22 edges
7. `toObjectId()` - 19 edges
8. `getQueue()` - 19 edges
9. `createApp()` - 18 edges
10. `isDuplicateKey()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `idParam()` --calls--> `toObjectId()`  [EXTRACTED]
  backend/src/routes/admin/categories.ts → backend/src/lib/mongo.ts
- `idParam()` --calls--> `toObjectId()`  [EXTRACTED]
  backend/src/routes/admin/reviewerSources.ts → backend/src/lib/mongo.ts
- `idParam()` --calls--> `toObjectId()`  [EXTRACTED]
  backend/src/routes/admin/shops.ts → backend/src/lib/mongo.ts

## Import Cycles
- None detected.

## Communities (38 total, 3 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.12
Nodes (29): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+21 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.07
Nodes (45): AiOptions, chatJson(), ChatJsonRequest, Completion, BoxApiError, sendMessage(), SendOptions, sendUrl() (+37 more)

### Community 4 - "shops.ts"
Cohesion: 0.08
Nodes (29): DataOptions, DataQuota, getMediaByShortcode(), getQuota(), getUserInfo(), MediaPage, Wrapped, bioPhone() (+21 more)

### Community 5 - "shopProfile.worker.ts"
Cohesion: 0.20
Nodes (10): contactField, createBody, idParam(), listQuery, objectId, shopBody, shopsRouter, updateBody (+2 more)

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
Cohesion: 0.30
Nodes (14): escapeRegex(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), handleOrThrow(), imageOrThrow(), listShops() (+6 more)

### Community 10 - "categories.ts"
Cohesion: 0.32
Nodes (11): isDuplicateKey(), normalizeFa(), slugify(), uniqueSlug(), CategoryDoc, categorySchema, assertNameFree(), CategoryInput (+3 more)

### Community 11 - "wishlist.ts"
Cohesion: 0.17
Nodes (18): toObjectId(), WishlistSource, idParam(), idParam(), promoteBody, idParam(), linkBody, listQuery (+10 more)

### Community 12 - "shopsServices.test.ts"
Cohesion: 0.06
Nodes (52): username, createApp(), signBoxApiBody(), verifyBoxApiSignature(), Env, schema, connectDb(), disconnectDb() (+44 more)

### Community 13 - "webhook-spike.ts"
Cohesion: 0.18
Nodes (11): lastPage, page, PNG, source(), Route, FakeJob, fakeQueue(), fakeQueuesModule() (+3 more)

### Community 15 - "budget.ts"
Cohesion: 0.06
Nodes (72): getUserMedia(), BoxApiPost, captionText(), extractTagged(), ImageVersions, isPinned(), mediaUrls(), postTime() (+64 more)

### Community 16 - "reviewerSources.ts"
Cohesion: 0.17
Nodes (16): REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, BackfillJobData, createBody, fields, idParam(), profileBody (+8 more)

### Community 17 - "reviews.ts"
Cohesion: 0.24
Nodes (13): normalizeHandle(), fetchProfile(), ProfileDeps, ProfileDraft, ProfileJobData, adopt(), ensureShop(), EnsureShopResult (+5 more)

### Community 18 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 19 - "jobs.ts"
Cohesion: 0.11
Nodes (15): ananas, botik, cdn, classified(), completion(), cropShoop, found, notFound (+7 more)

### Community 20 - "Review.ts"
Cohesion: 0.25
Nodes (8): fixture, info(), mediaRoute(), info(), boxapiBody(), dataCalls(), dataRoute(), json()

### Community 21 - "Wishlist.ts"
Cohesion: 0.32
Nodes (6): allow(), drainSends(), PNG, samples, useFetch(), fakeFetch()

### Community 22 - "Shop.ts"
Cohesion: 0.14
Nodes (13): DmEventDoc, dmEventSchema, ADMIN_ROLES, DM_KINDS, DM_RESULTS, DmKind, IMAGE_MIMES, PostCheckStatus (+5 more)

### Community 23 - "DeletionRequest.ts"
Cohesion: 0.33
Nodes (4): body, check(), png, stale()

### Community 24 - "PostCheck.ts"
Cohesion: 0.16
Nodes (13): HttpError, categoriesRouter, createBody, idParam(), name, updateBody, deleteCategory(), listCategories() (+5 more)

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (37): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+29 more)

### Community 26 - "mongo.ts"
Cohesion: 0.19
Nodes (10): allModels, DUP, oid(), reviewInput(), sha(), shopInput(), FakeJob, jobs (+2 more)

### Community 27 - "postChecks.ts"
Cohesion: 0.17
Nodes (11): DIRECTIONS, OUTCOMES, POST_CHECK_STATUSES, REVIEW_SOURCE_TYPES, LIVE, ReviewDoc, reviewSchema, listQuery (+3 more)

### Community 28 - "jobRun.ts"
Cohesion: 0.26
Nodes (9): finishJobRun(), JobRunContext, JobRunResult, startJobRun(), withJobRun(), JOB_TYPES, JobType, JobRunDoc (+1 more)

### Community 29 - "reviews.ts"
Cohesion: 0.25
Nodes (7): REVIEW_STATUSES, approveBody, listQuery, rejectBody, reviewsRouter, getReview(), listReviews()

### Community 30 - "aiQueue.test.ts"
Cohesion: 0.29
Nodes (7): ai(), completion(), Post, posts, queued(), source(), post()

### Community 31 - "Shop.ts"
Cohesion: 0.40
Nodes (4): SHOP_STATUSES, handleField, ShopDoc, shopSchema

### Community 32 - "Wishlist.ts"
Cohesion: 0.40
Nodes (4): WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistDoc, wishlistSchema

### Community 33 - "DeletionRequest.ts"
Cohesion: 0.50
Nodes (3): DeletionRequestDoc, deletionRequestSchema, DELETION_STATUSES

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.10
Nodes (35): RFC-4648, RFC-6238, importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount(), reserveAttempt() (+27 more)

## Knowledge Gaps
- **242 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+237 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `shopsServices.test.ts` to `devDependencies`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `shopsServices.test.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _242 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12100840336134454 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07005649717514124 - nodes in this community are weakly interconnected._
- **Should `shops.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08478513356562137 - nodes in this community are weakly interconnected._