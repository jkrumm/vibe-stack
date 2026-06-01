# This app — guide for Claude

This is a **vibe-stack** app. The owner is **not a programmer**. You do the building; they describe
what they want.

## How to work with the owner

- **Always talk to the owner in German**, in plain language. One short message per step.
- **Translate every error into one calm German sentence.** Never show a raw stack trace.
- **KISS.** Add the fewest moving parts that solve the request. No auth, no new services, no second
  deploy target unless the owner explicitly needs it and you've explained the trade-off.
- Show what you'll change, do it, confirm it worked. When the owner says *"veröffentliche"* /
  *"deploy"*, run `npm run deploy`. When they say *"rückgängig"* / *"roll back"*, run
  `wrangler rollback`.

## What this app is

[One sentence — filled in during setup, e.g. "A meal diary: log meals with an optional photo and a
number (calories), and see them over time."]

The starter ships a generic **entries** example you adapt to the owner's idea: each entry has a
`title`, an optional number `amount` (the chart plots it), an optional `note`, and an optional photo.

## Architecture (one Cloudflare Worker)

- `src/worker/index.ts` — the **API** (Hono). Runs only for `/api/*`. Reads the database via
  `c.env.DB` and file storage via `c.env.BUCKET`.
- `src/client/` — the **screen** (React + Mantine). `main.tsx` mounts providers; `App.tsx` is the
  layout; `features/entries/` is the example page, form, and chart.
- `src/shared/schema.ts` — types/validation shared by both sides.
- `migrations/` — database schema, as numbered SQL files.
- `wrangler.jsonc` — bindings (`DB`, `BUCKET`), routing, app name. `package.json` — the commands.

The React app and the API ship together from one Worker. With `assets.run_worker_first: ["/api/*"]`,
Cloudflare serves the screen as static files and only runs the Worker for the API — so there is no
CORS, no second URL, and the SPA needs no server-side fallback route.

## Hard rules (do not break)

- **Database changes are always a NEW numbered migration** in `migrations/` (e.g. `0002_*.sql`).
  Never edit a migration that was already applied; never edit the database by hand. After adding a
  migration, run `npm run db:apply:local` to update the local database. `npm run deploy` applies
  pending migrations to the live database before deploying.
- **Photos and files go to R2, not the database.** Store only the R2 key (`photo_key`) in D1, like
  the entries example does. Stream files back through `/api/photo/:key`.
- **Validate input in the Worker** before it touches SQL (see `newEntrySchema`). Use parameterized
  queries (`.bind(...)`), never string-concatenate SQL.
- **AUTH is a hard stop.** This kit is for **personal, single-owner** apps with **no auth**. If the
  app would hold *other people's* personal data, STOP and tell the owner (in German) that this needs
  a real developer and a proper auth provider. If it must be private, suggest Cloudflare Access.

## Verified tech facts (do not regress)

- Mantine is **v9** + **`@mantine/charts`** (which wraps Recharts) — never raw `recharts` alone.
  Import `@mantine/charts/styles.css` *after* `@mantine/core/styles.css` (see `main.tsx`).
- Charts come from `@mantine/charts` (`LineChart`, `BarChart`, `AreaChart`, `DonutChart`, …).
- Forms use `@mantine/form`; data fetching uses `@tanstack/react-query`.
- The Worker entry is `export default app` (a Hono app). Add routes under `/api/...`.

## Useful skills

When the owner asks for something, reach for the matching skill (they ship with this project and
globally): adding a page/section, adding a new kind of data (table + API + UI), adding a chart,
adding a form, deploying, and adding a Cloudflare binding. Prefer them over improvising — they
encode the correct, current patterns for this stack.

## Commands

- `npm run dev` — run the app locally (don't leave it running for the owner; the live URL is the
  real thing).
- `npm run deploy` — build, apply database migrations to the live database, and publish.
- `npm run db:apply:local` — apply new migrations to the local database.
- `wrangler rollback` — undo the last deploy.
