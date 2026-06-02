---
name: vibe-cloudflare
description: Manage Cloudflare resources for a vibe-stack app via wrangler — create the D1 database, create an R2 storage bucket, add a secret/API key, query D1 from the CLI, and regenerate types after editing wrangler.jsonc. Use when the owner mentions database, storage, bucket, secret, api key, binding, Cloudflare, Datenbank, or Speicher.
---

# Manage Cloudflare resources (vibe-stack)

Use this when the owner needs a Cloudflare resource for their app: a **database** (D1), **file
storage** (R2), a **secret / API key**, a CLI **database query**, or regenerated **types** after
editing `wrangler.jsonc`.

Everything runs through `npx wrangler` (the owner has no global install). All bindings live in
`wrangler.jsonc`; the Worker reads them via `c.env.<BINDING>`.

> **This handles the app's own data resources.** Every app already has its login/connector bindings —
> the `OAUTH_KV` namespace + the `OWNER_SECRET` secret — provisioned **once** by the **`vibe-connector`**
> skill. Here you add the app's *data*: D1, R2, and any extra secrets it needs.
>
> **`wrangler login` covers all of it** (database, storage, secrets, deploy, live SQL) — no API token
> needed. The **only** thing that needs a separate Cloudflare API token is per-staff website logins
> (Cloudflare Access) — that lives in the **`vibe-access`** skill.

**Always speak German to the owner**, one calm sentence per step. Translate any error into one
plain German sentence — never paste a raw trace. KISS: add only the resource they actually need.

## Before anything: are they logged in?

Cloudflare commands need a login (interactive browser approval — only the owner can do it). If a
command fails with an auth error, say:

> *"Ich öffne kurz deinen Browser, damit du dich bei Cloudflare anmeldest und auf 'Allow' klickst —
> danach mache ich automatisch weiter."*

```bash
npx wrangler login
```

---

## 1. Create the database (D1)

Use the app name from `wrangler.jsonc` (`<app-name>`). The convention is `<app-name>-db`.

Say: *"Ich lege jetzt deine Datenbank an — dort werden die Einträge deiner App gespeichert."*

```bash
npx wrangler d1 create <app-name>-db
```

Wrangler prints a `database_id`. Paste it into `wrangler.jsonc` under `d1_databases`, replacing the
placeholder:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "<app-name>-db",
    "database_id": "PASTE_THE_PRINTED_ID_HERE",
    "migrations_dir": "migrations"
  }
]
```

Then create the tables locally and regenerate types:

```bash
npx wrangler d1 migrations apply <app-name>-db --local
npx wrangler types
```

The Worker reads it via `c.env.DB` (already typed as `D1Database`). The **live** database tables are
created automatically by `npm run deploy` (it applies pending migrations before publishing).

Say: *"✅ Deine Datenbank steht."*

---

## 2. Create file storage (R2)

Only needed if the app stores photos/files. The convention is `<app-name>-files`.

⚠️ **Warn the owner first**, in German:

> *"Für den Datei-Speicher verlangt Cloudflare einmalig eine Zahlungsmethode zur Bestätigung deines
> Kontos — das ist eine Verifizierung, keine Rechnung. Wir bleiben im kostenlosen Bereich. Wenn du
> das jetzt nicht machen willst, kann deine App auch erstmal ohne Foto-Upload starten — sag mir
> einfach Bescheid."*

If they proceed:

```bash
npx wrangler r2 bucket create <app-name>-files
```

If the account isn't verified yet, Cloudflare blocks this with an *"add R2 subscription / payment
method"* step in the dashboard. **Only the checkout/payment is the owner's job** — the moment they've
done it, **you** re-run `npx wrangler r2 bucket create` yourself. Say:

> *"Cloudflare möchte dein Konto einmal bestätigen. Folge bitte dem 'R2 hinzufügen'-Schritt im
> Browser — sag mir Bescheid, sobald das erledigt ist, dann lege ich den Speicher automatisch an."*

The bucket binding is already in `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  { "binding": "BUCKET", "bucket_name": "<app-name>-files" }
]
```

The Worker reads it via `c.env.BUCKET` (typed `R2Bucket`). Store only the R2 **key** in D1
(`photo_key`); stream files back through `/api/photo/:key` — exactly like the entries example.

**If they skip uploads for now:** comment out the `r2_buckets` block in `wrangler.jsonc` and the
upload/photo routes in `src/worker/api.ts`. Tell them you can switch it on later.

Say: *"✅ Dein Datei-Speicher steht."*

---

## 3. Add a secret / API key

Use a secret for any private value the Worker needs (e.g. a third-party API key) — **never** write
it into a file or `wrangler.jsonc`. Pick an UPPERCASE name like `OPENAI_API_KEY`.

Say: *"Ich speichere deinen Schlüssel sicher bei Cloudflare — er landet nie im Code und ist für
niemanden sichtbar."*

Tell the owner first, so the hidden prompt doesn't scare them:

> *"Gleich erscheint eine Eingabe, in der nichts angezeigt wird — das ist Absicht. Füge deinen
> Schlüssel ein und drücke Enter."*

```bash
npx wrangler secret put OPENAI_API_KEY
```

Wrangler prompts for the value (the owner pastes it; it stays hidden). Then add it to the `Bindings`
type in `src/worker/api.ts` (and to `Env` in `src/worker/index.ts` if the Worker entry reads it) and
read it via `c.env`:

```ts
type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  OPENAI_API_KEY: string // added secret
}

// inside a route:
const key = c.env.OPENAI_API_KEY
```

For **local** development, put the same value in a `.dev.vars` file at the project root (it's
git-ignored — never commit it):

```
OPENAI_API_KEY=sk-...
```

Other secret commands when useful: `npx wrangler secret list`, `npx wrangler secret delete <KEY>`.

Say: *"✅ Dein Schlüssel ist sicher hinterlegt."*

---

## 4. Query the database from the CLI

For a quick look at what's in the database (debugging, counts, spot-checks). `--local` reads the
local copy; `--remote` reads the live one. **Reads are safe; be careful with writes.**

```bash
# local
npx wrangler d1 execute <app-name>-db --local --command "SELECT * FROM entries ORDER BY created_at DESC LIMIT 10"

# live
npx wrangler d1 execute <app-name>-db --remote --command "SELECT COUNT(*) FROM entries"
```

This is for *inspecting*. Schema changes are **always** a new numbered migration in `migrations/`
(e.g. `0002_*.sql`) applied with `npm run db:apply:local` then `npm run deploy` — never hand-edit the
database or an applied migration.

If the owner asks what's stored, summarize the result in one plain German sentence; don't show them
the raw SQL output.

---

## 5. Regenerate types after editing wrangler.jsonc

**Any time** you change `wrangler.jsonc` (new binding, renamed database, new variable), regenerate
the generated types so `c.env.<BINDING>` stays correctly typed:

```bash
npx wrangler types
```

(`npm run build` and `npm run deploy` run this for you, but run it directly after editing bindings so
the editor and type-check pick up the change immediately.)

---

## Free-tier limits (reassure the owner — these are generous)

These cover a personal app comfortably. Mention them only if the owner worries about cost.

- **D1 (database):** 5 million row reads/day, 100,000 row writes/day, 5 GB total storage.
- **R2 (file storage):** 10 GB stored, and **egress is free** (no charge for serving files).
- **Workers:** 100,000 requests/day on the free plan.

Say, if asked: *"Das bleibt locker im kostenlosen Bereich — für eine persönliche App reicht das
bei Weitem."*

---

## If something breaks

- **Auth error** → run `npx wrangler login` (owner approves in the browser).
- **R2 blocked / "add R2 subscription"** → account needs the one-time payment-method verification;
  guide them through it, then re-run.
- **`c.env.<BINDING>` is `undefined` / type error** → the binding is missing or misnamed in
  `wrangler.jsonc`; fix it and run `npx wrangler types`.
- **Wrong `database_id`** → re-check the value pasted into `wrangler.jsonc` against
  `npx wrangler d1 list`.

Translate the cause into one calm German sentence and propose the next single step.
