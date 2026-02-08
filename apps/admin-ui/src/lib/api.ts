export type TopicItem = {
  topic: string
  connectionCount: number
}

export type ConnectionItem = {
  connectionId: string
  topics: string[]
}

export type TailEvent = {
  id: string
  payload: string
}

type PaginatedResponse<T> = {
  page: number
  pageSize: number
  total: number
  data: T[]
}

export type AdminApiClient = {
  listTopics(): Promise<PaginatedResponse<TopicItem>>
  listConnections(): Promise<PaginatedResponse<ConnectionItem>>
  tailEvents(topic: string): Promise<{ topic: string; events: TailEvent[] }>
}

const DEFAULT_PAGE_SIZE = 50
const DEFAULT_TAIL_LIMIT = 20

export function createAdminApiClient(gatewayBaseUrl: string, apiKey: string): AdminApiClient {
  const base = gatewayBaseUrl.replace(/\/$/, '')

  const request = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${base}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`request failed with ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  return {
    listTopics: () => request<PaginatedResponse<TopicItem>>(`/v1/admin/topics?page=1&pageSize=${DEFAULT_PAGE_SIZE}`),
    listConnections: () =>
      request<PaginatedResponse<ConnectionItem>>(`/v1/admin/connections?page=1&pageSize=${DEFAULT_PAGE_SIZE}`),
    tailEvents: (topic: string) =>
      request<{ topic: string; events: TailEvent[] }>(
        `/v1/admin/topics/${encodeURIComponent(topic)}/tail?limit=${DEFAULT_TAIL_LIMIT}`,
      ),
  }
}
