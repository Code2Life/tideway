# Tideway SSE Gateway V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready SSE gateway on Hono + Cloudflare Workers with Durable Object state, API-key protected publisher/admin APIs, and a React admin console, then add a Redis adapter path for non-Cloudflare deployments.

**Architecture:** A Hono gateway routes requests through a `GatewayRuntimeAdapter` abstraction. Cloudflare Durable Object is the primary source-of-truth for connection and topic state. A Redis adapter mirrors the same contract for distributed non-Cloudflare deployment. Admin APIs/UI consume the same runtime state APIs.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers + Durable Objects + Wrangler/Miniflare, Vitest, React, Vite, shadcn/ui, Tailwind CSS 4, Redis, Docker, Helm.

---

### Task 1: Repository and Tooling Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `pnpm-workspace.yaml`
- Create: `vitest.workspace.ts`
- Create: `workers/gateway/package.json`
- Create: `workers/gateway/wrangler.toml`
- Create: `workers/gateway/src/index.ts`
- Create: `workers/gateway/test/health.spec.ts`

**Step 1: Write the failing test**
- Add an integration-style test for `GET /healthz` expecting HTTP 200 and JSON body.

**Step 2: Run test to verify it fails**
- Run: `pnpm --filter @tideway/gateway test`
- Expected: fail because worker app/routes do not exist.

**Step 3: Write minimal implementation**
- Add Hono app with `/healthz` route and worker export.

**Step 4: Run test to verify it passes**
- Run: `pnpm --filter @tideway/gateway test`
- Expected: pass for health route.

**Step 5: Commit**
- Commit message: `chore: scaffold workspace and worker test harness`

### Task 2: Topic Parsing and API Key Guard

**Files:**
- Create: `workers/gateway/src/lib/topic.ts`
- Create: `workers/gateway/src/lib/auth.ts`
- Create: `workers/gateway/test/topic.spec.ts`
- Create: `workers/gateway/test/auth.spec.ts`
- Modify: `workers/gateway/src/index.ts`

**Step 1: Write failing tests**
- Topic parser tests: normalize comma-separated values, dedupe, reject empty values.
- Auth tests: allow configured keys, deny missing/invalid headers, support multiple keys.

**Step 2: Verify red**
- Run targeted tests and confirm expected failures.

**Step 3: Minimal implementation**
- Implement pure utilities for topic parsing and API key validation.
- Wire auth middleware for publisher/admin routes.

**Step 4: Verify green**
- Run all gateway tests and confirm passes.

**Step 5: Commit**
- Commit message: `feat: add topic parsing and api key middleware`

### Task 3: Durable Object Runtime Adapter and SSE Connection Lifecycle

**Files:**
- Create: `workers/gateway/src/runtime/types.ts`
- Create: `workers/gateway/src/runtime/durable-object-adapter.ts`
- Create: `workers/gateway/src/durable-object/gateway-room.ts`
- Create: `workers/gateway/test/sse-lifecycle.spec.ts`
- Modify: `workers/gateway/src/index.ts`
- Modify: `workers/gateway/wrangler.toml`

**Step 1: Write failing tests**
- Open SSE stream with topic header.
- Assert connection appears in runtime state.
- Close stream and assert topic cleanup when no connections remain.

**Step 2: Verify red**
- Run lifecycle tests and confirm failures.

**Step 3: Minimal implementation**
- Implement DO-backed registration map and cleanup behavior.
- Return `text/event-stream` with keepalive.

**Step 4: Verify green**
- Run lifecycle tests and full gateway tests.

**Step 5: Commit**
- Commit message: `feat: implement do-backed sse connection lifecycle`

### Task 4: Publisher Flow and Drop-Early Behavior

**Files:**
- Create: `workers/gateway/test/publish.spec.ts`
- Modify: `workers/gateway/src/durable-object/gateway-room.ts`
- Modify: `workers/gateway/src/index.ts`

**Step 1: Write failing tests**
- Publish to active topic delivers event payload and ID.
- Publish to missing topic returns dropped status and does not parse body.

**Step 2: Verify red**
- Run publish tests and confirm fail for missing behavior.

**Step 3: Minimal implementation**
- Add topic existence check before body read.
- Fanout to connections and dedupe by connection ID.
- Log dropped topic/id metadata.

**Step 4: Verify green**
- Run publish tests + full suite.

**Step 5: Commit**
- Commit message: `feat: add publish fanout and drop-early path`

### Task 5: Admin Query APIs (Topics, Connections, Tail)

**Files:**
- Create: `workers/gateway/test/admin-api.spec.ts`
- Modify: `workers/gateway/src/durable-object/gateway-room.ts`
- Modify: `workers/gateway/src/index.ts`

**Step 1: Write failing tests**
- List connections with page/pageSize and max 500 enforcement.
- List topics with subscriber counts.
- Tail events endpoint returns latest bounded history.

**Step 2: Verify red**
- Run admin tests and confirm failures.

**Step 3: Minimal implementation**
- Add paged query methods in DO.
- Add bounded ring buffer per topic for tail events.

**Step 4: Verify green**
- Run all gateway tests.

**Step 5: Commit**
- Commit message: `feat: add admin topic connection and tail APIs`

### Task 6: Admin UI (React + shadcn + Tailwind)

**Files:**
- Create: `apps/admin-ui/...`
- Create: `apps/admin-ui/src/pages/topics.tsx`
- Create: `apps/admin-ui/src/pages/connections.tsx`
- Create: `apps/admin-ui/src/pages/tail-events.tsx`
- Create: `apps/admin-ui/src/components/api-key-login.tsx`
- Create: `apps/admin-ui/src/lib/api.ts`
- Create: `apps/admin-ui/test/admin-ui.spec.tsx`

**Step 1: Write failing tests**
- Login stores API key in localStorage.
- Requests include bearer token.
- Topics/Connections/Tail tabs fetch and render data.

**Step 2: Verify red**
- Run UI tests and confirm failure.

**Step 3: Minimal implementation**
- Build minimal UI with tabs and polling controls.
- Wire fetch client to gateway admin APIs.

**Step 4: Verify green**
- Run admin UI tests and build.

**Step 5: Commit**
- Commit message: `feat: add admin ui with api key auth and diagnostics tabs`

### Task 7: Redis Adapter and Multi-Node Runtime Metadata

**Files:**
- Create: `packages/runtime-redis/src/redis-adapter.ts`
- Create: `packages/runtime-redis/src/node-registry.ts`
- Create: `packages/runtime-redis/test/redis-adapter.spec.ts`
- Create: `packages/runtime-redis/test/node-registry.spec.ts`
- Modify: `workers/gateway/src/runtime/types.ts`

**Step 1: Write failing tests**
- Topic to node distribution is tracked.
- Publish reaches subscribers connected through different nodes.
- Startup node metadata persists with env override support.

**Step 2: Verify red**
- Run Redis adapter tests and confirm failures.

**Step 3: Minimal implementation**
- Implement Redis keys and pub/sub channels for fanout.
- Add node heartbeat/registration API.

**Step 4: Verify green**
- Run adapter tests with local Redis.

**Step 5: Commit**
- Commit message: `feat: add redis runtime adapter for distributed deployment`

### Task 8: Deploy Artifacts, Examples, E2E, Benchmarks, and Docs

**Files:**
- Create: `deploy/docker-compose.yml`
- Create: `deploy/helm/tideway/...`
- Create: `examples/{typescript,python,go,rust}/...`
- Create: `e2e/*.spec.ts`
- Create: `benchmarks/*.ts`
- Create: `docs/getting-started.md`
- Create: `docs/api-reference.md`
- Create: `docs/advanced-reference.md`
- Create: `test-results/README.md`
- Create: `benchmark-results/README.md`

**Step 1: Write failing tests/checks**
- E2E flows for subscribe/publish/admin endpoints.
- Smoke run for each language example.
- Benchmark harness with explicit baseline file output.

**Step 2: Verify red**
- Run E2E/bench commands to confirm expected initial failures.

**Step 3: Minimal implementation**
- Add deployment manifests and example clients.
- Add docs from quickstart to advanced operations.

**Step 4: Verify green**
- Run real wrangler deployment tests and benchmark scripts.
- Save outputs into `test-results/` and `benchmark-results/`.

**Step 5: Commit**
- Commit message: `docs: add deployment guides e2e examples and benchmark outputs`
