import type { NodeRegistration } from './redis-adapter'

type NodeRegistrationInput = {
  nodeId: string
  hostname: string
  env: Record<string, string | undefined>
  now?: string
}

export function buildNodeRegistration(input: NodeRegistrationInput): NodeRegistration {
  return {
    nodeId: input.nodeId,
    hostname: input.hostname,
    ip: resolveNodeIp(input.env),
    startedAt: input.now ?? new Date().toISOString(),
  }
}

function resolveNodeIp(env: Record<string, string | undefined>): string {
  const explicit = env.TIDEWAY_NODE_IP?.trim()
  if (explicit) {
    return explicit
  }

  const hostIp = env.HOST_IP?.trim()
  if (hostIp) {
    return hostIp
  }

  const podIp = env.POD_IP?.trim()
  if (podIp) {
    return podIp
  }

  return '127.0.0.1'
}
