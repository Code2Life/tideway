import { GatewayRoom } from '../durable-object/gateway-room'

import type { GatewayRuntimeAdapter } from './types'

const BASE_URL = 'http://localhost'

/**
 * Standalone runtime adapter for self-hosted (Docker/K8s) deployments.
 * Wraps GatewayRoom directly — no Durable Objects needed.
 */
export class StandaloneRuntimeAdapter implements GatewayRuntimeAdapter {
  private readonly room: InstanceType<typeof GatewayRoom>

  constructor() {
    // GatewayRoom._state and _env are required by the DO constructor signature
    // but never accessed at runtime, so stub values are safe here
    this.room = new GatewayRoom({} as never, {} as never)
  }

  async openStream(request: Request): Promise<Response> {
    return this.forward(request, '/stream')
  }

  async publish(request: Request): Promise<Response> {
    return this.forward(request, '/internal/publish')
  }

  async listTopics(request: Request): Promise<Response> {
    return this.forward(request, '/internal/admin/topics', true)
  }

  async listConnections(request: Request): Promise<Response> {
    return this.forward(request, '/internal/admin/connections', true)
  }

  async tailTopicEvents(request: Request, topic: string): Promise<Response> {
    return this.forward(
      request,
      `/internal/admin/topics/${encodeURIComponent(topic)}/tail`,
      true,
    )
  }

  private async forward(request: Request, path: string, keepSearch = false): Promise<Response> {
    const url = new URL(request.url)
    const target = new URL(path, BASE_URL)
    if (keepSearch) {
      target.search = url.search
    }

    return this.room.fetch(new Request(target.toString(), request))
  }
}
