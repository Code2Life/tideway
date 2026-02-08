import { describe, expect, it } from 'vitest'

import { buildNodeRegistration } from '../src/node-registry'

describe('buildNodeRegistration', () => {
  it('uses explicit env node ip override when provided', () => {
    const registration = buildNodeRegistration({
      nodeId: 'node-a',
      hostname: 'host-a',
      env: {
        TIDEWAY_NODE_IP: '172.16.0.5',
      },
      now: '2026-02-08T09:30:00.000Z',
    })

    expect(registration).toEqual({
      nodeId: 'node-a',
      hostname: 'host-a',
      ip: '172.16.0.5',
      startedAt: '2026-02-08T09:30:00.000Z',
    })
  })

  it('falls back to host ip env when explicit override is missing', () => {
    const registration = buildNodeRegistration({
      nodeId: 'node-b',
      hostname: 'host-b',
      env: {
        HOST_IP: '10.1.1.7',
      },
      now: '2026-02-08T09:31:00.000Z',
    })

    expect(registration.ip).toBe('10.1.1.7')
  })

  it('defaults to loopback when no env hint is set', () => {
    const registration = buildNodeRegistration({
      nodeId: 'node-c',
      hostname: 'host-c',
      env: {},
      now: '2026-02-08T09:32:00.000Z',
    })

    expect(registration.ip).toBe('127.0.0.1')
  })
})
