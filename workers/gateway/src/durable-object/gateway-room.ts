import { parseTopicHeader } from '../lib/topic'
import type { GatewayBindings } from '../types'

type ConnectionState = {
  controller: ReadableStreamDefaultController<Uint8Array>
  topics: string[]
}

type Snapshot = {
  connectionCount: number
  topicCounts: Record<string, number>
}

type TopicTailEvent = {
  id: string
  payload: string
}

const MAX_PAGE_SIZE = 500
const DEFAULT_PAGE_SIZE = 100
const DEFAULT_TAIL_LIMIT = 20
const MAX_TAIL_LIMIT = 500
const TAIL_BUFFER_SIZE = 200

export class GatewayRoom {
  private readonly encoder = new TextEncoder()
  private readonly connections = new Map<string, ConnectionState>()
  private readonly topics = new Map<string, Set<string>>()
  private readonly topicEvents = new Map<string, TopicTailEvent[]>()
  private bodyReadCount = 0

  constructor(private readonly _state: DurableObjectState, private readonly _env: GatewayBindings) {}

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/stream') {
      return this.handleStream(request)
    }

    if (request.method === 'POST' && url.pathname === '/internal/publish') {
      return this.handlePublish(request)
    }

    if (request.method === 'GET' && url.pathname === '/internal/admin/topics') {
      return this.handleListTopics(url)
    }

    if (request.method === 'GET' && url.pathname === '/internal/admin/connections') {
      return this.handleListConnections(url)
    }

    const tailRouteMatch = url.pathname.match(/^\/internal\/admin\/topics\/([^/]+)\/tail$/)
    if (request.method === 'GET' && tailRouteMatch) {
      return this.handleTailEvents(decodeURIComponent(tailRouteMatch[1]), url)
    }

    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  debugMetrics(): { bodyReadCount: number } {
    return {
      bodyReadCount: this.bodyReadCount,
    }
  }

  debugSnapshot(): Snapshot {
    const topicCounts: Record<string, number> = {}

    for (const [topic, subscribers] of this.topics) {
      topicCounts[topic] = subscribers.size
    }

    return {
      connectionCount: this.connections.size,
      topicCounts,
    }
  }

  private handleStream(request: Request): Response {
    let topics: string[]

    try {
      topics = parseTopicHeader(request.headers.get('x-sse-topic'))
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'invalid topic header',
        },
        { status: 400 },
      )
    }

    const providedConnectionId = request.headers.get('x-sse-id')?.trim()
    const connectionId = providedConnectionId && providedConnectionId.length > 0
      ? providedConnectionId
      : crypto.randomUUID()

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.registerConnection(connectionId, topics, controller)
        controller.enqueue(this.encoder.encode(`: connected ${connectionId}\n\n`))
      },
      cancel: () => {
        this.unregisterConnection(connectionId)
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
      },
    })
  }

  private async handlePublish(request: Request): Promise<Response> {
    const rawEventId = request.headers.get('x-sse-id')?.trim()
    if (!rawEventId) {
      return Response.json({ error: 'x-sse-id header is required' }, { status: 400 })
    }

    let topics: string[]
    try {
      topics = parseTopicHeader(request.headers.get('x-sse-topic'))
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'invalid topic header',
        },
        { status: 400 },
      )
    }

    const activeTopics: string[] = []
    const droppedTopics: string[] = []

    for (const topic of topics) {
      const subscribers = this.topics.get(topic)
      if (!subscribers || subscribers.size === 0) {
        droppedTopics.push(topic)
        continue
      }

      activeTopics.push(topic)
    }

    if (activeTopics.length === 0) {
      for (const topic of droppedTopics) {
        console.log(`[publish:dropped] topic=${topic} id=${rawEventId}`)
      }

      return Response.json(
        {
          status: 'dropped',
          id: rawEventId,
          droppedTopics,
        },
        { status: 202 },
      )
    }

    this.bodyReadCount += 1
    const payload = await request.text()
    const eventBytes = this.encoder.encode(this.formatSseEvent(rawEventId, payload))
    const targetConnections = new Set<string>()

    for (const topic of activeTopics) {
      const subscribers = this.topics.get(topic)
      if (!subscribers) {
        continue
      }

      for (const connectionId of subscribers) {
        targetConnections.add(connectionId)
      }

      this.appendTopicTail(topic, {
        id: rawEventId,
        payload,
      })
    }

    let delivered = 0
    for (const connectionId of targetConnections) {
      const connection = this.connections.get(connectionId)
      if (!connection) {
        continue
      }

      try {
        connection.controller.enqueue(eventBytes)
        delivered += 1
      } catch (error) {
        console.error(`[publish:enqueue-failed] connectionId=${connectionId}`, error)
        this.unregisterConnection(connectionId)
      }
    }

    return Response.json(
      {
        status: 'accepted',
        id: rawEventId,
        delivered,
        droppedTopics,
      },
      { status: 202 },
    )
  }

  private handleListTopics(url: URL): Response {
    const { page, pageSize } = this.parsePaging(url)

    const topics = [...this.topics.entries()]
      .map(([topic, subscribers]) => ({ topic, connectionCount: subscribers.size }))
      .sort((left, right) => left.topic.localeCompare(right.topic))

    return Response.json(this.paginate(topics, page, pageSize))
  }

  private handleListConnections(url: URL): Response {
    const { page, pageSize } = this.parsePaging(url)

    const connections = [...this.connections.entries()]
      .map(([connectionId, state]) => ({ connectionId, topics: state.topics }))
      .sort((left, right) => left.connectionId.localeCompare(right.connectionId))

    return Response.json(this.paginate(connections, page, pageSize))
  }

  private handleTailEvents(topic: string, url: URL): Response {
    const requestedLimit = this.parsePositiveInt(url.searchParams.get('limit'), DEFAULT_TAIL_LIMIT)
    const limit = Math.min(requestedLimit, MAX_TAIL_LIMIT)
    const tail = this.topicEvents.get(topic) ?? []

    return Response.json({
      topic,
      events: tail.slice(-limit),
    })
  }

  private appendTopicTail(topic: string, event: TopicTailEvent): void {
    const tail = this.topicEvents.get(topic) ?? []
    tail.push(event)

    if (tail.length > TAIL_BUFFER_SIZE) {
      tail.splice(0, tail.length - TAIL_BUFFER_SIZE)
    }

    this.topicEvents.set(topic, tail)
  }

  private parsePaging(url: URL): { page: number; pageSize: number } {
    const page = this.parsePositiveInt(url.searchParams.get('page'), 1)
    const requestedPageSize = this.parsePositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE)

    return {
      page,
      pageSize: Math.min(requestedPageSize, MAX_PAGE_SIZE),
    }
  }

  private parsePositiveInt(rawValue: string | null, fallback: number): number {
    if (!rawValue) {
      return fallback
    }

    const parsed = Number.parseInt(rawValue, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback
    }

    return parsed
  }

  private paginate<T>(items: T[], page: number, pageSize: number): {
    page: number
    pageSize: number
    total: number
    data: T[]
  } {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    return {
      page,
      pageSize,
      total: items.length,
      data: items.slice(startIndex, endIndex),
    }
  }

  private formatSseEvent(eventId: string, payload: string): string {
    const lines = payload.split(/\r?\n/)
    const body = lines.map((line) => `data: ${line}`).join('\n')

    return `id: ${eventId}\n${body}\n\n`
  }

  private registerConnection(
    connectionId: string,
    topics: string[],
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    if (this.connections.has(connectionId)) {
      this.unregisterConnection(connectionId)
    }

    this.connections.set(connectionId, {
      controller,
      topics,
    })

    for (const topic of topics) {
      const subscribers = this.topics.get(topic) ?? new Set<string>()
      subscribers.add(connectionId)
      this.topics.set(topic, subscribers)
    }
  }

  private unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return
    }

    this.connections.delete(connectionId)

    for (const topic of connection.topics) {
      const subscribers = this.topics.get(topic)
      if (!subscribers) {
        continue
      }

      subscribers.delete(connectionId)
      if (subscribers.size === 0) {
        this.topics.delete(topic)
        this.topicEvents.delete(topic)
      }
    }
  }
}
