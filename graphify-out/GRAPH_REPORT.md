# Graph Report - backend  (2026-10-29)

## Corpus Check
- 129 files · ~43,268 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 643 nodes · 1612 edges · 30 communities (27 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21caf8af`
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
- [[_COMMUNITY_reviewerSources.ts|reviewerSources.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_wishlist.ts|wishlist.ts]]
- [[_COMMUNITY_shopsServices.test.ts|shopsServices.test.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_Wishlist.ts|Wishlist.ts]]
- [[_COMMUNITY_Shop.ts|Shop.ts]]
- [[_COMMUNITY_DeletionRequest.ts|DeletionRequest.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_signedRequest.ts|signedRequest.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 20 edges
2. `normalizeHandle()` - 19 edges
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
  backend/src/services/reviewerPosts.ts → backend/tests/unit/boxapi.test.ts
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

## Communities (30 total, 3 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.11
Nodes (31): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+23 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.08
Nodes (48): worker, BoxApiError, sendMessage(), SendOptions, sendUrl(), signBoxApiBody(), verifyBoxApiSignature(), jobLogger() (+40 more)

### Community 4 - "shops.ts"
Cohesion: 0.32
Nodes (9): mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite(), normalizeContact() (+1 more)

### Community 5 - "reviews.ts"
Cohesion: 0.17
Nodes (15): Request, DeletionStatus, createLandingRouter(), DEFAULT_WEB_DIST, escapeHtml(), fillTemplate(), landingRouter, pageData() (+7 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (36): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+28 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 9 - "wishlist.ts"
Cohesion: 0.22
Nodes (16): normalizeHandle(), assertCategoriesExist(), assertHandlesFree(), ContactInput, createShop(), findByHandle(), handleOrThrow(), imageOrThrow() (+8 more)

### Community 10 - "wishlist.ts"
Cohesion: 0.24
Nodes (14): isDuplicateKey(), LETTER_MAP, normalizeFa(), toLatinDigits(), toPersianDigits(), slugify(), uniqueSlug(), CategoryDoc (+6 more)

### Community 11 - "shops.ts"
Cohesion: 0.10
Nodes (23): escapeRegex(), toObjectId(), fetchProfile(), ProfileDeps, ProfileDraft, ProfileJobData, shopProfileWorker, idParam() (+15 more)

### Community 12 - "server.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 13 - "webhook-spike.ts"
Cohesion: 0.11
Nodes (24): allow(), drainSends(), PNG, samples, lastPage, mediaRoute(), page, PNG (+16 more)

### Community 15 - "budget.ts"
Cohesion: 0.06
Nodes (59): DataOptions, DataQuota, getMediaByShortcode(), getQuota(), getUserInfo(), getUserMedia(), MediaPage, Wrapped (+51 more)

### Community 16 - "reviewerSources.ts"
Cohesion: 0.20
Nodes (14): REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, BackfillJobData, createBody, fields, reviewerSourcesRouter, updateBody (+6 more)

### Community 17 - "Shop.ts"
Cohesion: 0.40
Nodes (4): DmEventDoc, dmEventSchema, DM_KINDS, DM_RESULTS

### Community 18 - "wishlist.ts"
Cohesion: 0.25
Nodes (12): promoteBody, linkBody, listQuery, wishlistRouter, getShop(), dismiss(), entryOrThrow(), linkToShop() (+4 more)

### Community 19 - "shopsServices.test.ts"
Cohesion: 0.24
Nodes (8): HttpError, createBody, name, updateBody, deleteCategory(), listCategories(), PNG, rejects()

### Community 20 - "index.ts"
Cohesion: 0.36
Nodes (7): allModels, syncAllIndexes(), DUP, oid(), reviewInput(), sha(), shopInput()

### Community 21 - "Wishlist.ts"
Cohesion: 0.40
Nodes (4): WISHLIST_SOURCES, WISHLIST_STATUSES, WishlistDoc, wishlistSchema

### Community 22 - "Shop.ts"
Cohesion: 0.11
Nodes (17): ADMIN_ROLES, Direction, DmKind, IMAGE_MIMES, JOB_TYPES, Outcome, REVIEW_SOURCE_TYPES, ReviewStatus (+9 more)

### Community 23 - "DeletionRequest.ts"
Cohesion: 0.50
Nodes (3): DeletionRequestDoc, deletionRequestSchema, DELETION_STATUSES

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (37): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+29 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.09
Nodes (40): RFC-4648, RFC-6238, createApp(), importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+32 more)

### Community 43 - "signedRequest.ts"
Cohesion: 0.12
Nodes (22): username, Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler(), loggerOptions (+14 more)

## Knowledge Gaps
- **196 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `worker` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `scripts` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _196 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10960960960960961 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07643600180913614 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._