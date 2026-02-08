import type { MiddlewareHandler } from 'hono'

import type { GatewayBindings } from '../types'

const encoder = new TextEncoder()

export function parseApiKeys(rawKeys: string | undefined): string[] {
  if (!rawKeys) {
    return []
  }

  return rawKeys
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function extractBearerToken(rawAuthorization: string | null): string | null {
  if (!rawAuthorization) {
    return null
  }

  const match = rawAuthorization.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return null
  }

  const token = match[1].trim()
  return token.length > 0 ? token : null
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const maxLength = Math.max(leftBytes.length, rightBytes.length)
  let mismatch = leftBytes.length ^ rightBytes.length

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0)
  }

  return mismatch === 0
}

function isApiKeyAllowed(candidate: string, configuredKeys: readonly string[]): boolean {
  let matched = false

  for (const key of configuredKeys) {
    if (constantTimeEquals(candidate, key)) {
      matched = true
    }
  }

  return matched
}

export const requirePublisherApiKey: MiddlewareHandler<{ Bindings: GatewayBindings }> = async (
  context,
  next,
) => {
  const configuredKeys = parseApiKeys(context.env.SSE_PUBLISHER_API_KEYS)
  const token = extractBearerToken(context.req.header('authorization') ?? null)

  if (!token || configuredKeys.length === 0 || !isApiKeyAllowed(token, configuredKeys)) {
    return context.json({ error: 'unauthorized' }, 401)
  }

  await next()
}
