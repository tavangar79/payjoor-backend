# Graph Report - backend  (2026-10-23)

## Corpus Check
- 84 files · ~1,939 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 160 nodes · 112 edges · 73 communities (71 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `scripts` - 12 edges
2. `compilerOptions` - 12 edges
3. `backend/` - 5 edges
4. `logger` - 4 edges
5. `Env` - 3 edges
6. `engines` - 2 edges
7. `createApp()` - 2 edges
8. `authRouter` - 2 edges
9. `categoriesRouter` - 2 edges
10. `adminRouter` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (73 total, 2 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.20
Nodes (7): authRouter, categoriesRouter, jobsRouter, reviewerSourcesRouter, reviewsRouter, shopsRouter, wishlistRouter

### Community 1 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule, rootDir (+5 more)

### Community 2 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, admin:create, admin:import, build, dev, dev:worker, spike:webhook, start (+4 more)

### Community 3 - "logger.ts"
Cohesion: 0.27
Nodes (6): createApp(), Env, schema, logger, app, TODO: connect MongoDB and Redis, start every worker in src/queues/workers/,

### Community 4 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @bull-board/api, @bull-board/express, bullmq, express, ioredis, mongoose, pino (+2 more)

### Community 5 - "app.ts"
Cohesion: 0.29
Nodes (5): adminRouter, landingRouter, mediaRouter, metaRouter, webhooksRouter

### Community 6 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, mongodb-memory-server, pino-pretty, tsx, @types/express, @types/node, typescript, vitest

### Community 7 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 8 - "backend/"
Cohesion: 0.33
Nodes (5): backend/, Commands, graphify, Rules, Structure

## Knowledge Gaps
- **53 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _54 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._