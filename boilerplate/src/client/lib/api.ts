import type { Entry } from '../../shared/schema'

// Talk to the API (the Worker). The screen calls these; the Worker answers under /api/*.

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Anfrage fehlgeschlagen (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const entriesQueryKey = ['entries'] as const

export function listEntries(): Promise<Entry[]> {
  return fetch('/api/entries').then((r) => jsonOrThrow<Entry[]>(r))
}

export function createEntry(input: FormData): Promise<Entry> {
  return fetch('/api/entries', { method: 'POST', body: input }).then((r) => jsonOrThrow<Entry>(r))
}

export function deleteEntry(id: number): Promise<{ ok: true }> {
  return fetch(`/api/entries/${id}`, { method: 'DELETE' }).then((r) => jsonOrThrow<{ ok: true }>(r))
}

// The address of a stored photo, for an <img> / Mantine <Image>.
export function photoUrl(key: string): string {
  return `/api/photo/${key}`
}
