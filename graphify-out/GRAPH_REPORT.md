# Graph Report - backend  (2026-10-23)

## Corpus Check
- 136 files · ~35,658 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 620 nodes · 1601 edges · 30 communities (28 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ec8b68d`
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
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_Admin.ts|Admin.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 28 edges
2. `normalizeHandle()` - 20 edges
3. `logger` - 18 edges
4. `createShop()` - 18 edges
5. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
6. `getQueue()` - 16 edges
7. `useMongo()` - 16 edges
8. `updateShop()` - 15 edges
9. `createAdminAccount()` - 14 edges
10. `totpCode()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `runBackfill()` --indirect_call--> `source()`  [INFERRED]
  backend/src/apify/backfill.ts → backend/tests/integration/reviewerPosts.test.ts
- `runDailyCheck()` --indirect_call--> `source()`  [INFERRED]
  backend/src/apify/dailyCheck.ts → backend/tests/integration/reviewerPosts.test.ts
- `normalizeContact()` --indirect_call--> `normalizeEmail()`  [INFERRED]
  backend/src/services/shops.ts → backend/src/lib/contact.ts
- `normalizeContact()` --indirect_call--> `normalizeWebsite()`  [INFERRED]
  backend/src/services/shops.ts → backend/src/lib/contact.ts

## Import Cycles
- None detected.

## Communities (30 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.11
Nodes (30): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+22 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.07
Nodes (47): username, handle, out, importAdmin(), trustMeAdmin, Env, schema, connectDb() (+39 more)

### Community 4 - "shops.ts"
Cohesion: 0.26
Nodes (16): escapeRegex(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), handleOrThrow(), imageOrThrow(), listShops() (+8 more)

### Community 5 - "reviews.ts"
Cohesion: 0.13
Nodes (15): DIRECTIONS, OUTCOMES, REVIEW_SOURCE_TYPES, REVIEW_STATUSES, LIVE, ReviewDoc, reviewSchema, approveBody (+7 more)

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
Cohesion: 0.19
Nodes (15): WishlistSource, WishlistDoc, promoteBody, linkBody, listQuery, wishlistRouter, getShop(), ShopInput (+7 more)

### Community 10 - "shopsServices.test.ts"
Cohesion: 0.19
Nodes (11): HttpError, categoriesRouter, createBody, name, updateBody, deleteCategory(), listCategories(), saveShopImage() (+3 more)

### Community 11 - "shops.ts"
Cohesion: 0.14
Nodes (14): toObjectId(), ProfileJobData, idParam(), idParam(), idParam(), contactField, createBody, enqueueProfile() (+6 more)

### Community 12 - "reviewerSources.ts"
Cohesion: 0.29
Nodes (10): isDuplicateKey(), createBody, fields, updateBody, createSource(), enqueueBackfill(), listSources(), needsBackfill() (+2 more)

### Community 13 - "webhook-spike.ts"
Cohesion: 0.11
Nodes (22): app, dir, signBody(), verifySignature(), fixture, allow(), drainSends(), PNG (+14 more)

### Community 14 - "categories.ts"
Cohesion: 0.33
Nodes (10): normalizeFa(), slugify(), uniqueSlug(), CategoryDoc, categorySchema, assertNameFree(), CategoryInput, createCategory() (+2 more)

### Community 15 - "budget.ts"
Cohesion: 0.07
Nodes (48): runBackfill(), BudgetCheck, BudgetError, canRun(), RunKind, ApifyClientOptions, ApifyError, ApifyRun (+40 more)

### Community 16 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 17 - "Shop.ts"
Cohesion: 0.22
Nodes (7): IMAGE_MIMES, SHOP_STATUSES, handleField, ShopDoc, shopSchema, ShopImageDoc, shopImageSchema

### Community 18 - "extractTagged.ts"
Cohesion: 0.18
Nodes (19): runDailyCheck(), extractTagged(), IngestCounts, ingestPosts(), ApifyPost, postTime(), postUrl(), Direction (+11 more)

### Community 19 - "ReviewerSource.ts"
Cohesion: 0.50
Nodes (3): REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema

### Community 25 - "index.ts"
Cohesion: 0.08
Nodes (40): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+32 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.07
Nodes (48): RFC-4648, RFC-6238, createApp(), authenticateAdmin(), AuthResult, createAdminAccount(), reserveAttempt(), derive() (+40 more)

### Community 38 - "imageCheck.ts"
Cohesion: 0.22
Nodes (12): first(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite() (+4 more)

### Community 45 - "Admin.ts"
Cohesion: 0.13
Nodes (15): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, DELETION_STATUSES, DM_KINDS, DM_RESULTS, DmKind (+7 more)

## Knowledge Gaps
- **193 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _193 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0700152207001522 - nodes in this community are weakly interconnected._
- **Should `reviews.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._