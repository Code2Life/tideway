# Advanced Reference

## Runtime architecture

Tideway uses a runtime adapter abstraction:

- Cloudflare runtime: `workers/gateway/src/runtime/durable-object-adapter.ts`
- Non-Cloudflare runtime building block: `packages/runtime-redis`

Durable Object is the source of truth for:
- active connections
- topic membership
- tail event buffer

## Redis adapter package

`@tideway/runtime-redis` provides primitives to support distributed deployments:

- node registration metadata (`nodeId`, `hostname`, `ip`, `startedAt`)
- connection tracking by node and topic
- topic-to-node distribution lookup for publish routing

Key env vars for node identity:
- `TIDEWAY_NODE_IP` (highest priority)
- `HOST_IP`
- `POD_IP`

## Deploy options

### Docker Compose (3 gateway workers + Redis)

```bash
docker compose -f deploy/docker-compose.yml up --build
```

### Helm chart

Lint:

```bash
helm lint deploy/helm/tideway
```

Install with embedded Redis:

```bash
helm install tideway deploy/helm/tideway
```

Install with external Redis:

```bash
helm install tideway deploy/helm/tideway \
  --set redis.enabled=false \
  --set externalRedis.url=redis://redis.example:6379
```

## Example validation (E2E smoke)

Run end-to-end example validation (TypeScript/Python/Go/Rust):

```bash
./e2e/examples-smoke.sh
```

This script starts a local gateway, runs subscriber/publisher pairs in every language, and verifies event delivery.

## Benchmark harness

Run publish fanout benchmark:

```bash
pnpm bench:publish
```

Results are written to `benchmark-results/` with both `latest` and timestamped history files for comparison.
