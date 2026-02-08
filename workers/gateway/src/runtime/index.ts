import type { GatewayBindings } from '../types'

import { DurableObjectGatewayRuntimeAdapter } from './durable-object-adapter'
import type { GatewayRuntimeAdapter } from './types'

export function resolveRuntimeAdapter(env: GatewayBindings): GatewayRuntimeAdapter {
  if (env.GATEWAY_RUNTIME) {
    return env.GATEWAY_RUNTIME
  }

  if (!env.GATEWAY_ROOM) {
    throw new Error('GATEWAY_ROOM binding is required for stream routes')
  }

  return new DurableObjectGatewayRuntimeAdapter(env.GATEWAY_ROOM)
}
