import type { Entry } from '../../shared/schema'

// Talk to the API (the Worker). The screen calls these; the Worker answers under /api/*.
//
// The data routes are protected by the owner's access key (one secret). The key lives in the
// browser's localStorage; every data call sends it as `Authorization: Bearer <key>`. If the key is
// missing or wrong the Worker answers 401 — we clear it and reload, which shows the login screen
// again (see api-key-gate.tsx). Photos are public by unguessable URL, so they need no key.

const API_KEY_STORAGE = 'vibe-api-key'

export const getApiKey = (): string => localStorage.getItem(API_KEY_STORAGE) ?? ''
export const setApiKey = (key: string): void => localStorage.setItem(API_KEY_STORAGE, key.trim())
export const clearApiKey = (): void => localStorage.removeItem(API_KEY_STORAGE)

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${getApiKey()}` },
  })
  if (res.status === 401) {
    clearApiKey()
    location.reload() // wrong or missing key → ask for it again
    throw new Error('Nicht angemeldet.')
  }
  return res
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Anfrage fehlgeschlagen (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const entriesQueryKey = ['entries'] as const

export function listEntries(): Promise<Entry[]> {
  return apiFetch('/api/entries').then((r) => jsonOrThrow<Entry[]>(r))
}

export function createEntry(input: FormData): Promise<Entry> {
  return apiFetch('/api/entries', { method: 'POST', body: input }).then((r) =>
    jsonOrThrow<Entry>(r),
  )
}

export function deleteEntry(id: number): Promise<{ ok: true }> {
  return apiFetch(`/api/entries/${id}`, { method: 'DELETE' }).then((r) =>
    jsonOrThrow<{ ok: true }>(r),
  )
}

// The address of a stored photo, for an <img> / Mantine <Image>. Public route — no key needed.
export function photoUrl(key: string): string {
  return `/api/photo/${key}`
}
