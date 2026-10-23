# Graph Report - backend  (2026-10-23)

## Corpus Check
- 92 files · ~5,565 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 213 nodes · 196 edges · 71 communities (68 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4b4914f`
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
- [[_COMMUNITY_encryptField.ts|encryptField.ts]]
- [[_COMMUNITY_handle.ts|handle.ts]]
- [[_COMMUNITY_imageCheck.ts|imageCheck.ts]]
- [[_COMMUNITY_normalizeFa.ts|normalizeFa.ts]]

## God Nodes (most connected - your core abstractions)
1. `Backend build plan (pagesanj) — micro-task todo list` - 18 edges
2. `scripts` - 12 edges
3. `compilerOptions` - 12 edges
4. `logger` - 7 edges
5. `Env` - 6 edges
6. `createApp()` - 5 edges
7. `backend/` - 5 edges
8. `disconnectDb()` - 3 edges
9. `isDbConnected()` - 3 edges
10. `errorHandler()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --calls--> `isDbConnected()`  [EXTRACTED]
  backend/src/app.ts → backend/src/lib/db.ts
- `shutdown()` --calls--> `disconnectDb()`  [EXTRACTED]
  backend/src/server.ts → backend/src/lib/db.ts

## Import Cycles
- None detected.

## Communities (71 total, 3 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.18
Nodes (8): authRouter, categoriesRouter, adminRouter, jobsRouter, reviewerSourcesRouter, reviewsRouter, shopsRouter, wishlistRouter

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 2 - "scripts"
Cohesion: 0.11
Nodes (18): engines, node, name, private, scripts, admin:create, admin:import, build (+10 more)

### Community 3 - "logger.ts"
Cohesion: 0.18
Nodes (10): Env, schema, connectDb(), disconnectDb(), HttpError, logger, app, server (+2 more)

### Community 4 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+2 more)

### Community 5 - "app.ts"
Cohesion: 0.21
Nodes (8): createApp(), isDbConnected(), errorHandler(), landingRouter, mediaRouter, metaRouter, webhooksRouter, useMongo()

### Community 6 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, mongodb-memory-server, pino-pretty, supertest, tsx, @types/express, @types/node, @types/supertest (+2 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 36 - "encryptField.ts"
Cohesion: 0.60
Nodes (3): decryptField(), encryptField(), key

### Community 38 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 39 - "normalizeFa.ts"
Cohesion: 0.60
Nodes (4): LETTER_MAP, normalizeFa(), toLatinDigits(), toPersianDigits()

## Knowledge Gaps
- **80 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._