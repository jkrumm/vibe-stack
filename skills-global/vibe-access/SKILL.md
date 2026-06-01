---
name: vibe-access
description: Make a vibe-stack app's website PRIVATE so only the owner (and people they name) can open it, using Cloudflare Access — works on the free workers.dev URL, no custom domain needed. Use when an app holds other people's data, or the owner says it must be private / "nur für mich" / "nicht öffentlich" / "nur mein Team soll das sehen" / wants a login.
---

# vibe-access — put a login in front of the website

By default a vibe-stack site is public (anyone with the URL can open it). The moment an app holds
**other people's data** (employees, guests, customers), the website must be **private**. Cloudflare
**Access** does this for us: it shows a login page in front of the site and only lets in the emails the
owner allows. It works on the free `*.workers.dev` URL — **no domain to buy** — and Cloudflare emails
the allowed person a one-time code to sign in.

This is the **right way** to add privacy: a managed login from Cloudflare, never a hand-coded one.

> Note: the **owner's own data-management is unaffected**. You read/write the live data with the
> `vibe-operate` skill via `wrangler` (the owner's Cloudflare login), which goes around Access entirely.
> Access only protects the *website* that humans open in a browser.

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
