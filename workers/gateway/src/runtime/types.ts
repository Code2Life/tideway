export interface GatewayRuntimeAdapter {
  openStream(request: Request): Promise<Response>
  publish(request: Request): Promise<Response>
  listTopics(request: Request): Promise<Response>
  listConnections(request: Request): Promise<Response>
  tailTopicEvents(request: Request, topic: string): Promise<Response>
}
