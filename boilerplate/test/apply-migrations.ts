import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

// Creates the database tables before tests run, using the migrations exposed via vitest.config.ts.
// `applyD1Migrations` only applies migrations that haven't run yet, so it is safe to call here.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
