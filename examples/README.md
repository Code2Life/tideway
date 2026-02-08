# Tideway Example Clients

All examples use the same environment variables:

- `GATEWAY_URL` (default: `http://127.0.0.1:8787`)
- `TOPIC` (default: `alerts`)
- `API_KEY` (publisher only, default: `dev-key`)
- `EVENT_ID` (publisher event id)
- `PAYLOAD` (publisher message body)
- `SUBSCRIBER_ID` (subscriber connection id)

## TypeScript

```bash
pnpm exec tsx examples/typescript/subscriber.ts
pnpm exec tsx examples/typescript/publisher.ts
```

## Python

```bash
python3 examples/python/subscriber.py
python3 examples/python/publisher.py
```

## Go

```bash
go run examples/go/subscriber.go
go run examples/go/publisher.go
```

## Rust

```bash
cargo run --manifest-path examples/rust/Cargo.toml --bin subscriber
cargo run --manifest-path examples/rust/Cargo.toml --bin publisher
```

## End-to-end validation

```bash
./e2e/examples-smoke.sh
```
