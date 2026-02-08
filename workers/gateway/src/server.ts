import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import { app } from './app'
import { StandaloneRuntimeAdapter } from './runtime/standalone-adapter'
import type { GatewayBindings } from './types'

const port = parseInt(process.env.PORT ?? '8787', 10)
const host = process.env.HOST ?? '0.0.0.0'

const runtime = new StandaloneRuntimeAdapter()

// Wrap the main app to inject env bindings (replaces CF Workers' automatic env injection)
const server = new Hono<{ Bindings: GatewayBindings }>()

server.use('*', async (c, next) => {
  c.env = {
    ...c.env,
    GATEWAY_RUNTIME: runtime,
    SSE_PUBLISHER_API_KEYS: process.env.SSE_PUBLISHER_API_KEYS,
  }
  await next()
})

server.route('/', app)

const handle = serve({ fetch: server.fetch, port, hostname: host }, (info) => {
  console.log(`tideway gateway listening on ${info.address}:${info.port}`)
})

function shutdown() {
  console.log('shutting down...')
  handle.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
