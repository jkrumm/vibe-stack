// The Worker entry point (wrangler.jsonc → main). One Worker, wrapped in an OAuth provider so the
// owner can connect their app to Claude as a custom connector (the only auth consumer Claude
// connectors accept). The provider:
//   - serves /token, /register and /.well-known/oauth-authorization-server itself (DCR + discovery),
//   - sends /authorize to our consent page (authorize.ts), which checks the owner's key,
//   - gates /mcp: only a request carrying a valid token reaches the MCP server,
//   - passes everything else (the /api/* REST routes) straight through to the Hono app.
// The React app is still served as static files; only the run_worker_first paths run this code.

import { type OAuthHelpers, OAuthProvider } from '@cloudflare/workers-oauth-provider'

import { api, type Bindings } from './api'
import { handleAuthorize } from './authorize'
import mcp from './mcp'

// The runtime environment. DB/BUCKET/OWNER_SECRET are our bindings; OAUTH_KV is the provider's token
// store (wrangler.jsonc); OAUTH_PROVIDER is injected by the provider before it calls a handler.
type Env = Bindings & {
  OAUTH_KV: KVNamespace
  OAUTH_PROVIDER: OAuthHelpers
}

// The MCP endpoint — only reached AFTER the provider validated the token, so any caller is the
// owner. Plain {fetch} objects keep the provider's ExportedHandler typing clean.
const apiHandler = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => mcp.fetch(request, env, ctx),
}

// Everything else: the OAuth consent page at /authorize, otherwise the REST API (and SPA assets).
const defaultHandler = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const { pathname } = new URL(request.url)
    if (pathname === '/authorize') return handleAuthorize(request, env)
    return api.fetch(request, env, ctx)
  },
}

export default new OAuthProvider<Env>({
  apiRoute: '/mcp',
  apiHandler,
  defaultHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register', // RFC 7591 Dynamic Client Registration — Claude needs it
})
