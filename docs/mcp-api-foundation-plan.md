# Plan: documented MCP + API + OAuth as the vibe-stack foundation

> Status: IMPLEMENTED (2026-06-02). All seven sequencing steps landed as separate commits; the
> boilerplate passes `npm run validate` (Biome + tsc + build + workerd tests, incl. the full OAuth
> connector flow). The zod-v4 ↔ MCP-SDK spike passed — no shim needed (SDK 1.29.0 converts v4 natively
> via `zod/v4-mini`). This file is kept as the design record. Author/owner: Johannes.

## Goal

Make a well-documented **MCP server** + **OpenAPI-documented REST API** + **single-owner OAuth** the
*standard* of every vibe-stack app (not an opt-in layer). One Cloudflare Worker keeps serving the React
SPA and the Hono API; we add an MCP endpoint and an OAuth provider so the owner can operate their app
from **phone / desktop / web Chat, Projects, and routines** — not just the Code tab. "Heavily opt in
from all angles": base boilerplate code + every relevant skill + ONBOARDING + README + rules +
verified-facts.

This reshapes the product identity: from "personal tracker, no auth" to "single-owner app you operate
from everywhere via a documented MCP + API." The owner experience stays one-click ("approve"); the
complexity is ours, paid once.

## Verified build facts (spike, 2026-06-02 — re-confirm latest patch + respect bun cooldown before install)

- `@cloudflare/workers-oauth-provider` **0.7.0** (published 2026-05-21). Becomes the Worker default
  export via `new OAuthProvider({...})`. Auto-serves `/token`, `/register` (**RFC 7591 Dynamic Client
  Registration — required by Claude connectors**), and `/.well-known/oauth-authorization-server`.
  Requires a **KV namespace** binding for token storage.
- `@hono/mcp` **0.3.0** — `StreamableHTTPTransport`, **stateless, no Durable Objects, no migrations**.
  (Chosen over Cloudflare `McpAgent`/DO and over `createMcpHandler` to stay in the Hono family + KISS.)
- `hono-openapi` **1.3.0** (rhinobase) — `describeRoute` + `validator` middleware that **retrofits the
  existing plain Hono routes**. Do NOT use `@hono/zod-openapi` (it forces an `OpenAPIHono`/`createRoute`
  rewrite). Works with Zod v4 via Standard Schema.
- `@cloudflare/vitest-pool-workers` **0.16.11** unchanged — no DO test config needed (because no DO).
- Connector auth reality (do not regress): consumer Claude connectors **require OAuth 2.1 + DCR**.
  No no-auth URLs, no static Bearer/header (those work only in Claude Code's settings.json). Server-level
  MCP `instructions` and `prompts`/`resources` are NOT reliably honored on consumer surfaces
  (anthropics/claude-ai-mcp #93) — so behavior rides **tool descriptions (<500 chars each)** + the
  pasted Project, not the connector's instructions field.
- Consumer config (skills / Projects / global "Anweisungen") has **no programmatic API** — manual UI
  only. `/v1/skills` is API-workspace only, not the consumer account. BUT consumer config is
  **account-level**: one paste on any device applies across web/desktop/phone for that account.

## Target architecture — still one Worker, one deploy

`export default new OAuthProvider({ apiRoute: '/mcp', apiHandler: mcp, defaultHandler: api, authorizeEndpoint: '/authorize', tokenEndpoint: '/token', clientRegistrationEndpoint: '/register', ... })`

Request routing (all inside the one Worker):
- `/mcp` → `apiHandler` = the `@hono/mcp` server. OAuth-token-gated by the provider.
- `/token`, `/register`, `/.well-known/oauth-authorization-server` → auto-served by the provider (DCR + discovery).
- `/authorize` → `defaultHandler`: a consent page that validates `OWNER_SECRET`, then calls
  `env.OAUTH_PROVIDER.parseAuthRequest(...)` + `completeAuthorization({request, userId, metadata, scope, props})`.
- `/api/*` → `defaultHandler`: the existing Hono app, **Bearer-gated** (`OWNER_SECRET`), now also serving
  OpenAPI (`/api/openapi.json`) + a Scalar docs UI (`/api/docs`). Public discovery (`/api`) and photo
  route (`/api/photo/...`) stay public.
- everything else → static SPA assets (`not_found_handling: "single-page-application"`).

`wrangler.jsonc` `run_worker_first` grows to:
`["/api/*", "/mcp", "/authorize", "/token", "/register", "/.well-known/oauth-authorization-server"]`.

**Dual auth, one secret value.** `/mcp` uses OAuth (the only thing Claude accepts). `/api/*` + the
website use Bearer. The consent screen and the Bearer guard validate the **same `OWNER_SECRET`** (Worker
secret + Mac keychain). Single-owner ⇒ a valid token = "the owner"; no per-user prop-threading needed in
MCP tools (prop-threading via `this.ctx.props` is available if we later scope per-user).

## Codeshare — define a resource once → REST + OpenAPI + MCP tool

Deep-module discipline (`code-style.md`): behavior lives once; REST and MCP are thin adapters.

- `src/shared/schema.ts` — Zod schemas (the contract). Already present; extend minimally (update/query).
- `src/worker/data.ts` — pure data functions over D1/R2 (`listEntries`, `createEntry`, `deleteEntry`, …).
  Single source of behavior.
- `src/worker/api.ts` — Hono app: each route = `describeRoute(...)` + `validator(...)` → calls a `data.ts`
  fn. Serves `/api/openapi.json` + `/api/docs`. Bearer guard (promoted from `vibe-api-mode`).
- `src/worker/mcp.ts` — `@hono/mcp` server: one tool per data op, **reusing the same Zod input schemas**,
  calling the same `data.ts` fns. Tool descriptions **< 500 chars**.
- `src/worker/authorize.ts` — the OAuth consent page (validates `OWNER_SECRET`).
- `src/worker/index.ts` — assembles the `OAuthProvider`.

Result: the `add-data` skill adds one entity ⇒ a REST route + OpenAPI entry + an MCP tool, automatically.
**Photos stay REST/website-only** (MCP tools are JSON; binaries don't belong in tool calls).

## Consumer config sync (the irreducible manual part, made painless)

Scope: only **plain Chat + Cowork** need manual config (Code-tab + routines read repo files). The artifact
that matters is **one Project per app**; global instructions stay thin; a consumer skill is optional.

- `claude-setup/` (git-tracked, generated from current project facts — entities, rules, German vocab,
  connector URL):
  - `PROJEKT-ANWEISUNGEN.md` — the Project instructions (the main one; domain rules + connector usage +
    golden loop). German.
  - `ANWEISUNGEN-GLOBAL.md` — thin global custom-instructions text (German + tone). Set once.
  - `skill/` + `skill.zip` — OPTIONAL consumer skill (only if behavior wanted in non-Project chats).
  - `EINFUEGEN.md` — German: what to paste where, and when to redo it.
  - `manifest.json` — per-artifact content hash + version.
- Sync ritual (in `vibe-connector`, or a small `vibe-claude-sync`): regenerate → hash-diff vs manifest →
  if changed, show German "was sich geändert hat" + exact paste text + click-path, one surface at a time →
  record new hash. **Trigger tied to cause**: `add-data` / `vibe-ops-setup` rule/entity changes regenerate
  the bundle and offer the 30-second re-paste then.
- Minimize churn: volatile detail → MCP tool descriptions (deploy = auto-update) + repo files; pasted
  artifacts stay high-level/stable. Business detail scoped to the **Project**, not the global box.
- Residuals (honest): no API to verify the owner pasted (rely on confirmation); new *account* ⇒ redo
  pastes; UI-driven ⇒ re-check click-path during "Keeping current".

## File-by-file change set

Boilerplate code:
1. `package.json` — add `@cloudflare/workers-oauth-provider` 0.7.0, `@hono/mcp` 0.3.0, `hono-openapi`
   1.3.0 (pin exact per dependency-hygiene; respect bun `minimumReleaseAge` cooldown — 0.7.0 is recent).
2. `src/worker/index.ts` — wrap in `OAuthProvider`; move routes into `api.ts`.
3. `src/worker/{data,api,mcp,authorize}.ts` — new modules.
4. `src/shared/schema.ts` — add update/query schemas as needed (minimal).
5. `src/client/lib/api.ts` + `src/client/api-key-gate.tsx` + `src/client/main.tsx` — promote the
   `vibe-api-mode` Bearer helper + key-gate into base.
6. `wrangler.jsonc` — expand `run_worker_first`; add `kv_namespaces: [{binding:"OAUTH_KV", id:"…"}]`;
   document the `OWNER_SECRET` secret (set via `wrangler secret put`).
7. `worker-configuration.d.ts` — regen via `wrangler types`.

Tests (`test/`):
8. `entries.test.ts` — send the Bearer header now; add a 401-without-token case.
9. `mcp.test.ts` — `/mcp` 401 without OAuth token; a tool call works through the provider with one.
10. `openapi.test.ts` — `/api/openapi.json` serves a valid spec listing the routes.

Docs / rules / skills / onboarding (all angles):
11. `boilerplate/CLAUDE.md` — **reframe the AUTH hard-stop**: managed single-owner OAuth is now standard;
    public/multi-user sign-ups remain the hard stop. Add MCP/OpenAPI/OAuth to architecture + verified facts.
12. `boilerplate/.claude/rules/worker-data.md` — document the define-resource discipline (data fn → REST
    describeRoute → MCP tool; tool descriptions <500 chars; photos REST-only).
13. `add-data` / `add-page` skills — register the MCP tool + OpenAPI metadata alongside the route.
14. New global skill `vibe-connector` — one-time activation: provision `OAUTH_KV` + `OWNER_SECRET`,
    deploy, walk the owner (German) through *Settings → Connectors → Add custom connector →
    `https://<app>.workers.dev/mcp` → enter secret → approve*, then generate the `claude-setup/` bundle.
15. Consolidate `vibe-api-mode` — its Bearer guard + key-gate move into base; skill absorbed.
16. `vibe-operate` (Code-tab wrangler) and `vibe-access` (multi-staff per-person logins) stay. `vibe-access`
    is the one piece kept as a *layer*, not base (shared-secret OAuth is single-owner by design).
17. `vibe-ops-setup` — step 5 defaults to connector + Bearer instead of leading with Access.
18. `ONBOARDING.md` — new phase: provision KV + secret, deploy, register connector, hand over
    `claude-setup/`. Update account-boundary notes (KV = new one-time resource like R2).
19. `README.md` — the "use from phone / desktop Chat / routines, plus the website" story.
20. Repo root `CLAUDE.md` verified-facts — re-date 2026-06-02; add the connector/OAuth/consumer facts and
    the three dep versions; note account-level propagation + chat-only scope.

## Open validation points (resolve in-code, do not assume)

1. **zod v4 ↔ `@modelcontextprotocol/sdk`** (under `@hono/mcp`): the MCP SDK historically pinned Zod v3 for
   tool input schemas. Spike this FIRST (throwaway). If mismatched, fix = a tiny zod-v4→JSON-schema shim
   for tool inputs. Gates `mcp.ts`.
2. **`run_worker_first` + OAuthProvider + SPA coexistence** — confirm the SPA still serves while the default
   export is the provider, and that the six worker-first paths are correct.
3. **`@hono/mcp` behind the provider** — confirm a valid OAuth token reaches `/mcp` and tools execute; 401
   without. (Prop-threading optional for single-owner.)
4. **bun cooldown** on the three recent deps — wait or use a vetted prior version if within `minimumReleaseAge`.

## Sequencing (separate commits; `npm run validate` green after each)

1. zod-v4 / MCP-SDK compatibility spike (in-code, throwaway).
2. Codeshare core: `data.ts` + `api.ts` (OpenAPI) + Bearer guard + tests green.
3. MCP server (`mcp.ts`) + `/mcp` test.
4. OAuth wrapper (`index.ts` + `authorize.ts` + KV + `run_worker_first`) + MCP-401 test.
5. Client key-gate into base.
6. Docs + rules + repo verified-facts.
7. `vibe-connector` skill + `claude-setup/` generator + consumer-sync ritual + onboarding phase +
   `add-data` update + `vibe-ops-setup` / `vibe-api-mode` consolidation.

## Constraints (from CLAUDE.md / rules — non-negotiable)

- All repo artifacts in English; the *running agent* speaks German to the owner (skills/onboarding script
  plain-German owner phrasings).
- The validate-before-done gate is sacred: `npm run fix` then `npm run validate` (Biome + tsc + build +
  workerd tests) must pass before claiming anything works. Every `/api/...` route + every MCP tool gets a test.
- KISS applies to our own output; keep the boilerplate small. Deep modules over shallow wrappers.
- Dependency-hygiene: pin exact, respect cooldown, commit lockfile, no blind updates.
- No AI/tool attribution anywhere. TypeScript strict, no `any`.
- Offload validation loops to `/check` (sideclaw); don't grind format/lint/tsc/test inline.
- Re-verify moving facts with `/research` before relying on them (research-first).
