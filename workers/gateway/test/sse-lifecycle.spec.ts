import { describe, expect, it } from 'vitest'

import { app } from '../src/app'
import { GatewayRoom } from '../src/durable-object/gateway-room'
import type { GatewayBindings } from '../src/types'

function buildBindings(room: GatewayRoom): GatewayBindings {
  return {
    GATEWAY_ROOM: {
      idFromName: () => ({ toString: () => 'room-1' }) as DurableObjectId,
      get: () => ({
        fetch: (input: RequestInfo | URL, init?: RequestInit) => room.fetch(input, init),
      }),
    } as unknown as DurableObjectNamespace,
  }
}

describe('sse lifecycle', () => {
  it('registers a stream connection and removes topic state on cancel', async () => {
    const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
    const response = await app.request(
      '/v1/stream',
      {
        headers: {
          'x-sse-topic': 'alerts,metrics',
          'x-sse-id': 'conn-1',
        },
      },
      buildBindings(room),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(room.debugSnapshot()).toEqual({
      connectionCount: 1,
      topicCounts: {
        alerts: 1,
        metrics: 1,
      },
    })

    await response.body?.cancel()
    await Promise.resolve()

    expect(room.debugSnapshot()).toEqual({
      connectionCount: 0,
      topicCounts: {},
    })
  })

  it('keeps shared topic when one of two subscribers disconnects', async () => {
    const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
    const bindings = buildBindings(room)

    const first = await app.request(
      '/v1/stream',
      {
        headers: {
          'x-sse-topic': 'alerts',
          'x-sse-id': 'conn-a',
        },
      },
      bindings,
    )

    const second = await app.request(
      '/v1/stream',
      {
        headers: {
          'x-sse-topic': 'alerts',
          'x-sse-id': 'conn-b',
        },
      },
      bindings,
    )

    expect(room.debugSnapshot()).toEqual({
      connectionCount: 2,
      topicCounts: {
        alerts: 2,
      },
    })

    await first.body?.cancel()
    await Promise.resolve()

    expect(room.debugSnapshot()).toEqual({
      connectionCount: 1,
      topicCounts: {
        alerts: 1,
      },
    })

    await second.body?.cancel()
    await Promise.resolve()

    expect(room.debugSnapshot()).toEqual({
      connectionCount: 0,
      topicCounts: {},
    })
  })
})
