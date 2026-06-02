// The REST API + its OpenAPI contract. One Hono app, base path /api. Every data route documents
// itself with describeRoute (so it shows up in /api/openapi.json) and calls a pure function in
// data.ts — the SAME functions the MCP server (mcp.ts) reuses. So one feature = one data function,
// surfaced as both a REST route and an MCP tool.
//
// Auth: every /api/* route needs `Authorization: Bearer <OWNER_SECRET>`, EXCEPT the public
// discovery (/api), docs (/api/openapi.json, /api/docs) and photo (/api/photo/...) routes. A valid
// token means "the owner" — the same single secret the website and the OAuth consent screen check.

import { Hono } from 'hono'
import { describeRoute, openAPIRouteHandler, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { entrySchema, idParamSchema, newEntrySchema } from '../shared/schema'
import * as data from './data'

export type Bindings = {
  DB: D1Database // the database (D1)
  BUCKET: R2Bucket // file storage (R2) — for photos
  OWNER_SECRET: string // the owner's access key (set via `wrangler secret put OWNER_SECRET`)
}

export const api = new Hono<{ Bindings: Bindings }>().basePath('/api')

// A tiny human-readable docs page (Scalar, loaded from a CDN — no dependency added). The
// machine-readable contract other tools and the connector read is /api/openapi.json.
const DOCS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>API</title></head><body>
<script id="api-reference" data-url="/api/openapi.json"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body></html>`

// Which paths stay public (no token). Everything else is protected by default — a new route added
// below is automatically behind the key, which is the safe default for a single-owner app.
function isPublic(path: string): boolean {
  return (
    path === '/api' ||
    path === '/api/' ||
    path === '/api/openapi.json' ||
    path === '/api/docs' ||
    path.startsWith('/api/photo/')
  )
}

// Require the owner's key on every /api/* route except the public ones. A single high-entropy
// secret = "the owner". A plain-German 401 is what the website turns into its login screen.
api.use('/*', async (c, next) => {
  if (isPublic(c.req.path)) return next()
  const header = c.req.header('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (token !== c.env.OWNER_SECRET) return c.json({ error: 'Nicht angemeldet.' }, 401)
  return next()
})

// --- Public: discovery + docs ---

// Health + discovery: confirms the API is up, names the app, advertises the auth scheme.
api.get(
  '/',
  describeRoute({
    description: 'Health and discovery: confirms the API is up and names the app.',
    responses: { 200: { description: 'API info' } },
  }),
  (c) => c.json({ ok: true, name: 'vibe-stack app', auth: 'bearer' }),
)

// The OpenAPI 3.1 contract (machine-readable) and a small human docs page.
api.get(
  '/openapi.json',
  openAPIRouteHandler(api, {
    documentation: {
      info: {
        title: 'vibe-stack app API',
        version: '1.0.0',
        description:
          'The data API for this app. Send `Authorization: Bearer <key>` on data routes.',
      },
    },
  }),
)
api.get('/docs', (c) => c.html(DOCS_HTML))

// Stream a stored photo back from R2. Public by unguessable key so <img> tags work without a header.
api.get('/photo/:key{.+}', async (c) => {
  const object = await data.getPhoto(c.env.BUCKET, c.req.param('key'))
  if (!object) return c.notFound()

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
})

// --- Protected: the entries data (mirrors the MCP tools in mcp.ts) ---

// List the most recent entries.
api.get(
  '/entries',
  describeRoute({
    description: 'List the most recent entries, newest first.',
    responses: {
      200: {
        description: 'The entries.',
        content: { 'application/json': { schema: resolver(z.array(entrySchema)) } },
      },
    },
  }),
  async (c) => c.json(await data.listEntries(c.env.DB)),
)

// Create an entry. Sent as multipart form data so it can include an optional photo (so it is parsed
// and validated by hand here rather than with the JSON validator middleware).
api.post(
  '/entries',
  describeRoute({
    description:
      'Create an entry. multipart/form-data: title, optional amount, optional note, optional photo.',
    responses: {
      201: {
        description: 'The created entry.',
        content: { 'application/json': { schema: resolver(entrySchema) } },
      },
      400: { description: 'Invalid input.' },
    },
  }),
  async (c) => {
    const form = await c.req.parseBody()
    const parsed = newEntrySchema.safeParse({
      title: typeof form.title === 'string' ? form.title : '',
      amount: form.amount === undefined || form.amount === '' ? null : Number(form.amount),
      note: typeof form.note === 'string' && form.note !== '' ? form.note : null,
    })
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, 400)
    }

    const photo = form.photo instanceof File ? form.photo : null
    const entry = await data.createEntry(c.env.DB, c.env.BUCKET, parsed.data, photo)
    return c.json(entry, 201)
  },
)

// Delete an entry (and its photo, if any). The :id path param is validated + documented.
api.delete(
  '/entries/:id',
  validator('param', idParamSchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Ungültige ID.' }, 400)
  }),
  describeRoute({
    description: 'Delete an entry by id (and its photo, if any).',
    responses: { 200: { description: 'Deleted.' }, 400: { description: 'Invalid id.' } },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    await data.deleteEntry(c.env.DB, c.env.BUCKET, id)
    return c.json({ ok: true })
  },
)
