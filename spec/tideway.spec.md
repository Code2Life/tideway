# SSE Gateway — Product & Technical Spec

## Overview

Implement a simple **SSE Gateway**: publishers (e.g. web servers) send each event via HTTP POST to the gateway; edge clients consume events over SSE or WebSocket.

## Tech Stack

- **Runtime**: Hono + Cloudflare Workers + Cloudflare Durable Objects (DO)
- **Tooling**: Wrangler (Miniflare for local dev/debug), Vite
- **Admin UI**: React + Shadcn + Tailwind CSS 4

## Authentication

| Role        | Auth model                          |
|------------|--------------------------------------|
| Subscriber | Anonymous (any HTTPS client)         |
| Publisher  | API Key (gateway supports multiple keys, comma-separated) |

---

## Detailed Requirements

### 1. Subscriber: topic selection and connection model

- On **SSE connection creation**, the client sends header **`x-sse-topic`** with a **comma-separated** list of topic names.
- The server uses this value to either:
  - create a **unicast** connection (new topic), or
  - attach to an existing topic (effectively **multicast** when multiple subscribers share a topic).

### 2. Connection lifecycle and publish semantics

**Cleanup**

- When a connection drops, if the topic has **zero** remaining SSE connections, remove that topic from the connection map (and any related routing state).

**Publish**

- Publish requests **must** include headers: **`x-sse-topic`**, **`x-sse-id`** (same format/rules as subscriber topic).
- If the topic has **no active connections** (transient topic not found):
  - **Drop** the message.
  - **Log** topic and id; do **not** read the body (for performance).
- Design for low latency and minimal work on “topic not found” path.

### 3. Admin API and Admin UI

**REST API**

- **Paged list** of connections: RESTful, **max 500 items per request**, with pagination params.

**Admin UI**

- **Auth**: same API key as publisher; store in **localStorage** as login state; send key on each request (e.g. `Authorization` header).
- **Tabs**: Topics | Connections | Tail Events (tail requires selecting a topic).
- **Data source**: Admin UI must read from **Durable Object (DO)** so data is consistent and not affected by Worker hibernation or multiple replicas.
- **Stack**: React + Shadcn + Tailwind CSS 4; keep the app minimal and focused.

### 4. Distributed deployment and Redis adapter

- **Cloudflare**: use DO for state; design remains performance- and distribution-aware.
- **Non-Cloudflare**: provide a **Redis adapter** that **mimics the DO API** so the same gateway logic can run outside CF.
  - On startup, each node **reports its identity** (IP/hostname); allow override via env (e.g. advertised host).
  - Redis adapter must **track which nodes** hold connections for each topic so publish can be routed correctly when only one node receives the POST.
- **Design**: keep adapter **decoupled** and **unit-testable** in isolation.
- **Deploy options**:
  - **Docker**: single compose (or equivalent) for local/distributed runs.
  - **Helm**: deploy **3 SSE Gateway replicas** + Redis (built-in or external).

### 5. Documentation and examples

- **Docs** in `docs/`: from **Getting Started** through **Advanced Reference**; review APIs and usage from a **user perspective** and adjust if needed.
- **Client examples**: TypeScript, Python, Go, Rust for both **publisher** and **subscriber**.
- **Validation**: E2E tests must **run these examples** and verify they work against the real gateway.

### 6. Quality and testing (high priority)

- Design and implementation must emphasize **performance** and **distributed behavior**; follow best practices.
- **Test strategy**:
  - High-value unit/integration tests.
  - **Benchmark tests** (e.g. throughput, fan-out, latency).
  - **E2E tests**: use **Wrangler CLI** to deploy the worker and run tests against the **real** deployed environment; do **not** bypass or mock in E2E (if env/tooling is missing, request it rather than mocking).
- **Artifacts**: persist results under:
  - `test-results/`
  - `benchmark-results/`
- Results must be **reviewable and comparable** after completion.

---

## Summary checklist

- [ ] SSE/WebSocket subscribe with `x-sse-topic` (comma-separated); unicast vs multicast by topic.
- [ ] Publish via POST with `x-sse-topic` + `x-sse-id`; drop and log when topic has no connections; no body read on drop path.
- [ ] Connection map cleanup when last subscriber of a topic disconnects.
- [ ] REST API: paged connections list (≤500 per page).
- [ ] Admin UI: API Key auth (localStorage + header), tabs Topics | Connections | Tail Events, data from DO.
- [ ] Redis adapter for non-CF; node identity and topic→node mapping; Docker + Helm (3 GW + Redis).
- [ ] Docs (Getting Started → Advanced); TS/Python/Go/Rust examples; E2E verification.
- [ ] Tests + benchmarks + E2E against real deploy; outputs in `test-results/` and `benchmark-results/`.
