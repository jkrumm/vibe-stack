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
   payment method, clicking "Allow"). Name them plainly when you reach them — see *The account
   boundary* below.
4. **KISS.** Don't add anything not in this script. The single-owner login (one access key) is
   already built in — don't hand-code any other auth, add extra services, or a second deploy target.
   The starter is deliberately minimal.
5. **Verified facts live in the project `CLAUDE.md`.** Trust them over your training data; the
   ecosystem moves. If you must look something up, prefer the project's skills.
6. **Announce each milestone.** End every phase with a short German "✅" line so the owner feels
   progress (e.g. *"✅ Geschafft — deine Werkzeuge sind bereit. Weiter zu Schritt 3 von 8."*).

There are **8 phases**. Tell the owner that up front, in one sentence, so they know it's finite.

---

## Phase 1 — Hallo & kurzes Interview

**First, check you can actually work.** In the desktop app's **Code tab** you only have a chat box
and file access *after* a folder is selected. If it looks like the owner has **no folder open** (you
can't see files / there's no project), guide them gently, in German, before anything else:

> *"Damit ich für dich arbeiten kann, brauche ich einen Ordner. Klicke oben auf **Code**, wähle
> **Local**, dann **Select folder** — und lege einen neuen, leeren Ordner an, z. B. `vibe-app`. Danach
> schreib mir einfach wieder hier."*

Confirm the basics gently: *"Du bist auf einem Mac, hast Claude Pro und die Claude-Desktop-App —
richtig?"* If they're on Windows, on the Free plan, or only have the web chat (no Code tab), stop and
explain kindly what they need (this kit is macOS-only; Claude Code needs at least a Pro plan and the
desktop app).

Then greet them warmly and explain in two sentences: there's a short one-time setup (a few clicks and
a couple of questions), then they just chat to build their app.

Ask a **short** interview (one question at a time, conversational):
1. *Wie heißt du?* (their name)
2. *Was soll deine erste App können?* (Often already in their opening message — confirm it instead
   of re-asking.)
3. *Was möchtest du damit erreichen?* (the goal / why — for their profile)
4. *Gibt es etwas, das dir bei Technik Sorgen macht?* (so you can reassure and adapt)

Keep their answers — you'll write them into their personal profile in Phase 3. Don't create any
files yet.

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

  Wait for them to confirm it finished. Homebrew almost always prints **"Next steps"** about adding
  itself to the PATH — run those lines for them (or have them paste them), **then have them open a
  fresh Terminal/chat** so `brew` and `node` are found. (If `node` "isn't found" right after install,
  this is the cause.)
- **Install Node + git** (you can run this yourself once brew exists):

  ```bash
  brew install node git
  ```

Explain in one German sentence what this is: *"Das sind die Bausteine, mit denen deine App auf
deinem Mac läuft und gebaut wird."* Do **not** introduce a version manager (nvm/fnm/mise) — one
current Node is all this needs.

Re-check `node -v` and `git --version` to confirm.

> ✅ End Phase 2: *"✅ Deine Werkzeuge sind bereit. Schritt 2 von 8 geschafft."*

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
- My apps use the vibe-stack setup: one Cloudflare Worker (React + Mantine UI on the screen; a Hono
  API + D1 database + R2 file storage behind it; an MCP connector + a single-owner login so I can use
  the app from my phone/Claude and it stays private to me). See each project's CLAUDE.md.
- Before telling me something is done, the agent checks it with `npm run validate` (and a screenshot
  when it can). To publish a change I just say "deploy". To undo one I say "roll back".
- Keep things simple (KISS): the fewest moving parts that work. Beyond the built-in single-owner login,
  don't add extra auth or services unless I explicitly ask and it's truly needed.
```

Explain it plainly: *"Ich lege ein kleines Profil über dich an, damit ich dich in jedem Gespräch
gut verstehe und immer auf Deutsch mit dir rede."*

> ✅ End Phase 3: *"✅ Dein Profil steht und ich kenne jetzt Cloudflare. Schritt 3 von 8."*

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

> ✅ End Phase 4: *"✅ Dein Projekt steht und ist startklar. Schritt 4 von 8."*

---

## Phase 5 — Cloudflare verbinden (database, file storage, Zugangsschlüssel)

This is where the owner's account comes in. Read *The account boundary* below first, then walk them
through it gently. Besides the database and file storage, the app needs **two more things to run**: a
small token store (`OAUTH_KV`) and the owner's **access key** (`OWNER_SECRET`) — both set up here,
before the first deploy, because the Worker won't start without them.

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

**5e — Create the token store (KV)** that the app's login provider needs:

```bash
npx wrangler kv namespace create OAUTH_KV
```

Copy the `id` it prints into `wrangler.jsonc` under `kv_namespaces` → the `OAUTH_KV` binding (replace
`REPLACE_WITH_YOUR_KV_ID`). The app won't start without this, so don't skip it.

**5f — Create the owner's access key** (`OWNER_SECRET`). This one secret protects the website, the API,
and the connector. Generate it, set it on the app, keep a copy in the Mac keychain (so you can manage
the data later), and show it to the owner **once**:

```bash
KEY=$(openssl rand -hex 32)
echo "$KEY" | npx wrangler secret put OWNER_SECRET
security add-generic-password -U -s "<app-name>-owner-secret" -a "<app-name>" -w "$KEY"
echo "Dein Zugangsschlüssel: $KEY"
```

Tell the owner, in German: *"Das ist dein **Zugangsschlüssel** — behandle ihn wie ein Passwort. Ich
habe ihn sicher hinterlegt. Du gibst ihn gleich beim ersten Öffnen deiner Webseite ein (und später,
wenn du die App mit Claude verbindest). Danach musst du ihn dir nicht merken."* The `vibe-connector`
skill encapsulates 5e + 5f if you'd rather run it as one step.

> ✅ End Phase 5: *"✅ Deine App ist mit Cloudflare verbunden — Datenbank, Speicher und dein
> Zugangsschlüssel stehen. Schritt 5 von 8."*

---

## Phase 6 — Zum ersten Mal online

Build, check, and deploy in one go. `npm run deploy` first runs the full check (format, types, build,
tests) so a broken app can never go live, then applies database migrations and publishes.

```bash
npm run deploy
```

Two things to expect on the **very first** deploy — tell the owner so neither surprises them:
- Wrangler may ask, in the terminal, to **register a free `workers.dev` subdomain** ("Would you like
  to register a workers.dev subdomain now?"). The answer is **yes**.
- The brand-new URL can be briefly unreachable (an error/"523") for up to a minute while it goes live.
  **Wait and try again** — this is normal, not a failure.

**Verify it actually works before you celebrate.** When deploy succeeds Wrangler prints a public URL
(`https://<app-name>.<subdomain>.workers.dev`). The app now opens with a small **login screen** — the
owner enters the **access key** from Phase 5f, then sees the app. Confirm it's really up:
- If the **chrome-devtools MCP** is connected (see Phase 8), open the URL there, take a screenshot
  (you'll see the login screen — that's correct), and check the console is error-free.
- Otherwise, ask the owner to open the URL, enter their key, and tell you what they see.

Only once it loads, celebrate: *"🎉 Deine App ist live und läuft! Öffne diesen Link auf deinem Handy
oder Laptop: <URL> — beim ersten Mal gibst du deinen Zugangsschlüssel ein. Auf dem Handy kannst du im
Browser-Menü 'Zum Home-Bildschirm' tippen, dann fühlt sie sich wie eine echte App an."*

> ✅ End Phase 6: *"✅ Deine App ist online und auf jedem Gerät erreichbar. Schritt 6 von 8 —
> fast geschafft!"*

---

## Phase 7 — Mit Claude verbinden (von überall benutzen)

The app already ships an MCP server + REST API; this phase turns it into a **Claude connector** so the
owner can use it from **anywhere** — phone, desktop/web Chat, a Project, scheduled routines — not just
the Code tab. Run the **`vibe-connector`** skill; it does the work. The short version of what it does:

1. **The connector URL** is the live app URL **+ `/mcp`** (`https://<app-name>.<subdomain>.workers.dev/mcp`).
2. **Walk the owner through adding it** in Claude (only they can click): *Settings → Connectors → Add
   custom connector → paste the `/mcp` URL → on the app's login page enter the **access key** → Erlauben*.
   Explain it in German, one line at a time (the skill scripts this).
3. **Hand over the paste bundle.** Fill in `claude-setup/` from this app (the connector tool names, the
   app name) and walk the owner through pasting the **Project instructions** (and, once, the global
   preferences) — see the `vibe-connector` skill + `claude-setup/EINFUEGEN.md`. This is only needed for
   normal **Chat / Cowork**; the Code tab and routines read the repo files directly.

If the owner is on a surface without custom connectors, that's fine — they still use the app from the
**website** and you still build from the **Code tab**; the connector is the "from any chat" bonus. Say:

> *"Geschafft — deine App ist jetzt mit Claude verbunden. Du kannst sie auch vom Handy oder im normalen
> Chat benutzen: sag einfach, was du brauchst, und ich erledige es in deiner App."*

> ✅ End Phase 7: *"✅ Deine App ist mit Claude verbunden — du kannst sie von überall benutzen.
> Schritt 7 von 8."*

---

## Phase 8 — Ab jetzt baust du selbst

The owner now has a working, live app. Hand off to everyday development:

1. **Switch to the project as your workspace.** For the project's skills and rules to load on every
   future change, the owner should open new chats *with the project folder as the workspace*. Explain
   in German how, in the Code tab: open the folder `~/vibe-apps/<app-name>`. Tell them to start a
   **new chat there for each new feature** (a fresh chat keeps things fast and clear) — and that they
   can always come back; you'll remember everything via the project's `CLAUDE.md`.
2. **How to ask for things** — give them concrete examples in German:
   - *"Füge ein Feld für Eiweiß in Gramm hinzu."*
   - *"Zeig mir ein Diagramm der letzten 30 Tage."*
   - *"Mach die Knöpfe blau."*
   - *"Veröffentliche die Änderung."* (you run `npm run deploy`)
   - *"Mach die letzte Veröffentlichung rückgängig."* (you run `wrangler rollback`)
3. **How the agent works for them** — reassure, in German: *"Bei jeder Änderung prüfe ich automatisch,
   dass alles funktioniert, bevor ich dir 'fertig' sage. Wenn etwas komisch aussieht, schick mir gern
   einen Screenshot — dann sehe ich, was du siehst."*
4. **Safety net — be precise.** Every change is shown as a diff and they click **Accept** or
   **Reject** before it happens — that's the real per-change undo. `wrangler rollback` undoes the last
   *published* version. Nothing the owner does in chat can permanently break their app or their data.

**Optional power-up — "Augen für den Agenten" (chrome-devtools MCP).** This lets you open the running
app yourself, take screenshots, and read errors — so you can verify changes visually without bugging
the owner. It's optional; the app works fine without it. To offer it (in German):
- The project ships a ready config at `.mcp.json.example`. Enable it by copying it to `.mcp.json`:
  `cp .mcp.json.example .mcp.json`.
- Tell them: *"Wenn du das nächste Mal ein neues Gespräch in diesem Ordner startest, fragt Claude
  einmal: 'Diesen Projekt-Server erlauben?' — bitte auf **Erlauben** klicken."* Verify with `/mcp`
  (they should see `chrome-devtools` with a ✓).
- It runs hidden and in a throwaway browser profile (no access to their logged-in accounts), so
  there's nothing to worry about. Prerequisite: Chrome is installed (it almost always is) and Node
  ≥ 20.19 (installed in Phase 2).

> ✅ End Phase 8: *"✅ Alles steht, [Name]! Du hast eine echte, eigene App gebaut und veröffentlicht:
> sie kann [kurze Zusammenfassung], läuft unter <URL>, ist mit Claude verbunden (du kannst sie also auch
> vom Handy benutzen), und deine Daten liegen sicher in deiner Datenbank. Ab jetzt sag mir einfach, was
> du als Nächstes möchtest."*

---

## If this is a business tool, not a personal tracker

If the owner's app is really about running a small operation — reservations, employees, orders,
inventory (anything with *other people's* data) — switch to the **operations flavor** instead of (or
right after) the basic entries example:

1. Run the **`vibe-ops-setup`** skill — it interviews the owner about what they manage and the rules,
   builds the data (each entity gets REST routes **and** connector tools), and writes the domain
   operating-manual + a plain-German guide (`ANLEITUNG.md`).
2. The website is **already private** (the single-owner access key from Phase 5f) — that satisfies the
   AUTH boundary for a single owner. Only if several **staff** need their *own* logins, layer
   **Cloudflare Access** with the **`vibe-access`** skill (a managed login, never hand-coded).
3. From then on the owner **manages by talking** — from anywhere via the **connector** (Phase 7), and
   from the Code tab you can also use raw SQL with the **`vibe-operate`** skill. Day-to-day management
   no longer needs the Mac: the connector works on the phone and in Chat.

Public sign-ups for outside people (customers making their own accounts) remain a STOP — that needs a
real developer.

---

## The account boundary — be honest, don't surprise them

You **cannot** do these for the owner; they happen on the owner's machine/account. Name them plainly
when you reach them, never imply zero human steps:

- Creating a Cloudflare account and `npx wrangler login` (interactive browser approval).
- The very first `wrangler d1 create` / `r2 bucket create` / `kv namespace create` (the ids don't
  exist until then).
- **Enabling R2 may require adding a payment method** to verify the account, even though usage stays
  free. This is a one-time verification, **not** a bill. Warn before, not after.
- **The first deploy may ask to register a free `workers.dev` subdomain** (answer yes) — an
  interactive terminal step only the owner sees.
- **Adding the custom connector in Claude** and entering the access key on the consent page (Phase 7)
  — clicks only the owner can do, in the Claude app.

## AUTH — the one hard stop

- **Single-owner is built in** (the default here): the **access key** (`OWNER_SECRET`, Phase 5f) gates
  the website, the API, and the connector — the app is private to the owner from the first deploy. A
  valid key/token always means "the owner". Don't hand-code any other login.
- **Several staff, each their own login** → layer **Cloudflare Access** (`vibe-access`). Still a
  managed login, not hand-coded.
- **Apps where *other people* sign up and log in with their own accounts**, or that hold *other
  people's* personal data beyond what one owner manages: **STOP.** Tell the owner, kindly, that this
  needs a real developer and a proper auth provider.

## If something breaks

Stay calm and concrete. Read the actual error, translate the *cause* into one German sentence, and
propose the next single step. The common ones:

- **No folder open in the Code tab** → you can't see files or type-to-build; guide them to
  *Code → Local → Select folder* (Phase 1).
- **`node`/`npm`/`brew` "not found" after install** → Homebrew's PATH "Next steps" weren't run, or the
  shell is stale; run those lines and have them open a fresh Terminal/chat (Phase 2).
- **`wrangler login` not completed** in the browser → re-run `npx wrangler login`, have them click
  "Allow".
- **Cloudflare login expired mid-session** (commands suddenly fail with an auth error) → re-run
  `npx wrangler login`.
- **R2 blocked / "add R2 subscription"** → account needs the one-time payment-method verification;
  guide them, then re-run.
- **First deploy asks for a subdomain / URL 523s** → answer yes to the subdomain prompt; wait ~1 min
  and retry the URL — it's going live, not broken.
- **Wrong/blank `database_id`** in `wrangler.jsonc` → re-check it against `npx wrangler d1 list`.
- **Deploy fails about KV / `OAUTH_KV`** → the namespace id is missing or still the placeholder in
  `wrangler.jsonc`; create it (`npx wrangler kv namespace create OAUTH_KV`) and paste the real id (Phase 5e).
- **Website always shows the login again / API returns "nicht angemeldet"** → `OWNER_SECRET` isn't set
  or the entered key is wrong; re-check (`npx wrangler secret list`) or set it again (Phase 5f).
- **Connector won't connect in Claude** → the app must be deployed and the URL must end in **`/mcp`**;
  the owner enters the access key on the consent page (Phase 7).

Never show the owner a raw trace.
