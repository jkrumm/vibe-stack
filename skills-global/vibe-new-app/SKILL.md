---
name: vibe-new-app
description: Scaffold a second (or third) independent vibe-stack app — clone the kit, copy the boilerplate to ~/vibe-apps/<name>, rename it, npm install, connect Cloudflare (own DB + R2), and deploy. Use when the owner wants a new app, another app, a second app, to start fresh, or says "neue App" / "weitere App".
---

# vibe-new-app

Scaffold a **brand-new, independent** vibe-stack app for an owner who already has at least one.
Each app is fully separate: its **own** Cloudflare Worker, its **own** D1 database, its **own** R2
bucket. **There is NO shared database** — never point a new app at an existing app's `database_id`.

The owner is non-technical and German-speaking. Speak to them only in **plain German**, one short
message per step. Translate any error into a single calm German sentence — never show a raw trace.

## When to use this
The owner is in any chat and says they want to build *another* app, e.g. *"Ich will noch eine App
bauen"*, *"eine zweite App"*, *"weitere App"*, *"neu anfangen"*, *"new app"*, *"start fresh"*.
(The first-ever setup is the 7-phase ONBOARDING, not this skill. This skill assumes Node, git, and
a Cloudflare login already exist from the first app — but it re-checks and re-runs login if needed.)

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
upload/photo routes in `src/worker/index.ts`, and tell them you can switch it on later.

**4d — Set up the local database tables and types:**

```bash
npx wrangler d1 migrations apply <new-app-name>-db --local
npx wrangler types
```

(The *live* database tables get created on first deploy — `npm run deploy` applies pending
migrations to the live database automatically before publishing.)

## Step 5 — Deploy for the first time
```bash
npm run deploy
```

`deploy` first checks everything (format, types, build, tests), so a broken app can't go live, then
publishes. When it succeeds, Wrangler prints a public URL
(`https://<new-app-name>.<subdomain>.workers.dev`). Confirm it actually loads (open it via the
chrome-devtools MCP if connected, otherwise ask the owner), then celebrate:

> *"🎉 Deine neue App ist live! Öffne diesen Link auf deinem Handy oder Laptop: <URL>."*

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
- The new app keeps the full boilerplate (Worker + React/Mantine + D1 + R2). Adapt the entries
  example to the new idea later, in the new app's own chat.
- AUTH hard stop still applies: this kit is for **personal, single-owner** apps with **no auth**. If
  the new app would hold *other people's* personal data, STOP and tell the owner (in German) that it
  needs a real developer and a proper auth provider.
