# Self-Host Deployment Guide

Tideway can be self-hosted on any infrastructure using Docker or Kubernetes. Self-hosted mode runs a standalone Node.js server (no Cloudflare Workers dependency).

## Container Image

Pre-built images are published to GitHub Container Registry on each release:

```
ghcr.io/tensor-fusion/tideway-gateway:latest
ghcr.io/tensor-fusion/tideway-gateway:0.1.0
```

Multi-arch: `linux/amd64` and `linux/arm64`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SSE_PUBLISHER_API_KEYS` | Yes | — | Comma-separated API keys for publish/admin endpoints |
| `PORT` | No | `8787` | HTTP listen port |
| `HOST` | No | `0.0.0.0` | HTTP listen address |
| `TIDEWAY_NODE_ID` | No | — | Unique node identifier (for multi-node setups) |
| `TIDEWAY_NODE_IP` | No | — | Node IP for inter-node communication |
| `TIDEWAY_RUNTIME_ADAPTER` | No | — | Set to `redis` for multi-node coordination |
| `REDIS_URL` | Conditional | — | Redis connection URL (required when `TIDEWAY_RUNTIME_ADAPTER=redis`) |

---

## Docker

### Single node

```bash
docker run -d \
  --name tideway \
  -p 8787:8787 \
  -e SSE_PUBLISHER_API_KEYS=your-secret-key \
  ghcr.io/tensor-fusion/tideway-gateway:latest
```

### Multi-node with Docker Compose

The included `deploy/docker-compose.yml` runs 3 gateway replicas behind Redis:

```bash
SSE_PUBLISHER_API_KEYS=your-secret-key \
  docker compose -f deploy/docker-compose.yml up -d
```

This starts:
- **Redis** on port 6379
- **gateway-1** on port 8787
- **gateway-2** on port 8788
- **gateway-3** on port 8789

All gateways share the same Redis for topic distribution. A subscriber connected to gateway-1 will receive events published to gateway-2.

### Building the image locally

```bash
docker build -f deploy/docker/gateway.Dockerfile -t tideway-gateway .
```

---

## Kubernetes (Helm)

### Prerequisites

- Helm 3+
- A Kubernetes cluster (1.24+)

### Install with embedded Redis

```bash
helm install tideway deploy/helm/tideway \
  --set gateway.apiKeys=your-secret-key
```

This creates:
- A 3-replica gateway Deployment with liveness/readiness probes
- A ClusterIP Service on port 8787
- A single-replica Redis Deployment
- A Secret for API keys

### Install with external Redis

```bash
helm install tideway deploy/helm/tideway \
  --set gateway.apiKeys=your-secret-key \
  --set redis.enabled=false \
  --set externalRedis.url=redis://redis.example:6379
```

### Configuration

Key values (see `deploy/helm/tideway/values.yaml` for full reference):

| Value | Default | Description |
|-------|---------|-------------|
| `gateway.replicaCount` | `3` | Number of gateway pods |
| `gateway.image.tag` | `latest` | Image tag |
| `gateway.apiKeys` | `""` | API keys (stored in a Secret) |
| `gateway.service.type` | `ClusterIP` | Service type (`ClusterIP`, `LoadBalancer`, `NodePort`) |
| `gateway.resources.requests.memory` | `128Mi` | Memory request |
| `gateway.resources.limits.memory` | `256Mi` | Memory limit |
| `redis.enabled` | `true` | Deploy embedded Redis |
| `externalRedis.url` | `""` | External Redis URL |

### Exposing the service

**With an Ingress controller:**

```bash
helm install tideway deploy/helm/tideway \
  --set gateway.apiKeys=your-secret-key \
  --set gateway.service.type=ClusterIP
# Then create an Ingress resource pointing to the tideway service
```

**With a LoadBalancer:**

```bash
helm install tideway deploy/helm/tideway \
  --set gateway.apiKeys=your-secret-key \
  --set gateway.service.type=LoadBalancer
```

### Upgrade

```bash
helm upgrade tideway deploy/helm/tideway \
  --set gateway.image.tag=0.2.0
```

### Uninstall

```bash
helm uninstall tideway
```

---

## Building from Source

```bash
git clone https://github.com/tensor-fusion/tideway.git && cd tideway
pnpm install
pnpm --filter @tideway/gateway build:server
# Output: workers/gateway/dist/server.js (with sourcemap)
```

Run directly:

```bash
SSE_PUBLISHER_API_KEYS=dev-key node workers/gateway/dist/server.js
```

---

## Health Checks

All deployments expose `GET /healthz` returning `{"status":"ok"}` with HTTP 200. This endpoint requires no authentication and is used by Docker healthchecks and Kubernetes probes.

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` for graceful shutdown, compatible with Kubernetes pod termination and Docker stop signals.
