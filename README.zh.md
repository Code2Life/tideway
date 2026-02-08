<div align="center">

# tideway

**实时事件，零基础设施。**

基于 Cloudflare Workers 的轻量级 SSE 网关：HTTP POST 投递事件，SSE 拉流消费。无队列、无消息中间件。适用于实时看板、通知或任何基于 HTTP 的发布/订阅场景。

**[English](README.md)** · **[中文](README.zh.md)**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## 一分钟跑起来

**环境要求：** Node 18+ 与 [pnpm](https://pnpm.io)（`npm i -g pnpm`）。

```bash
git clone https://github.com/tensor-fusion/tideway.git && cd tideway
pnpm install && pnpm --filter @tideway/gateway dev
```

在**另一个终端**：先订阅，再发布。本地开发默认 API Key 为 `dev-key`，无需注册。

```bash
# 终端 A：订阅主题 "alerts"
curl -N -H "x-sse-topic: alerts" http://localhost:8787/v1/stream
```

```bash
# 终端 B：发布一条事件
curl -X POST http://localhost:8787/v1/publish \
  -H "Authorization: Bearer dev-key" \
  -H "x-sse-topic: alerts" -H "x-sse-id: evt-1" \
  -d '{"msg": "hello world"}'
```

终端 A 会输出：`id: evt-1` 与 `data: {"msg": "hello world"}`。

---

## 亮点

| | |
|---|---|
| **极速** | 约 0.07ms 发布延迟；200 订阅者扇出 14K+ 事件/秒（[基准](benchmark-results/)） |
| **极简** | 单 Worker，无队列、无外部状态，仅用 Durable Objects |
| **多主题** | 订阅头 `x-sse-topic: a,b,c`；POST 可发往任意主题 |
| **快速丢弃** | 无订阅者时直接丢弃发布，不读 body |
| **分布式** | Redis 适配器 + Docker/Helm，可部署 3+ 节点（非 CF） |
| **管理后台** | 主题、连接、实时事件追踪 — 内置于 `/admin` |

---

## 架构

```
                  ┌──────────────────────────────────────┐
                  │         Cloudflare Workers            │
                  │                                      │
  发布者 ──POST──▶  Hono Router ──▶ Durable Object      │
                  │       │              (GatewayRoom)    │
  订阅者 ──SSE───▶      │           ┌──────────────┐    │
                  │       │           │ 连接映射     │    │
  管理后台 ──GET──▶       │           │ + 事件缓冲   │    │
                  │       │           └──────────────┘    │
                  └──────────────────────────────────────┘
                           ▼ (非 CF)
                  ┌──────────────────┐
                  │  Redis 适配器    │  ← 相同 API，
                  │  (多节点)        │    Docker/Helm
                  └──────────────────┘
```

---

## API 概览

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/v1/stream` | GET | — | SSE 订阅（头 `x-sse-topic`） |
| `/v1/publish` | POST | API Key | 发布事件（头 `x-sse-topic`、`x-sse-id`） |
| `/v1/admin/topics` | GET | API Key | 主题列表（分页，最多 500） |
| `/v1/admin/connections` | GET | API Key | 连接列表 |
| `/v1/admin/topics/:topic/tail` | GET | API Key | 主题最近事件 |
| `/healthz` | GET | — | 健康检查 |

详情：[docs/api-reference.md](docs/api-reference.md)

---

## 客户端示例

四种语言的发布端 + 订阅端（已通过 E2E 验证）：

| 语言 | 发布者 | 订阅者 |
|------|--------|--------|
| TypeScript | [publisher.ts](examples/typescript/publisher.ts) | [subscriber.ts](examples/typescript/subscriber.ts) |
| Python | [publisher.py](examples/python/publisher.py) | [subscriber.py](examples/python/subscriber.py) |
| Go | [main.go](examples/go/publisher/main.go) | [main.go](examples/go/subscriber/main.go) |
| Rust | [publisher.rs](examples/rust/src/bin/publisher.rs) | [subscriber.rs](examples/rust/src/bin/subscriber.rs) |

---

## 部署

| 环境 | 命令 |
|------|------|
| **Cloudflare Workers** | `cd workers/gateway && npx wrangler deploy` |
| **Docker Compose** | `docker compose -f deploy/docker-compose.yml up`（网关 :8787–8789） |
| **Helm (K8s)** | `helm install tideway deploy/helm/tideway`（默认 3 副本 + Redis） |

更多：[docs/advanced-reference.md](docs/advanced-reference.md)

---

## 管理后台

```bash
# 访问运行中网关的 /admin
open http://localhost:8787/admin
# → 使用 API Key 登录
```

标签页：**主题** · **连接** · **事件追踪**

---

## 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm e2e:examples    # TS/Python/Go/Rust 冒烟
pnpm bench:publish   # 扇出基准
```

**目录：** `workers/gateway/`（Worker + 内置管理后台）· `packages/runtime-redis/`（Redis 适配器）· `examples/` · `deploy/` · `docs/`

---

## 文档

- [快速入门](docs/getting-started.md)
- [API 参考](docs/api-reference.md)
- [高级](docs/advanced-reference.md)（Redis、Docker、Helm）

---

**[English](README.md)** · **[中文](README.zh.md)** — [MIT](LICENSE)
