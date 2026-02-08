<div align="center">

# tideway

**实时事件推送，零基础设施。**

基于 Cloudflare Workers 的轻量级 SSE 网关。发布者通过 HTTP POST 发送事件，订阅者通过 SSE 接收——就这么简单。

[English](README.md) | [中文](README.zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## 30 秒快速体验

```bash
# 1. 启动网关
git clone https://github.com/tensor-fusion/tideway.git && cd tideway
pnpm install && pnpm --filter @tideway/gateway dev
```

```bash
# 2. 订阅（终端 A）
curl -N -H "x-sse-topic: alerts" http://localhost:8787/v1/stream
```

```bash
# 3. 发布（终端 B）
curl -X POST http://localhost:8787/v1/publish \
  -H "Authorization: Bearer dev-key" \
  -H "x-sse-topic: alerts" \
  -H "x-sse-id: evt-1" \
  -d '{"msg": "hello world"}'
```

终端 A 立即输出：

```
id: evt-1
data: {"msg": "hello world"}
```

---

## 亮点

**极速** — 平均发布延迟 0.07ms，200 订阅者扇出吞吐 14K+ 事件/秒（[基准测试](benchmark-results/)）

**极简** — 单个 Worker，无队列、无外部状态；Durable Objects 处理一切

**多主题扇出** — 订阅者通过 `x-sse-topic: a,b,c` 订阅多个主题；发布者通过 HTTP POST 投递到任意主题

**快速丢弃路径** — 主题无订阅者时，直接丢弃发布请求，不读取 body

**分布式模式** — 切换 Redis 适配器，通过 Docker Compose 或 Helm 部署 3+ 节点

**管理后台** — React + Tailwind 管理界面，支持主题、连接和实时事件追踪

---

## 架构

```
                  ┌──────────────────────────────────────┐
                  │         Cloudflare Workers            │
                  │                                      │
  发布者 ───POST──▶  Hono Router ──▶ Durable Object      │
                  │       │              (GatewayRoom)    │
  订阅者 ───SSE───▶      │           ┌──────────────┐    │
                  │       │           │ 连接映射表   │    │
  管理后台 ──GET──▶       │           │ + 事件缓冲区 │    │
                  │       │           └──────────────┘    │
                  └──────────────────────────────────────┘
                           ▼ (非 CF 环境)
                  ┌──────────────────┐
                  │  Redis 适配器    │  ← 相同 API，
                  │  (多节点)        │    Docker/Helm
                  └──────────────────┘
```

---

## API 概览

| 端点 | 方法 | 认证 | 说明 |
|---|---|---|---|
| `/v1/stream` | GET | 无 | 通过 SSE 订阅主题（`x-sse-topic` 头） |
| `/v1/publish` | POST | API Key | 发布事件（`x-sse-topic` + `x-sse-id` 头） |
| `/v1/admin/topics` | GET | API Key | 列出活跃主题（分页，每页最多 500） |
| `/v1/admin/connections` | GET | API Key | 列出活跃连接 |
| `/v1/admin/topics/:topic/tail` | GET | API Key | 查看主题的最近事件缓冲 |
| `/healthz` | GET | 无 | 健康检查 |

> 完整文档：[docs/api-reference.md](docs/api-reference.md)

---

## 客户端示例

提供四种语言的发布者 + 订阅者示例，开箱即用：

| 语言 | 发布者 | 订阅者 |
|---|---|---|
| TypeScript | [publisher.ts](examples/typescript/publisher.ts) | [subscriber.ts](examples/typescript/subscriber.ts) |
| Python | [publisher.py](examples/python/publisher.py) | [subscriber.py](examples/python/subscriber.py) |
| Go | [publisher.go](examples/go/publisher.go) | [subscriber.go](examples/go/subscriber.go) |
| Rust | [publisher.rs](examples/rust/src/bin/publisher.rs) | [subscriber.rs](examples/rust/src/bin/subscriber.rs) |

所有示例均通过 E2E 测试验证。

---

## 部署

### Cloudflare Workers（推荐）

```bash
cd workers/gateway
npx wrangler deploy
```

### Docker Compose（3 网关 + Redis）

```bash
docker compose -f deploy/docker-compose.yml up
# 网关端口：:8787、:8788、:8789
```

### Helm（Kubernetes）

```bash
helm install tideway deploy/helm/tideway
# 默认 3 副本 + Redis
```

> 分布式部署文档：[docs/advanced-reference.md](docs/advanced-reference.md)

---

## 管理后台

```bash
pnpm --filter @tideway/admin-ui dev
# → http://localhost:5173
```

使用 API Key 登录。三个标签页：**主题** | **连接** | **事件追踪**。

---

## 开发

```bash
pnpm install              # 安装所有工作区依赖
pnpm test                 # 运行单元测试
pnpm typecheck            # 全量类型检查
pnpm e2e:examples         # E2E 冒烟测试（TS/Python/Go/Rust）
pnpm bench:publish        # 发布扇出基准测试
```

### 项目结构

```
workers/gateway/         网关 Worker（Hono + Durable Objects）
packages/runtime-redis/  Redis 适配器（分布式模式）
apps/admin-ui/           React 管理后台
examples/                客户端示例（4 种语言）
deploy/                  Docker Compose + Helm Chart
docs/                    API 参考、入门指南、高级文档
e2e/                     端到端测试套件
benchmarks/              性能基准测试
```

---

## 文档

- [快速入门](docs/getting-started.md)
- [API 参考](docs/api-reference.md)
- [高级文档](docs/advanced-reference.md)（Redis 适配器、Docker、Helm）

---

## 许可证

[MIT](LICENSE)
