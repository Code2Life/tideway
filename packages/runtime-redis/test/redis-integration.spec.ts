import Redis from 'ioredis'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { RedisRuntimeAdapter, type RedisLike } from '../src/redis-adapter'

declare const process: { env: Record<string, string | undefined> }

const REDIS_URL = process.env.REDIS_URL
const REDIS_PASSWORD = process.env.REDIS_PASSWORD

const shouldRun = REDIS_URL && REDIS_PASSWORD

function createRedisLike(client: Redis): RedisLike {
  return {
    hset: (key, values) => client.hset(key, values).then(() => {}),
    hgetall: (key) => client.hgetall(key),
    sadd: (key, ...members) => client.sadd(key, ...members).then(() => {}),
    smembers: (key) => client.smembers(key),
    srem: (key, ...members) => client.srem(key, ...members).then(() => {}),
    del: (...keys) => client.del(...keys).then(() => {}),
  }
}

describe.skipIf(!shouldRun)('RedisRuntimeAdapter (real Redis)', () => {
  let client: Redis
  let adapter: RedisRuntimeAdapter
  const keyPrefix = `tideway:integration:${Date.now()}`

  beforeAll(() => {
    client = new Redis(REDIS_URL!, { password: REDIS_PASSWORD })
    adapter = new RedisRuntimeAdapter(createRedisLike(client), { keyPrefix })
  })

  afterAll(async () => {
    const keys = await client.keys(`${keyPrefix}:*`)
    if (keys.length > 0) {
      await client.del(...keys)
    }
    client.disconnect()
  })

  it('registers node and connections, then routes publish to correct nodes', async () => {
    await adapter.registerNode({
      nodeId: 'int-node-1',
      hostname: 'host-1',
      ip: '10.0.0.1',
      startedAt: new Date().toISOString(),
    })

    await adapter.registerConnection({
      connectionId: 'int-conn-1',
      nodeId: 'int-node-1',
      topics: ['alerts', 'metrics'],
    })

    const result = await adapter.publishToTopic({ topic: 'alerts', id: 'int-evt-1' })
    expect(result.dropped).toBe(false)
    expect(result.targetNodes).toEqual(['int-node-1'])

    const dropped = await adapter.publishToTopic({ topic: 'missing', id: 'int-evt-2' })
    expect(dropped.dropped).toBe(true)
    expect(dropped.targetNodes).toEqual([])
  })

  it('cleans up fully on unregisterNode', async () => {
    await adapter.registerNode({
      nodeId: 'int-node-2',
      hostname: 'host-2',
      ip: '10.0.0.2',
      startedAt: new Date().toISOString(),
    })
    await adapter.registerConnection({
      connectionId: 'int-conn-2',
      nodeId: 'int-node-2',
      topics: ['cleanup-test'],
    })

    await adapter.unregisterNode('int-node-2')

    const result = await adapter.publishToTopic({ topic: 'cleanup-test', id: 'int-evt-3' })
    expect(result.dropped).toBe(true)

    const nodeData = await client.hgetall(`${keyPrefix}:node:int-node-2`)
    expect(Object.keys(nodeData)).toHaveLength(0)
  })
})
