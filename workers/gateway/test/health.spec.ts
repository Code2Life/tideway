import { describe, expect, it } from 'vitest'

import { app } from '../src/app'

describe('health route', () => {
  it('responds with ok payload', async () => {
    const response = await app.request('/healthz')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
