---
paths:
  - "test/**/*.ts"
---

# Test conventions (Vitest in the real Cloudflare runtime)

Tests run **inside** the Cloudflare Workers runtime with a local D1 database and R2 bucket, via
`@cloudflare/vitest-pool-workers` — so they exercise the actual API end-to-end, not a mock.

- Call the Worker with **`exports.default.fetch(url, init)`** after
  `import { exports } from 'cloudflare:workers'`. Read bindings (e.g. `env.DB`) from
  `import { env } from 'cloudflare:workers'`. See `test/entries.test.ts`.
- Tables are created by `test/apply-migrations.ts` (it applies everything in `migrations/`). A new
  migration is picked up automatically.
- **Keep each test self-contained**: create the data it needs inside the same test, and assert on
  presence (`entries.some((e) => e.title === …)`) rather than exact row counts, so tests never depend
  on each other or on order.
- Do **not** use the old `defineWorkersConfig`, or `SELF` / `env` from `cloudflare:test` — that API is
  obsolete. `applyD1Migrations` is the one thing still imported from `cloudflare:test`.
- Run with `npm run test`, or the full gate `npm run validate`.
