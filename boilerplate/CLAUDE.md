# This app — guide for Claude

This is a **vibe-stack** app. The owner is **not a programmer** and talks to you in plain German.
You do all the building, testing, and deploying; they describe what they want and look at the result.

## Talking to the owner (always)

- **German only**, plain language, one short message per step. No jargon; if you must use a technical
  word, add a tiny explanation.
- **Translate every error into ONE calm German sentence** (e.g. *"Ich musste kurz etwas anpassen,
  jetzt läuft es weiter."*). Never paste a stack trace, a command, or English error text.
- Say what you'll do → do it → confirm it worked. Don't dump walls of commands or code.
- Reassure: nothing breaks permanently — every change is shown before it happens and can be rolled
  back. Celebrate progress.

## The working loop — do this on EVERY change, never skip

1. Make the change (reach for the matching **skill** — see *Tools* below).
2. **`npm run fix`** — auto-formats and fixes lint (Biome).
3. **`npm run validate`** — the gate: Biome + type-check + build + tests. It **must pass** before you
   tell the owner anything is done.
4. If you added or changed an `/api/...` route, an **MCP tool**, or the data model, **add or extend a
   test** in `test/` so the new behavior is covered (see `test/entries.test.ts` and `test/mcp.test.ts`),
   then re-run step 3.
5. **See it with your own eyes** when the UI changed: if the chrome-devtools MCP is connected (check
   with `/mcp`), run `npm run dev`, open `http://localhost:5173`, take a screenshot to confirm it
   renders (icons, charts, layout) and read the console for errors — then stop the dev server. If the
   MCP isn't available, or anything looks off, **ask the owner to send you a screenshot**.
6. Only after `npm run validate` passes (and ideally you've seen it) tell the owner **"fertig"** — in
   German, one sentence. **Never say it works if `npm run validate` did not pass.**

Do **not** run `npm run deploy` until the owner says *"veröffentliche"* / *"deploy"*. Deploy re-runs
the full gate first, so a broken app can't go live. *"rückgängig"* / *"roll back"* → `wrangler rollback`.

## What this app is

[One sentence — filled in during setup, e.g. *"A meal diary: log meals with an optional photo and a
number (calories), and see them over time."*]

The starter ships a generic **entries** example you adapt to the owner's idea: each entry has a
`title`, an optional number `amount` (the chart plots it), an optional `note`, and an optional photo.

## Architecture (one Cloudflare Worker)

Everything ships from **one Worker** in one deploy: the React screen (static files), a REST API, an
MCP server (so the owner can use the app from Claude on their phone/desktop/web), and an OAuth
provider that ties them together. A new "app" is new pages + data here — never a second deploy.

- `src/worker/index.ts` — the **entry point**: `new OAuthProvider(...)`. Makes the app a Claude
  **connector** — it serves the token/registration/discovery endpoints, gates `/mcp`, sends
  `/authorize` to the consent page, and passes `/api/*` to the REST API.
- `src/worker/data.ts` — the **data layer**: pure functions over D1 + R2 (`listEntries`,
  `createEntry`, `deleteEntry`, …). The single source of behavior.
- `src/worker/api.ts` — the **REST API** (Hono, base path `/api`). Each route documents itself
  (OpenAPI at `/api/openapi.json`, docs at `/api/docs`) and calls a `data.ts` function. Bearer-gated
  by `OWNER_SECRET`; the discovery/docs/photo routes are public.
- `src/worker/mcp.ts` — the **MCP server**: one tool per data op, reusing the same Zod schemas and the
  same `data.ts` functions. Served at `/mcp` for Claude connectors.
- `src/worker/authorize.ts` — the **OAuth consent page** (German); checks the owner's access key.
- `src/client/` — the **screen** (React 19 + Mantine v9). `main.tsx` mounts providers + the login
  gate; `App.tsx` is the layout; `features/entries/` is the example page, form, and chart.
- `src/shared/schema.ts` — Zod schemas + types shared by the client, the REST API, and the MCP tools.
- `migrations/` — database schema as numbered SQL files. `test/` — tests (real Cloudflare runtime).
- `wrangler.jsonc` — bindings (`DB`, `BUCKET`, `OAUTH_KV`) + the `OWNER_SECRET` secret, routing, app
  name. `package.json` — the commands.

`assets.run_worker_first` lists the paths that run the Worker (`/api/*`, `/mcp`, and the OAuth
endpoints); everything else is served as static files. So the screen, the API, and the connector all
live at one URL — no CORS, no second deploy, and the SPA needs no server-side fallback route.

## Hard rules (never break — these apply to NEW code you write too)

- **Database changes = a NEW numbered migration** in `migrations/` (`0002_*.sql`, …). Never edit an
  applied migration or the database by hand. Run `npm run db:apply:local` after adding one;
  `npm run deploy` applies pending migrations to the live database.
- **Files/photos go to R2, not D1.** Store only the R2 key (like `photo_key`) in the database; stream
  files back through an `/api/photo/...`-style route. Delete the object when its row is deleted. Photos
  stay website/REST-only — **never an MCP tool** (binaries don't belong in tool calls).
- **Validate input in the Worker with Zod** (see `newEntrySchema`) and use parameterized queries
  (`.bind(...)`) — never build SQL by string concatenation.
- **Define each data operation once.** Put the logic in a `data.ts` function, then expose it two ways:
  a REST route (wrapped in `describeRoute` so it lands in the OpenAPI spec) and an MCP tool (reusing
  the same Zod schema). Keep **MCP tool descriptions under 500 characters** — consumer Claude drives
  behavior from them. The `add-data` skill does all three for you.
- **Every `/api/...` route AND every MCP tool gets a test.** No untested surface reaches the owner.
- **AUTH is built in — keep it single-owner.** This app belongs to **one owner**: a single access key
  (`OWNER_SECRET`) protects the website, the REST API, and the connector, and the OAuth provider only
  ever authorizes that one owner. The **hard stop** is **other people**: if the app should let *other
  users sign up and log in with their own accounts*, or would hold *other people's* personal data,
  STOP and tell the owner (in German) that this needs a real developer and a proper auth provider. For
  a small team sharing the app with per-person logins, use the `vibe-access` skill (Cloudflare Access).

## Verified tech facts (do not regress — verified 2026-06-02)

- **Biome** is the ONLY formatter/linter (config: `biome.jsonc`). Never add ESLint or Prettier.
  `npm run fix` = format + safe fixes; `npm run validate` runs `biome ci` as the gate.
- **Tests run in the real Cloudflare runtime** via `@cloudflare/vitest-pool-workers` (vitest 4):
  `import { exports } from 'cloudflare:workers'`, then `exports.default.fetch(...)` calls the Worker;
  D1 + R2 are real and local. See `vitest.config.ts` and `test/`. Do **not** use the old
  `defineWorkersConfig` or `SELF`/`env` from `cloudflare:test` — that API is obsolete.
- **One Worker behind an OAuth provider.** `src/worker/index.ts` is `new OAuthProvider(...)` from
  **`@cloudflare/workers-oauth-provider`**. It auto-serves `/token`, `/register` (RFC 7591 dynamic
  client registration — Claude connectors require it) and `/.well-known/oauth-authorization-server`,
  gates `/mcp`, and routes `/authorize` + `/api/*` to our handlers. Needs the **`OAUTH_KV`** namespace
  and the **`OWNER_SECRET`** secret. A valid token = the owner (single-owner, one shared secret).
- **MCP is stateless** via **`@hono/mcp`** (`StreamableHTTPTransport`, `sessionIdGenerator: undefined`,
  `enableJsonResponse`) + **`@modelcontextprotocol/sdk`** — a fresh server per request, **no Durable
  Objects**. Tool inputs are the shared **Zod v4** schemas (the SDK converts v4 natively — no shim).
  The SDK's WebStandard transport runs in workerd with **no `nodejs_compat`**.
- **The REST API documents itself** with **`hono-openapi`** (`describeRoute` + `validator` + `resolver`)
  — spec at `/api/openapi.json`, human docs at `/api/docs`. Do **not** switch to `@hono/zod-openapi`
  (it forces an `OpenAPIHono`/`createRoute` rewrite).
- **Mantine v9** + **`@mantine/charts`** (which wraps Recharts) — never raw `recharts`. Core CSS
  before charts CSS (see `main.tsx`). Theme + the iOS 16px input fix live in `theme.ts`.
- Forms: `@mantine/form`. Data fetching: `@tanstack/react-query`. Icons: `@tabler/icons-react`.

## Tools you have

- **Project skills** (`.claude/skills/`): add a page, add a kind of data (table + API + UI + test),
  add a chart, add a form — plus the official **Mantine v9** skills (forms, combobox, custom
  components). **Global skills** (`~/.claude/skills/`): deploy, manage Cloudflare resources, start a
  new app, `vibe-connector` (connect the app to Claude so the owner can use it from their
  phone/desktop/web — provisions `OAUTH_KV` + `OWNER_SECRET` and registers the connector) — and, for
  apps that run a real business (bookings, staff, stock): `vibe-operate` (read and change the live
  database by talking), `vibe-ops-setup` (set up the domain + rules), `vibe-access` (per-person staff
  logins). Prefer a skill over improvising — they encode the correct, current patterns.
- **More skills on demand** (only when you need deeper reference; **never `-g`** — it has a bug that
  hides the skill): copy an official skill into this project, e.g. for deep Cloudflare/Wrangler work
  `npx skills add cloudflare/skills -a claude-code --skill cloudflare wrangler --copy -y`. Treat these
  as reference only — this project's architecture (single Worker + SPA, `run_worker_first`) always
  wins over a generic skill.
- **Rules** (`.claude/rules/`): conventions that load automatically when you edit the matching files
  (UI, API/data, tests).
- **chrome-devtools MCP** (optional power-up): if connected, use it to see the running app (step 5).

## Commands

- `npm run dev` — local app at `http://localhost:5173` (stop it when done; don't leave it running).
- `npm run fix` — format + lint-fix. `npm run validate` — the full gate (run before saying "fertig").
- `npm run test` — just the tests. `npm run db:apply:local` — apply new migrations locally.
- `npm run deploy` — gate + apply live migrations + publish (only on the owner's request).
- `wrangler rollback` — undo the last deploy.

The connector, the `OAUTH_KV` namespace and the `OWNER_SECRET` secret are set up **once** by the
`vibe-connector` skill — don't hand-roll `wrangler secret put` / `kv namespace create`; run the skill.
