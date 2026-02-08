import { describe, expect, it } from 'vitest'

import { app } from '../src/app'
import { parseApiKeys } from '../src/lib/auth'
import type { GatewayBindings } from '../src/types'

describe('parseApiKeys', () => {
  it('supports comma separated keys and trims blanks', () => {
    expect(parseApiKeys(' key-1, key-2 ,, key-3 ')).toEqual(['key-1', 'key-2', 'key-3'])
  })

  it('returns empty keys when configuration is unset', () => {
    expect(parseApiKeys(undefined)).toEqual([])
  })
})

describe('publisher/admin auth middleware', () => {
  it('allows publish with any configured key', async () => {
    const response = await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer key-2',
          'x-sse-topic': 'alerts',
          'x-sse-id': 'event-1',
        },
      },
      {
        SSE_PUBLISHER_API_KEYS: 'key-1,key-2',
        GATEWAY_RUNTIME: {
          openStream: async () => new Response('unsupported', { status: 501 }),
          publish: async () => Response.json({ status: 'accepted' }, { status: 202 }),
          listTopics: async () => Response.json({ data: [] }, { status: 200 }),
          listConnections: async () => Response.json({ data: [] }, { status: 200 }),
          tailTopicEvents: async () => Response.json({ topic: 'alerts', events: [] }, { status: 200 }),
        },
      } satisfies GatewayBindings,
    )

    expect(response.status).toBe(202)
  })

  it('denies publish when auth header is missing', async () => {
    const response = await app.request(
      '/v1/publish',
      {
        method: 'POST',
        headers: {
          'x-sse-topic': 'alerts',
          'x-sse-id': 'event-1',
        },
      },
      {
        SSE_PUBLISHER_API_KEYS: 'key-1,key-2',
      },
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' })
  })

  it('denies admin route with malformed authorization header', async () => {
    const response = await app.request(
      '/v1/admin/topics',
      {
        headers: {
          Authorization: 'Token key-1',
        },
      },
      {
        SSE_PUBLISHER_API_KEYS: 'key-1,key-2',
      },
    )

    expect(response.status).toBe(401)
  })
})
