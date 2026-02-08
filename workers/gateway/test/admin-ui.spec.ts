import { describe, expect, it } from 'vitest'

import { app } from '../src/app'

describe('admin UI route', () => {
  it('serves the admin HTML page at /admin', async () => {
    const response = await app.request('/admin')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')

    const body = await response.text()
    expect(body).toContain('<!DOCTYPE html>')
    expect(body).toContain('Tideway Admin')
    expect(body).toContain('tideway.admin.apiKey')
  })

  it('contains the dashboard navigation structure', async () => {
    const response = await app.request('/admin')
    const body = await response.text()

    expect(body).toContain('Topics')
    expect(body).toContain('Connections')
    expect(body).toContain('Tail Events')
  })

  it('contains the API client calling correct endpoints', async () => {
    const response = await app.request('/admin')
    const body = await response.text()

    expect(body).toContain('/v1/admin/topics')
    expect(body).toContain('/v1/admin/connections')
    expect(body).toContain('/tail')
  })

  it('does not expose API keys in the HTML output', async () => {
    const response = await app.request(
      '/admin',
      undefined,
      { SSE_PUBLISHER_API_KEYS: 'secret-key-123' },
    )
    const body = await response.text()

    expect(body).not.toContain('secret-key-123')
  })

  it('includes XSS protection via escape function', async () => {
    const response = await app.request('/admin')
    const body = await response.text()

    expect(body).toContain('&amp;')
    expect(body).toContain('&lt;')
    expect(body).toContain('&gt;')
  })
})
