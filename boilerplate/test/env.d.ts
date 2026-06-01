// Types for the test-only binding defined in vitest.config.ts (miniflare.bindings.TEST_MIGRATIONS).
// DB and BUCKET are typed by worker-configuration.d.ts, which `wrangler types` generates.
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
