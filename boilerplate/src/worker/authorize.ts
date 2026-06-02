// The OAuth consent page. When the owner adds this app as a custom connector in Claude, Claude
// sends them here (/authorize). They enter their access key (OWNER_SECRET) once; if it matches, we
// complete the authorization and Claude gets a token. A valid token = "the owner" — single owner,
// one shared secret, no accounts. This is the only place the secret is entered in the browser.

import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider'

type AuthorizeEnv = {
  OWNER_SECRET: string
  OAUTH_PROVIDER: OAuthHelpers
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

// A small, trustworthy German consent page. The form has no `action`, so it posts back to the same
// /authorize?... URL (the OAuth parameters ride along in the query string automatically).
function consentPage(appName: string, error?: string): string {
  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Zugriff erlauben</title>
<style>
  :root { color-scheme: light dark }
  body { font-family: system-ui, sans-serif; margin: 0; display: grid; place-items: center; min-height: 100vh; background: #f6f7f9 }
  @media (prefers-color-scheme: dark) { body { background: #1a1b1e } }
  .card { width: min(360px, 90vw); padding: 28px; border-radius: 14px; background: Canvas; box-shadow: 0 6px 30px rgba(0,0,0,.12) }
  h1 { font-size: 20px; margin: 0 0 6px }
  p { color: GrayText; font-size: 14px; line-height: 1.5; margin: 0 0 16px }
  input { width: 100%; box-sizing: border-box; font-size: 16px; padding: 11px 12px; border-radius: 9px; border: 1px solid #b6b9bf; background: Field; color: FieldText }
  button { width: 100%; margin-top: 14px; font-size: 16px; padding: 11px; border: 0; border-radius: 9px; background: #4263eb; color: #fff; cursor: pointer }
  .error { color: #e03131 }
</style></head>
<body><div class="card">
  <h1>Mit ${escapeHtml(appName)} verbinden</h1>
  <p>Damit ${escapeHtml(appName)} mit deiner App reden darf, gib einmal deinen Zugangsschlüssel ein.</p>
  ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
  <form method="POST">
    <input type="password" name="secret" placeholder="Zugangsschlüssel" autocomplete="off" autofocus required/>
    <button type="submit">Erlauben</button>
  </form>
</div></body></html>`
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function handleAuthorize(request: Request, env: AuthorizeEnv): Promise<Response> {
  const oauthReq = await env.OAUTH_PROVIDER.parseAuthRequest(request)
  const client = await env.OAUTH_PROVIDER.lookupClient(oauthReq.clientId)
  const appName = client?.clientName ?? 'Claude'

  if (request.method === 'POST') {
    const form = await request.formData()
    const secret = typeof form.get('secret') === 'string' ? (form.get('secret') as string) : ''
    if (secret !== env.OWNER_SECRET) {
      return htmlResponse(
        consentPage(appName, 'Falscher Schlüssel. Bitte versuche es noch einmal.'),
        401,
      )
    }
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: oauthReq,
      userId: 'owner',
      metadata: {},
      scope: oauthReq.scope,
      props: {},
    })
    return Response.redirect(redirectTo, 302)
  }

  return htmlResponse(consentPage(appName))
}
