# Graph Report - backend  (2026-10-23)

## Corpus Check
- 135 files · ~33,633 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 595 nodes · 1511 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e128902d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_webhook-spike.ts|webhook-spike.ts]]
- [[_COMMUNITY_budget.ts|budget.ts]]
- [[_COMMUNITY_extractTagged.ts|extractTagged.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_Admin.ts|Admin.ts]]

## God Nodes (most connected - your core abstractions)
1. `Env` - 28 edges
2. `normalizeHandle()` - 20 edges
3. `logger` - 18 edges
4. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
5. `getQueue()` - 16 edges
6. `createShop()` - 15 edges
7. `useMongo()` - 15 edges
8. `scripts` - 13 edges
9. `isDuplicateKey()` - 13 edges
10. `QUEUES` - 13 edges

## Surprising Connections (you probably didn't know these)
- `startWorkers()` --references--> `worker`  [EXTRACTED]
  backend/src/queues/startWorkers.ts → backend/package.json
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `rejects()` --indirect_call--> `HttpError`  [INFERRED]
  backend/tests/integration/shopsServices.test.ts → backend/src/lib/errorHandler.ts
- `enqueueProfile()` --calls--> `getQueue()`  [EXTRACTED]
  backend/src/routes/admin/shops.ts → backend/src/queues/queues.ts
- `runBackfill()` --calls--> `ingestPosts()`  [EXTRACTED]
  backend/src/apify/backfill.ts → backend/src/apify/ingest.ts

## Import Cycles
- None detected.

## Communities (19 total, 1 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.11
Nodes (30): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+22 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 3 - "logger.ts"
Cohesion: 0.06
Nodes (56): lookupPostOwner(), BotDeps, jobLogger(), createRedis(), REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema, DmInboundData (+48 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (39): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+31 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 13 - "webhook-spike.ts"
Cohesion: 0.10
Nodes (24): GraphError, RETRYABLE_CODES, SendOptions, sendText(), signBody(), verifySignature(), processDmSend(), fixture (+16 more)

### Community 15 - "budget.ts"
Cohesion: 0.06
Nodes (50): username, handle, out, app, dir, runBackfill(), BudgetCheck, BudgetError (+42 more)

### Community 18 - "extractTagged.ts"
Cohesion: 0.22
Nodes (15): extractTagged(), IngestCounts, ingestPosts(), ApifyPost, postTime(), postUrl(), normalizeHandle(), isDuplicateKey() (+7 more)

### Community 25 - "index.ts"
Cohesion: 0.11
Nodes (34): BotOutcome, handleMessage(), detectLang(), Lang, LookupDeps, lookupHandle(), LookupResult, ReviewSummary (+26 more)

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.08
Nodes (44): RFC-4648, RFC-6238, createApp(), importAdmin(), trustMeAdmin, authenticateAdmin(), AuthResult, createAdminAccount() (+36 more)

### Community 38 - "imageCheck.ts"
Cohesion: 0.05
Nodes (72): first(), mapProfile(), phone(), ProfileItem, ScrapedProfile, website(), normalizeEmail(), normalizePhone() (+64 more)

### Community 45 - "Admin.ts"
Cohesion: 0.06
Nodes (43): DeletionRequestDoc, deletionRequestSchema, DmEventDoc, dmEventSchema, DELETION_STATUSES, Direction, DIRECTIONS, DM_KINDS (+35 more)

## Knowledge Gaps
- **187 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startWorkers()` connect `logger.ts` to `devDependencies`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `worker` connect `devDependencies` to `logger.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10810810810810811 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061052631578947365 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._