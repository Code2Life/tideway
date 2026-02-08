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

describe('admin APIs', () => {
  it('lists active connections with paging and max page size cap', async () => {
    const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
    const bindings = buildBindings(room)

    const first = await app.request(
      '/v1/stream',
      { headers: { 'x-sse-topic': 'alerts', 'x-sse-id': 'conn-1' } },
      bindings,
    )
    const second = await app.request(
      '/v1/stream',
      { headers: { 'x-sse-topic': 'alerts,metrics', 'x-sse-id': 'conn-2' } },
      bindings,
    )
    const third = await app.request(
      '/v1/stream',
      { headers: { 'x-sse-topic': 'metrics', 'x-sse-id': 'conn-3' } },
      bindings,
    )

    const pageOne = await app.request(
      '/v1/admin/connections?page=1&pageSize=2',
      { headers: { authorization: 'Bearer key-1' } },
      bindings,
    )

    expect(pageOne.status).toBe(200)
    await expect(pageOne.json()).resolves.toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      data: [
        {
          connectionId: 'conn-1',
          topics: ['alerts'],
        },
        {
          connectionId: 'conn-2',
          topics: ['alerts', 'metrics'],
        },
      ],
    })

    const capped = await app.request(
      '/v1/admin/connections?page=1&pageSize=800',
      { headers: { authorization: 'Bearer key-1' } },
      bindings,
    )

    expect(capped.status).toBe(200)
    await expect(capped.json()).resolves.toMatchObject({
      page: 1,
      pageSize: 500,
      total: 3,
    })

    await first.body?.cancel()
    await second.body?.cancel()
    await third.body?.cancel()
  })

  it('lists topics and returns tail events for a specific topic', async () => {
    const room = new GatewayRoom({} as DurableObjectState, {} as GatewayBindings)
    const bindings = buildBindings(room)

    const subscriber = await app.request(
      '/v1/stream',
      { headers: { 'x-sse-topic': 'alerts', 'x-sse-id': 'conn-1' } },
      bindings,
    )

    await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer key-1',
          'x-sse-topic': 'alerts',
          'x-sse-id': 'event-1',
        },
        body: 'first payload',
      },
      bindings,
    )

    await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer key-1',
          'x-sse-topic': 'alerts',
          'x-sse-id': 'event-2',
        },
        body: 'second payload',
      },
      bindings,
    )

    const topicsResponse = await app.request(
      '/v1/admin/topics?page=1&pageSize=50',
      { headers: { authorization: 'Bearer key-2' } },
      bindings,
    )

    expect(topicsResponse.status).toBe(200)
    await expect(topicsResponse.json()).resolves.toEqual({
      page: 1,
      pageSize: 50,
      total: 1,
      data: [
        {
          topic: 'alerts',
          connectionCount: 1,
        },
      ],
    })

    const tailResponse = await app.request(
      '/v1/admin/topics/alerts/tail?limit=1',
      { headers: { authorization: 'Bearer key-2' } },
      bindings,
    )

    expect(tailResponse.status).toBe(200)
    await expect(tailResponse.json()).resolves.toEqual({
      topic: 'alerts',
      events: [
        {
          id: 'event-2',
          payload: 'second payload',
        },
      ],
    })

    await subscriber.body?.cancel()
  })
})
