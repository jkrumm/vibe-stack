---
name: vibe-connector
description: Connect a vibe-stack app to Claude as a custom connector so the owner can use it from anywhere — phone, desktop/web Chat, Projects, and routines, not just the Code tab. Provisions the OAUTH_KV namespace and the OWNER_SECRET access key, deploys, walks the owner (in German) through adding the custom connector, and generates the claude-setup/ paste bundle. Use when the owner wants to use/manage the app from their phone or outside the Code tab, "von überall", "auf dem Handy", "mit Claude verbinden", "Connector einrichten", or right after the first deploy.
---

# vibe-connector — use your app from anywhere

Every vibe-stack app already ships an **MCP server** (`/mcp`), a **REST API**, and a **single-owner
OAuth provider** (see the project's `CLAUDE.md`). This skill switches that on for real: it provisions
the one secret + the token store, deploys, and walks the owner through adding the app to Claude as a
**custom connector** — after which the owner can read and change their data from **any** Claude:
phone, desktop, web Chat, a Project, or a scheduled routine.

It also turns on the website's login (the same key) and lets you, the agent, operate the live data
from the Code tab via the REST API. Speak only plain German to the owner, one step at a time. The app
must be a deployed vibe-stack app (or about to be — this skill can do the first deploy).

## What the owner gets (say this in German, short)

> *"Ich verbinde deine App mit Claude. Danach kannst du sie von überall benutzen — auf dem Handy, im
> Chat, in einem Projekt — und nicht nur hier am Mac. Du brauchst dafür nur einen Zugangsschlüssel,
> den ich gleich für dich erstelle."*

## Step 1 — The token store (OAUTH_KV)

The OAuth provider needs a KV namespace to hold connector tokens. Create it and put the id into
`wrangler.jsonc` (replace `REPLACE_WITH_YOUR_KV_ID`). Do this **before** deploying — the Worker won't
start without it.

```bash
npx wrangler kv namespace create OAUTH_KV
```

It prints an `id`. Set it in `wrangler.jsonc` under `kv_namespaces` → the `OAUTH_KV` binding. (If the
binding block is missing, add it — see the project's `wrangler.jsonc` comment.)

## Step 2 — The access key (OWNER_SECRET)

One strong secret is the whole security model: it protects the website, the REST API, and the
connector consent. Generate it, set it on the Worker, store a copy in the Mac keychain (so you can use
the API from the Code tab), and show it to the owner **once**.

```bash
KEY=$(openssl rand -hex 32)
echo "$KEY" | npx wrangler secret put OWNER_SECRET                       # the Worker checks this
security add-generic-password -U -s "<app-name>-owner-secret" -a "<app-name>" -w "$KEY"   # for you
echo "Dein Zugangsschlüssel: $KEY"
```

Tell the owner, in German:

> *"Das ist dein **Zugangsschlüssel** — behandle ihn wie ein Passwort. Ich habe ihn sicher hinterlegt.
> Du gibst ihn gleich zweimal ein: einmal beim Verbinden mit Claude und einmal in deiner Webseite.
> Danach musst du ihn dir nicht merken."*

Later you read it back without showing it again:

```bash
KEY=$(security find-generic-password -s "<app-name>-owner-secret" -a "<app-name>" -w)
```

## Step 3 — Deploy

Now publish, so there's a live `/mcp` URL to connect to (and the website login is active). `npm run
deploy` validates first, so a broken app can't go live.

```bash
npm run deploy
```

Read the printed URL — `https://<app-name>.<subdomain>.workers.dev`. The connector URL is that **+
`/mcp`**.

## Step 4 — Add the connector in Claude (the owner clicks; you guide)

This part happens in the Claude app/website, and only the owner can click it. Walk them through it in
German, one line at a time. Give them the exact connector URL.

> *"Jetzt verbinden wir deine App mit Claude:*
> 1. *Öffne in Claude die **Einstellungen** und dort **Connectors** (Verbindungen).*
> 2. *Klicke **Add custom connector** (eigenen Connector hinzufügen).*
> 3. *Füge diese Adresse ein: **`https://<app-name>.<subdomain>.workers.dev/mcp`** und bestätige.*
> 4. *Es öffnet sich eine kleine Anmelde-Seite deiner App. Gib dort deinen **Zugangsschlüssel** ein
>    und klicke **Erlauben**.*
> 5. *Fertig — deine App taucht jetzt als Connector auf."*

What happens under the hood (don't burden the owner with it): Claude registers itself (dynamic client
registration), sends the owner to the app's `/authorize` consent page, the page checks the
`OWNER_SECRET`, and Claude receives a token. From then on Claude's calls to `/mcp` carry that token.

If the owner is on a plan/surface without custom connectors, tell them plainly they can still use the
app from the **website** (Step 6) and the **Code tab**; the connector is the "from any chat" bonus.

## Step 5 — Hand over the paste bundle (claude-setup/)

The connector gives Claude the **tools**; a short **Project** gives Claude the **how** for normal Chat
and Cowork. The project ships a `claude-setup/` bundle — fill it in from this app, then walk the owner
through pasting it (only **Chat / Cowork** need this; the Code tab and routines read the repo files).

1. **Fill the placeholders** in `claude-setup/PROJEKT-ANWEISUNGEN.md`: the app name, the real connector
   **tool names** (from `src/worker/mcp.ts`), and any domain rules (from the project `CLAUDE.md`). Set
   `connectorUrl` in `claude-setup/manifest.json` to the real `/mcp` URL.
2. **Record hashes** so you can detect later changes:

   ```bash
   shasum -a 256 claude-setup/PROJEKT-ANWEISUNGEN.md claude-setup/ANWEISUNGEN-GLOBAL.md
   ```

   Write each hash into the matching `artifacts[...].hash` in `manifest.json`. Commit `claude-setup/`.
3. **Walk the owner through pasting**, one surface at a time, following `claude-setup/EINFUEGEN.md`:
   the **Project instructions** (the important one) and, once, the **global personal preferences**.
   Show the exact text and where it goes; don't make them read the files themselves.

> *"Damit Claude im normalen Chat weiß, wie es deine App bedient, fügen wir noch einen kurzen Text in
> ein Projekt ein. Ich zeige dir genau, wo — das dauert eine halbe Minute."*

### Keeping the bundle in sync (tie the re-paste to the cause)

The pasted text is high-level and stable, so it rarely changes. When something **does** change the
domain — you ran `add-data` (new tools) or `vibe-ops-setup` (new rules) — regenerate the affected
`claude-setup/` file, re-hash it, and if the hash differs from `manifest.json`, offer the 30-second
re-paste **right then**, in German:

> *"Kleinigkeit: Deine App kann jetzt etwas Neues. Magst du den Projekt-Text einmal auffrischen? Ich
> gebe dir den neuen Text — einfach im Projekt ersetzen."*

Then update the hash. Keep volatile detail in the **tool descriptions** (auto-updated on every deploy)
and in the repo files, so the pasted text stays stable. Honest limits: there's no way to verify the
owner actually pasted (rely on their confirmation); a brand-new Claude **account** means pasting again.

## Step 6 — Operate from anywhere (you and the owner)

- **Owner, website:** open the app's URL; it asks for the access key once, then opens. On a phone:
  *"Zum Home-Bildschirm"*. This is the smoothest "from anywhere".
- **Owner, any Claude chat / Project / phone:** just talk — the connector tools do the work.
- **You, from the Mac Code tab:** read the key from the keychain and call the REST API:

  ```bash
  KEY=$(security find-generic-password -s "<app-name>-owner-secret" -a "<app-name>" -w)
  BASE="https://<app-name>.<subdomain>.workers.dev/api"
  curl -s "$BASE/entries" -H "Authorization: Bearer $KEY"                 # read
  ```

  Same safety rules as ever: read before write, confirm before write, enforce the domain rules in
  `CLAUDE.md`, report back in one plain-German sentence, never paste raw JSON. A **Cowork/cloud**
  session has no keychain — there, use the connector (Step 4) or the website.

## Step 7 — Rotate / troubleshoot

- **Rotate the key** (lost device, hygiene): repeat Step 2 with a fresh `openssl rand` value (it
  overwrites the Worker secret + the keychain entry), redeploy, then the owner re-enters it in the
  website and re-approves the connector. Old tokens stop working.
- **Connector can't connect:** confirm the app is deployed and the URL ends in **`/mcp`**; confirm
  `OAUTH_KV` has a real id in `wrangler.jsonc` and `OWNER_SECRET` is set (`npx wrangler secret list`).
- **Website always shows the login again:** the entered key doesn't match `OWNER_SECRET` — re-check or
  rotate. The website stores the key in that browser only; clearing site data logs out.

## Hard rules

- **Single shared secret = single owner.** A valid token always means "the owner". If the owner needs
  **other people to log in with their own identities**, that's `vibe-access` (Cloudflare Access), not
  this. Public sign-ups for outside people remain a **STOP** — that needs a real developer.
- Never show the secret in any committed file, the website code, or to the owner more than once.
- The connector covers the **data**; the website still owns **photos** and the visual view.
