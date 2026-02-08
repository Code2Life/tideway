/// <reference types="@cloudflare/workers-types" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { app } from '../workers/gateway/src/app'
import { GatewayRoom } from '../workers/gateway/src/durable-object/gateway-room'
import type { GatewayBindings } from '../workers/gateway/src/types'

type BenchmarkResult = {
  name: string
  topic: string
  subscribers: number
  iterations: number
  warmupIterations: number
  meanMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  throughputPerSecond: number
  startedAt: string
  completedAt: string
}

function buildBindings(room: GatewayRoom): GatewayBindings {
  return {
    SSE_PUBLISHER_API_KEYS: 'dev-key',
    GATEWAY_ROOM: {
      idFromName: () => ({ toString: () => 'bench-room' }) as DurableObjectId,
      get: () => ({
        fetch: (input: RequestInfo | URL, init?: RequestInit) => room.fetch(input, init),
      }),
    } as unknown as DurableObjectNamespace,
  }
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.floor((percentileValue / 100) * sorted.length))
  return sorted[index]
}

async function main() {
  const subscribers = Number.parseInt(process.env.BENCH_SUBSCRIBERS ?? '200', 10)
  const iterations = Number.parseInt(process.env.BENCH_ITERATIONS ?? '300', 10)
  const warmupIterations = Number.parseInt(process.env.BENCH_WARMUP ?? '50', 10)
  const topic = process.env.BENCH_TOPIC ?? 'bench-alerts'

  const startedAt = new Date().toISOString()

  const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
  const bindings = buildBindings(room)

  const readers: ReadableStreamDefaultReader<Uint8Array>[] = []

  for (let index = 0; index < subscribers; index += 1) {
    const response = await app.request(
      '/v1/stream',
      {
        headers: {
          'x-sse-topic': topic,
          'x-sse-id': `bench-sub-${index}`,
        },
      },
      bindings,
    )

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('missing stream reader during benchmark setup')
    }

    readers.push(reader)
    await reader.read()
  }

  for (let index = 0; index < warmupIterations; index += 1) {
    await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer dev-key',
          'x-sse-topic': topic,
          'x-sse-id': `warmup-${index}`,
        },
        body: `warmup-${index}`,
      },
      bindings,
    )
  }

  const latencies: number[] = []
  const benchStart = performance.now()

  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now()

    const response = await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer dev-key',
          'x-sse-topic': topic,
          'x-sse-id': `bench-${index}`,
        },
        body: `payload-${index}`,
      },
      bindings,
    )

    if (response.status !== 202) {
      throw new Error(`publish benchmark request failed with status ${response.status}`)
    }

    latencies.push(performance.now() - start)
  }

  const elapsedMs = performance.now() - benchStart

  for (const reader of readers) {
    await reader.cancel()
  }

  const meanMs = latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1)
  const result: BenchmarkResult = {
    name: 'publish-fanout',
    topic,
    subscribers,
    iterations,
    warmupIterations,
    meanMs,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    throughputPerSecond: (iterations / elapsedMs) * 1000,
    startedAt,
    completedAt: new Date().toISOString(),
  }

  const outputDir = resolve(process.cwd(), 'benchmark-results')
  mkdirSync(outputDir, { recursive: true })

  const timestamp = result.completedAt.replace(/[:.]/g, '-')
  const latestFile = resolve(outputDir, 'publish-fanout-latest.json')
  const historyFile = resolve(outputDir, `publish-fanout-${timestamp}.json`)

  writeFileSync(latestFile, JSON.stringify(result, null, 2))
  writeFileSync(historyFile, JSON.stringify(result, null, 2))

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
