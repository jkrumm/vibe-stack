---
name: vibe-ops-setup
description: Set up a vibe-stack app as a BUSINESS / operations tool the owner runs by talking — define the things they manage (reservations, employees, orders, inventory, …) and the rules, then wire the data, a domain operating-manual, and a plain-language guide so the agent can run the live data. Use when the owner wants to manage a business, a team, bookings, or a shop (not just track personal data), e.g. "ich will Reservierungen und Mitarbeiter verwalten", "für mein Restaurant", "meinen Betrieb organisieren".
---

# vibe-ops-setup — make the app a tool you run by talking

Most vibe-stack apps are a personal tracker. This sets up the **operations** flavor: the database
becomes the **business's memory**, the owner **manages it by talking** to you (you read and write the
live data with the `vibe-operate` skill), and the website is the **private** visual view. Think of it
like a small in-house assistant: the owner says *"trag eine Reservierung ein"* or *"wer arbeitet
morgen?"* and you do it.

Run this once, when an owner wants to manage a real operation. It builds on the normal boilerplate —
it does **not** replace it. Speak only plain German to the owner, one step at a time.

## Step 0 — Frame it honestly (German), including privacy

Explain the model in two sentences, then the privacy reality up front:

> *"Wir bauen dir ein Werkzeug, mit dem du deinen Betrieb per Sprache verwaltest: Ich merke mir alles in
> deiner Datenbank, du sagst mir einfach, was du brauchst. Eine Webseite zeigt dir alles übersichtlich."*

> *"Wichtig: Hier stehen Daten von anderen Menschen drin (z. B. Mitarbeiter, Gäste). Deshalb wird deine
> Webseite **privat** — nur du (und wen du erlaubst) kann sie öffnen. Das richten wir mit einem
> Login-Schutz ein (Schritt 5). Ich programmiere keinen eigenen Login — das übernimmt Cloudflare sicher
> für uns."*

This is the **AUTH boundary done right**: the app holds other people's data, so it must be private —
but we use **Cloudflare Access** (a managed login), never a hand-coded one. If the owner instead wanted
*the public* (e.g. guests) to log in and create their own accounts, STOP — that needs a real developer.

## Step 1 — Interview the domain (one entity at a time)

Find the few "things" the owner manages. For each, capture a **name** (plural), its **fields** (with a
type), and its **rules**. Keep it small — 1–3 core entities to start. Ask in German, e.g.:

> *"Was möchtest du verwalten? Fangen wir mit dem Wichtigsten an — z. B. Reservierungen. Was gehört zu
> einer Reservierung? (z. B. Gast, Personenzahl, Datum, Uhrzeit, Tisch, Status)"*

> *"Gibt es Regeln, die ich immer beachten soll? (z. B. ein Tisch darf nicht doppelt belegt sein, die
> Personenzahl darf die Tisch-Größe nicht übersteigen)"*

A restaurant example you can suggest:
- **reservations** — `guest` (text), `party_size` (number), `date`, `time`, `table_no` (number),
  `status` (booked / seated / cancelled / no_show), `note`, `created_at`.
- **employees** — `name`, `role` (e.g. waiter, kitchen), `phone`, `active` (yes/no), `note`.
- **shifts** (optional) — `employee_id`, `date`, `start`, `end`.

## Step 2 — Build each entity (reuse `add-data`)

For every entity, use the **`add-data`** skill end-to-end: a numbered migration (the table), the shared
Zod schema, the Hono CRUD routes, the client fetch helpers, a feature page, and **a test**. Don't
reinvent it — `add-data` already encodes the correct patterns and the test discipline. Adapt the field
names to the owner's domain. Keep German labels.

## Step 3 — Write the operating manual (domain section in the project `CLAUDE.md`)

Append a **"## Your business (domain)"** section to the project's `CLAUDE.md`. This is what makes you
operate the data correctly every session — the entities, the **rules you must enforce on every write**,
and the German vocabulary. The rules go here (always-on), not in a path-scoped rule, because they must
apply when you create records too. Template (fill in from the interview):

```markdown
## Your business (domain) — how to run this app's data

This app is an **operations tool**. The owner manages the live data by talking; you read and write it
with the **vibe-operate** skill (`wrangler d1 execute <db-name> --remote`). Read before you write,
confirm before you write, and enforce the rules below every time.

### What we manage
- **reservations** (Reservierungen): guest, party_size, date, time, table_no, status, note, created_at.
- **employees** (Mitarbeiter): name, role, phone, active, note.

### Rules (enforce on every change)
- A table can hold only one reservation per overlapping time window — **never double-book a table**.
- party_size must not exceed the table's capacity.
- An employee can't be in two overlapping shifts.
- Status lifecycle: booked → seated → (cancelled | no_show). Don't skip backwards silently.
- Soft-cancel (set status='cancelled') rather than deleting, so the history stays.

### German vocabulary
Reservierung = reservation · Tisch = table_no · Gast = guest · Personen = party_size ·
Schicht = shift · Mitarbeiter = employee · stornieren = set status='cancelled'.
```

## Step 4 — Write small domain skills (optional but recommended)

For the main entities, add a project skill that pre-shapes the common workflows so you don't reinvent
queries each time. Put them in `.claude/skills/`. Keep each tight. Example
`.claude/skills/manage-reservations/SKILL.md`:

```markdown
---
name: manage-reservations
description: Manage restaurant reservations in the live database — list today's/a day's bookings, check table availability, add, change, or cancel a reservation. Use when the owner talks about reservations, bookings, tables, guests, "Reservierung", "Tisch", "Gast", "stornieren".
---

# manage-reservations

Operate the `reservations` table with the **vibe-operate** skill (`wrangler d1 execute <db-name>
--remote`). Always read before writing and enforce the rules in CLAUDE.md (no double-booked table,
party_size ≤ capacity, soft-cancel).

## Common jobs
- **Today's list:** `SELECT * FROM reservations WHERE date = <today> AND status != 'cancelled' ORDER BY time`. Summarise in German.
- **Check availability before booking:** read existing reservations for that table + overlapping time; only book if free.
- **Add:** confirm guest, party_size, date, time, table_no with the owner, check the rules, then INSERT with status='booked'.
- **Change/cancel:** find the reservation first (by guest + date), show it, confirm, then UPDATE (cancel = set status='cancelled').

Report back in one plain-German sentence. Never show SQL.
```

Make an equivalent `manage-staff` (or whatever the owner's second entity is). Keep the count small.

## Step 5 — Make the website private (`vibe-access`)

The site holds other people's data, so gate it. Run the **`vibe-access`** skill to switch on Cloudflare
Access (manager-only login) on the `workers.dev` URL — no custom domain needed. Do this before or right
after the first deploy.

If instead the owner wants to **manage from anywhere** (their phone, Cowork) and is the only user, the
**`vibe-api-mode`** skill is the alternative gate: one secret protects the data and the website asks for
it once. Rule of thumb — **Access** when several staff need their own logins; **API mode** for a single
owner who wants access everywhere. Don't run both.

## Step 6 — Write the owner's guide, then deploy

Write a plain-German **`ANLEITUNG.md`** into the project (see the template below) so the owner knows how
to *manage*, *build*, and *view*. Then deploy with `npm run deploy` (it validates first). Hand off:

> *"✅ Dein Betriebs-Werkzeug steht. Du verwaltest jetzt alles, indem du mit mir sprichst — und siehst es
> auf deiner privaten Webseite. In der ANLEITUNG steht, wie du was machst."*

### `ANLEITUNG.md` template (German, owner-facing — write this into the project)

```markdown
# Deine Anleitung — so benutzt du dein Werkzeug

Du machst alles, indem du mit Claude redest. Du musst nichts programmieren und keine Dateien öffnen.

## 1. Daten verwalten (dein Alltag)
Öffne Claude in der **Code-Ansicht** mit dem Ordner deiner App und schreib einfach, z. B.:
- „Zeig mir die Reservierungen heute Abend.“
- „Trag Müller für 4 Personen um 19 Uhr an Tisch 5 ein.“
- „Storniere die Reservierung von Schmidt morgen.“
- „Wer arbeitet am Freitag?“  ·  „Setz Anna am Mittwoch auf die Schicht 17–22 Uhr.“
Claude liest und ändert die echten Daten für dich und bestätigt jede Änderung.

## 2. Etwas Neues bauen (ab und zu)
Wenn etwas fehlt, sag es einfach:
- „Füge bei Reservierungen ein Feld für Allergien hinzu.“
- „Ich will auch Lieferanten verwalten.“
Claude baut es, prüft es und stellt es online, wenn du „veröffentliche“ sagst.

## 3. Alles ansehen (Webseite)
Öffne die Web-Adresse deiner App (Claude nennt sie dir) auf Handy oder Laptop. Sie ist **privat** —
beim Öffnen fragt Cloudflare nach deiner E-Mail und schickt dir einen Code zum Einloggen.

## Code-Ansicht vs. Cowork
Zum **Verwalten der echten Daten** nutze die **Code-Ansicht auf deinem Mac** (dort hat Claude den
Zugang zu deiner Datenbank). Cowork (in der Cloud) eignet sich noch nicht zum Verwalten.
```

## Independence & hard rules
- This is still **one app, one D1, one Worker** — no second deploy target. New entities are new tables
  in the same database (the business's growing memory).
- Schema changes are always a new migration; managing data is `vibe-operate` (live SQL), never a hand-
  edited migration.
- The website is **private via Cloudflare Access** — never hand-code a login. Public sign-ups for
  outside people = STOP (needs a real developer).
