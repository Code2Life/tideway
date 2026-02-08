import type { GatewayRuntimeAdapter } from './types'

const ROOM_NAME = 'global'
const ROOM_BASE_URL = 'https://gateway.internal'

export class DurableObjectGatewayRuntimeAdapter implements GatewayRuntimeAdapter {
  constructor(private readonly namespace: DurableObjectNamespace) {}

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
    return this.forward(request, `/internal/admin/topics/${encodeURIComponent(topic)}/tail`, true)
  }

  private async forward(request: Request, path: string, keepSearch = false): Promise<Response> {
    const url = new URL(request.url)
    const target = new URL(path, ROOM_BASE_URL)
    if (keepSearch) {
      target.search = url.search
    }

    const stub = this.namespace.get(this.namespace.idFromName(ROOM_NAME))

    return stub.fetch(new Request(target.toString(), request))
  }
}
