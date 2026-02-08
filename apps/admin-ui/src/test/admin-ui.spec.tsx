import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '../app'

const STORAGE_KEY = 'tideway.admin.apiKey'

describe('Admin UI', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores API key and sends bearer auth when loading topics', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/v1/admin/topics')) {
        return Response.json({
          page: 1,
          pageSize: 50,
          total: 1,
          data: [{ topic: 'alerts', connectionCount: 2 }],
        })
      }

      return Response.json({ error: 'unexpected' }, { status: 500 })
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App gatewayBaseUrl="https://gateway.example" />)

    await userEvent.type(screen.getByLabelText(/api key/i), 'key-123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText('alerts')).toBeInTheDocument()
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBe('key-123')

    const [, requestInit] = fetchMock.mock.calls[0]
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('authorization')).toBe('Bearer key-123')
  })

  it('loads connections and tail events from tab actions', async () => {
    localStorage.setItem(STORAGE_KEY, 'key-abc')

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/v1/admin/topics?page=1&pageSize=50')) {
        return Response.json({
          page: 1,
          pageSize: 50,
          total: 1,
          data: [{ topic: 'alerts', connectionCount: 1 }],
        })
      }

      if (url.includes('/v1/admin/connections?page=1&pageSize=50')) {
        return Response.json({
          page: 1,
          pageSize: 50,
          total: 1,
          data: [{ connectionId: 'conn-1', topics: ['alerts'] }],
        })
      }

      if (url.includes('/v1/admin/topics/alerts/tail?limit=20')) {
        return Response.json({
          topic: 'alerts',
          events: [{ id: 'event-1', payload: 'hello' }],
        })
      }

      return Response.json({ error: 'unexpected' }, { status: 500 })
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App gatewayBaseUrl="https://gateway.example" />)

    await waitFor(() => {
      expect(screen.getByText('alerts')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /connections/i }))

    await waitFor(() => {
      expect(screen.getByText('conn-1')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /tail events/i }))
    await userEvent.type(screen.getByLabelText(/topic/i), 'alerts')
    await userEvent.click(screen.getByRole('button', { name: /load tail/i }))

    await waitFor(() => {
      expect(screen.getByText('event-1')).toBeInTheDocument()
      expect(screen.getByText('hello')).toBeInTheDocument()
    })
  })
})
