---
name: vibe-ai
description: Turn on AI inside a vibe-stack app's server so the WEBSITE (and autonomous tasks) can summarise, translate, or parse free text into saved data — using Cloudflare Workers AI, no API key and no extra account. Use when the owner wants the app itself to be "smart": "fass das zusammen", "übersetze", "erkenne automatisch", "aus dem Text rausziehen", "ich tippe einfach 'handvoll Erdbeeren mit Skyr' und es trägt sich ein", a free-text field that fills in fields by itself, or an AI step in a server task.
---

# vibe-ai — AI tasks on the server (summarise / translate / parse free text)

This adds **Cloudflare Workers AI** to the app's own server. It runs on the binding the owner already
has (no API key, no second account, no secret), on Cloudflare's **free tier**. The app gets typed AI
"tasks": validated text in → validated data out, as normal `/api/...` routes.

## First decide: does this actually need server AI?

A lot of "use AI" wishes are already covered — don't add this when you don't need it:

- **Translate a list once / clean up data once** (e.g. translate an English food table into German) →
  **you** do it right now in the chat and write the rows to the database. No server AI.
- **The owner logs by talking to Claude** (phone / desktop / web connector) → **Claude is already the
  AI.** It parses "handvoll Erdbeeren mit zwei Löffel Skyr" and calls the app's `create_entry` tool.
  Adding a server-AI step there would just have Claude ask a weaker model — pointless.

**Use `vibe-ai` when the *website itself* must be smart with no Claude in the loop**, for example:

- The owner (or a customer/staff) types free text **into a form** and the app fills in the fields.
- An **autonomous task** (a scheduled job, an API call from another tool) needs to summarise/translate
  without a human present.

So: server AI is for the **website + programmatic** path. The connector path needs none of this.

## What's already shipped (you only switch it on)

The boilerplate already contains the tested helper **`src/worker/ai.ts`** with two functions:

- `parseToSchema(env.AI, { text, schema, instruction })` → turns free text into a value that fits a
  **Zod schema you already have**, in JSON Mode, and **re-validates** the model's answer before
  trusting it. Returns `{ ok: true, data }` or `{ ok: false, reason: 'unavailable' | 'unparseable' }`.
- `translate(env.AI, { text, target })` → plain text in, translated text out (default German).

It is DORMANT until you do the three small wirings below. Its logic is covered by `test/ai.test.ts`,
so the gate already proves the parsing + validation + graceful-fallback behaviour.

## Switch it on (you do all of this yourself, then `npm run validate`)

### 1. Add the AI binding

In `wrangler.jsonc`, add the binding (next to the other bindings). No id, no secret — it just works:

```jsonc
"ai": { "binding": "AI" }
```

Then regenerate types so `c.env.AI` is known:

```bash
npm run cf-typegen
```

### 2. Let the API see the binding

In `src/worker/api.ts`, add `AI` to the `Bindings` type:

```ts
export type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  OWNER_SECRET: string
  AI: Ai // Cloudflare Workers AI (summarise / translate / parse) — added by vibe-ai
}
```

### 3. Add one AI task (the worked example: free text → a new entry)

Still in `src/worker/api.ts`, import the helpers and add a protected route. It reuses **`newEntrySchema`**
— the exact schema the form and the MCP tool already use — as the parse target:

```ts
import * as ai from './ai'
// (newEntrySchema is already imported from '../shared/schema')

// Parse free text ("handvoll Erdbeeren mit zwei Löffel Skyr") into the fields of a new entry.
api.post(
  '/ai/parse',
  validator('json', z.object({ text: z.string().trim().min(1, 'Bitte gib einen Text ein.') }), (r, c) => {
    if (!r.success) return c.json({ error: 'Bitte gib einen Text ein.' }, 400)
  }),
  describeRoute({
    description: 'Parse free text into a new entry (title + optional amount + note) using AI.',
    responses: {
      200: { description: 'The parsed fields.', content: { 'application/json': { schema: resolver(newEntrySchema) } } },
      422: { description: 'The text could not be understood.' },
      503: { description: 'AI briefly unavailable (e.g. the daily free limit is used up).' },
    },
  }),
  async (c) => {
    const { text } = c.req.valid('json')
    const result = await ai.parseToSchema(c.env.AI, {
      text,
      schema: newEntrySchema,
      instruction:
        'Extrahiere EINEN Eintrag aus dem Text: title (kurz, sprechend), amount (eine Zahl wie Kalorien oder Menge, sonst null), note (sonst null). Antworte nur als JSON nach dem Schema. Behalte die Sprache des Nutzers.',
    })
    if (!result.ok) {
      const unavailable = result.reason === 'unavailable'
      const error = unavailable
        ? 'Die KI ist gerade nicht erreichbar (eventuell ist das Tageslimit erreicht). Bitte später nochmal.'
        : 'Ich konnte den Text nicht sicher verstehen. Bitte etwas genauer schreiben.'
      return c.json({ error }, unavailable ? 503 : 422)
    }
    return c.json(result.data)
  },
)
```

The route is **automatically Bearer-protected** (it's under `/api/*`, not in the `isPublic` list) and
it **documents itself** in `/api/openapi.json` like every other route. It never trusts the model: the
answer is re-validated by `newEntrySchema` before it goes back.

### 4. Add the route's tests (deterministic — they do NOT call the live model)

Add to `test/` (e.g. extend `test/entries.test.ts` or a new `test/ai-route.test.ts`). Test the auth
gate and input validation — the paths that return **before** the AI call, so they pass offline. The
AI logic itself is already covered by `test/ai.test.ts` (stubbed binding):

```ts
it('requires the access key on /api/ai/parse', async () => {
  const res = await exports.default.fetch('https://example.com/api/ai/parse', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'irgendwas' }),
  })
  expect(res.status).toBe(401)
})

it('rejects an empty text', async () => {
  const res = await exports.default.fetch('https://example.com/api/ai/parse', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-secret', 'content-type': 'application/json' },
    body: JSON.stringify({ text: '' }),
  })
  expect(res.status).toBe(400)
})
```

> The **live model call** only works against the real Cloudflare account, so it is verified on
> **deploy**, not in local tests. That's why the binding is injected into `ai.ts` and unit-tested with a
> stub — the gate stays offline and deterministic.

### 5. Run the gate

```bash
npm run fix && npm run validate
```

Only say **"fertig"** in German once it passes. Then, if the owner wants a button for it, use `add-form`
to add a free-text box on the page that POSTs to `/api/ai/parse` and pre-fills the entry form.

## What the owner needs to know (say it in plain German)

- **It's free, with a daily limit.** Workers AI gives **10,000 "Neurons" per day** for the whole
  account — roughly a few hundred parse/translate calls a day. When it's used up, the app says one calm
  sentence ("*Die KI macht heute Pause, morgen geht's weiter*") and **keeps working** — the owner can
  still type the fields by hand. Nothing breaks. *(On the free Workers plan the limit is a hard stop,
  not a surprise bill.)*
- **The AI can be wrong.** It's a good helper, not perfect — so the website should **show the parsed
  result and let the owner confirm** before saving, never save silently. For a tracker that's plenty.
- **For a business (the ops flavor), be stricter.** If the number matters (a price, a stock count, a
  reservation size), **always parse → show → let the owner confirm/correct → then save**. Tell the
  owner: the AI proposes, you approve.

## More AI tasks (the pattern)

Every AI task is the same shape — reach for the `ai.ts` helpers, never call `env.AI.run` by hand in a
route:

- **Summarise** notes/messages → `parseToSchema(env.AI, { text, schema: z.object({ summary: z.string() }), instruction: '…' })`, or `translate(...)` for plain text.
- **Translate** a field on the way in/out → `translate(env.AI, { text, target: 'Deutsch' })`.
- **Categorise** free text into one of a few choices → a Zod `z.enum([...])` schema as the parse target.

Rules that keep it safe and current:

- **Reuse a Zod schema as the parse target** (define it once in `src/shared/schema.ts`). The model's
  output is validated by it — so a wrong answer becomes a clean "unparseable", never bad data.
- **Always handle `{ ok: false }`** with one calm German sentence and a manual fallback. Never let an
  AI failure block the owner.
- **Keep the model id in `src/worker/ai.ts`** (one place). It's `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  today (good at German + JSON Mode). If you ever change models, `/research` Workers AI first and keep
  it on the JSON-Mode list.
- **Don't reach for the Vercel AI SDK / OpenRouter / an API key.** The native binding is lighter, has no
  key to manage, and stays on one account — that's the whole point.

## If something is confusing

Translate the cause into one calm German sentence and give the next step. Common ones: the binding
wasn't added yet (do step 1 + `npm run cf-typegen`); the daily limit is used up (wait, or the owner
types it by hand — the app already handles this); the model didn't understand (ask the owner to write
a bit more clearly — `parseToSchema` already returned `unparseable`, so no bad data was saved).
