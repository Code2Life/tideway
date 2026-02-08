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
      }),
    ).resolves.toEqual({
      dropped: true,
      topic: 'missing',
      id: 'event-2',
      targetNodes: [],
    })
  })

  it('removes connection data and cleans up topic-node mapping on unregister', async () => {
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
      topics: ['alerts', 'metrics'],
    })
    await adapter.registerConnection({
      connectionId: 'conn-2',
      nodeId: 'node-a',
      topics: ['alerts'],
    })

    await adapter.unregisterConnection('conn-1')

    await expect(adapter.getTopicDistribution('alerts')).resolves.toEqual(['node-a'])
    await expect(adapter.getTopicDistribution('metrics')).resolves.toEqual([])

    await adapter.unregisterConnection('conn-2')

    await expect(adapter.getTopicDistribution('alerts')).resolves.toEqual([])
  })

  it('is a no-op when unregistering an unknown connection', async () => {
    const redis = new InMemoryRedis()
    const adapter = new RedisRuntimeAdapter(redis, { keyPrefix: 'tideway:test' })

    await expect(adapter.unregisterConnection('nonexistent')).resolves.toBeUndefined()
  })

  it('removes all connections and node data on unregisterNode', async () => {
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
      nodeId: 'node-a',
      topics: ['alerts', 'metrics'],
    })
    await adapter.registerConnection({
      connectionId: 'conn-3',
      nodeId: 'node-b',
      topics: ['alerts'],
    })

    await adapter.unregisterNode('node-a')

    await expect(adapter.getTopicDistribution('alerts')).resolves.toEqual(['node-b'])
    await expect(adapter.getTopicDistribution('metrics')).resolves.toEqual([])

    const result = await adapter.publishToTopic({ topic: 'alerts', id: 'evt-1' })
    expect(result.targetNodes).toEqual(['node-b'])
  })
})
