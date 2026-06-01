---
name: vibe-api-mode
description: Turn a vibe-stack app's API into an authenticated API protected by one secret (Bearer token) so the owner can manage the data from anywhere — the agent uses the secret from the Mac keychain, and the website asks for the secret once. This is the "manage from anywhere" upgrade to vibe-operate's local-only wrangler path. Use when the owner wants to manage from Cowork / their phone / outside the Code tab, wants the website itself to require a key, or wants other tools to call the API.
---

# vibe-api-mode — one secret, manage from anywhere

By default the agent runs the live data with `wrangler` (the `vibe-operate` skill) — great, but only in
the **Code tab on the owner's Mac**. This skill upgrades the app to the **argo pattern**: the Hono API
is guarded by a single **Bearer secret**, so anything that can send that secret can use the API — the
agent (secret from the **Mac keychain**), the website (the owner pastes the secret **once**), or a
future tool. Same idea as the user's `argo` server, just public on `*.workers.dev` instead of behind
Tailscale.

## When this is the right move (and the honest tradeoffs)

Use it when the owner wants to manage from **Cowork, their phone, or any device**, or wants the website
to require a key. Be straight with them (in German) about the tradeoffs:

- The website stores the key in the browser (one master key on their own device). Fine for a
  single-owner tool; rotate it if a device is lost (Step 7). Serve only over HTTPS (workers.dev is).
- This **replaces Cloudflare Access** for the app — don't run both. The Bearer secret is now the gate.
  (If many *staff* should log in to the website with their own identities, prefer `vibe-access`
  instead — a shared secret isn't per-person.)
- The **Mac Code tab** reads the key from the keychain automatically. A **Cowork/cloud** session has no
  keychain, so the owner would paste the key into that session once. The website-on-a-phone is the
  smoothest "from anywhere".
- Photos are served by an unguessable key and stay **public-by-URL** (so `<img>` tags work — they
  can't send an auth header). The sensitive **data** (reservations, staff, …) is fully gated.

Speak German to the owner throughout, one step at a time.

## Step 1 — Create the secret (Worker + keychain), show it once

Generate a strong secret, set it on the Worker (so the Worker can validate incoming tokens), and store
the same value in the Mac keychain for the agent. Use the app name for the keychain service.

```bash
KEY=$(openssl rand -hex 32)
echo "$KEY" | npx wrangler secret put API_SECRET           # the Worker validates against this
security add-generic-password -U -s "<app-name>-api-secret" -a "<app-name>" -w "$KEY"   # for the agent
echo "Dein Zugangsschlüssel (einmal in die Webseite eingeben): $KEY"
```

Tell the owner: *"Das ist dein Zugangsschlüssel. Ich habe ihn sicher hinterlegt. Du gibst ihn gleich
einmal in deine Webseite ein — danach musst du ihn dir nicht merken."* Later the agent reads it with:

```bash
KEY=$(security find-generic-password -s "<app-name>-api-secret" -a "<app-name>" -w)
```

## Step 2 — Guard the API in the Worker

Add the `API_SECRET` binding to the `Bindings` type and a Bearer guard. **Leave the discovery route
(`/api`) and the photo route (`/api/photo/...`) public** — discovery so tools can see the app exists,
photos so `<img>` tags render. Everything else needs the token.

In `src/worker/index.ts`:

```ts
import { bearerAuth } from 'hono/bearer-auth'
// ...
type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  API_SECRET: string // the access key (set via `wrangler secret put API_SECRET`)
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// Public: health/discovery (already present) — keep it BEFORE the guard.
app.get('/', (c) => c.json({ ok: true, name: '<app-name>', auth: 'bearer' }))

// Guard: every /api/* route needs `Authorization: Bearer <API_SECRET>`,
// except the public discovery and photo routes (photos are served by unguessable key).
app.use('/*', (c, next) => {
  const path = c.req.path
  if (path === '/api' || path === '/api/' || path.startsWith('/api/photo/')) return next()
  return bearerAuth({ verifyToken: (token) => token === c.env.API_SECRET })(c, next)
})

// ...all the data routes below stay as they are (now protected)...
```

Then regenerate types and check it builds: `npm run cf-typegen` (note: secrets aren't in
`wrangler.jsonc`, so `API_SECRET` is typed by the hand-written `Bindings` above, not generated).

## Step 3 — Make the website send the key

Route all data calls through one helper that adds the `Authorization` header and re-prompts on 401, and
put a small key-gate in front of the app.

In `src/client/lib/api.ts`:

```ts
const API_KEY = 'vibe-api-key'
export const getApiKey = () => localStorage.getItem(API_KEY) ?? ''
export const setApiKey = (k: string) => localStorage.setItem(API_KEY, k.trim())
export const clearApiKey = () => localStorage.removeItem(API_KEY)

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${getApiKey()}` },
  })
  if (res.status === 401) {
    clearApiKey()
    location.reload() // wrong/expired key → ask for it again
    throw new Error('Nicht angemeldet.')
  }
  return res
}
```

Switch the existing data helpers from `fetch(...)` to `apiFetch(...)` (e.g. `listEntries`,
`createEntry`, `deleteEntry`). **Leave `photoUrl()` as a plain `/api/photo/<key>` URL** — that route is
public, so images keep working in `<img>`/`<Image>`.

Add a gate, `src/client/api-key-gate.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button, Center, PasswordInput, Stack, Text, Title } from '@mantine/core'

import { getApiKey, setApiKey } from './lib/api'

export function ApiKeyGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => getApiKey() !== '')
  const [value, setValue] = useState('')
  if (unlocked) return <>{children}</>
  return (
    <Center h="100vh" p="md">
      <Stack maw={360} w="100%">
        <Title order={4}>Anmeldung</Title>
        <Text size="sm" c="dimmed">
          Gib deinen Zugangsschlüssel ein, um deine App zu öffnen.
        </Text>
        <PasswordInput
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="Zugangsschlüssel"
        />
        <Button
          disabled={value.trim() === ''}
          onClick={() => {
            setApiKey(value)
            setUnlocked(true)
          }}
        >
          Öffnen
        </Button>
      </Stack>
    </Center>
  )
}
```

Wrap the app with it in `src/client/main.tsx`, inside the providers:

```tsx
<MantineProvider theme={theme} defaultColorScheme="auto">
  <QueryClientProvider client={queryClient}>
    <ApiKeyGate>
      <App />
    </ApiKeyGate>
  </QueryClientProvider>
</MantineProvider>
```

## Step 4 — Update the tests + the contract

- **Tests:** the workerd tests now need the header. Either set `API_SECRET` in the test env and send
  `Authorization: Bearer <same>` on data requests, or test the guard explicitly (a request without the
  token returns **401**; with it, **200/201**). Add a `bindings: { API_SECRET: 'test-secret' }` to the
  `miniflare` block in `vitest.config.ts` and send that token from the tests. Keep `npm run validate`
  green.
- **The contract:** the public `GET /api` now advertises `auth: 'bearer'`. For a richer, self-
  describing contract the agent (or other tools) can read, list the routes there, e.g.
  `{ ok: true, name, auth: 'bearer', endpoints: [{ method: 'GET', path: '/api/reservations' }, …] }`.
  If the owner outgrows that, `@hono/zod-openapi` generates a full OpenAPI 3 spec from the route
  schemas — note it as the upgrade, don't force the heavier route syntax on a small app.

## Step 5 — Switch off Cloudflare Access (if it was on)

If `vibe-access` was enabled earlier, turn it off so the app isn't double-gated: dashboard →
**Workers & Pages → app → Settings → Domains & Routes → disable Cloudflare Access**. The Bearer secret
is the gate now. (Keep Access instead of this skill if per-person staff logins matter more than
managing from anywhere.)

## Step 6 — How the agent operates in API mode

From the **Mac Code tab**, read the key from the keychain and call the API:

```bash
KEY=$(security find-generic-password -s "<app-name>-api-secret" -a "<app-name>" -w)
BASE="https://<app-name>.<subdomain>.workers.dev/api"
curl -s "$BASE/reservations" -H "Authorization: Bearer $KEY"                       # read
curl -s -X POST "$BASE/reservations" -H "Authorization: Bearer $KEY" \
  -F "guest=Müller" -F "party_size=4" -F "date=2026-06-02" -F "time=19:00" -F "table_no=5"  # write
```

Same safety rules as `vibe-operate`: read before write, confirm before write, enforce the domain rules
in `CLAUDE.md`, report back in plain German, never paste raw JSON. In a **Cowork/cloud** session there's
no keychain — ask the owner to paste the key once, or keep heavy management on the Mac. `wrangler
d1 execute --remote` still works locally too.

## Step 7 — Deploy, then rotate when needed

`npm run deploy` (it validates first). To **rotate** the secret (lost device, or just hygiene): repeat
Step 1 with a fresh `openssl rand` value (it overwrites the Worker secret and the keychain entry), then
re-enter it once in the website. To **revoke** everything, rotate the secret — old copies stop working
immediately.

## Security notes (tell the owner the plain version)

- The key is the master key — *"behandle ihn wie ein Passwort"*. It only lives on his own devices.
- The website's code is public (it's just the screen); the **data is locked** behind the key (the API
  returns "nicht angemeldet" without it). Never put the key or sensitive data into the app's code.
- Public sign-ups for outside people remain a **STOP** — that needs a real developer and proper auth.
