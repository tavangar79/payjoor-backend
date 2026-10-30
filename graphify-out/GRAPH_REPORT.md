# Graph Report - backend  (2026-10-30)

## Corpus Check
- 129 files · ~42,678 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 631 nodes · 1589 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d948f87`
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
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_PostOwner.ts|PostOwner.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_reviewerSources.ts|reviewerSources.ts]]
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
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `ingestPosts()` --indirect_call--> `post()`  [INFERRED]
  backend/src/services/reviewerPosts.ts → backend/tests/unit/boxapi.test.ts
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --indirect_call--> `serializeReq()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/logger.ts

## Import Cycles
- None detected.

## Communities (19 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.12
Nodes (28): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+20 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.08
Nodes (48): BoxApiError, sendMessage(), SendOptions, sendUrl(), jobLogger(), createRedis(), DmInboundData, dmJobId() (+40 more)

### Community 4 - "shops.ts"
Cohesion: 0.06
Nodes (62): bioPhone(), mapProfile(), phone(), ScrapedProfile, website(), normalizeEmail(), normalizePhone(), normalizeWebsite() (+54 more)

### Community 5 - "shopProfile.worker.ts"
Cohesion: 0.09
Nodes (26): DataOptions, DataQuota, getMediaByShortcode(), getQuota(), getUserInfo(), MediaPage, Wrapped, BoxApiProfile (+18 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+29 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 13 - "webhook-spike.ts"
Cohesion: 0.12
Nodes (22): allow(), drainSends(), PNG, samples, lastPage, mediaRoute(), page, PNG (+14 more)

### Community 15 - "budget.ts"
Cohesion: 0.08
Nodes (45): getUserMedia(), BoxApiPost, captionText(), extractTagged(), ImageVersions, isPinned(), mediaUrls(), postTime() (+37 more)

### Community 16 - "reviewerSources.ts"
Cohesion: 0.14
Nodes (14): toObjectId(), REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, idParam(), createBody, fields, idParam() (+6 more)

### Community 22 - "Shop.ts"
Cohesion: 0.05
Nodes (52): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, ADMIN_ROLES, DELETION_STATUSES, DIRECTIONS, DM_KINDS (+44 more)

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (36): BotDeps, BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult (+28 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.08
Nodes (39): RFC-4648, RFC-6238, importAdmin(), pagesanjAdmin, authenticateAdmin(), AuthResult, createAdminAccount(), reserveAttempt() (+31 more)

### Community 43 - "signedRequest.ts"
Cohesion: 0.09
Nodes (32): username, createApp(), signBoxApiBody(), verifyBoxApiSignature(), Env, schema, connectDb(), disconnectDb() (+24 more)

## Knowledge Gaps
- **192 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07738095238095238 - nodes in this community are weakly interconnected._
- **Should `shops.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0629746835443038 - nodes in this community are weakly interconnected._