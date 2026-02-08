# Getting Started

Tideway is a lightweight SSE gateway with API-key protected publishing and anonymous subscription.

## 1) Install dependencies

```bash
pnpm install
```

## 2) Run the gateway locally

```bash
SSE_PUBLISHER_API_KEYS=dev-key pnpm --filter @tideway/gateway dev --ip 127.0.0.1 --port 8787
```

Health check:

```bash
curl -s http://127.0.0.1:8787/healthz
```

Expected output:

```json
{"status":"ok"}
```

## 3) Subscribe to a topic

```bash
curl -N \
  -H 'x-sse-topic: alerts' \
  -H 'x-sse-id: cli-sub-1' \
  http://127.0.0.1:8787/v1/stream
```

## 4) Publish an event

```bash
curl -X POST \
  -H 'Authorization: Bearer dev-key' \
  -H 'x-sse-topic: alerts' \
  -H 'x-sse-id: event-1' \
  --data 'hello tideway' \
  http://127.0.0.1:8787/v1/publish
```

## 5) Open the admin UI

Navigate to http://127.0.0.1:8787/admin and log in with `dev-key`.

## 6) Run all tests

```bash
pnpm test
pnpm typecheck
```

## Example clients

Examples are available in:
- `examples/typescript`
- `examples/python`
- `examples/go`
- `examples/rust`

They are validated by `e2e/examples-smoke.sh`.
