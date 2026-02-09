<div align="center">

# tideway

**Real-time events, zero infrastructure.**

A lightweight SSE gateway on Cloudflare Workers: POST events in, stream them out over SSE. No queues, no brokers. Use it for live dashboards, notifications, or any pub/sub over HTTP.

**[English](README.md)** · **[中文](README.zh.md)**

[![License](https://img.shields.io/github/license/Code2Life/tideway)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## Try it (under a minute)

**Prerequisites:** Node 18+ and [pnpm](https://pnpm.io) (`npm i -g pnpm`).

```bash
git clone https://github.com/tensor-fusion/tideway.git && cd tideway
pnpm install && pnpm --filter @tideway/gateway dev
```

In **another terminal**: subscribe, then publish. Local dev uses API key `dev-key` (no signup).

```bash
# Terminal A: subscribe to topic "alerts"
curl -N -H "x-sse-topic: alerts" http://localhost:8787/v1/stream
```

```bash
# Terminal B: publish one event
curl -X POST http://localhost:8787/v1/publish \
  -H "Authorization: Bearer dev-key" \
  -H "x-sse-topic: alerts" -H "x-sse-id: evt-1" \
  -d '{"msg": "hello world"}'
```

Terminal A prints: `id: evt-1` and `data: {"msg": "hello world"}`.

---

## Highlights

| | |
|---|---|
| **Fast** | ~0.07ms publish latency; 14K+ ev/s fan-out to 200 subscribers ([benchmarks](benchmark-results/)) |
| **Small** | Single Worker, no queues or external state; Durable Objects only |
| **Multi-topic** | Subscribe with `x-sse-topic: a,b,c`; publish to any topic via POST |
| **Drop-early** | No active subscribers → drop publish without reading body |
| **Distributed** | Redis adapter + Docker/Helm for 3+ nodes off Cloudflare |
| **Admin UI** | Topics, connections, and live event tail — built-in at `/admin` |

---

## Architecture

```
                  ┌──────────────────────────────────────┐
                  │         Cloudflare Workers           │
                  │                                      │
  Publisher ──POST──▶  Hono Router ──▶ Durable Object    │
                  │       │              (GatewayRoom)   │
  Subscriber ──SSE──▶     │           ┌──────────────┐   │
                  │       │           │ Connection   │   │
  Admin UI ──GET──▶       │           │ Map + Event  │   │
                  │       │           │ Buffer       │   │
                  │       │           └──────────────┘   │
                  └──────────────────────────────────────┘
                           ▼ (non-CF)
                  ┌──────────────────┐
                  │  Redis Adapter   │  ← same API,
                  │  (multi-node)    │    Docker/Helm
                  └──────────────────┘
```

---

## API at a glance

| Endpoint | Method | Auth | Description |
|----------|--------|------|--------------|
| `/v1/stream` | GET | — | SSE subscribe (`x-sse-topic` header) |
| `/v1/publish` | POST | API Key | Publish event (`x-sse-topic`, `x-sse-id`) |
| `/v1/admin/topics` | GET | API Key | List topics (paginated, max 500) |
| `/v1/admin/connections` | GET | API Key | List connections |
| `/v1/admin/topics/:topic/tail` | GET | API Key | Recent events for a topic |
| `/healthz` | GET | — | Health check |

Details: [docs/api-reference.md](docs/api-reference.md)

---

## Client examples

Publisher + subscriber in four languages (E2E-validated):

| Language | Publisher | Subscriber |
|----------|-----------|------------|
| TypeScript | [publisher.ts](examples/typescript/publisher.ts) | [subscriber.ts](examples/typescript/subscriber.ts) |
| Python | [publisher.py](examples/python/publisher.py) | [subscriber.py](examples/python/subscriber.py) |
| Go | [main.go](examples/go/publisher/main.go) | [main.go](examples/go/subscriber/main.go) |
| Rust | [publisher.rs](examples/rust/src/bin/publisher.rs) | [subscriber.rs](examples/rust/src/bin/subscriber.rs) |

---

## Deploy

| Environment | Command |
|-------------|---------|
| **Cloudflare Workers** | `cd workers/gateway && npx wrangler deploy` |
| **Docker** | `docker run -p 8787:8787 -e SSE_PUBLISHER_API_KEYS=key ghcr.io/tensor-fusion/tideway-gateway:latest` |
| **Docker Compose** | `docker compose -f deploy/docker-compose.yml up` (3 gateways + Redis) |
| **Helm (K8s)** | `helm install tideway deploy/helm/tideway --set gateway.apiKeys=key` |

Full self-host guide: [docs/self-host-guide.md](docs/self-host-guide.md)

---

## Admin UI

```bash
# visit /admin on your running gateway
open http://localhost:8787/admin
# → log in with your API key
```

Tabs: **Topics** · **Connections** · **Tail events**

---

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm e2e:examples    # TS/Python/Go/Rust smoke
pnpm bench:publish   # fan-out benchmark
```

**Layout:** `workers/gateway/` (Worker + inline Admin UI) · `packages/runtime-redis/` (Redis adapter) · `examples/` · `deploy/` · `docs/`

**Releases:** Versioning is done by [release-please](.github/workflows/release.yml) on conventional commits. If the Release workflow fails with *"GitHub Actions is not permitted to create or approve pull requests"*, enable **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests** (organization may need to allow it first). Optionally set a `RELEASE_PLEASE_TOKEN` secret (PAT) for the action to use.

---

## Docs

- [Getting started](docs/getting-started.md)
- [API reference](docs/api-reference.md)
- [Self-host guide](docs/self-host-guide.md) (Docker, Helm, building from source)
- [Advanced](docs/advanced-reference.md) (Redis adapter, benchmarks, E2E)

---

**[English](README.md)** · **[中文](README.zh.md)** — [MIT](LICENSE)
