# Tideway SSE Gateway V1 Design (Confirmed)

## 1. Scope and Principles

This design translates `spec/product-tech-spec-draft.md` into an implementable V1 with strong testability, clear abstractions, and incremental delivery.

Guiding principles:
- Optimize for low-latency fanout and simple operations first.
- Keep subscriber usage anonymous over HTTPS.
- Require API key authentication for publisher/admin APIs.
- Keep a single source of truth for runtime state in the control plane (Durable Object or Redis adapter).
- Build with adapter boundaries so non-Cloudflare deployment is possible without rewriting business logic.

## 2. High-Level Architecture

V1 has three layers:

1) Gateway API layer (Hono)
- Routes and request validation.
- Auth guard for publisher/admin APIs.
- Delegation to runtime state adapter.

2) Runtime state layer (adapter interface)
- `GatewayRuntimeAdapter` interface defines subscribe, publish, topic/connection listing, and topic tail events.
- Cloudflare implementation: Durable Object adapter.
- Non-Cloudflare implementation: Redis adapter with nowde registry.

1) Admin UI layer (React + Vite + shadcn + Tailwind CSS 4)
- Topics / Connections / Tail Events tabs.
- API key login persisted in localStorage.
- Every request includes `Authorization: Bearer <apiKey>`.

## 3. Data and Routing Model

### Subscriber model
- Endpoint: `GET /v1/stream`
- Required header: `x-sse-topic` (comma-separated topic names)
- Optional header: `x-sse-id` (client-supplied connection hint)

Server behavior:
- Parse and normalize topics.
- Create one logical connection ID for the stream.
- Register the connection into each topic fanout set.
- If a topic already exists, connection joins group fanout.
- On stream close, remove connection from every topic and delete empty topic indexes.

### Publisher model
- Endpoint: `POST /v1/publish`
- Required auth: API key
- Required headers: `x-sse-topic`, `x-sse-id`

Server behavior:
- Parse topics and event ID before reading request body.
- If none of the target topics currently have active subscribers, drop early and log `{topic, id}` without body parsing.
- If topic exists, read payload and fanout to matching subscribers.
- Store bounded tail events per topic for admin diagnostics.

### Admin model
- Required auth: same API key model as publisher.

APIs:
- `GET /v1/admin/topics?page=&pageSize=`
- `GET /v1/admin/connections?page=&pageSize=` (max page size 500)
- `GET /v1/admin/topics/:topic/tail?limit=`

All admin reads come from the runtime state layer source-of-truth (DO/Redis), not ephemeral in-memory worker state.

## 4. Adapter Strategy

### Interface-first contract
A shared interface keeps business behavior identical across deployments.

Core methods:
- `openStream(topics, connectionMeta)`
- `closeStream(connectionId)`
- `publish(eventEnvelope)`
- `listTopics(page, pageSize)`
- `listConnections(page, pageSize)`
- `tailEvents(topic, limit)`

### Cloudflare adapter (primary)
- Durable Object stores topic->connections map and connection metadata.
- Hono worker routes call DO methods to avoid worker replica inconsistency.
- DO performs fanout and cleanup.

### Redis adapter (non-Cloudflare)
- Redis hash/set keys emulate topic/connection indexes.
- Redis Pub/Sub fans out published events across gateway nodes.
- Node process reports startup metadata (`hostname`, `ip`, `startedAt`) using env override when explicit IP is needed.
- Adapter records topic-to-node distribution for diagnostics and routing.

## 5. Security and Auth

- Subscriber stream endpoints are anonymous.
- Publisher and admin routes require API keys configured by `SSE_PUBLISHER_API_KEYS` comma-separated env var.
- Constant-time API key comparison and normalized `Authorization` parsing.
- Admin UI stores key in localStorage only; never cookies; include logout/clear action.

## 6. Testing and Verification Strategy

- TDD for every feature slice.
- Unit tests for parsing, auth, pagination caps, and drop-early behavior.
- Integration tests:
  - Worker + Durable Object fanout path.
  - Disconnect cleanup path.
  - Admin pagination and auth.
- E2E tests (Wrangler deployed target) for real publish/subscribe flows.
- Benchmarks for publish-to-fanout latency and throughput.
- Persist artifacts in:
  - `test-results/`
  - `benchmark-results/`

## 7. Delivery Phases

Phase 1: Foundation and core SSE publish/subscribe via DO.
Phase 2: Admin APIs + Admin UI.
Phase 3: Redis adapter + Docker/Helm deployment.
Phase 4: E2E matrix examples (TS/Python/Go/Rust), docs, and benchmarks.

This order keeps risk low while producing a usable gateway quickly.
