// The Worker entry point (wrangler.jsonc → main). For now it simply serves the Hono API; once the
// connector is set up, this file wraps the API and the MCP server in an OAuth provider (see the
// vibe-connector skill). Either way the React app is served as static files and only /api/* (and,
// later, /mcp) run this code — see wrangler.jsonc → run_worker_first.

export { api as default } from './api'
