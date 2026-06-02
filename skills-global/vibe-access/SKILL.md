---
name: vibe-access
description: Add per-person staff logins to a vibe-stack app's website using Cloudflare Access — the agent sets it up ITSELF via the Cloudflare API (works on the free workers.dev URL, no domain). Use only when SEVERAL people each need their OWN login (their own email); a single owner is already private via the access key. Triggers: "mein Team soll sich einloggen", "Mitarbeiter-Logins", "jeder mit eigener E-Mail", "staff logins".
---

# vibe-access — per-person staff logins (the agent sets up Cloudflare Access)

A vibe-stack app is **already private**: the built-in single-owner **access key** gates the website,
the REST API, and the connector. **A single owner does NOT need this skill** — the key is enough and
keeps the connector (phone / Chat) working.

Use this **only** when **several staff each need their OWN login** — their own email, not a shared
key. Cloudflare **Access** adds a per-person email login in front of the website, on the free
`*.workers.dev` URL (no domain to buy), with a one-time email code. The agent provisions it **itself**
via the Cloudflare API — the owner's only jobs are to create one scoped token once and name the emails.

Speak only plain German to the owner, one calm sentence per step.

## The one human step — a scoped Cloudflare API token

`wrangler login` can do almost everything, but it **cannot** touch Cloudflare Access — only the
Cloudflare REST API can, and that needs an **API token**. Creating + copying a token (it's shown once)
is the one thing only the owner can do. Walk them through it, German, **least-privilege**:

> *"Für eigene Logins deiner Mitarbeiter brauche ich einmal einen Cloudflare-Schlüssel. Ich sage dir
> genau, wo du klickst — es dauert eine Minute, danach mache ich alles automatisch."*

1. Open `dash.cloudflare.com` → profile (top right) → **My Profile** → **API Tokens** → **Create Token**
   → **Create Custom Token**. Name it e.g. `vibe-access`.
2. Add these two permissions, both **Edit**, scope **Account → (their account)**:
   - `Access: Apps and Policies`
   - `Access: Organizations, Identity Providers, and Groups`
3. Optionally set a TTL (e.g. expires in a month) — safer. **Continue → Create Token → copy it once.**
4. The owner pastes it to you. Store it in the Mac keychain (account-wide — one token serves all their
   apps); never write it to a file:

   ```bash
   security add-generic-password -U -s "vibe-cloudflare-api-token" -a "cloudflare" -w "<the token>"
   ```

> *"Danke — ich habe den Schlüssel sicher hinterlegt. Ab hier mache ich den Rest selbst."*

## What the agent does itself (via the Cloudflare API)

Gather the inputs (the agent does this — don't ask the owner):

```bash
TOKEN=$(security find-generic-password -s "vibe-cloudflare-api-token" -a "cloudflare" -w)
ACCOUNT_ID="<read it from: npx wrangler whoami>"
HOST="<app-name>.<subdomain>.workers.dev"        # the live URL, without https://
API="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access"
```

**Pre-flight — is Zero Trust set up?** On a brand-new account the Access org must exist before any app
can be created (a first POST can 403 just because the org is missing). Check first:

```bash
curl -s "$API/organizations" -H "Authorization: Bearer $TOKEN"
```

If that returns no org (404), guide the owner through the one-time **free Zero Trust sign-up** (choose
the **Free** plan — no payment for a small team), then continue. The email one-time-code login itself
needs no setup once an email is in a policy.

**1 — Keep the connector + website-API reachable.** Cloudflare evaluates the **most specific matching
path first**, so a bypass app scoped to `$HOST/api` should take precedence over the root app for `/api`
traffic. Create one **bypass** app per non-website path so Access steps aside there. Those paths stay
protected by the app's **own** OAuth / Bearer (`OWNER_SECRET`) after Access steps aside — *bypass here
means "let the app authenticate it", not "public"* (our Worker already has auth, which is why we don't
need Cloudflare's Service-Auth / Linked-App pattern). Repeat for each, using the **exact** domain string
(no scheme, no trailing slash, one leading slash): `$HOST/api`, `$HOST/mcp`, `$HOST/authorize`,
`$HOST/token`, `$HOST/register`, `$HOST/.well-known`.

```bash
curl -s -X POST "$API/apps" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "<app-name> API (bypass)",
  "type": "self_hosted",
  "domain": "'"$HOST"'/api",
  "policies": [{ "name": "Allow all on API path", "decision": "bypass", "include": [{ "everyone": {} }] }]
}'
```

**2 — Require an email login for the website itself** (the catch-all `/`), allowing exactly the emails
the owner named:

```bash
curl -s -X POST "$API/apps" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "<app-name> Website",
  "type": "self_hosted",
  "domain": "'"$HOST"'",
  "session_duration": "24h",
  "policies": [{ "name": "Allowed staff", "decision": "allow",
    "include": [ { "email": { "email": "owner@example.com" } }, { "email": { "email": "staff@example.com" } } ] }]
}'
```

Ask the owner only for the **emails to allow** (and to confirm the test).

**3 — Verify the connector survived (BLOCKING — don't skip).** The whole design hinges on the bypass
apps taking precedence over the root app, so prove it before telling the owner anything:

```bash
curl -s "https://$HOST/.well-known/oauth-authorization-server"
```

This **must** return JSON. If instead it returns a Cloudflare Access **login page** (HTML), the root app
is also intercepting the connector paths — **delete the root Website app immediately** (the built-in
access key keeps the site private in the meantime), then re-check. Once that's clean, open the site in a
private window (or ask the owner): it should ask for an email and send a one-time code, **and** the
owner's connector (phone / Chat) should still answer. Translate any failure into one calm German
sentence and fix it (usually a missing token permission).

> The owner's `wrangler` data management (`vibe-operate`) and the connector go **around** Access (the
> bypass apps in step 1) — only the website's visual view is behind the email login.

## The dual login — say this plainly (German), so nobody panics

Staff face two things and it looks confusing without a word of warning:

> *"Deine Mitarbeiter melden sich mit ihrer **E-Mail** an — das ist ihre persönliche Tür. Einmal pro
> Gerät geben sie zusätzlich deinen **Zugangsschlüssel** ein. Danach läuft alles, ganz normal."*

## If the API path can't be made to work — dashboard fallback

If the API keeps erroring and you can't fix it, fall back to the dashboard click-through, gently in
German, one click per message: *Workers & Pages → deine App → Settings → Domains & Routes → **Enable
Cloudflare Access** → **Manage Cloudflare Access*** → add the allowed emails. **Caveat to tell the
owner:** this dashboard switch gates the **whole** address, so the **connector (phone / Chat) stops
working** — only use this fallback if the owner doesn't need the connector. The API path above avoids
this by bypassing the connector/API paths.

## Free tier, changing access, custom domain

- **Free tier:** Cloudflare's **Zero Trust Free** plan covers a small team comfortably. If the dashboard
  ever pushes a paid step for a handful of people, stop and tell the owner — the free plan is enough.
- **Add / remove people later:** update the Website app's `allow` policy (same API call, new email list)
  or, via the dashboard, *Manage Cloudflare Access*. Tell the owner they can change who gets in anytime.
- **Nicer address (optional):** a custom domain is separate and not required — the `workers.dev` URL with
  Access is already private and free.

## If something is confusing

Translate the cause into one calm German sentence and give the next single step. Common ones: the app
wasn't deployed yet (no URL to protect → deploy first); the token is missing a permission (re-create it
with both Access permissions, Edit); Zero Trust not set up (do the free sign-up); the test email's code
went to spam.
