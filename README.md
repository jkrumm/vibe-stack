# vibe-stack

**Build your own app by chatting with Claude — no coding required.**

vibe-stack is a starter kit for people who can't (yet) program but want their own real app — **one
app that grows with you**: start with a habit tracker, then add a recipe box, a workout log, even a
little tool for your business — all in the **same** private app. You describe what you want in plain
language, Claude builds it, and one command puts it online — reachable on your Mac **and** from Claude
on your phone.

It runs entirely on [Cloudflare](https://www.cloudflare.com/)'s generous free tier — one small
app serves both your screen (React + [Mantine](https://mantine.dev)) **and** your data (an API +
a real database + file storage), all from a single deployment. No servers to manage, no monthly
hosting bill, no surprise costs.

> 🇩🇪 **Für meine deutschsprachigen Freunde:** Diese Anleitung ist auf Englisch, aber Claude
> spricht mit dir auf **Deutsch** durch die ganze Einrichtung. Du musst hier nichts verstehen —
> spring direkt zu [„So fängst du an"](#-so-fängst-du-an--how-to-start) und füge den einen Satz ein.

---

## 🟢 Before you start (one-time, ~5 minutes)

You need exactly two things:

1. **A Claude Pro subscription.** Pro *includes Claude Code*, the part that builds software for you —
   the **Free** plan can't use it, and you do **not** need the **Max** plan. The only limit is how much
   you can do in a rolling time window; for weekend tinkering that's plenty.
2. **The Claude desktop app on your Mac** — download it from [claude.com](https://claude.com),
   sign in with your Pro account, and open the **Code** tab. That's a friendly point-and-click
   view of Claude Code — **no terminal required**. It shows you each change and asks before doing
   anything.

That's it. Claude installs the few developer tools it needs (like Node) *for you* during setup —
you don't install anything by hand. **This kit targets macOS.**

> **Which Claude is which?** The **Code** tab *builds and changes* your app — that's the one you
> use here. Plain **Chat** is for questions. You won't need anything else to get started.

---

## ▶️ So fängst du an / How to start

1. In the Claude desktop app, open the **Code** tab, choose **Local**, click **Select folder**, and
   pick (or create) a new **empty** folder — for example `vibe-app` in your home folder. *(Claude
   needs a folder to work in; until you pick one there's no chat box.)*
2. In that folder's chat, paste one sentence — swap the description for whatever *your* app should be:

> **„Richte mir bitte ein neues Vibe-Stack-Projekt ein und folge dabei
> github.com/jkrumm/vibe-stack. Meine App soll ein Mahlzeiten-Tagebuch werden, in dem ich Essen
> mit Foto und Kalorien festhalte."**

*(English: "Set up a new vibe-stack project for me, following github.com/jkrumm/vibe-stack. My app
should be a meal diary where I log food with a photo and calories.")*

From there Claude takes over: it reads this repository, sets up your tools and your Cloudflare
account *with* you, builds your starter app, and walks you to your first live deployment — one
guided step at a time, in plain German. You just answer its questions and click **Accept**.

---

## 📦 What you get

- **One app that holds everything, one deploy.** Your screen and your data ship together from a single
  Cloudflare Worker, and every new thing you build lives in the *same* app. No two URLs, no glue.
- **A real database that grows with you (D1).** Everything your app remembers lives here. Over time
  it becomes *your* knowledge base — every new feature you ask for builds on the same data.
- **File storage (R2)** for photos and uploads, with the image kept out of the database.
- **A polished look out of the box** — [Mantine](https://mantine.dev) components and charts, so
  forms, tables, and graphs look good without you styling anything.
- **One command to publish:** you say *"deploy"* and your app is live on every device.
- **Private to you, usable from anywhere.** Protected by your own access key, and **connected to
  Claude** — so you add and check things from your phone or any Claude chat, not just your Mac (more in
  *Using your app on your phone* below).
- **Claude already knows this stack.** The starter ships with skills and rules so Claude builds the
  *right* way every time, and it **tests and checks every change** before telling you it's done — so a
  broken version can't go live.
- **Or run a small business by talking.** Beyond personal trackers, it can manage reservations, staff,
  inventory and the like: you handle the live data just by chatting ("add a reservation for 4 at 7pm",
  "who's working Friday?") — from your phone too — and the website stays **private behind your login**.
  Just describe a business tool during setup and Claude wires it up.

---

## 📱 Using your app on your phone and other devices

A few different things, which work differently — don't mix them up:

1. **Using the app** (logging things, viewing charts): works **everywhere**. Your app is a private web
   address — open it in any phone or laptop browser and enter your access key once. On a phone, tap
   *"Add to Home Screen"* and it behaves like a real app, camera and all. This is your day-to-day.
2. **Using it straight from Claude** (on your phone, in any chat): your app connects to Claude, so you
   can just ask — *"add a workout"*, *"show me this week"* — without even opening the website. This is
   set up once during onboarding.
3. **Changing or extending the app** (new features): happens **on your Mac**, in the Code tab. You
   say what you want, Claude builds it, you say *"deploy"*. Build at the desk, use everywhere.
4. **Undoing a change:** just say *"roll back"* — Claude can revert the last deploy.

---

## 🔁 What you do after setup

Just keep talking to Claude in the Code tab: *"add a field for protein grams"*, *"show me a chart
of the last 30 days"*, *"make the buttons blue"*, *"deploy"*. Your project keeps a file called
`CLAUDE.md` — you never open it; it's Claude's memory of how *your* app works, so you can come back
weeks later and pick up right where you left off.

---

<!-- ─────────────────────────────────────────────────────────────────────────── -->
<!-- The rest of this file is for Claude Code, not the app owner.                  -->
<!-- ─────────────────────────────────────────────────────────────────────────── -->

## Claude Code: start here

If a non-technical owner asked you to "set up vibe-stack" (or similar), **read
[`ONBOARDING.md`](./ONBOARDING.md) in this repository and follow it exactly.** It is a guided,
phase-by-phase setup written for you to drive. Do not improvise the setup from this README — the
authoritative, verified instructions live in `ONBOARDING.md`.

The ready-to-use starter app lives in [`boilerplate/`](./boilerplate). The setup copies it into a
new project folder; you do not develop inside this repo when onboarding an owner.

---

## For developers / contributors

This repository is itself a project you build *with* Claude — but you almost never touch the app
code. You maintain the **onboarding experience** and the **starter template**. See
[`CLAUDE.md`](./CLAUDE.md) for the contributor guide, the audience, the verified tech facts (so the
stack never regresses), and how the pieces fit together:

- `ONBOARDING.md` — the guided, milestone-based setup Claude runs for a new owner.
- `boilerplate/` — the Cloudflare-optimized starter: one Worker serving the React SPA + a Hono REST
  API + an MCP server + single-owner OAuth (so every app is a documented connector), D1 + R2, Mantine
  v9 + `@mantine/charts`, with vendored `.claude/` skills and rules.
- `skills-global/` — Cloudflare/Wrangler + connector skills the onboarding installs into the owner's
  `~/.claude/skills/` so they apply across every app they build.

Licensed under [MIT](./LICENSE).
