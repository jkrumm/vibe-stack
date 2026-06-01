---
name: vibe-operate
description: Read and change the LIVE data in a vibe-stack app by talking — list, find, add, update, or cancel real records (reservations, employees, orders, inventory, …). Use when the owner wants to SEE or CHANGE actual data in their running app (not build a feature), e.g. "zeig mir die Reservierungen heute", "trag Müller für 4 um 19 Uhr ein", "wer arbeitet Freitag?", "storniere Tisch 5", "ändere die Telefonnummer von Anna".
---

# vibe-operate — run the live database by talking

This turns the app's **D1 database into the owner's memory**: you read the current state and write
changes to it on the owner's behalf, in plain conversation. The owner manages their business by
talking to you; they never touch SQL or files.

You reach the **live** database through `wrangler d1 execute`, authenticated by the owner's own
Cloudflare login — **no API key, no public endpoint**. This works in the Claude **Code tab** on the
owner's Mac (it needs their local `wrangler` login). Cowork/cloud sessions can't reach it.

> This skill is for **running** the app's data. Adding a new field, table, or rule is a *build* change
> — that's a migration via the `add-data` skill + `npm run deploy`, **not** a live SQL edit here.

## Always, in German

Speak to the owner only in plain German, one short message per step. Summarize results as a sentence
or a tidy list — **never** paste SQL or raw JSON. Translate any error into one calm German sentence.

## First: know the data before you touch it

You must know the tables and columns before querying. Read the project's `CLAUDE.md` (it should
describe the entities and the business rules), and confirm against the live schema when unsure:

```bash
npx wrangler d1 execute <db-name> --remote --json --command "SELECT name, sql FROM sqlite_master WHERE type='table'"
```

`<db-name>` is the `database_name` from `wrangler.jsonc` (e.g. `restaurant-db`). Use `--json` so you
can parse the result reliably.

## The golden loop — read → confirm → write → confirm

1. **Read current state first.** Before adding or changing anything, look at what's there — e.g. check
   existing reservations for that table/time before booking, or find the employee before editing them.
2. **For any change (INSERT / UPDATE / DELETE), show the owner exactly what you'll do, in German, and
   wait for a clear "ja".** Never write without confirmation.
3. **Run the write** against `--remote` (the real, live data).
4. **Read back and confirm** in one German sentence ("✅ Reservierung für Müller, 4 Personen, 19:00 an
   Tisch 5 ist eingetragen.").

```bash
# read
npx wrangler d1 execute <db-name> --remote --json --command "SELECT * FROM reservations WHERE date = '2026-06-02' ORDER BY time"

# write (only after the owner confirmed)
npx wrangler d1 execute <db-name> --remote --command "INSERT INTO reservations (guest, party_size, date, time, table_no, status, created_at) VALUES ('Müller', 4, '2026-06-02', '19:00', 5, 'booked', '2026-06-01T16:00:00Z')"
```

## Safety rules (hard — these protect the owner's real data)

- **Never** run an `UPDATE` or `DELETE` without first showing the owner what it affects and getting a
  yes. Always scope writes with a precise `WHERE id = ?`-style condition — **never** an unbounded
  `UPDATE`/`DELETE` over a whole table.
- **One thing at a time.** Change one record per confirmed step; don't batch surprising changes.
- **Enforce the business rules** written in the project's `CLAUDE.md` before writing (e.g. don't
  double-book a table for an overlapping time; party size must fit the table; an employee can't have
  two overlapping shifts). If a request breaks a rule, say so kindly and propose the fix.
- **Quote and sanitise values.** Wrap text in single quotes and escape any single quote inside it.
  Prefer values the owner actually gave; don't invent data.
- **Never** `DROP`, `ALTER`, or otherwise change the schema with this skill, and never edit a
  migration file. Structure changes go through `add-data` + `npm run deploy`.
- `--remote` is the **real, live** data. `--local` is a safe practice copy (great for trying a query
  first). Always be deliberate about which one you're using, and tell the owner when you touch live data.

## Reporting back

Turn results into a short, human summary in German. Examples:
- *"Heute Abend hast du 3 Reservierungen: 18:30 Schmidt (2), 19:00 Müller (4, Tisch 5), 20:15 Kaya (6)."*
- *"Anna ist diese Woche an Mo, Mi und Fr eingeteilt."*

If a read returns nothing: *"Für heute sind noch keine Reservierungen eingetragen."*

## When you can't reach the data

- **"not authenticated" / login errors** → the Cloudflare login expired: `npx wrangler login`
  (the owner approves in their browser), then retry. Tell them in German.
- **Cowork / no local wrangler** → say (German) that managing the live data needs the **Code tab** on
  their Mac, and offer to continue there. To manage from **anywhere** (phone, Cowork), switch the app to
  **API mode** with the `vibe-api-mode` skill — then the agent and the website use one shared secret
  (Bearer token) instead of `wrangler`.
- **A request needs a field that doesn't exist** → that's a build change: offer to add it with the
  `add-data` flow and deploy, then come back to managing.
