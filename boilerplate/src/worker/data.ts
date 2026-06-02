// Pure data operations over D1 + R2 — the single source of behavior. The REST API (api.ts) and the
// MCP server (mcp.ts) are thin adapters that both call these functions, so a feature is implemented
// once and exposed two ways (website + REST, and the connector). No Hono and no HTTP live here.

import type { Entry, NewEntry } from '../shared/schema'

const COLUMNS = 'id, title, amount, note, photo_key, created_at'

// List the most recent entries, newest first.
export async function listEntries(db: D1Database, limit = 200): Promise<Entry[]> {
  const { results } = await db
    .prepare(`SELECT ${COLUMNS} FROM entries ORDER BY created_at DESC LIMIT ?`)
    .bind(limit)
    .all<Entry>()
  return results
}

// Create an entry. An optional photo is stored in R2; only its key is kept in the database.
export async function createEntry(
  db: D1Database,
  bucket: R2Bucket,
  input: NewEntry,
  photo?: File | null,
): Promise<Entry> {
  let photoKey: string | null = null
  if (photo instanceof File && photo.size > 0) {
    photoKey = `photos/${crypto.randomUUID()}`
    await bucket.put(photoKey, photo, {
      httpMetadata: { contentType: photo.type || 'application/octet-stream' },
    })
  }

  const createdAt = new Date().toISOString()
  const inserted = await db
    .prepare(
      'INSERT INTO entries (title, amount, note, photo_key, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(input.title, input.amount, input.note, photoKey, createdAt)
    .run()

  return {
    id: Number(inserted.meta.last_row_id),
    title: input.title,
    amount: input.amount,
    note: input.note,
    photo_key: photoKey,
    created_at: createdAt,
  }
}

// Delete an entry and its photo (if any). Returns whether a row actually existed.
export async function deleteEntry(db: D1Database, bucket: R2Bucket, id: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT photo_key FROM entries WHERE id = ?')
    .bind(id)
    .first<{ photo_key: string | null }>()
  if (!row) return false
  if (row.photo_key) await bucket.delete(row.photo_key)
  await db.prepare('DELETE FROM entries WHERE id = ?').bind(id).run()
  return true
}

// Fetch a stored photo object from R2, for streaming back through the API.
export function getPhoto(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return bucket.get(key)
}
