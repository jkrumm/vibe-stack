---
name: vibe-deploy
description: Publish a vibe-stack app live, read its public URL, view logs, and roll back. Use when the owner says deploy / publish / go live / roll back / veröffentlichen / online stellen / rückgängig.
---

# vibe-deploy

Publish a vibe-stack app, hand the owner its live URL, view logs when something misbehaves, and roll
back safely. Works for ANY vibe-stack app the owner has built.

## When to use

The owner says any of: *"veröffentlichen"*, *"online stellen"*, *"deploy"*, *"go live"*,
*"die Änderung soll live gehen"* — or for undo: *"rückgängig machen"*, *"zurück"*, *"roll back"*.

## What `npm run deploy` does (one command, everything in sync)

The starter's `deploy` script (in `package.json`) is:

```
npm run deploy  →  build  +  wrangler d1 migrations apply DB --remote  +  wrangler deploy
```

So a single command **builds** the app, **applies pending database migrations to the LIVE database**
(keeping the live data structure in sync with the code), and **publishes**. You never apply remote
migrations by hand — `deploy` does it. Run it from the project folder.

## Steps — publish

1. Say what you're about to do, in one German sentence:

   > *"Ich veröffentliche deine Änderung jetzt — das dauert einen Moment."*

2. Run it from the project root:

   ```bash
   npm run deploy
   ```

3. When it succeeds, Wrangler prints the public URL in this shape:

   ```
   https://<app-name>.<subdomain>.workers.dev
   ```

   Read that exact line from the output and give the URL to the owner. Celebrate + reassure:

   > *"🎉 Deine Änderung ist live! Hier ist deine App: <URL>"*
   > *"Keine Sorge, ich kann jederzeit zurückrollen, falls dir etwas nicht gefällt."*

   On a phone they can open the browser menu and tap *"Zum Home-Bildschirm"* so it feels like a real
   app — mention it once:

   > *"Tipp: Auf dem Handy kannst du im Browser-Menü 'Zum Home-Bildschirm' tippen — dann fühlt sich
   > deine App wie eine echte App an."*

## Steps — roll back (undo the last deploy)

The owner says *"rückgängig"* / *"roll back"*. Reassure first, then run it:

> *"Kein Problem — ich mache die letzte Veröffentlichung rückgängig."*

```bash
wrangler rollback
```

Then confirm:

> *"✅ Erledigt — die vorherige Version ist wieder live."*

## Steps — view logs (when something misbehaves live)

When the owner reports the live app acting up, watch the live request logs to see the real cause:

```bash
wrangler tail
```

This streams the Worker's live logs. Read them yourself, find the cause, and translate it into ONE
calm German sentence + the next single step. Never paste raw log output to the owner. (Logs are also
visible in the Cloudflare dashboard, since `observability` is enabled in `wrangler.jsonc`.) Stop the
stream with `Ctrl+C` when done.

## Common failure — not logged in

If `npm run deploy` (or any `wrangler` command) fails with an authentication / "not logged in" /
"You are not authenticated" error, the owner's Cloudflare login expired. Re-run the login — it opens
their browser and only they can approve it:

```bash
npx wrangler login
```

Tell the owner, in German:

> *"Deine Cloudflare-Anmeldung ist abgelaufen. Es öffnet sich gleich dein Browser — melde dich an
> und klicke auf 'Allow', dann veröffentliche ich automatisch weiter."*

After they approve, re-run `npm run deploy`.

## Reminders

- Always run from the project folder (`~/vibe-apps/<app-name>`).
- Don't leave a `npm run dev` server running for the owner — the live URL from `npm run deploy` is
  the real thing.
- One command keeps code AND the live database in sync; never apply remote migrations separately.
