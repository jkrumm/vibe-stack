import { exports } from 'cloudflare:workers'
import { expect, it } from 'vitest'

// Drives the whole connector handshake the way a Claude connector does it, against the real Worker
// in workerd: dynamic client registration → /authorize consent (the owner's key) → token exchange →
// an authenticated /mcp call. Proves the OAuth provider gates /mcp AND lets a valid token through to
// the MCP tools. OWNER_SECRET is 'test-secret' (vitest.config.ts); OAUTH_KV is a local namespace.

const ORIGIN = 'https://example.com'
const REDIRECT = 'https://example.com/callback'

function base64url(bytes: ArrayBuffer): string {
  let str = ''
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b)
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function pkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64url(digest) }
}

it('runs the connector OAuth flow and reaches the MCP tools with a token', async () => {
  // 1. Dynamic Client Registration (a connector's first call).
  const reg = await exports.default.fetch(`${ORIGIN}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Claude',
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }),
  })
  expect(reg.status).toBeLessThan(300)
  const client = (await reg.json()) as { client_id: string }
  expect(client.client_id).toBeTruthy()

  // 2. Authorize with PKCE.
  const { verifier, challenge } = await pkce()
  const authUrl =
    `${ORIGIN}/authorize?response_type=code&client_id=${encodeURIComponent(client.client_id)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=&state=xyz` +
    `&code_challenge=${challenge}&code_challenge_method=S256`

  // The consent page renders in German.
  const consent = await exports.default.fetch(authUrl)
  expect(consent.status).toBe(200)
  expect(await consent.text()).toContain('Zugangsschlüssel')

  // Wrong key is rejected.
  const wrong = await exports.default.fetch(authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'secret=nope',
    redirect: 'manual',
  })
  expect(wrong.status).toBe(401)

  // Right key completes authorization → redirect carrying an auth code.
  const granted = await exports.default.fetch(authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'secret=test-secret',
    redirect: 'manual',
  })
  expect(granted.status).toBe(302)
  const code = new URL(granted.headers.get('location') ?? '').searchParams.get('code')
  expect(code).toBeTruthy()

  // 3. Exchange the code for an access token (public client + PKCE verifier).
  const tokenRes = await exports.default.fetch(`${ORIGIN}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code ?? '',
      redirect_uri: REDIRECT,
      client_id: client.client_id,
      code_verifier: verifier,
    }),
  })
  expect(tokenRes.status).toBe(200)
  const { access_token } = (await tokenRes.json()) as { access_token: string }
  expect(access_token).toBeTruthy()

  // 4. With the token, /mcp now reaches the MCP server (the initialize result names the server).
  const mcp = await exports.default.fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    }),
  })
  expect(mcp.status).toBe(200)
  expect(await mcp.text()).toContain('vibe-stack app')
})
