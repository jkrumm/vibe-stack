import { exports } from 'cloudflare:workers'
import { expect, it } from 'vitest'

// These tests run the real Worker (src/worker/index.ts) against a local D1 database and R2 bucket,
// inside the actual Cloudflare runtime. `exports.default.fetch(...)` calls the Hono app exactly as
// Cloudflare would for an /api/* request — so this is a true end-to-end test of the API.
//
// The data routes are Bearer-protected: tests send the test key (set in vitest.config.ts as
// OWNER_SECRET = 'test-secret'). The discovery and photo routes are public.

const API = 'https://example.com/api'
const AUTH = { Authorization: 'Bearer test-secret' }

function entryForm(fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.set(key, value)
  return form
}

it('creates an entry and lists it back', async () => {
  const created = await exports.default.fetch(`${API}/entries`, {
    method: 'POST',
    headers: AUTH,
    body: entryForm({ title: 'Milch', amount: '2' }),
  })
  expect(created.status).toBe(201)
  const entry = (await created.json()) as { id: number; title: string; amount: number | null }
  expect(entry.title).toBe('Milch')
  expect(entry.amount).toBe(2)

  const list = await exports.default.fetch(`${API}/entries`, { headers: AUTH })
  expect(list.status).toBe(200)
  const entries = (await list.json()) as Array<{ title: string }>
  expect(entries.some((e) => e.title === 'Milch')).toBe(true)
})

it('rejects an entry without a title', async () => {
  const res = await exports.default.fetch(`${API}/entries`, {
    method: 'POST',
    headers: AUTH,
    body: entryForm({ title: '' }),
  })
  expect(res.status).toBe(400)
})

it('requires the access key on data routes (401 without a token)', async () => {
  const noToken = await exports.default.fetch(`${API}/entries`)
  expect(noToken.status).toBe(401)

  const wrongToken = await exports.default.fetch(`${API}/entries`, {
    headers: { Authorization: 'Bearer wrong' },
  })
  expect(wrongToken.status).toBe(401)
})

it('stores a photo in R2 and serves it back', async () => {
  const form = new FormData()
  form.set('title', 'Mit Foto')
  form.set('photo', new File([new Uint8Array([1, 2, 3, 4])], 'photo.png', { type: 'image/png' }))

  const created = await exports.default.fetch(`${API}/entries`, {
    method: 'POST',
    headers: AUTH,
    body: form,
  })
  expect(created.status).toBe(201)
  const entry = (await created.json()) as { photo_key: string | null }
  expect(entry.photo_key).toMatch(/^photos\//)

  // The photo route is public (served by unguessable key), so no auth header here.
  const photo = await exports.default.fetch(`${API}/photo/${entry.photo_key}`)
  expect(photo.status).toBe(200)
  await photo.arrayBuffer() // consume the R2 body (required by the test runtime)
})

it('deletes an entry', async () => {
  const created = await exports.default.fetch(`${API}/entries`, {
    method: 'POST',
    headers: AUTH,
    body: entryForm({ title: 'Zu löschen' }),
  })
  const entry = (await created.json()) as { id: number }

  const deleted = await exports.default.fetch(`${API}/entries/${entry.id}`, {
    method: 'DELETE',
    headers: AUTH,
  })
  expect(deleted.status).toBe(200)
})

it('answers the health/discovery endpoint', async () => {
  const res = await exports.default.fetch(API)
  expect(res.status).toBe(200)
  const info = (await res.json()) as { ok: boolean; auth: string }
  expect(info.ok).toBe(true)
  expect(info.auth).toBe('bearer')
})
