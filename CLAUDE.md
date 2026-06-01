# vibe-stack — Contributor Guide (for Claude working *on this repo*)

> **You are not building an end-user app here.** This repository is the *factory*: it produces a
> guided onboarding and a starter template that let a non-technical person spin up their own
> Cloudflare app by chatting with Claude. When someone works in this repo, they are improving the
> **onboarding experience** and the **boilerplate** — not writing application features.

## What this project is

A "keep-it-stupid-simple" full-stack kit for **beginners who can't really program** and want a
real, deployable app built entirely by talking to Claude Code. It rides Cloudflare's free tier:
one Worker serves a React SPA *and* a Hono API, backed by D1 (database) and R2 (file storage).

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
3. **Hybrid skills.** Cloudflare/Wrangler skills install into the owner's `~/.claude/skills/`
   (global, reused across their apps); Mantine/React/forms/data/charts skills + rules live
   per-project under `boilerplate/.claude/`. Installed by **copying files**, never `npx skills
   add -g` (see verified facts).
4. **Ship a ready boilerplate.** The owner gets `boilerplate/` copied into a fresh folder
   (deterministic), not a from-scratch scaffold. Keep it current (see "Keeping current").
5. **Target Claude Pro + the desktop app's Code tab** (no terminal) as the primary path.

## Repository layout

| Path | Purpose |
|-|-|
| `README.md` | Human-facing intro + the one paste-line. Ends with a pointer telling Claude to read `ONBOARDING.md`. |
| `ONBOARDING.md` | The guided, **milestone-based** setup Claude runs for a new owner. The heart of the product. |
| `boilerplate/` | The Cloudflare-optimized starter app (single Worker + Hono + D1 + R2, Mantine v9 + `@mantine/charts`). Self-contained, committed, runnable. |
| `boilerplate/.claude/` | Per-project skills + rules vendored into every owner project. |
| `skills-global/` | Cloudflare/Wrangler skills the onboarding copies into `~/.claude/skills/`. |

## Verified tech facts — do NOT regress (verified 2026-06-01)

These were confirmed against primary docs with adversarial cross-checking. They override stale
training knowledge. **Re-verify with `/research` before changing any of them** (the ecosystem moves).

- **Mantine is v9.x** (9.2.2 at verification), requires **React 19.2+**. Charts use
  **`@mantine/charts` + `recharts` (peer, >=3.2.1)** — NOT raw `recharts` alone. Import
  `@mantine/charts/styles.css` *after* `@mantine/core/styles.css`. PostCSS via
  `postcss-preset-mantine` + `postcss-simple-vars` in `postcss.config.cjs`. Client-only SPA needs
  no `ColorSchemeScript`; set `defaultColorScheme` on `MantineProvider`.
- **Cloudflare single Worker + SPA:** scaffold parity comes from `@cloudflare/vite-plugin` (builds
  SPA → `dist/client`, Worker → `dist/<name>`, auto-fills `assets.directory` — so omit it). Routing
  in `wrangler.jsonc`: `assets.not_found_handling: "single-page-application"` +
  `assets.run_worker_first: ["/api/*"]` (array form needs Wrangler ≥ 4.20.0). `compatibility_date`
  must be a real recent date.
- **Hono is not in Cloudflare's template** — add it. Worker entry is `export default app` (the Hono
  instance). With `run_worker_first: ["/api/*"]` the asset layer serves the SPA without invoking the
  Worker, so Hono needs **no** `*` SPA fallback. Bindings via `new Hono<{ Bindings }>()`, read from
  `c.env.DB` / `c.env.BUCKET`. Validation: `@hono/zod-validator` + `zod`.
- **R2 has a gate the others don't:** enabling R2 requires completing a checkout / "add R2
  subscription" flow that in practice needs a **payment method on file**, even though usage stays
  free. D1, Workers, and Static Assets do not. The onboarding must warn the owner this is a
  one-time verification, not a bill.
- **Claude Pro ($20/mo, ≈ €20 + VAT) includes Claude Code** — confirmed; it is *not* Max-gated; the
  Free plan cannot use it. Don't quote a fixed "€20" rate card or name specific Pro model versions.
- **Skills distribution:** `npx skills` (vercel-labs/skills) is real and the upstream repos exist
  (`cloudflare/skills`, `mantinedev/skills` — default branch **`master`** — `secondsky/claude-skills`),
  but `npx skills add -g` has a symlink bug (#851) that hides globally-installed skills from Claude
  Code. **We vendor skills by copying files.** Pulling upstream skills *into a project* (`.claude/skills/`,
  no `-g`) is fine as an optional depth-add.

## Conventions

- Code style: low nesting, early returns, self-documenting, no premature abstraction. TypeScript
  strict, no `any`. Keep the boilerplate *small* — KISS applies to our own output too.
- Every owner-facing word the agent will say must survive a non-technical reader. Skills and
  `ONBOARDING.md` should script *plain-German* phrasings, not jargon.
- No AI/tool attribution anywhere (commits, docs, code).
- Update this `CLAUDE.md` in the same change as the code it documents.

## Keeping current

The boilerplate is a frozen snapshot, so it can drift. When updating: run `/research` on the moving
pieces (Mantine, Wrangler/Vite plugin, Hono, Cloudflare assets config, Claude plan facts), refresh
the "Verified tech facts" block with a new date, then update `boilerplate/` and the skills to match.

## Validating a change to the boilerplate

From `boilerplate/`: `npm install`, then `npm run build` (Vite + Worker bundle) and
`npx wrangler types` must pass. Don't run `npm run dev` for the user. Prefer `/check` for
format/lint/typecheck. A real end-to-end deploy needs a Cloudflare account, so smoke-test the build,
not the deploy, in this repo.
