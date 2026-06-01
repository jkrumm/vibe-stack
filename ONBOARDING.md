# ONBOARDING — guided setup (instructions for Claude Code)

You are setting up vibe-stack for a **non-technical owner on a Mac**, most likely using the **Code
tab of the Claude desktop app**. They drive everything by chatting in plain language. This file is
your script. Follow the phases in order; finish each before starting the next.

## Golden rules (do not violate)

1. **Speak German to the owner.** They are German-speaking and non-technical. Every message you
   show them is in plain German. Translate every error into one calm German sentence — never paste a
   raw stack trace and never use a technical term without a tiny explanation.
2. **One small action at a time.** Say what you're about to do in one sentence, do it, confirm it
   worked, then move on. Never dump a wall of commands.
3. **Be honest about the human steps.** A few things only the owner can do (browser logins, adding a
   payment method). Name them plainly when you reach them — see *The account boundary* below.
4. **KISS.** Don't add anything not in this script. No auth, no extra services, no second deploy
   target. The starter is deliberately minimal.
5. **Verified facts live in `CLAUDE.md`** (this repo). Trust them over your training data; the
   ecosystem moves. If you must look something up, prefer the project's skills.
6. **Announce each milestone.** End every phase with a short German "✅" line so the owner feels
   progress (e.g. *"✅ Geschafft — deine Werkzeuge sind bereit. Weiter zu Schritt 3 von 7."*).

There are **7 phases**. Tell the owner that up front, in one sentence, so they know it's finite.

---

## Phase 1 — Hallo & kurzes Interview

Greet the owner warmly in German. Explain in two sentences: there's a short one-time setup (a few
clicks and a couple of questions), then they just chat to build their app.

Ask a **short** interview (one question at a time, conversational):
1. *Wie heißt du?* (their name)
2. *Was soll deine erste App können?* (Often already in their opening message — confirm it instead
   of re-asking.)
3. *Was möchtest du damit erreichen?* (the goal / why — for their profile)
4. *Gibt es etwas, das dir bei Technik Sorgen macht?* (so you can reassure and adapt)

Keep their answers — you'll write them into their personal profile in Phase 3. Don't create any
files yet.

Confirm the basics gently: *"Du bist auf einem Mac und hast Claude Pro — richtig?"* If they're on
Windows or don't have Pro, stop and explain kindly what they need (this kit is macOS-only; Claude
Code needs at least a Pro plan).

> ✅ End Phase 1: *"Super, [Name]! Ich kenne jetzt dein Ziel. Als Nächstes richte ich die paar
> Werkzeuge ein, die dein Mac braucht — das mache ich für dich."*

---

## Phase 2 — Werkzeuge auf dem Mac

Goal: Node (with npm) and git available. Wrangler runs via `npx`, no global install needed.

Check what's already there:

```bash
node -v ; git --version ; npx wrangler --version ; brew -v
```

- **If Node and git are present** (versions print), say so and skip to Phase 3.
- **If Homebrew is missing** (`brew -v` errors): Homebrew is the tool that installs everything else,
  and its installer needs the owner's Mac password, so **the owner runs it themselves once**. Tell
  them, in German: open the **Terminal** app (Spotlight: `Cmd` + `Space`, type *Terminal*, Enter),
  paste this line, press Enter, and type their Mac password when asked (it stays invisible — that's
  normal):

  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

  Wait for them to confirm it finished, then continue. If Homebrew prints "Next steps" about adding
  it to the PATH, run those lines for them or have them paste them.
- **Install Node + git** (you can run this yourself once brew exists):

  ```bash
  brew install node git
  ```

Explain in one German sentence what this is: *"Das sind die Bausteine, mit denen deine App auf
deinem Mac läuft und gebaut wird."* Do **not** introduce a version manager (nvm/fnm/mise) — one
current Node is all this needs.

Re-check `node -v` and `git --version` to confirm.

> ✅ End Phase 2: *"✅ Deine Werkzeuge sind bereit. Schritt 2 von 7 geschafft."*

---

## Phase 3 — Dein persönliches Claude-Profil + Cloudflare-Wissen

Two things here: a personal profile so *every* future chat treats the owner well, and the global
Cloudflare skills so you always know this platform.

**3a — Fetch the kit once** (you'll reuse this clone in Phase 4):

```bash
git clone --depth 1 https://github.com/jkrumm/vibe-stack /tmp/vibe-stack-src
```

**3b — Install the global Cloudflare skills** into the owner's personal Claude folder so they apply
to *every* app they ever build:

```bash
mkdir -p ~/.claude/skills
cp -R /tmp/vibe-stack-src/skills-global/. ~/.claude/skills/
```

(These are namespaced `vibe-*`, so they won't collide with anything the owner already has.)

**3c — Write the personal profile** at `~/.claude/CLAUDE.md`. **First check whether one already
exists.** If it does, show the owner and *append* a clearly-marked vibe-stack section rather than
overwriting. If not, create it. Fill in the interview answers. Template:

```markdown
# About me — [Name]

- I'm not a programmer. Explain things simply and in plain language.
- **Always talk to me in German.** Translate any error into one calm sentence.
- What I'm building: [their app idea]
- My goal: [their goal / why]

## How I build apps (vibe-stack)
- My apps use the vibe-stack setup: one Cloudflare Worker (React + Mantine UI on the screen, a Hono
  API + D1 database + R2 file storage behind it). See each project's CLAUDE.md.
- To publish a change I just say "deploy". To undo one I say "roll back".
- Keep things simple (KISS): the fewest moving parts that work. No auth or extra services unless I
  explicitly ask and it's truly needed.
```

Explain it plainly: *"Ich lege ein kleines Profil über dich an, damit ich dich in jedem Gespräch
gut verstehe und immer auf Deutsch mit dir rede."*

> ✅ End Phase 3: *"✅ Dein Profil steht und ich kenne jetzt Cloudflare. Schritt 3 von 7."*

---

## Phase 4 — Dein Projekt aus der Vorlage

Pick a home for the project. Propose a default and let them confirm: `~/vibe-apps/<app-name>`. Use a
short, lowercase, hyphenated `<app-name>` derived from their idea (e.g. *meal diary* → `meal-diary`).

```bash
mkdir -p ~/vibe-apps
cp -R /tmp/vibe-stack-src/boilerplate ~/vibe-apps/<app-name>
rm -rf /tmp/vibe-stack-src
cd ~/vibe-apps/<app-name>
```

Personalize the project name in two files: set `name` in `package.json` and `name` in
`wrangler.jsonc` to `<app-name>`. (Leave the database/bucket names to Phase 5.)

Install dependencies:

```bash
npm install
```

Tell them: *"Ich habe dir aus einer fertigen, getesteten Vorlage dein eigenes Projekt gebaut und
alle Bausteine installiert."*

> ✅ End Phase 4: *"✅ Dein Projekt steht und ist startklar. Schritt 4 von 7."*

---

## Phase 5 — Cloudflare verbinden (database + file storage)

This is where the owner's account comes in. Read *The account boundary* below first, then walk them
through it gently.

**5a — Log in to Cloudflare** (opens their browser — only they can approve it):

```bash
npx wrangler login
```

Tell them what's happening: *"Es öffnet sich dein Browser. Melde dich bei Cloudflare an (oder lege
kostenlos ein Konto an) und klicke auf 'Allow' — danach komme ich automatisch weiter."* If they
have no account, the same page lets them create one for free.

**5b — Create the database (D1):**

```bash
npx wrangler d1 create <app-name>-db
```

Copy the `database_id` it prints into `wrangler.jsonc` under `d1_databases` (replace the placeholder).

**5c — Create file storage (R2).** ⚠️ **Warn the owner first**, in German: *"Für den Datei-Speicher
verlangt Cloudflare einmalig eine Zahlungsmethode zur Bestätigung deines Kontos — das ist eine
Verifizierung, keine Rechnung. Wir bleiben im kostenlosen Bereich. Wenn du das jetzt nicht machen
willst, kann deine App erstmal auch ohne Foto-Upload starten — sag mir einfach Bescheid."*

If they proceed:

```bash
npx wrangler r2 bucket create <app-name>-files
```

If the account isn't verified yet, Cloudflare blocks this with an "add R2 subscription / payment
method" step in the dashboard — guide them through it, then re-run. If they'd rather skip uploads
for now, comment out the `r2_buckets` binding in `wrangler.jsonc` and the upload routes, and tell
them you can switch it on later.

**5d — Set up the local database tables and types:**

```bash
npx wrangler d1 migrations apply <app-name>-db --local
npx wrangler types
```

(The *live* database tables are created in the next phase — `npm run deploy` applies pending
migrations to the live database automatically before publishing.)

> ✅ End Phase 5: *"✅ Deine App ist mit Cloudflare verbunden — Datenbank und Speicher stehen.
> Schritt 5 von 7."*

---

## Phase 6 — Zum ersten Mal online

Build and deploy. The starter's `deploy` script builds the app and ships it in one go.

```bash
npm run deploy
```

When it succeeds, Wrangler prints a public URL (`https://<app-name>.<subdomain>.workers.dev`). Give
that URL to the owner with a celebration: *"🎉 Deine App ist live! Öffne diesen Link auf deinem
Handy oder Laptop: <URL>. Auf dem Handy kannst du im Browser-Menü 'Zum Home-Bildschirm' tippen,
dann fühlt sie sich wie eine echte App an."*

If they want to *see it locally* first instead, you can run `npm run dev` and share the local
address — but don't leave a dev server running; the live URL is the real thing.

> ✅ End Phase 6: *"✅ Deine App ist online und auf jedem Gerät erreichbar. Schritt 6 von 7 —
> fast geschafft!"*

---

## Phase 7 — Ab jetzt baust du selbst

The owner now has a working, live app. Hand off to everyday development:

1. **Switch to the project as your workspace.** For your skills to load on every future change, the
   owner should open new chats *with the project folder as the workspace*. Explain in German how, in
   the Code tab: open the folder `~/vibe-apps/<app-name>`. Tell them to start a **new chat** there
   for new features — and that they can always come back; you'll remember everything via the
   project's `CLAUDE.md`.
2. **How to ask for things** — give them concrete examples in German:
   - *"Füge ein Feld für Eiweiß in Gramm hinzu."*
   - *"Zeig mir ein Diagramm der letzten 30 Tage."*
   - *"Mach die Knöpfe blau."*
   - *"Veröffentliche die Änderung."* (you run `npm run deploy`)
   - *"Mach die letzte Änderung rückgängig."* (you run `wrangler rollback`)
3. **Reassure:** they can't break anything permanently — every change is shown before it happens and
   can be rolled back.

> ✅ End Phase 7: *"✅ Alles steht, [Name]! Du hast eine echte, eigene App gebaut und veröffentlicht.
> Ab jetzt sag mir einfach, was du als Nächstes möchtest."*

---

## The account boundary — be honest, don't surprise them

You **cannot** do these for the owner; they happen on the owner's machine/account. Name them plainly
when you reach them, never imply zero human steps:

- Creating a Cloudflare account and `npx wrangler login` (interactive browser approval).
- The very first `wrangler d1 create` / `r2 bucket create` (the ids don't exist until then).
- **Enabling R2 may require adding a payment method** to verify the account, even though usage stays
  free. This is a one-time verification, **not** a bill. Warn before, not after.

## AUTH — the one hard stop

- **Personal, single-owner tools** (the default here): **no auth.** If the app must be private,
  gate it with **Cloudflare Access**; otherwise note that anyone with the URL can use it — fine for a
  personal tracker, not for anything sensitive.
- **Apps holding *other people's* personal data** (e.g. a shop's customer reservations): **STOP.**
  Do not vibe-code authentication. Tell the owner, kindly, that this needs a real developer and a
  proper auth provider. This kit is for personal, single-owner use.

## If something breaks

Stay calm and concrete. Read the actual error, translate the *cause* into one German sentence, and
propose the next single step. Common ones: Homebrew not on PATH (run its "Next steps"); `wrangler
login` not completed in the browser; R2 blocked pending account verification; a typo in the
`database_id` pasted into `wrangler.jsonc`. Never show the owner a raw trace.
