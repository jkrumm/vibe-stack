---
description: Connect this app to your Cloudflare account
---

# /setup — connect this app to Cloudflare

You are setting up a **vibe-stack** app for a **non-technical, German-speaking owner**. This command
mirrors **Phase 5 of `ONBOARDING.md`**: it connects the project to the owner's Cloudflare account
(database + file storage) so the app can later go live.

Follow the steps **in order**, one at a time. Before each step say what you're about to do in **one
plain-German sentence**, run it, confirm it worked, then move on. Never dump a wall of commands.
Translate any error into **one calm German sentence** — never paste a raw trace. All commands run
from the project root.

## Golden rules (do not violate)

- **Speak German to the owner.** Every message you show them is plain German. The quoted German
  sentences below are the exact words to say — use them.
- **One small action at a time.** Announce → run → confirm → next.
- **Be honest about the human-only steps.** Two things only the owner can do, on their own machine
  and account: the **browser login** (they click "Allow") and, for file storage, the **one-time
  payment-method verification**. Name them plainly when you reach them — never imply zero human steps.
- **KISS.** Do exactly these steps. Don't add auth, extra services, or a second deploy target.

## Before you start — find the app name

The app name is the `name` field in `package.json` and `wrangler.jsonc` (set during onboarding, e.g.
`meal-diary`). Read it from `package.json` and use it for `<app-name>` below. If it's still the
default `vibe-stack-app`, ask the owner in German what their app should be called and set `name` in
both files first.

Say: *"Ich verbinde deine App jetzt mit Cloudflare — das ist der Dienst, der deine App ins Internet
bringt, samt Datenbank und Datei-Speicher. Das sind ein paar kleine Schritte, ich führe dich durch."*

## Step 1 — Log in to Cloudflare (browser, owner only)

Say: *"Es öffnet sich gleich dein Browser. Melde dich bei Cloudflare an oder lege kostenlos ein Konto
an, und klicke dann auf 'Allow'. Danach mache ich automatisch weiter."*

```bash
npx wrangler login
```

This is a **human-only step**: the browser approval can only be done by the owner. Wait until it
reports success before continuing. If it doesn't finish, say: *"Die Anmeldung im Browser ist noch
nicht abgeschlossen — klicke bitte auf 'Allow', dann probiere ich es erneut."*

## Step 2 — Create the database (D1)

Say: *"Jetzt lege ich deine Datenbank an — dort werden die Einträge deiner App gespeichert."*

```bash
npx wrangler d1 create <app-name>-db
```

The command prints a `database_id` (a long string). **Copy it into `wrangler.jsonc`**: replace
`REPLACE_WITH_YOUR_DATABASE_ID` in the `d1_databases` block with the real value. Also make sure
`database_name` reads `<app-name>-db`. Then say: *"Deine Datenbank ist angelegt und mit der App
verknüpft."*

## Step 3 — Create file storage (R2) — WARN about the one-time payment-method check first

File storage (R2) lets the app store photos and uploads. **Before doing anything, warn the owner**
and let them choose. Say:

*"Für den Datei-Speicher (für Fotos und Uploads) verlangt Cloudflare einmalig eine Zahlungsmethode,
um dein Konto zu bestätigen — das ist nur eine Verifizierung, keine Rechnung, und wir bleiben im
kostenlosen Bereich. Wenn du das jetzt nicht machen möchtest, kann deine App auch erstmal ohne
Foto-Upload starten, und wir schalten den Speicher später ein. Möchtest du den Datei-Speicher jetzt
einrichten?"*

**If they say yes:**

```bash
npx wrangler r2 bucket create <app-name>-files
```

Confirm `bucket_name` in the `r2_buckets` block of `wrangler.jsonc` reads `<app-name>-files`, then
say: *"Dein Datei-Speicher steht."*

If Cloudflare blocks this because the account isn't verified yet (it asks to "add R2 subscription /
add a payment method" in the dashboard), explain plainly: *"Cloudflare möchte zuerst dein Konto
bestätigen — bitte hinterlege im geöffneten Dashboard einmalig eine Zahlungsmethode (es entsteht
keine Rechnung), dann lege ich den Speicher erneut an."* Wait, then re-run the command.

**If they say no (skip file storage for now):** remove the `r2_buckets` block from `wrangler.jsonc`
so the app builds without it, and say: *"Alles klar — deine App startet erstmal ohne Foto-Upload. Wir
können den Speicher jederzeit später nachrüsten."* (Keep this reversible — only the binding is
removed; nothing else changes.)

## Step 4 — Set up the local database tables

Say: *"Ich richte die Tabellen in deiner lokalen Datenbank ein, damit alles bereit ist."*

```bash
npx wrangler d1 migrations apply <app-name>-db --local
```

This applies the migration files in `migrations/`. The **live** database tables are created later
automatically: `npm run deploy` applies any pending migrations to the live database before
publishing.

## Step 5 — Generate the type definitions

Say: *"Zum Schluss bringe ich die internen Typ-Informationen auf den neuesten Stand — damit erkenne
ich beim Bauen früh, wenn etwas nicht zusammenpasst."*

```bash
npx wrangler types
```

## Done — how to go live

End with: *"✅ Geschafft — deine App ist mit Cloudflare verbunden: Datenbank und Speicher stehen.
Wenn du bereit bist, sag einfach **'veröffentliche die App'**, dann bringe ich sie live ins Internet."*

When the owner says *"veröffentliche die App"* (or *"deploy"*), run `npm run deploy` — that builds
the app, applies pending migrations to the live database, and publishes. Wrangler then prints the
public URL (`https://<app-name>.<subdomain>.workers.dev`); give it to the owner with a short
celebration in German.

## If something breaks

Stay calm and concrete: read the actual error, translate the **cause** into one German sentence, and
propose the next single step. Common ones: `wrangler login` not finished in the browser; R2 blocked
pending account verification; a typo in the `database_id` pasted into `wrangler.jsonc`. Never show the
owner a raw trace.
