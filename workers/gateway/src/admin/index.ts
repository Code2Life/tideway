import { Hono } from 'hono'

import type { GatewayBindings } from '../types'
import { adminHtml } from './html'

export const adminRoutes = new Hono<{ Bindings: GatewayBindings }>()

adminRoutes.get('/', (c) => {
  return c.html(adminHtml())
})
