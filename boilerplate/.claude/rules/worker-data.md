---
paths:
  - "src/worker/**/*.ts"
  - "src/shared/**/*.ts"
  - "migrations/**/*.sql"
---

# API & data conventions (Hono + D1 + R2 + Zod)

This is the **API / data** layer. Match the existing style in `src/worker/data.ts` and `api.ts`.

## Define a resource once → REST + OpenAPI + MCP tool

Behavior lives in **one** place; the REST API and the MCP server are thin adapters over it.

- Put the actual logic in a **pure function in `src/worker/data.ts`** (takes `D1Database` / `R2Bucket`,
  returns plain data — no Hono, no HTTP). This is the single source of behavior.
- Expose it as a **REST route** in `api.ts`, wrapped in `describeRoute({...})` so it lands in the
  OpenAPI spec at `/api/openapi.json`. The route just parses input and calls the `data.ts` function.
- Expose it as an **MCP tool** in `mcp.ts`, reusing the **same Zod schema** for the tool input and
  calling the **same `data.ts` function**. Keep each tool **`description` under 500 characters** —
  consumer Claude drives behavior from the description, not from server instructions.
- **Photos / binaries are REST + website only — never an MCP tool** (tool calls are JSON).
- The **`add-data` skill does all of this for you** (table + data fn + REST route + MCP tool + UI +
  test). Reach for it instead of wiring a new entity by hand.

## Routes (Hono)

- The REST API is one Hono app (`api.ts`) with `basePath('/api')`. Add routes as `api.get('/things', …)`
  — they answer at `/api/things`. The Worker entry (`index.ts`) wraps this app in the OAuth provider;
  don't change `index.ts` to add a route, add it to `api.ts`.
- Read bindings from `c.env`: the database is `c.env.DB` (`D1Database`), file storage is
  `c.env.BUCKET` (`R2Bucket`). After changing `wrangler.jsonc`, run `npm run cf-typegen`.
- Data routes are **Bearer-gated by default** (the guard in `api.ts` checks `OWNER_SECRET`). New routes
  are automatically protected; only add a path to the `isPublic` allowlist if it must be public.
- **Every new route AND every new MCP tool needs a test** in `test/` (see `test/entries.test.ts` and
  `test/mcp.test.ts`), then `npm run validate`.

## Input validation (Zod, shared)

- Define request shapes as a Zod schema in `src/shared/schema.ts` (so client, worker, and MCP tools all
  agree). In a route either use the `validator(...)` middleware or `safeParse` the input **before** any
  SQL. On failure return `400` with a plain-German message (like `newEntrySchema`). German validation
  messages live in the schema. Multipart bodies with a file (photos) are parsed by hand with
  `c.req.parseBody()` + `safeParse` (the validator middleware is for JSON/query/param inputs).

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

## AI-backed tasks (optional — only after the `vibe-ai` skill is on)

If the app uses AI (a route that summarises / translates / parses free text), it runs on **Cloudflare
Workers AI** via the shipped helper `src/worker/ai.ts` — turned on by the **`vibe-ai`** skill (which
adds the `{ "ai": { "binding": "AI" } }` binding and `AI: Ai` to `Bindings`). Conventions:

- **Never call `c.env.AI.run(...)` directly in a route.** Use `parseToSchema(c.env.AI, { text, schema,
  instruction })` or `translate(c.env.AI, { text, target })` from `ai.ts`. They run JSON Mode and
  **re-validate** the model's output, so the route stays thin.
- **Reuse a Zod schema as the parse target** (define it once in `src/shared/schema.ts`, like
  `newEntrySchema`). The model's answer is validated against it — a wrong answer becomes a clean
  `unparseable`, never bad data. Never write an AI result to D1 without that validation.
- **Always handle `{ ok: false }`** — map `'unavailable'` (free daily limit / model down) and
  `'unparseable'` to a plain-German message (503 and 422). An AI failure must never block the owner;
  leave the manual path working.
- **Keep the model id in `ai.ts`** (one place). It's on the JSON-Mode list
  (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`); `/research` Workers AI before swapping it.
- **The route still needs tests** — assert the auth gate (401) and input validation (400), the paths
  that return **before** the model call (the live call only works on a real deploy). The `ai.ts` logic
  is covered offline by `test/ai.test.ts` with a stubbed binding.
