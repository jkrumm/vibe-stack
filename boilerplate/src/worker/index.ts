// The Worker entry point (wrangler.jsonc → main). It serves two things from one Worker: the MCP
// server at /mcp (for Claude connectors) and the Hono REST API + SPA assets for everything else.
// Once the connector is set up, this file is replaced by an OAuth provider that gates /mcp (see the
// vibe-connector skill); the routing stays the same. The React app is served as static files —
// only /api/* and /mcp run this code (see wrangler.jsonc → run_worker_first).

import type { Bindings } from './api'
import { api } from './api'
import mcp from './mcp'

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url)
    if (pathname === '/mcp') return mcp.fetch(request, env, ctx)
    return api.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Bindings>
