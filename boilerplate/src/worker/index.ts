// The API. This runs on Cloudflare for every request to /api/* (see wrangler.jsonc → run_worker_first).
// Everything else (the React app) is served as static files by Cloudflare, without touching this code.

import { Hono } from 'hono'
import { newEntrySchema, type Entry } from '../shared/schema'

// Bindings come from wrangler.jsonc. `wrangler types` generates the D1Database / R2Bucket types.
type Bindings = {
  DB: D1Database // the database (D1)
  BUCKET: R2Bucket // file storage (R2) — for photos
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// List the most recent entries.
app.get('/entries', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, amount, note, photo_key, created_at FROM entries ORDER BY created_at DESC LIMIT 200',
  ).all<Entry>()
  return c.json(results)
})

// Create an entry. Sent as multipart form data so it can include an optional photo.
app.post('/entries', async (c) => {
  const form = await c.req.parseBody()

  const parsed = newEntrySchema.safeParse({
    title: typeof form.title === 'string' ? form.title : '',
    amount: form.amount === undefined || form.amount === '' ? null : Number(form.amount),
    note: typeof form.note === 'string' && form.note !== '' ? form.note : null,
  })
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, 400)
  }
  const { title, amount, note } = parsed.data

  // If a photo was attached, store the file in R2 and keep only its key in the database.
  let photoKey: string | null = null
  const photo = form.photo
  if (photo instanceof File && photo.size > 0) {
    photoKey = `photos/${crypto.randomUUID()}`
    await c.env.BUCKET.put(photoKey, photo, {
      httpMetadata: { contentType: photo.type || 'application/octet-stream' },
    })
  }

  const createdAt = new Date().toISOString()
  const inserted = await c.env.DB.prepare(
    'INSERT INTO entries (title, amount, note, photo_key, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(title, amount, note, photoKey, createdAt)
    .run()

  const entry: Entry = {
    id: Number(inserted.meta.last_row_id),
    title,
    amount,
    note,
    photo_key: photoKey,
    created_at: createdAt,
  }
  return c.json(entry, 201)
})

// Delete an entry (and its photo, if any).
app.delete('/entries/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return c.json({ error: 'Ungültige ID.' }, 400)

  const row = await c.env.DB.prepare('SELECT photo_key FROM entries WHERE id = ?')
    .bind(id)
    .first<{ photo_key: string | null }>()
  if (row?.photo_key) await c.env.BUCKET.delete(row.photo_key)

  await c.env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// Stream a stored photo back from R2. The `{.+}` lets the key contain a slash (photos/<id>).
app.get('/photo/:key{.+}', async (c) => {
  const object = await c.env.BUCKET.get(c.req.param('key'))
  if (!object) return c.notFound()

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
})

export default app
