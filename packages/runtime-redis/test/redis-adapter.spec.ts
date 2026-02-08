import { describe, expect, it } from 'vitest'

import {
  InMemoryRedis,
  RedisRuntimeAdapter,
  type PublishMessage,
} from '../src/redis-adapter'

describe('RedisRuntimeAdapter', () => {
  it('tracks topic-to-node distribution from registered connections', async () => {
    const redis = new InMemoryRedis()
    const adapter = new RedisRuntimeAdapter(redis, { keyPrefix: 'tideway:test' })

    await adapter.registerNode({
      nodeId: 'node-a',
      hostname: 'host-a',
      ip: '10.0.0.1',
      startedAt: '2026-02-08T09:00:00.000Z',
    })
    await adapter.registerNode({
      nodeId: 'node-b',
      hostname: 'host-b',
      ip: '10.0.0.2',
      startedAt: '2026-02-08T09:01:00.000Z',
    })

    await adapter.registerConnection({
      connectionId: 'conn-1',
      nodeId: 'node-a',
      topics: ['alerts'],
    })
    await adapter.registerConnection({
      connectionId: 'conn-2',
      nodeId: 'node-b',
      topics: ['alerts', 'metrics'],
    })

    await expect(adapter.getTopicDistribution('alerts')).resolves.toEqual(['node-a', 'node-b'])
    await expect(adapter.getTopicDistribution('metrics')).resolves.toEqual(['node-b'])
  })

  it('returns target nodes for publish and drops when topic has no subscribers', async () => {
    const redis = new InMemoryRedis()
    const adapter = new RedisRuntimeAdapter(redis, { keyPrefix: 'tideway:test' })

    await adapter.registerNode({
      nodeId: 'node-a',
      hostname: 'host-a',
      ip: '10.0.0.1',
      startedAt: '2026-02-08T09:00:00.000Z',
    })

    await adapter.registerConnection({
      connectionId: 'conn-1',
      nodeId: 'node-a',
      topics: ['alerts'],
    })

    const publish: PublishMessage = {
      topic: 'alerts',
      id: 'event-1',
      payload: 'hello',
    }

    await expect(adapter.publishToTopic(publish)).resolves.toEqual({
      dropped: false,
      topic: 'alerts',
      id: 'event-1',
      targetNodes: ['node-a'],
    })

    await expect(
      adapter.publishToTopic({
        topic: 'missing',
        id: 'event-2',
        payload: 'none',
      }),
    ).resolves.toEqual({
      dropped: true,
      topic: 'missing',
      id: 'event-2',
      targetNodes: [],
    })
  })
})
