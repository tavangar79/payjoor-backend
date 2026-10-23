# Graph Report - backend  (2026-10-23)

## Corpus Check
- 96 files · ~8,712 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 277 nodes · 309 edges · 60 communities (57 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0058ae22`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_logger.ts|logger.ts]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_app.ts|app.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_backend|backend/]]
- [[_COMMUNITY_names.ts|names.ts]]
- [[_COMMUNITY_RFC-6238|RFC-6238]]
- [[_COMMUNITY_tsconfig.test.json|tsconfig.test.json]]
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_handle.ts|handle.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_normalizeFa.ts|normalizeFa.ts]]
- [[_COMMUNITY_Admin.ts|Admin.ts]]

## God Nodes (most connected - your core abstractions)
1. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
2. `scripts` - 12 edges
3. `compilerOptions` - 12 edges
4. `logger` - 8 edges
5. `Env` - 6 edges
6. `createApp()` - 5 edges
7. `backend/` - 5 edges
8. `normalizeFa()` - 4 edges
9. `disconnectDb()` - 3 edges
10. `isDbConnected()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --calls--> `isDbConnected()`  [EXTRACTED]
  backend/src/app.ts → backend/src/lib/db.ts
- `shutdown()` --calls--> `disconnectDb()`  [EXTRACTED]
  backend/src/server.ts → backend/src/lib/db.ts

## Import Cycles
- None detected.

## Communities (60 total, 3 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.18
Nodes (8): authRouter, categoriesRouter, adminRouter, jobsRouter, reviewerSourcesRouter, reviewsRouter, shopsRouter, wishlistRouter

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 2 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, admin:create, admin:import, build, dev, dev:worker, spike:webhook, start (+4 more)

### Community 3 - "logger.ts"
Cohesion: 0.12
Nodes (17): createApp(), Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler(), HttpError (+9 more)

### Community 4 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+2 more)

### Community 5 - "app.ts"
Cohesion: 0.10
Nodes (18): DmEventDoc, dmEventSchema, DM_KINDS, DM_RESULTS, allModels, syncAllIndexes(), LoginAttemptDoc, loginAttemptSchema (+10 more)

### Community 6 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, mongodb-memory-server, pino-pretty, supertest, tsx, @types/express, @types/node, @types/supertest (+8 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.60
Nodes (3): decryptField(), encryptField(), key

### Community 38 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 39 - "normalizeFa.ts"
Cohesion: 0.36
Nodes (6): LETTER_MAP, normalizeFa(), toLatinDigits(), toPersianDigits(), CategoryDoc, categorySchema

### Community 45 - "Admin.ts"
Cohesion: 0.06
Nodes (36): AdminDoc, adminSchema, DeletionRequestDoc, deletionRequestSchema, ADMIN_ROLES, DELETION_STATUSES, Direction, DIRECTIONS (+28 more)

## Knowledge Gaps
- **119 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `logger.ts` to `app.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `devDependencies`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Env` connect `logger.ts` to `encryptField.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12096774193548387 - nodes in this community are weakly interconnected._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10153846153846154 - nodes in this community are weakly interconnected._