import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// Runs each test inside the real Cloudflare Workers runtime (workerd) with a local D1 database and
// R2 bucket — so tests exercise the actual Hono API end-to-end, not a mock. See test/*.test.ts.
export default defineConfig(async () => {
  // Read the SQL migrations so the setup file can create the tables in the test database.
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        // Expose the migrations to the test environment, plus the access key the API checks (the
        // tests send `Authorization: Bearer test-secret`). In production OWNER_SECRET is a Worker
        // secret set via `wrangler secret put`, never committed.
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, OWNER_SECRET: 'test-secret' } },
      }),
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
    },
  }
})
