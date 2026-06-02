---
name: vibe-new-app
description: RARELY needed — vibe-stack is ONE growing app, so a new thing is normally a new page (use add-page / add-data), NOT a new app. Only scaffold a fully separate app (its own DB + R2 + URL) when the owner explicitly insists on an isolated environment — confirm they don't just mean a new feature first. Then clone the kit, copy the boilerplate to ~/vibe-apps/<name>, rename, npm install, connect Cloudflare, deploy. Triggers: "wirklich eine eigene, getrennte App", "komplett separate app", "neu anfangen".
---

# vibe-new-app

> **Usually you do NOT want this.** vibe-stack is **one growing app** — the owner builds *everything*
> into the same project (food log, workout, a business domain, …), with one D1 as the growing knowledge
> base, reachable from the Mac and from Claude on the phone. **A new feature is a new page in the
> existing app** (`add-page` / `add-data`), *not* a new app. Create a **separate** app only when the
> owner genuinely wants an isolated environment with its own data and URL — a rare exception.

Scaffold a **brand-new, independent** vibe-stack app for an owner who explicitly wants one *separate*
from their existing app. Each app is fully separate: its **own** Cloudflare Worker, **own** D1 database,
**own** R2 bucket. **There is NO shared database** — never point a new app at an existing app's
`database_id`.

The owner is non-technical and German-speaking. Speak to them only in **plain German**, one short
message per step. Translate any error into a single calm German sentence — never show a raw trace.

## When to use this
The owner is in any chat and says they want to build *another* app, e.g. *"Ich will noch eine App
bauen"*, *"eine zweite App"*, *"weitere App"*, *"neu anfangen"*, *"new app"*, *"start fresh"*.
(The first-ever setup is the 8-phase ONBOARDING, not this skill. This skill assumes Node, git, and
a Cloudflare login already exist from the first app — but it re-checks and re-runs login if needed.)

**First, confirm they really want a separate app.** The default is to grow their existing one, so ask
in German before scaffolding anything:

> *"Möchtest du wirklich eine **komplett eigene, getrennte** App (mit eigener Datenbank) — oder soll
> ich die neue Sache einfach in deine bestehende App einbauen? Meistens ist das Zweite gemeint."*

Only continue here if they confirm a fully separate one. If they just want a new feature, use
`add-page` / `add-data` in their existing project instead.

## First: name the new app
Ask once, in German:

> *"Wie soll deine neue App heißen, und was soll sie können?"*

Derive a short, lowercase, hyphenated `<new-app-name>` from the idea (e.g. *book list* →
`book-list`). Tell them where it will live:

> *"Ich lege deine neue App unter `~/vibe-apps/<new-app-name>` an — komplett getrennt von deiner
> ersten App, mit eigener Datenbank."*

In the steps below replace every `<new-app-name>` with that name.

## Step 1 — Copy the kit into a new project
Fetch the kit, copy only the boilerplate, then remove the temp clone:

```bash
git clone --depth 1 https://github.com/jkrumm/vibe-stack /tmp/vibe-stack-src
mkdir -p ~/vibe-apps
cp -R /tmp/vibe-stack-src/boilerplate ~/vibe-apps/<new-app-name>
rm -rf /tmp/vibe-stack-src
cd ~/vibe-apps/<new-app-name>
```

If `~/vibe-apps/<new-app-name>` already exists, stop and ask for a different name — never overwrite
an existing app:

> *"Ein Projekt mit diesem Namen gibt es schon. Wie sollen wir die neue App stattdessen nennen?"*

## Step 2 — Rename the project
Set the project name in **two** files to `<new-app-name>`:

- `package.json` → the `"name"` field (default is `"vibe-stack-app"`).
- `wrangler.jsonc` → the top-level `"name"` field (default is `"vibe-stack-app"`).

Leave `database_name` / `bucket_name` for Step 4 — you create those next. Use Edit, e.g.:

```jsonc
// wrangler.jsonc
"name": "<new-app-name>",
```
```json
// package.json
"name": "<new-app-name>",
```

## Step 3 — Install dependencies
```bash
npm install
```

Tell the owner:

> *"Ich habe dir aus der getesteten Vorlage ein neues, eigenständiges Projekt gebaut und alle
> Bausteine installiert."*

## Step 4 — Connect Cloudflare (its OWN database + storage)

This new app needs its **own** Cloudflare resources. Do not reuse the first app's database or bucket.

**4a — Make sure you're logged in.** A previous app may already be logged in; check first:

```bash
npx wrangler whoami
```

If it shows an account, continue. If it reports you're not logged in, run the interactive login
(opens the owner's browser — only they can approve it):

```bash
npx wrangler login
```

> *"Es öffnet sich dein Browser. Melde dich bei Cloudflare an und klicke auf 'Allow' — danach komme
> ich automatisch weiter."*

**4b — Create this app's database (D1):**

```bash
npx wrangler d1 create <new-app-name>-db
```

Copy the `database_id` it prints into `wrangler.jsonc` under `d1_databases` (replace
`REPLACE_WITH_YOUR_DATABASE_ID`), and set `database_name` to `<new-app-name>-db`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "<new-app-name>-db",
    "database_id": "<the id wrangler just printed>",
    "migrations_dir": "migrations"
  }
]
```

**4c — Create this app's file storage (R2).** Set `bucket_name` to `<new-app-name>-files` in
`wrangler.jsonc`, then create the bucket. If R2 was already verified for the first app, this just
works — no payment step. If this is somehow the first time R2 is used on the account, warn first, in
German:

> *"Für den Datei-Speicher verlangt Cloudflare einmalig eine Zahlungsmethode zur Bestätigung deines
> Kontos — das ist eine Verifizierung, keine Rechnung. Wir bleiben im kostenlosen Bereich. Wenn du
> das jetzt nicht machen willst, kann deine App auch erstmal ohne Foto-Upload starten."*

```jsonc
"r2_buckets": [
  { "binding": "BUCKET", "bucket_name": "<new-app-name>-files" }
]
```
```bash
npx wrangler r2 bucket create <new-app-name>-files
```

If the owner skips uploads for now, comment out the `r2_buckets` block in `wrangler.jsonc` and the
upload/photo routes in `src/worker/api.ts`, and tell them you can switch it on later.

**4d — Set up the local database tables and types:**

```bash
npx wrangler d1 migrations apply <new-app-name>-db --local
npx wrangler types
```

(The *live* database tables get created on first deploy — `npm run deploy` applies pending
migrations to the live database automatically before publishing.)

**4e — Create this app's token store (KV)** — the login provider needs it, and the Worker won't
start without it:

```bash
npx wrangler kv namespace create OAUTH_KV
```

Copy the printed `id` into `wrangler.jsonc` under `kv_namespaces` → the `OAUTH_KV` binding (replace
`REPLACE_WITH_YOUR_KV_ID`).

**4f — Create this app's own access key** (`OWNER_SECRET`) — separate from the first app's:

```bash
KEY=$(openssl rand -hex 32)
echo "$KEY" | npx wrangler secret put OWNER_SECRET
security add-generic-password -U -s "<new-app-name>-owner-secret" -a "<new-app-name>" -w "$KEY"
echo "Dein Zugangsschlüssel für die neue App: $KEY"
```

Tell the owner this is the **new app's own** key (each app has its own). The `vibe-connector` skill
encapsulates 4e + 4f if you'd rather run it as one step.

## Step 5 — Deploy for the first time
```bash
npm run deploy
```

`deploy` first checks everything (format, types, build, tests), so a broken app can't go live, then
publishes. When it succeeds, Wrangler prints a public URL
(`https://<new-app-name>.<subdomain>.workers.dev`). The app opens with a login screen — the owner
enters the **new app's access key** (4f). Confirm it actually loads (open it via the chrome-devtools
MCP if connected, otherwise ask the owner), then celebrate:

> *"🎉 Deine neue App ist live! Öffne diesen Link auf deinem Handy oder Laptop: <URL> — beim ersten Mal
> gibst du den Zugangsschlüssel der neuen App ein."*

To use the new app from anywhere (phone / Chat), run the **`vibe-connector`** skill for it too — it
registers this app as its own Claude connector and generates its `claude-setup/` bundle.

## Step 6 — Open a NEW chat in the new project
Both apps now exist side by side, each independent. Hand off:

> *"Geschafft — du hast jetzt zwei getrennte Apps. Für die neue App öffne bitte ein **neues Gespräch**
> mit dem Ordner `~/vibe-apps/<new-app-name>` als Arbeitsbereich. So lade ich automatisch das Wissen
> zu genau dieser App. An deiner ersten App ändert sich nichts."*

In the Code tab of the Claude desktop app: open the folder `~/vibe-apps/<new-app-name>` and start a
fresh chat there for building features. Each project remembers its own setup via its `CLAUDE.md`.

## Independence rules (do not break)
- Each app has its **own** `<name>-db` and `<name>-files`. **No shared database, ever.**
- Never paste one app's `database_id` into another app's `wrangler.jsonc`.
- The new app keeps the full boilerplate (one Worker = SPA + REST API + MCP connector + OAuth login,
  D1 + R2). Each app has its **own** `OAUTH_KV` and **own** `OWNER_SECRET` — never share them.
- AUTH: the new app is **single-owner private by its own key** (built in). The hard stop is **other
  people**: if the new app should let *other users sign up with their own accounts* or would hold
  *other people's* personal data, STOP and tell the owner (in German) it needs a real developer and a
  proper auth provider. Per-staff logins → `vibe-access`.
