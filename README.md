<div align="center">

# tideway

**Real-time Events, Zero Infrastructure.**

A lightweight SSE gateway that runs on Cloudflare Workers. Publishers POST events, subscribers consume them over SSE — that's it.

[English](README.md) | [中文](README.zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## Try It in 30 Seconds

```bash
# 1. Start the gateway
git clone https://github.com/tensor-fusion/tideway.git && cd tideway
pnpm install && pnpm --filter @tideway/gateway dev
```

```bash
# 2. Subscribe (Terminal A)
curl -N -H "x-sse-topic: alerts" http://localhost:8787/v1/stream
```

```bash
# 3. Publish (Terminal B)
curl -X POST http://localhost:8787/v1/publish \
  -H "Authorization: Bearer dev-key" \
  -H "x-sse-topic: alerts" \
  -H "x-sse-id: evt-1" \
  -d '{"msg": "hello world"}'
```

Terminal A instantly prints:

```
id: evt-1
data: {"msg": "hello world"}
```

---

## Highlights

**Fast** — 0.07ms mean publish latency, 14K+ events/sec fan-out to 200 subscribers ([benchmark](benchmark-results/))

**Tiny** — single Worker, no queues, no external state; Durable Objects handle everything

**Multi-topic fan-out** — subscribers send `x-sse-topic: a,b,c`; publishers target any topic via HTTP POST

**Drop-early path** — when a topic has zero subscribers, the publish is dropped before reading the body

**Distributed mode** — swap in the Redis adapter and deploy 3+ nodes via Docker Compose or Helm

**Admin dashboard** — React + Tailwind UI for topics, connections, and live event tailing

---

## Architecture

```
                  ┌──────────────────────────────────────┐
                  │         Cloudflare Workers            │
                  │                                      │
  Publisher ──POST──▶  Hono Router ──▶ Durable Object    │
                  │       │              (GatewayRoom)    │
  Subscriber ──SSE──▶    │           ┌──────────────┐    │
                  │       │           │ Connection   │    │
  Admin UI ──GET──▶       │           │ Map + Event  │    │
                  │       │           │ Buffer       │    │
                  │       │           └──────────────┘    │
                  └──────────────────────────────────────┘
                           ▼ (non-CF)
                  ┌──────────────────┐
                  │  Redis Adapter   │  ← same API,
                  │  (multi-node)    │    Docker/Helm
                  └──────────────────┘
```

---

## API at a Glance

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/v1/stream` | GET | None | Subscribe to topics via SSE (`x-sse-topic` header) |
| `/v1/publish` | POST | API Key | Publish an event (`x-sse-topic` + `x-sse-id` headers) |
| `/v1/admin/topics` | GET | API Key | List active topics (paginated, max 500) |
| `/v1/admin/connections` | GET | API Key | List active connections |
| `/v1/admin/topics/:topic/tail` | GET | API Key | Recent events buffer for a topic |
| `/healthz` | GET | None | Health check |

> Full details: [docs/api-reference.md](docs/api-reference.md)

---

## Client Examples

Ready-to-run publisher + subscriber in four languages:

| Language | Publisher | Subscriber |
|---|---|---|
| TypeScript | [publisher.ts](examples/typescript/publisher.ts) | [subscriber.ts](examples/typescript/subscriber.ts) |
| Python | [publisher.py](examples/python/publisher.py) | [subscriber.py](examples/python/subscriber.py) |
| Go | [publisher.go](examples/go/publisher.go) | [subscriber.go](examples/go/subscriber.go) |
| Rust | [publisher.rs](examples/rust/src/bin/publisher.rs) | [subscriber.rs](examples/rust/src/bin/subscriber.rs) |

All examples are validated by E2E tests on every run.

---

## Deploy

### Cloudflare Workers (recommended)

```bash
cd workers/gateway
npx wrangler deploy
```

### Docker Compose (3 gateways + Redis)

```bash
docker compose -f deploy/docker-compose.yml up
# Gateways on :8787, :8788, :8789
```

### Helm (Kubernetes)

```bash
helm install tideway deploy/helm/tideway
# 3 replicas + Redis by default
```

> Distributed mode docs: [docs/advanced-reference.md](docs/advanced-reference.md)

---

## Admin UI

```bash
pnpm --filter @tideway/admin-ui dev
# → http://localhost:5173
```

Login with your API key. Three tabs: **Topics** | **Connections** | **Tail Events**.

---

## Development

```bash
pnpm install              # install all workspace deps
pnpm test                 # run unit tests
pnpm typecheck            # type-check all packages
pnpm e2e:examples         # E2E smoke tests (TS/Python/Go/Rust)
pnpm bench:publish        # publish fan-out benchmark
```

### Project Structure

```
workers/gateway/     Gateway Worker (Hono + Durable Objects)
packages/runtime-redis/  Redis adapter for distributed mode
apps/admin-ui/       React admin dashboard
examples/            Client examples (4 languages)
deploy/              Docker Compose + Helm chart
docs/                API reference, getting started, advanced guide
e2e/                 End-to-end test suite
benchmarks/          Performance benchmarks
```

---

## Documentation

- [Getting Started](docs/getting-started.md)
- [API Reference](docs/api-reference.md)
- [Advanced Reference](docs/advanced-reference.md) (Redis adapter, Docker, Helm)

---

## License

[MIT](LICENSE)
