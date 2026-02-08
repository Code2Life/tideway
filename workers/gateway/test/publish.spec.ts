import { describe, expect, it } from 'vitest'

import { app } from '../src/app'
import { GatewayRoom } from '../src/durable-object/gateway-room'
import type { GatewayBindings } from '../src/types'

function buildBindings(room: GatewayRoom): GatewayBindings {
  return {
    SSE_PUBLISHER_API_KEYS: 'key-1,key-2',
    GATEWAY_ROOM: {
      idFromName: () => ({ toString: () => 'room-1' }) as DurableObjectId,
      get: () => ({
        fetch: (input: RequestInfo | URL, init?: RequestInit) => room.fetch(input, init),
      }),
    } as unknown as DurableObjectNamespace,
  }
}

describe('publish route', () => {
  it('drops publish without reading request body when no active subscribers exist', async () => {
    const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
    const bindings = buildBindings(room)

    const response = await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer key-1',
          'x-sse-topic': 'alerts',
          'x-sse-id': 'event-1',
        },
        body: 'never-read',
      },
      bindings,
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({
      status: 'dropped',
      id: 'event-1',
      droppedTopics: ['alerts'],
    })
    expect(room.debugMetrics().bodyReadCount).toBe(0)
  })

  it('fans out publish payload to active subscribers', async () => {
    const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
    const bindings = buildBindings(room)

    const streamResponse = await app.request(
      '/v1/stream',
      {
        headers: {
          'x-sse-topic': 'alerts',
          'x-sse-id': 'conn-1',
        },
      },
      bindings,
    )

    const reader = streamResponse.body?.getReader()
    if (!reader) {
      throw new Error('missing stream body')
    }

    await reader.read()

    const publishResponse = await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer key-2',
          'x-sse-topic': 'alerts',
          'x-sse-id': 'event-2',
        },
        body: 'hello tideway',
      },
      bindings,
    )

    expect(publishResponse.status).toBe(202)
    await expect(publishResponse.json()).resolves.toEqual({
      status: 'accepted',
      id: 'event-2',
      delivered: 1,
      droppedTopics: [],
    })
    expect(room.debugMetrics().bodyReadCount).toBe(1)

    const pushed = await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('stream did not receive publish event')), 1_000)
      }),
    ])

    const chunk = new TextDecoder().decode(pushed.value)
    expect(chunk).toContain('id: event-2')
    expect(chunk).toContain('data: hello tideway')

    await reader.cancel()
  })
})
