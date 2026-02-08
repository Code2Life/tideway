# API Reference

Base URL example: `http://127.0.0.1:8787`

## Auth model

- Subscriber routes: anonymous.
- Publisher/Admin routes: API key required.
- Header format: `Authorization: Bearer <apiKey>`

Configured via:

- `SSE_PUBLISHER_API_KEYS=key1,key2,...`

## GET /healthz

Returns service health.

Response:

```json
{"status":"ok"}
```

## GET /v1/stream

Open an SSE stream.

Headers:
- `x-sse-topic` (required): comma-separated topic list
- `x-sse-id` (optional): subscriber connection id

Response:
- `200 text/event-stream`
- Stream emits standard SSE frames (`id` + `data`)

## POST /v1/publish

Publish an event to one or more topics.

Headers:
- `Authorization` (required)
- `x-sse-topic` (required)
- `x-sse-id` (required event id)

Body:
- raw text payload

Response (`202`):
- Accepted and delivered:

```json
{"status":"accepted","id":"event-1","delivered":1,"droppedTopics":[]}
```

- Dropped (no active subscribers):

```json
{"status":"dropped","id":"event-1","droppedTopics":["alerts"]}
```

## GET /v1/admin/topics

List topics with active subscriber counts.

Headers:
- `Authorization` (required)

Query:
- `page` (default `1`)
- `pageSize` (default `100`, max `500`)

Response:

```json
{
  "page": 1,
  "pageSize": 50,
  "total": 1,
  "data": [{"topic":"alerts","connectionCount":2}]
}
```

## GET /v1/admin/connections

List active connections and their topics.

Headers:
- `Authorization` (required)

Query:
- `page` (default `1`)
- `pageSize` (default `100`, max `500`)

Response:

```json
{
  "page": 1,
  "pageSize": 50,
  "total": 1,
  "data": [{"connectionId":"conn-1","topics":["alerts"]}]
}
```

## GET /v1/admin/topics/:topic/tail

List recent events for a specific topic.

Headers:
- `Authorization` (required)

Query:
- `limit` (default `20`, max `500`)

Response:

```json
{
  "topic": "alerts",
  "events": [{"id":"event-1","payload":"hello"}]
}
```
