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
4. If you added or changed an `/api/...` route or the data model, **add or extend a test** in `test/`
   so the new behavior is covered (copy the pattern in `test/entries.test.ts`), then re-run step 3.
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

- `src/worker/index.ts` — the **API** (Hono, `export default app`, base path `/api`). Reads the
  database via `c.env.DB` and file storage via `c.env.BUCKET`. Runs only for `/api/*`.
- `src/client/` — the **screen** (React 19 + Mantine v9). `main.tsx` mounts providers; `App.tsx` is
  the layout; `features/entries/` is the example page, form, and chart.
- `src/shared/schema.ts` — Zod schema + types shared by client and worker.
- `migrations/` — database schema as numbered SQL files. `test/` — tests (real Cloudflare runtime).
- `wrangler.jsonc` — bindings (`DB`, `BUCKET`), routing, app name. `package.json` — the commands.

The React app and the API ship from one Worker. `assets.run_worker_first: ["/api/*"]` makes Cloudflare
serve the screen as static files and only run the Worker for the API — so no CORS, no second URL, and
the SPA needs no server-side fallback route.

## Hard rules (never break — these apply to NEW code you write too)

- **Database changes = a NEW numbered migration** in `migrations/` (`0002_*.sql`, …). Never edit an
  applied migration or the database by hand. Run `npm run db:apply:local` after adding one;
  `npm run deploy` applies pending migrations to the live database.
- **Files/photos go to R2, not D1.** Store only the R2 key (like `photo_key`) in the database; stream
  files back through an `/api/photo/...`-style route. Delete the object when its row is deleted.
- **Validate input in the Worker with Zod** (see `newEntrySchema`) and use parameterized queries
  (`.bind(...)`) — never build SQL by string concatenation.
- **Every `/api/...` route gets a test.** No untested route reaches the owner.
- **AUTH is a hard stop.** This kit is for **personal, single-owner** apps with **no auth**. If the
  app would hold *other people's* personal data, STOP and tell the owner (in German) that this needs a
  real developer and a proper auth provider. If it must be private, suggest Cloudflare Access.

## Verified tech facts (do not regress — verified 2026-06-01)

- **Biome** is the ONLY formatter/linter (config: `biome.jsonc`). Never add ESLint or Prettier.
  `npm run fix` = format + safe fixes; `npm run validate` runs `biome ci` as the gate.
- **Tests run in the real Cloudflare runtime** via `@cloudflare/vitest-pool-workers` (vitest 4):
  `import { exports } from 'cloudflare:workers'`, then `exports.default.fetch(...)` calls the Worker;
  D1 + R2 are real and local. See `vitest.config.ts` and `test/`. Do **not** use the old
  `defineWorkersConfig` or `SELF`/`env` from `cloudflare:test` — that API is obsolete.
- **Mantine v9** + **`@mantine/charts`** (which wraps Recharts) — never raw `recharts`. Core CSS
  before charts CSS (see `main.tsx`). Theme + the iOS 16px input fix live in `theme.ts`.
- Forms: `@mantine/form`. Data fetching: `@tanstack/react-query`. Icons: `@tabler/icons-react`.

## Tools you have

- **Project skills** (`.claude/skills/`): add a page, add a kind of data (table + API + UI + test),
  add a chart, add a form — plus the official **Mantine v9** skills (forms, combobox, custom
  components). **Global skills** (`~/.claude/skills/`): deploy, manage Cloudflare resources, start a
  new app. Prefer a skill over improvising — they encode the correct, current patterns.
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
