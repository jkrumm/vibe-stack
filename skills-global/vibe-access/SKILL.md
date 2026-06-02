---
name: vibe-access
description: Make a vibe-stack app's website PRIVATE so only the owner (and people they name) can open it, using Cloudflare Access — works on the free workers.dev URL, no custom domain needed. Use when an app holds other people's data, or the owner says it must be private / "nur für mich" / "nicht öffentlich" / "nur mein Team soll das sehen" / wants a login.
---

# vibe-access — per-person staff logins for the website

A vibe-stack app is **already private**: the built-in single-owner **access key** gates the website,
the REST API, and the connector. So for a **single owner you do NOT need this skill** — the key is
enough, and it keeps the connector (phone / Chat) working.

Use this skill only when **several staff each need their OWN login** (their own email, not a shared
key). Cloudflare **Access** adds a per-person login page in front of the site, allowing exactly the
emails the owner lists, on the free `*.workers.dev` URL (no domain to buy), with a one-time email code.
It's a managed login from Cloudflare — never hand-code one.

## Before you turn this on — the important trade-off

Enabling Access on the whole `*.workers.dev` URL gates **every** path, including `/api/*`, `/mcp`, and
the OAuth endpoints. That **breaks the connector and the Bearer API** — Claude (and any tool) can't get
through an interactive email login. So:

- **Single owner** → don't use Access. The built-in key already makes it private *and* keeps the
  connector / phone-API working.
- **Staff need their own website logins** → use Access, but know it protects the **website only in
  practice**: staff use the site (behind their email login); the "from any chat" connector won't work
  through Access. The website still uses the shared `OWNER_SECRET` behind the scenes for its API calls,
  so a device enters that key once *and* the staffer signs in with their email each session.
- Keeping **both** the per-person door *and* the connector requires scoping the Access application to
  exclude `/api/*` + `/mcp` + the OAuth paths (an advanced, path-based Access policy) — note this to the
  owner; don't attempt it unless they specifically need both.

> The owner's `wrangler`-based data management (`vibe-operate`) goes around Access entirely (it uses the
> Cloudflare login, not the website). The connector does **not** — it goes through the front door.

## This is a dashboard click-through (guide gently, in German)

Access policies aren't set with `wrangler`, so walk the owner through the Cloudflare dashboard, one
click per message, plain German. Make sure the app has been deployed at least once first (so the
`workers.dev` URL exists).

1. **Open the app's settings.** *"Öffne im Browser das Cloudflare-Dashboard, klicke links auf
   **Workers & Pages**, dann auf deine App, dann oben auf **Settings** und auf **Domains & Routes**."*
2. **Turn Access on.** *"In der Zeile mit deiner `*.workers.dev`-Adresse klickst du auf **Enable
   Cloudflare Access**."* (If Cloudflare first asks to set up **Zero Trust**, follow the free sign-up —
   choose the **Free** plan, it does not ask for payment for a small team.)
3. **Allow your email.** *"Klicke auf **Manage Cloudflare Access** — dort trägst du deine E-Mail-Adresse
   ein (und die deiner Mitarbeiter, falls sie es auch sehen sollen) und speicherst."* This creates an
   Access application with a policy that allows exactly those emails.
4. **Test it.** *"Öffne deine App-Adresse in einem privaten Browser-Fenster. Es sollte nach deiner
   E-Mail fragen und dir einen Code schicken — gib den Code ein, dann öffnet sich deine App. Fremde
   ohne deine Erlaubnis kommen nicht rein."*

## How login feels for the owner / their team

When they open the site, Cloudflare asks for their email and emails them a **one-time code** (default
"one-time PIN" method). After entering it they're in for a while (a session), so it's not every click.
No password to remember.

## Free tier

Cloudflare's **Zero Trust Free** plan covers a small team comfortably (well within its free user limit),
so a manager plus a handful of staff costs nothing. If the dashboard ever pushes a paid step for a tiny
team, stop and tell the owner — don't sign them up for anything paid; the free plan is enough here.

## Changing or removing access later

Same screen (**Settings → Domains & Routes → Manage Cloudflare Access**): add or remove allowed emails,
or turn Access off to make the site public again. Tell the owner they can adjust who gets in anytime.

## If they later want a nicer address

A custom domain (e.g. `meinrestaurant.de`) is **optional** and separate: buy a domain, add it to
Cloudflare as a zone, point the app's route at it, and Access protects that hostname the same way.
Not required — the `workers.dev` URL with Access is already private and free.

## If something is confusing

Translate the cause into one calm German sentence and give the next single click. Common ones: the app
wasn't deployed yet (no URL to protect → deploy first); Zero Trust not set up yet (do the free sign-up);
the test email's code went to spam (check the spam folder).
