import type { GatewayRuntimeAdapter } from './runtime/types'

export type GatewayBindings = {
  SSE_PUBLISHER_API_KEYS?: string
  GATEWAY_ROOM?: DurableObjectNamespace
  GATEWAY_RUNTIME?: GatewayRuntimeAdapter
}
