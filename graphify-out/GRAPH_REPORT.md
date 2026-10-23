# Graph Report - backend  (2026-10-23)

## Corpus Check
- 102 files · ~13,014 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 328 nodes · 500 edges · 59 communities (55 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a1e9670`
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
- [[_COMMUNITY_admin-create.ts|admin-create.ts]]
- [[_COMMUNITY_admin-import.ts|admin-import.ts]]
- [[_COMMUNITY_csrf.ts|csrf.ts]]
- [[_COMMUNITY_login.ts|login.ts]]
- [[_COMMUNITY_password.ts|password.ts]]
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
4. `Env` - 11 edges
5. `createAdminAccount()` - 9 edges
6. `totpCode()` - 9 edges
7. `logger` - 9 edges
8. `authenticateAdmin()` - 8 edges
9. `createApp()` - 7 edges
10. `hashPassword()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  backend/src/app.ts → backend/src/lib/errorHandler.ts
- `createApp()` --calls--> `isDbConnected()`  [EXTRACTED]
  backend/src/app.ts → backend/src/lib/db.ts
- `code()` --calls--> `totpCode()`  [EXTRACTED]
  backend/tests/integration/login.test.ts → backend/src/auth/totp.ts
- `shutdown()` --calls--> `disconnectDb()`  [EXTRACTED]
  backend/src/server.ts → backend/src/lib/db.ts
- `loggedInAgent()` --calls--> `createApp()`  [EXTRACTED]
  backend/tests/integration/adminAuthRoutes.test.ts → backend/src/app.ts

## Import Cycles
- None detected.

## Communities (59 total, 4 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.10
Nodes (28): csrfTokenFor(), requireCsrf(), SAFE_METHODS, verifyCsrf(), adminCookieOptions(), AdminIdentity, endAdminSession(), Express (+20 more)

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 2 - "scripts"
Cohesion: 0.22
Nodes (7): IMAGE_MIMES, SHOP_STATUSES, handleField, ShopDoc, shopSchema, ShopImageDoc, shopImageSchema

### Community 3 - "logger.ts"
Cohesion: 0.13
Nodes (16): Env, schema, connectDb(), disconnectDb(), isDbConnected(), errorHandler(), HttpError, logger (+8 more)

### Community 4 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+2 more)

### Community 5 - "app.ts"
Cohesion: 0.24
Nodes (9): allModels, syncAllIndexes(), MetaTokenDoc, metaTokenSchema, DUP, oid(), reviewInput(), sha() (+1 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, mongodb-memory-server, pino-pretty, supertest, tsx, @types/express, @types/node, @types/supertest (+20 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (18): Backend build plan (pagesanj) — micro-task todo list, Context, Conventions for every task, Critical files, Phase 0 — Foundations, Phase 10 — Moderation + wishlist admin (M3, PRD §9.2), Phase 11 — Meta compliance + landing render (M4, PRD §7, §10), Phase 12 — Hardening (+10 more)

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

### Community 10 - "RFC-6238"
Cohesion: 0.40
Nodes (4): DmEventDoc, dmEventSchema, DM_KINDS, DM_RESULTS

### Community 11 - "admin-create.ts"
Cohesion: 0.50
Nodes (3): DeletionRequestDoc, deletionRequestSchema, DELETION_STATUSES

### Community 12 - "admin-import.ts"
Cohesion: 0.50
Nodes (3): JOB_TYPES, JobRunDoc, jobRunSchema

### Community 21 - "csrf.ts"
Cohesion: 0.50
Nodes (3): REVIEWER_PERMISSIONS, ReviewerSourceDoc, reviewerSourceSchema

### Community 35 - "tsconfig.test.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, rootDir, extends, include

### Community 36 - "encryptField.ts"
Cohesion: 0.11
Nodes (33): RFC-4648, RFC-6238, username, createApp(), importAdmin(), trustMeAdmin, authenticateAdmin(), AuthResult (+25 more)

### Community 38 - "imageCheck.ts"
Cohesion: 0.28
Nodes (7): checkImage(), ImageCheck, ImageMime, sniffImageMime(), jpeg, png, webp

### Community 39 - "normalizeFa.ts"
Cohesion: 0.36
Nodes (6): LETTER_MAP, normalizeFa(), toLatinDigits(), toPersianDigits(), CategoryDoc, categorySchema

### Community 45 - "Admin.ts"
Cohesion: 0.13
Nodes (17): Direction, DIRECTIONS, JobType, Outcome, OUTCOMES, REVIEW_SOURCE_TYPES, REVIEW_STATUSES, ReviewStatus (+9 more)

## Knowledge Gaps
- **129 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `logger.ts` to `encryptField.ts`, `app.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `Env` connect `logger.ts` to `index.ts`, `encryptField.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09851551956815115 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._