# Graph Report - backend  (2026-10-30)

## Corpus Check
- 137 files · ~46,922 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 670 nodes · 1711 edges · 30 communities (27 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `effc0673`
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
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 21 edges
2. `getQueue()` - 20 edges
3. `normalizeHandle()` - 19 edges
4. `logger` - 19 edges
5. `createShop()` - 18 edges
6. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
7. `useMongo()` - 17 edges
8. `createApp()` - 16 edges
9. `isDuplicateKey()` - 16 edges
10. `toObjectId()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  src/queues/startWorkers.ts → package.json
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  tests/integration/shopsServices.test.ts → src/lib/errorHandler.ts
- `ingestPosts()` --indirect_call--> `post()`  [INFERRED]
  src/services/reviewerPosts.ts → tests/unit/boxapi.test.ts
- `code()` --calls--> `totpCode()`  [EXTRACTED]
  tests/integration/login.test.ts → src/auth/totp.ts
- `deleteCategory()` --references--> `shop`  [EXTRACTED]
  src/services/categories.ts → tests/unit/bot.test.ts

## Import Cycles
- None detected.

## Communities (30 total, 3 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.14
Nodes (26): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+18 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.06
Nodes (65): AiOptions, chatJson(), ChatJsonRequest, Completion, BoxApiError, sendMessage(), SendOptions, sendUrl() (+57 more)

### Community 4 - "shops.ts"
Cohesion: 0.30
Nodes (11): bioPhone(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite() (+3 more)

### Community 5 - "shopProfile.worker.ts"
Cohesion: 0.11
Nodes (21): normalizeHandle(), toObjectId(), fetchProfile(), ProfileDeps, ProfileDraft, ProfileJobData, shopProfileWorker, idParam() (+13 more)

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
Cohesion: 0.23
Nodes (18): escapeRegex(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), findByHandle(), handleOrThrow(), imageOrThrow() (+10 more)

### Community 10 - "categories.ts"
Cohesion: 0.15
Nodes (19): fa, LETTER_MAP, normalizeFa(), toPersianDigits(), slugify(), uniqueSlug(), CategoryDoc, categorySchema (+11 more)

### Community 11 - "wishlist.ts"
Cohesion: 0.19
Nodes (16): isDuplicateKey(), promoteBody, linkBody, listQuery, wishlistRouter, createOnce(), getShop(), ShopInput (+8 more)

### Community 12 - "shopsServices.test.ts"
Cohesion: 0.10
Nodes (26): username, Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler(), loggerOptions (+18 more)

### Community 13 - "webhook-spike.ts"
Cohesion: 0.10
Nodes (31): ai(), completion(), Post, posts, queued(), source(), allow(), drainSends() (+23 more)

### Community 15 - "budget.ts"
Cohesion: 0.06
Nodes (54): DataOptions, DataQuota, getMediaByShortcode(), getUserInfo(), getUserMedia(), MediaPage, Wrapped, BoxApiPost (+46 more)

### Community 16 - "reviewerSources.ts"
Cohesion: 0.16
Nodes (16): HttpError, REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, BackfillJobData, createBody, fields, reviewerSourcesRouter (+8 more)

### Community 17 - "reviews.ts"
Cohesion: 0.22
Nodes (7): IMAGE_MIMES, SHOP_STATUSES, handleField, ShopDoc, shopSchema, ShopImageDoc, shopImageSchema

### Community 18 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 19 - "jobs.ts"
Cohesion: 0.29
Nodes (6): getQuota(), JOB_TYPES, JobRunDoc, jobRunSchema, jobsRouter, runsQuery

### Community 20 - "Review.ts"
Cohesion: 0.25
Nodes (7): DIRECTIONS, OUTCOMES, REVIEW_SOURCE_TYPES, REVIEW_STATUSES, LIVE, ReviewDoc, reviewSchema

### Community 21 - "Wishlist.ts"
Cohesion: 0.40
Nodes (4): WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistDoc, wishlistSchema

### Community 22 - "Shop.ts"
Cohesion: 0.18
Nodes (11): DmEventDoc, dmEventSchema, ADMIN_ROLES, Direction, DM_KINDS, DM_RESULTS, DmKind, DmResult (+3 more)

### Community 23 - "DeletionRequest.ts"
Cohesion: 0.50
Nodes (3): DeletionRequestDoc, deletionRequestSchema, DELETION_STATUSES

### Community 24 - "PostCheck.ts"
Cohesion: 0.50
Nodes (3): POST_CHECK_STATUSES, PostCheckDoc, postCheckSchema

### Community 25 - "index.ts"
Cohesion: 0.10
Nodes (35): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+27 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.07
Nodes (47): RFC-4648, RFC-6238, createApp(), importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+39 more)

## Knowledge Gaps
- **208 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+203 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13709677419354838 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05616509926854754 - nodes in this community are weakly interconnected._
- **Should `shopProfile.worker.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._