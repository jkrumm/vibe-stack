---
paths:
  - "src/worker/**/*.ts"
  - "src/shared/**/*.ts"
  - "migrations/**/*.sql"
---

# API & data conventions (Hono + D1 + R2 + Zod)

This is the **API / data** layer. Match the existing style in `src/worker/index.ts`.

## Routes (Hono)

- The Worker is one Hono app with `basePath('/api')` and `export default app`. Add routes as
  `app.get('/things', …)` — they answer at `/api/things`.
- Read bindings from `c.env`: the database is `c.env.DB` (`D1Database`), file storage is
  `c.env.BUCKET` (`R2Bucket`). After changing `wrangler.jsonc`, run `npm run cf-typegen`.
- **Every new route needs a test** in `test/` (see `test/entries.test.ts`), then `npm run validate`.

## Input validation (Zod, shared)

- Define request shapes as a Zod schema in `src/shared/schema.ts` (so client and worker agree), and
  `safeParse` the input in the route **before** any SQL. On failure return `400` with a plain-German
  message (like `newEntrySchema`). German validation messages live in the schema.

## Database (D1)

- **Schema changes are always a NEW numbered migration** in `migrations/` (`0002_*.sql`, …). Never
  edit a migration that was already applied, and never change data by hand. After adding one, run
  `npm run db:apply:local`; `npm run deploy` applies pending migrations to the live database.
- Use **parameterized queries** only: `.prepare('… WHERE id = ?').bind(id)`. Never concatenate values
  into SQL.

## Files (R2)

- Store uploads in `c.env.BUCKET` and keep only the **key** (e.g. `photo_key`) in D1. Stream files
  back through an `/api/photo/...`-style route. Delete the R2 object when its row is deleted (see the
  `DELETE` route).
