# vibe-stack — Contributor Guide (for Claude working *on this repo*)

> **You are not building an end-user app here.** This repository is the *factory*: it produces a
> guided onboarding and a starter template that let a non-technical person spin up their own
> Cloudflare app by chatting with Claude. When someone works in this repo, they are improving the
> **onboarding experience** and the **boilerplate** — not writing application features.

## What this project is

A "keep-it-stupid-simple" full-stack kit for **beginners who can't really program** and want a
real, deployable app — **one growing, fully-enabled personal environment, not many single-purpose
apps** — built entirely by talking to Claude Code. It rides Cloudflare's free tier: one Worker serves
a React SPA *and* a Hono API, backed by D1 (database) and R2 (file storage), plus an MCP server + OAuth
connector so the same environment answers from the local Code tab **and** from claude.ai on phone/desktop.

**Two flavors, same boilerplate.** (1) A **personal tracker** (the default) — build a little app for
yourself. (2) An **operations tool** — run a small business by *talking*: the D1 database is the
business's memory, the agent reads and writes the live data (via the `vibe-operate` skill +
`wrangler d1 execute --remote`, authenticated by the owner's own Cloudflare login — no API secret for
data ops), and the website is **private** behind the owner's access key (Cloudflare Access is layered
on only when staff each need their own login). The ops flavor is layered on at setup
(`vibe-ops-setup`), not a second boilerplate.

**Audience:** the author's German-speaking, non-technical friends. Two consequences:
- **All repo artifacts are in English** (code, docs, commits, skills, rules) — standard.
- **The running agent speaks German to the owner.** `ONBOARDING.md` and the global `CLAUDE.md` it
  writes both instruct the agent to converse in German, translate every error, and never assume a
  technical term. Keep that split: English source, German conversation.

## Locked architecture decisions

1. **One growing personal environment, its own D1.** Each owner gets a **single fully-enabled app** —
   one Worker (Hono API + website + MCP + OAuth) with one D1 — and builds **everything** into it:
   private *and* work, a food log *and* a workout tracker *and* a business domain, all as new
   pages/features in the *same* project. The D1 is the one growing knowledge base; the connector makes
   it a **personal agent** reachable identically from the local Code tab and from claude.ai
   (phone/desktop). This is the model — **not** a factory for many single-purpose apps. No shared
   cross-app DB, no microservices, no second deploy target. (A genuinely separate environment is a rare
   escape hatch — `vibe-new-app` — never the default; a new "app" is normally a new page here.)
2. **Single Worker.** The Hono REST API, the MCP server, the OAuth provider, and the React SPA all
   ship from one Worker in one `wrangler deploy`. Never split into Pages + Workers. No CORS, no second
   URL. (Standard foundation — see verified facts: every app is a documented connector + API + OAuth.)
3. **Hybrid skills + rules.** Cloudflare/Wrangler skills install into the owner's `~/.claude/skills/`
   (global, reused across their apps); per-project skills, `.claude/rules/`, and `test/` live under
   `boilerplate/`. The official **Mantine v9** skills are vendored into `boilerplate/.claude/skills/`.
   Everything is installed by **copying files**, never `npx skills add -g` (see verified facts).
4. **Ship a ready boilerplate.** The owner gets `boilerplate/` copied into a fresh folder
   (deterministic), not a from-scratch scaffold. Keep it current (see "Keeping current").
5. **Target Claude Pro + the desktop app's Code tab** (no terminal) as the primary path.
6. **The agent validates, then claims done.** The boilerplate ships a real test + lint + build gate
   (`npm run validate`) and `boilerplate/CLAUDE.md` makes running it non-negotiable before the agent
   tells the owner anything works. Bulletproofing the agent's self-check is a first-class goal.
7. **Agentic operations is a flavor, not a fork.** Every app already ships the connector + authed REST
   API + single-owner OAuth (decision 2), so "manage from anywhere" (phone, desktop/web Chat, routines)
   is **base**, not an upgrade — the old `vibe-api-mode` skill is folded into the boilerplate. When an
   owner runs a business (reservations, staff, inventory), `vibe-ops-setup` layers **domain entities +
   rules + a German owner guide** onto that base; the agent still operates the live D1 conversationally
   via `wrangler d1 execute --remote` (Code tab, owner-authenticated) when it needs raw SQL. The
   website is private by default via the OWNER_SECRET key-gate; for a small team needing **per-person
   logins**, layer **Cloudflare Access** (`vibe-access`, works on `*.workers.dev`, no domain).

## Repository layout

| Path | Purpose |
|-|-|
| `README.md` | Human-facing intro + the one paste-line + where to literally start (Code tab → Select folder). Ends with a pointer telling Claude to read `ONBOARDING.md`. |
| `ONBOARDING.md` | The guided, **milestone-based** 8-phase setup Claude runs for a new owner. The heart of the product. |
| `boilerplate/` | The Cloudflare-optimized starter app (single Worker serving SPA + Hono REST API + MCP server + OAuth provider, D1 + R2, Mantine v9 + `@mantine/charts`, Vitest + Biome). Self-contained, committed, runnable. |
| `boilerplate/CLAUDE.md` | The always-on agent contract: German communication, the validate-before-done loop, hard rules, verified facts. |
| `boilerplate/.claude/skills/` | Per-project how-to skills (add-page/data/chart/form) + vendored Mantine v9 skills. |
| `boilerplate/.claude/rules/` | Path-scoped edit-time conventions (`ui.md`, `worker-data.md`, `testing.md`). |
| `boilerplate/test/` | Workerd integration tests (`@cloudflare/vitest-pool-workers`) + setup. |
| `boilerplate/biome.jsonc` | The single formatter/linter config. `boilerplate/.mcp.json.example` | optional chrome-devtools MCP. |
| `skills-global/` | Global skills copied into `~/.claude/skills/`: `vibe-deploy`, `vibe-cloudflare`, `vibe-new-app`, `vibe-connector` (connect the app to Claude as a custom connector — provision `OAUTH_KV` + `OWNER_SECRET`, deploy, register, generate `claude-setup/`), plus the ops set — `vibe-operate` (run live D1 by talking), `vibe-ops-setup` (turn an app into a business tool), `vibe-access` (per-person staff logins — the agent provisions Cloudflare Access **itself** via a scoped Cloudflare API token, dashboard click-path as fallback), `vibe-ai` (turn on in-app AI — adds the `env.AI` binding + an example route over the shipped `boilerplate/src/worker/ai.ts`, so the website/autonomous tasks can summarise/translate/parse free text via Workers AI, no key). The old `vibe-api-mode` is folded into the base boilerplate. |
| `boilerplate/claude-setup/` | Git-tracked paste bundle (German) for the consumer surfaces that have no API — `PROJEKT-ANWEISUNGEN.md`, `ANWEISUNGEN-GLOBAL.md`, `EINFUEGEN.md`, `manifest.json`. `vibe-connector` fills it from the real project and drives the copy-paste ritual. Only Chat/Cowork need it. |

## Verified tech facts — do NOT regress (verified 2026-06-02)

These were confirmed against primary docs with adversarial cross-checking. They override stale
training knowledge. **Re-verify with `/research` before changing any of them** (the ecosystem moves).

- **Mantine is v9.x** (9.2.2 at verification), requires **React 19.2+**. Charts use
  **`@mantine/charts` + `recharts` (peer, >=3.2.1)** — NOT raw `recharts` alone. Import
  `@mantine/charts/styles.css` *after* `@mantine/core/styles.css`. PostCSS via
  `postcss-preset-mantine` + `postcss-simple-vars` in `postcss.config.cjs`. Client-only SPA needs
  no `ColorSchemeScript`; set `defaultColorScheme` on `MantineProvider`.
- **Cloudflare single Worker + SPA:** scaffold parity comes from `@cloudflare/vite-plugin` (1.39.1;
  builds SPA → `dist/client`, Worker → `dist/<name>`, auto-fills `assets.directory` — so omit it).
  Routing in `wrangler.jsonc`: `assets.not_found_handling: "single-page-application"` +
  `assets.run_worker_first` (array form needs Wrangler ≥ 4.20.0) now lists the six Worker paths
  (`/api/*`, `/mcp`, and the four OAuth endpoints — see the OAuth foundation fact below).
  `compatibility_date` must be a real recent date. **Stay on Vite 7**: Vite 8 + `@cloudflare/vite-plugin`
  still has open build-breaking issues (see "Keeping current" for the Vite+ note).
- **Hono is not in Cloudflare's template** — add it. The Hono REST app lives in `src/worker/api.ts`
  (`basePath('/api')`); `src/worker/index.ts` wraps it (+ the MCP server) in the OAuth provider as the
  default export. With `run_worker_first` listing `/api/*`, `/mcp` and the OAuth paths, the asset layer
  serves the SPA without invoking the Worker, so Hono needs **no** `*` SPA fallback. Bindings via
  `new Hono<{ Bindings }>()`, read from `c.env.DB` / `c.env.BUCKET`. The REST routes document themselves
  with **`hono-openapi 1.3.0`** (`describeRoute` + `validator` + `resolver` — NOT `@hono/zod-openapi`,
  which forces an `OpenAPIHono` rewrite); multipart-with-file is still parsed by hand via
  `c.req.parseBody()` then `safeParse` (the boilerplate does **not** use `@hono/zod-validator`).
- **MCP + OpenAPI REST + single-owner OAuth is the STANDARD foundation** of every app (verified
  2026-06-02 incl. an in-code spike), not an opt-in layer. One Worker stays one deploy:
  `src/worker/index.ts` = `new OAuthProvider({...})` from **`@cloudflare/workers-oauth-provider` 0.7.0**
  — auto-serves `/token`, `/register` (RFC 7591 **DCR — Claude connectors require it**) and
  `/.well-known/oauth-authorization-server`, gates `/mcp`, routes `/authorize` (our German consent page,
  validates `OWNER_SECRET`) + `/api/*` (the Hono app). Needs a **KV namespace `OAUTH_KV`** + a Worker
  **secret `OWNER_SECRET`** (one shared secret = single owner; a valid token = the owner). MCP via
  **`@hono/mcp` 0.3.0** (`StreamableHTTPTransport`, **stateless** — `sessionIdGenerator: undefined`,
  `enableJsonResponse`, fresh server per request, **no Durable Objects**) + **`@modelcontextprotocol/sdk`
  1.29.0**, whose tool inputs reuse the shared **Zod v4** schemas (the SDK converts v4 natively via
  `zod/v4-mini` `toJSONSchema` — **no shim**). The SDK's WebStandard transport runs in workerd with **no
  `nodejs_compat`**. Dual auth, one secret value: `/mcp` = OAuth 2.1 + DCR (the only thing connectors
  accept); `/api/*` + website = Bearer. `data.ts` holds behavior once; `api.ts` + `mcp.ts` are thin
  adapters; **photos stay REST/website-only** (binaries don't belong in tool calls). Tool descriptions
  **< 500 chars** — consumer surfaces don't reliably honor server `instructions`/`prompts`.
- **Consumer config (skills / Projects / global "Anweisungen") has no programmatic API** — manual UI
  only. BUT it is **account-level**: one paste on any device applies across web/desktop/phone for that
  account. Only **plain Chat + Cowork** need it (the Code tab + routines read the repo files). So the
  connector covers the *data*; a small git-tracked `claude-setup/` bundle (a Project + thin global
  instructions) covers the *behavior*, synced by a German copy-paste ritual tied to the cause that
  changed it (`vibe-connector` / `add-data` / `vibe-ops-setup`).
- **Testing runs in the real Workers runtime** via **`@cloudflare/vitest-pool-workers` 0.16.11**,
  which requires **vitest ^4.1.0**. The current API: config uses the **`cloudflareTest()` plugin**
  from `@cloudflare/vitest-pool-workers` (NOT the old `defineWorkersConfig`); tests
  `import { env, exports } from 'cloudflare:workers'` and call **`exports.default.fetch(...)`** (NOT
  `SELF` from `cloudflare:test`); `readD1Migrations` is imported from `@cloudflare/vitest-pool-workers`
  and migrations are applied in a setup file via `applyD1Migrations` (still from `cloudflare:test`).
  Real local D1 + R2. The pre-0.16 API is obsolete — verified against the workers-sdk D1 fixture.
- **Lint/format is Biome** (`@biomejs/biome` pinned **2.4.16**, single binary, config `biome.jsonc`,
  `$schema` URL is version-locked — bump both together). One command formats + lints + organizes
  imports. We deliberately do **not** use ESLint/Prettier or oxlint+oxfmt (oxfmt is pre-1.0).
- **Claude Code rules/skills mechanics:** `.claude/rules/*.md` **is** a real Claude Code feature
  (auto-loads each session). A `paths:` glob in the frontmatter scopes a rule — but path-scoped rules
  fire on **Read, not Write/create** (workers-sdk-style gotcha, GH #23478 not-planned). So: create-time
  guardrails live in `boilerplate/CLAUDE.md` (always-on) and in skills (intent-triggered); `paths:`
  rules are edit-time reinforcement only. SKILL.md frontmatter: `name` + a third-person `description`
  (what + WHEN); only those preload, the body loads on demand.
- **The agent runs autonomously via a committed allow-list, not a permissive mode.**
  `boilerplate/.claude/settings.json` ships a *narrow* `permissions.allow` — the `npm` scripts +
  `wrangler` + `curl`/keychain, in **space-glob** form like `Bash(wrangler *)` (Claude Code's `:*` is a
  trailing wildcard only, so the obsolete `wrangler d1:*` colon form does NOT match v4's space-separated
  `wrangler d1 create`) — allow-rules silence prompts in **any** mode
  including the desktop Code tab's default, and a project `settings.json` is **auto-trusted** (no
  dialog). `deploy` + `rm -rf` are `ask`; `.dev.vars` / `.env` reads are `deny`. Do **not** ship
  `defaultMode: bypassPermissions`/`auto` (buggy/ignored on desktop — GH #61501/#62076 — and unsafe in
  an auto-trusted template), and never tell owners to enable Bypass. The allow-list must mirror
  `boilerplate/package.json` scripts.
- **chrome-devtools MCP** (`chrome-devtools-mcp` 1.1.1, Node engines `^20.19||^22.12||>=23`) ships as
  an **optional, off-by-default** `boilerplate/.mcp.json.example` (`--isolated --headless`,
  project-scoped so Claude approval-gates it). The agent uses it to screenshot the running app and
  read the console. The core path must work without it. This is **not** "Claude for Chrome".
- **Workers AI is the optional in-app AI (verified 2026-06-02), OFF by default — the `vibe-ai` skill
  turns it on.** Chosen path: **plain `env.AI.run()` JSON Mode**, NOT the Vercel AI SDK. The
  `workers-ai-provider` 3.x pulls in AI SDK **v6**, where `generateObject` is deprecated (→
  `generateText` + `Output.object`) while Cloudflare's docs still show the old call (doc/code mismatch),
  plus bundle weight against the 3 MB free limit — and a Cloudflare-locked app needs no provider
  abstraction. So `boilerplate/src/worker/ai.ts` calls `env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  { messages, response_format: { type: 'json_schema', json_schema } })`, feeding it **Zod v4's native
  `z.toJSONSchema(schema)`** (no `zod-to-json-schema` dep — the SAME shared schema the REST/MCP layers
  use), then **re-validates** with `safeParse`. That model is on the JSON-Mode list + good at German;
  GLM-4.7-Flash is the cheaper multilingual alt (function-calling, not JSON-Mode). Free tier = **10k
  Neurons/day/account**, a **hard fail** on the Workers Free plan → the helper returns a graceful
  `{ ok: false }`, never bad data. No API key, no extra account. The binding is dependency-injected so
  `test/ai.test.ts` covers the logic with a stub; the live model call is deploy-only.
- **Auth model + live-data ops + privacy (the ops flavor):** one `npx wrangler login` (OAuth, all
  scopes by default, auto-refreshing — verified 2026-06-02) is the **only** auth the base needs: it
  covers D1/R2/KV create, `secret put`, `deploy`, and `wrangler d1 execute <db> --remote` reads AND
  writes (the agent's live-data path; Code tab only — Cowork/cloud can't reach it). Do **not** push a
  Cloudflare API token as the default — for a non-technical owner it's ~8–11 dashboard clicks, a
  shown-once secret, never-expiring full-account scope, and it does **not** skip the R2 payment gate.
  The **one** thing wrangler can't do is **Cloudflare Access**: its apps + policies are set via the
  Cloudflare REST API (`POST /accounts/{id}/access/apps` + `/access/policies`), **not** `wrangler`. So
  `vibe-access` has the agent provision Access **itself** with a *scoped, TTL'd* Cloudflare API token
  (Account → `Access: Apps and Policies` + `Access: Organizations, Identity Providers, and Groups`,
  Edit), stored in the Mac keychain; the dashboard click-path (*Workers & Pages → app → Settings →
  Domains & Routes → Enable Cloudflare Access*) is the documented fallback. **Cloudflare Access works
  on `*.workers.dev`** with no custom domain; the free Zero Trust tier covers a small team; default
  login = one-time email code. The Access-via-API path is documented but **not deploy-verified** (no
  live account here) — re-verify on the next "Keeping current" pass.
- **R2 has a gate the others don't:** enabling R2 requires completing a checkout / "add R2
  subscription" flow that in practice needs a **payment method on file**, even though usage stays
  free. D1, Workers, and Static Assets do not. The onboarding must warn the owner this is a
  one-time verification, not a bill.
- **First deploy** on a fresh account interactively asks to register a free `workers.dev` subdomain
  (answer yes), and the new URL can briefly 523 (~1 min). The onboarding warns about both.
- **Claude Pro includes Claude Code** — confirmed; *not* Max-gated; the Free plan cannot use it.
  Don't quote a fixed "€20" rate card or name specific Pro model versions. The desktop **Code tab**
  requires selecting a folder before there's a prompt box, and has a built-in **Preview** pane.
- **Skills distribution:** `npx skills` (vercel-labs/skills, npm v1.5.9) is real; upstream repos
  exist (`cloudflare/skills` — branch **`main`**; `mantinedev/skills` — branch **`master`**, 3
  Mantine v9 skills; `secondsky/claude-skills`). `npx skills add -g` still has the symlink bug (#851,
  OPEN) that hides globally-installed skills from Claude Code. **We vendor by copying** (`--copy`,
  project scope). Pulling upstream skills into a project (`.claude/skills/`, no `-g`) is the
  documented on-demand depth-add.

## Conventions

- Code style: low nesting, early returns, self-documenting, no premature abstraction. TypeScript
  strict, no `any`. Keep the boilerplate *small* — KISS applies to our own output too.
- Every owner-facing word the agent will say must survive a non-technical reader. Skills and
  `ONBOARDING.md` should script *plain-German* phrasings, not jargon.
- No AI/tool attribution anywhere (commits, docs, code).
- Update this `CLAUDE.md` in the same change as the code it documents.

## Keeping current

The boilerplate is a frozen snapshot, so it can drift. When updating: run `/research` on the moving
pieces (Mantine, Wrangler/`@cloudflare/vite-plugin`, Hono, `hono-openapi`, Cloudflare assets config,
Vitest + `@cloudflare/vitest-pool-workers`, Biome, **`@cloudflare/workers-oauth-provider` + `@hono/mcp`
+ `@modelcontextprotocol/sdk`** (re-run the zod-v4 ↔ MCP-SDK spike), the Claude **connector** auth
contract + consumer-config UI click-paths, the Cloudflare **auth model** (wrangler-login scope
coverage) + the **Access-via-API** token recipe + endpoints (deploy-verify it), Claude Code
**permission-mode / desktop** behavior (the `.claude/settings.json` allow-list must mirror
`package.json`; GH #61501/#62076 churn), **Workers AI** (the free Neuron/day tier, the JSON-Mode model
list + best German model, and the `workers-ai-provider` ↔ AI-SDK-v6 churn — re-confirm plain
`env.AI.run` JSON Mode still beats the SDK), chrome-devtools-mcp, Claude plan + desktop facts), refresh
the "Verified tech facts" block with a new date, then update `boilerplate/` and the skills to match.

- **Vite+ (viteplus.dev):** evaluated 2026-06-01 → **not adopted**. It's free (MIT) but alpha
  (v0.1.x) and ships Vite 8, which `@cloudflare/vite-plugin` does not yet support cleanly
  (workers-sdk #11530/#12497/#11948). Re-evaluate only once Vite+ reaches 1.0/GA **and** the
  Cloudflare plugin officially supports the Vite major Vite+ ships.

## Validating a change to the boilerplate

From `boilerplate/`: `npm install`, then **`npm run validate`** (Biome CI + `wrangler types` + `tsc`
+ `vite build` + the Vitest workerd tests) must pass. `npm run fix` auto-formats. The tests run the
real Worker against local D1 + R2, so they are the closest thing to a deploy you can run here. If the
chrome-devtools MCP is available you can additionally seed local data, run `npm run dev`, and
screenshot the app to confirm icons/charts render — but **don't leave a dev server running**. A real
end-to-end deploy needs a Cloudflare account, so smoke-test the build + tests, not the deploy.
