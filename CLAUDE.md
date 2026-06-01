# vibe-stack — Contributor Guide (for Claude working *on this repo*)

> **You are not building an end-user app here.** This repository is the *factory*: it produces a
> guided onboarding and a starter template that let a non-technical person spin up their own
> Cloudflare app by chatting with Claude. When someone works in this repo, they are improving the
> **onboarding experience** and the **boilerplate** — not writing application features.

## What this project is

A "keep-it-stupid-simple" full-stack kit for **beginners who can't really program** and want a
real, deployable app built entirely by talking to Claude Code. It rides Cloudflare's free tier:
one Worker serves a React SPA *and* a Hono API, backed by D1 (database) and R2 (file storage).

**Two flavors, same boilerplate.** (1) A **personal tracker** (the default) — build a little app for
yourself. (2) An **operations tool** — run a small business by *talking*: the D1 database is the
business's memory, the agent reads and writes the live data (via the `vibe-operate` skill +
`wrangler d1 execute --remote`, authenticated by the owner's own Cloudflare login — no API secret),
and the website is **private** behind Cloudflare Access. The ops flavor is layered on at setup
(`vibe-ops-setup`), not a second boilerplate.

**Audience:** the author's German-speaking, non-technical friends. Two consequences:
- **All repo artifacts are in English** (code, docs, commits, skills, rules) — standard.
- **The running agent speaks German to the owner.** `ONBOARDING.md` and the global `CLAUDE.md` it
  writes both instruct the agent to converse in German, translate every error, and never assume a
  technical term. Keep that split: English source, German conversation.

## Locked architecture decisions

1. **One growing app, its own D1.** Each owner gets a single app with its own D1 database. New
   "apps" are new pages/features in the *same* project; the database becomes their personal
   knowledge base. No shared cross-app DB, no microservices, no second deploy target.
2. **Single Worker.** The Hono API and the React SPA ship from one Worker in one `wrangler deploy`.
   Never split into Pages + Workers. No CORS, no second URL.
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
7. **Agentic operations is a flavor, not a fork.** When an owner runs a business (reservations, staff,
   inventory), the agent operates the live D1 conversationally via `wrangler d1 execute --remote`
   (Code tab, owner-authenticated — no public mutation API, no secret) and the website is gated by
   **Cloudflare Access** (managed login, works on `*.workers.dev`, no domain). Domain entities + rules
   and a German owner guide are written into the project at setup. To manage from **anywhere** (phone,
   Cowork) the `vibe-api-mode` skill upgrades the app to an authed Hono API — one Bearer secret in the
   Mac keychain (agent) + entered once in the website, like Hermes/argo without Tailscale; it replaces
   Access. Single shared secret = single-owner; use Access when staff need per-person logins.

## Repository layout

| Path | Purpose |
|-|-|
| `README.md` | Human-facing intro + the one paste-line + where to literally start (Code tab → Select folder). Ends with a pointer telling Claude to read `ONBOARDING.md`. |
| `ONBOARDING.md` | The guided, **milestone-based** 7-phase setup Claude runs for a new owner. The heart of the product. |
| `boilerplate/` | The Cloudflare-optimized starter app (single Worker + Hono + D1 + R2, Mantine v9 + `@mantine/charts`, Vitest + Biome). Self-contained, committed, runnable. |
| `boilerplate/CLAUDE.md` | The always-on agent contract: German communication, the validate-before-done loop, hard rules, verified facts. |
| `boilerplate/.claude/skills/` | Per-project how-to skills (add-page/data/chart/form) + vendored Mantine v9 skills. |
| `boilerplate/.claude/rules/` | Path-scoped edit-time conventions (`ui.md`, `worker-data.md`, `testing.md`). |
| `boilerplate/test/` | Workerd integration tests (`@cloudflare/vitest-pool-workers`) + setup. |
| `boilerplate/biome.jsonc` | The single formatter/linter config. `boilerplate/.mcp.json.example` | optional chrome-devtools MCP. |
| `skills-global/` | Global skills copied into `~/.claude/skills/`: `vibe-deploy`, `vibe-cloudflare`, `vibe-new-app`, plus the ops set — `vibe-operate` (run live D1 by talking), `vibe-ops-setup` (turn an app into a business tool), `vibe-access` (private website via Cloudflare Access), `vibe-api-mode` (authed Bearer API + contract, to manage from anywhere). |

## Verified tech facts — do NOT regress (verified 2026-06-01)

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
  `assets.run_worker_first: ["/api/*"]` (array form needs Wrangler ≥ 4.20.0). `compatibility_date`
  must be a real recent date. **Stay on Vite 7**: Vite 8 + `@cloudflare/vite-plugin` still has open
  build-breaking issues (see "Keeping current" for the Vite+ note).
- **Hono is not in Cloudflare's template** — add it. Worker entry is `export default app` (the Hono
  instance, `basePath('/api')`). With `run_worker_first: ["/api/*"]` the asset layer serves the SPA
  without invoking the Worker, so Hono needs **no** `*` SPA fallback. Bindings via
  `new Hono<{ Bindings }>()`, read from `c.env.DB` / `c.env.BUCKET`. Validation: a `zod` schema in
  `src/shared/schema.ts`, `safeParse`d in the route (the boilerplate does **not** use
  `@hono/zod-validator` — it parses multipart via `c.req.parseBody()` then `safeParse`).
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
- **chrome-devtools MCP** (`chrome-devtools-mcp` 1.1.1, Node engines `^20.19||^22.12||>=23`) ships as
  an **optional, off-by-default** `boilerplate/.mcp.json.example` (`--isolated --headless`,
  project-scoped so Claude approval-gates it). The agent uses it to screenshot the running app and
  read the console. The core path must work without it. This is **not** "Claude for Chrome".
- **Live-data ops + privacy (the ops flavor):** the agent manages live data with
  `wrangler d1 execute <db> --remote --command "…" [--json]` (reads AND writes; authenticated by
  `wrangler login`; Code tab only — Cowork/cloud can't reach it). **Cloudflare Access works on
  `*.workers.dev`** with no custom domain: dashboard *Workers & Pages → app → Settings → Domains &
  Routes → Enable Cloudflare Access → Manage Cloudflare Access* (allow the owner's email; default login
  = one-time email code; the free Zero Trust tier covers a small team). Access policies are dashboard-
  only, **not** set via `wrangler`.
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
pieces (Mantine, Wrangler/`@cloudflare/vite-plugin`, Hono, Cloudflare assets config, Vitest +
`@cloudflare/vitest-pool-workers`, Biome, chrome-devtools-mcp, Claude plan + desktop facts), refresh
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
