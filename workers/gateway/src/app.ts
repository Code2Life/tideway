import { Hono } from 'hono'

import { adminRoutes } from './admin'
import { requirePublisherApiKey } from './lib/auth'
import { resolveRuntimeAdapter } from './runtime'
import type { GatewayBindings } from './types'

export const app = new Hono<{ Bindings: GatewayBindings }>()

app.route('/admin', adminRoutes)

app.get('/healthz', (context) => {
  return context.json({ status: 'ok' })
})

app.get('/v1/stream', async (context) => {
  const runtime = resolveRuntimeAdapter(context.env)
  return runtime.openStream(context.req.raw)
})

app.post('/v1/publish', requirePublisherApiKey, async (context) => {
  const runtime = resolveRuntimeAdapter(context.env)
  return runtime.publish(context.req.raw)
})

app.get('/v1/admin/topics', requirePublisherApiKey, async (context) => {
  const runtime = resolveRuntimeAdapter(context.env)
  return runtime.listTopics(context.req.raw)
})

app.get('/v1/admin/connections', requirePublisherApiKey, async (context) => {
  const runtime = resolveRuntimeAdapter(context.env)
  return runtime.listConnections(context.req.raw)
})

app.get('/v1/admin/topics/:topic/tail', requirePublisherApiKey, async (context) => {
  const runtime = resolveRuntimeAdapter(context.env)
  return runtime.tailTopicEvents(context.req.raw, context.req.param('topic'))
})
