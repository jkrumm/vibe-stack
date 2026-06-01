---
name: add-data
description: Add a NEW kind of data end-to-end (new table + API + screen). Use when the owner wants to store/save/track a new kind of thing — "ich will auch X speichern", a new table, a new list, a new record type (e.g. workouts, books, expenses) that is separate from the existing entries.
---

# add-data — add a new kind of data, end to end

Use this when the owner wants to store a **new kind of thing** that doesn't fit the existing `entries`
example — e.g. "ich will auch meine Workouts speichern", "ich will Bücher festhalten", "kannst du auch
meine Ausgaben tracken". You build the full vertical slice: database table → shared schema → API routes
→ client fetch helpers → a feature page with a form, mirroring the `entries` feature exactly.

If they just want to rename/repurpose the *single* existing thing, that is not this skill — adapt
`entries` instead. Use this when they need a **second, separate** list alongside what already exists.

## Before you touch code — confirm the shape (in German)

Ask the owner what each item has. Keep it to a title + an optional number (for the chart) + an optional
note, plus an optional photo — same shape as `entries`. Only add extra columns if they truly need them.

Say (German):

> "Alles klar — ich lege eine neue Liste für deine **Workouts** an. Jeder Eintrag bekommt einen **Namen**
> (z. B. „Beine"), eine optionale **Zahl** (die zeichne ich dir als Verlauf, z. B. das Gewicht), eine
> optionale **Notiz** und optional ein **Foto**. Passt das so, oder fehlt dir etwas?"

**AUTH hard stop:** if the new data is about *other people* (clients, members, patients, customers — their
names, contact info, anything personal), STOP. Say (German):

> "Das hier wären persönliche Daten von anderen Menschen. Dafür braucht die App einen richtigen Login und
> Datenschutz — das geht über das hinaus, was wir hier sicher selbst bauen können. Dafür solltest du eine
> Entwicklerin oder einen Entwickler dazu holen."

Throughout this skill, replace `workouts` / `workout` with the owner's real word (kebab-case for files
and the table, e.g. `workouts`, `books`, `expenses`). Keep names lowercase and plural for the table.

---

## 1. New migration (NEVER edit an applied one)

Migrations are **append-only**. Look at `migrations/` and create the **next** number — if the highest is
`0001_init.sql`, the new file is `0002_<name>.sql`. Never edit `0001_init.sql` or any file already applied;
never change the database by hand.

`migrations/0002_workouts.sql`:

```sql
-- A new kind of data: workouts. Same shape as the entries example.
-- This is a NEW migration — never edit a migration that was already applied.

CREATE TABLE IF NOT EXISTS workouts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  amount      REAL,                 -- optional number — the chart plots this
  note        TEXT,                 -- optional free text
  photo_key   TEXT,                 -- optional: the R2 object key (image itself lives in R2, not here)
  created_at  TEXT    NOT NULL      -- ISO 8601 timestamp
);

CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts (created_at);
```

Apply it to the **local** database:

```bash
npm run db:apply:local
```

The live database is updated automatically by `npm run deploy` (it runs the remote migration before
deploying) — you do not apply remote migrations by hand here.

---

## 2. Shared schema + type (`src/shared/schema.ts`)

Add a new zod schema and type alongside the existing `newEntrySchema` / `Entry`. The German validation
messages matter — they are what the owner sees.

```ts
// New: workouts.
export const newWorkoutSchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(120, 'Der Name ist zu lang.'),
  amount: z.number().finite().nonnegative('Die Zahl darf nicht negativ sein.').nullable(),
  note: z.string().trim().max(2000).nullable(),
})

export type NewWorkout = z.infer<typeof newWorkoutSchema>

export interface Workout {
  id: number
  title: string
  amount: number | null
  note: string | null
  photo_key: string | null
  created_at: string // ISO 8601
}
```

---

## 3. API routes (`src/worker/index.ts`)

Add list / create / delete routes for the new table, copying the `entries` handlers. Validate in the
Worker with the new schema, and use parameterized `.bind(...)` — never string-concatenate SQL. The photo
goes to R2 (`c.env.BUCKET`); only the key is stored in D1. The existing `/api/photo/:key` route already
serves photos for any table, so you do **not** add a new photo route.

Update the import, then add the routes (place them next to the `entries` routes, before `export default app`):

```ts
import { newEntrySchema, newWorkoutSchema, type Entry, type Workout } from '../shared/schema'
```

```ts
// List the most recent workouts.
app.get('/workouts', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, amount, note, photo_key, created_at FROM workouts ORDER BY created_at DESC LIMIT 200',
  ).all<Workout>()
  return c.json(results)
})

// Create a workout (multipart form so it can carry an optional photo).
app.post('/workouts', async (c) => {
  const form = await c.req.parseBody()

  const parsed = newWorkoutSchema.safeParse({
    title: typeof form.title === 'string' ? form.title : '',
    amount: form.amount === undefined || form.amount === '' ? null : Number(form.amount),
    note: typeof form.note === 'string' && form.note !== '' ? form.note : null,
  })
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, 400)
  }
  const { title, amount, note } = parsed.data

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
    'INSERT INTO workouts (title, amount, note, photo_key, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(title, amount, note, photoKey, createdAt)
    .run()

  const workout: Workout = {
    id: Number(inserted.meta.last_row_id),
    title,
    amount,
    note,
    photo_key: photoKey,
    created_at: createdAt,
  }
  return c.json(workout, 201)
})

// Delete a workout (and its photo, if any).
app.delete('/workouts/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return c.json({ error: 'Ungültige ID.' }, 400)

  const row = await c.env.DB.prepare('SELECT photo_key FROM workouts WHERE id = ?')
    .bind(id)
    .first<{ photo_key: string | null }>()
  if (row?.photo_key) await c.env.BUCKET.delete(row.photo_key)

  await c.env.DB.prepare('DELETE FROM workouts WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})
```

---

## 3b. A test for the new routes (required)

**Every `/api/...` route gets a test.** Create `test/workouts.test.ts`, mirroring `test/entries.test.ts`,
so create / list / validation behavior is covered. Tests run the real Worker against a local D1 + R2, so
this proves the new endpoints actually work. The new table is created automatically — `test/apply-migrations.ts`
applies every file in `migrations/`.

```ts
import { exports } from 'cloudflare:workers'
import { expect, it } from 'vitest'

const API = 'https://example.com/api'

function workoutForm(fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.set(key, value)
  return form
}

it('creates a workout and lists it back', async () => {
  const created = await exports.default.fetch(`${API}/workouts`, {
    method: 'POST',
    body: workoutForm({ title: 'Beine', amount: '80' }),
  })
  expect(created.status).toBe(201)

  const list = await exports.default.fetch(`${API}/workouts`)
  const workouts = (await list.json()) as Array<{ title: string }>
  expect(workouts.some((w) => w.title === 'Beine')).toBe(true)
})

it('rejects a workout without a name', async () => {
  const res = await exports.default.fetch(`${API}/workouts`, {
    method: 'POST',
    body: workoutForm({ title: '' }),
  })
  expect(res.status).toBe(400)
})
```

---

## 4. Client fetch helpers + query key (`src/client/lib/api.ts`)

Add helpers and a query key for the new data, next to the `entries` ones. The query key is what you
invalidate after create/delete so the list refreshes.

Update the import, then add:

```ts
import type { Entry, Workout } from '../../shared/schema'
```

```ts
export const workoutsQueryKey = ['workouts'] as const

export function listWorkouts(): Promise<Workout[]> {
  return fetch('/api/workouts').then((r) => jsonOrThrow<Workout[]>(r))
}

export function createWorkout(input: FormData): Promise<Workout> {
  return fetch('/api/workouts', { method: 'POST', body: input }).then((r) => jsonOrThrow<Workout>(r))
}

export function deleteWorkout(id: number): Promise<{ ok: true }> {
  return fetch(`/api/workouts/${id}`, { method: 'DELETE' }).then((r) => jsonOrThrow<{ ok: true }>(r))
}
```

`photoUrl` is shared — reuse it, don't add another.

---

## 5. Feature folder (`src/client/features/workouts/`)

Create three files mirroring `features/entries/`. Adjust the German labels to the owner's wording.

`src/client/features/workouts/workouts-chart.tsx`:

```tsx
import { LineChart } from '@mantine/charts'
import { Card, Title } from '@mantine/core'

import type { Workout } from '../../../shared/schema'

export function WorkoutsChart({ workouts }: { workouts: Workout[] }) {
  const data = workouts
    .filter((w) => w.amount !== null)
    .slice()
    .reverse()
    .map((w) => ({
      date: new Date(w.created_at).toLocaleDateString('de-DE'),
      amount: w.amount as number,
    }))

  if (data.length < 2) return null

  return (
    <Card withBorder padding="md" radius="md">
      <Title order={5} mb="sm">
        Verlauf
      </Title>
      <LineChart
        h={220}
        data={data}
        dataKey="date"
        series={[{ name: 'amount', label: 'Zahl', color: 'indigo.6' }]}
        curveType="monotone"
        withDots
      />
    </Card>
  )
}
```

`src/client/features/workouts/workout-form.tsx`:

```tsx
import { useState } from 'react'
import { useForm } from '@mantine/form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, FileButton, Group, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { IconCamera, IconPlus } from '@tabler/icons-react'

import { createWorkout, workoutsQueryKey } from '../../lib/api'

export function WorkoutForm() {
  const qc = useQueryClient()
  const [photo, setPhoto] = useState<File | null>(null)

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { title: '', amount: '', note: '' },
    validate: {
      title: (v) => (v.trim().length === 0 ? 'Bitte gib einen Namen ein.' : null),
      amount: (v) =>
        v.trim() !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)
          ? 'Bitte gib eine gültige, positive Zahl ein.'
          : null,
    },
  })

  const create = useMutation({
    mutationFn: createWorkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutsQueryKey })
      form.reset()
      setPhoto(null)
    },
  })

  const submit = form.onSubmit((values) => {
    const data = new FormData()
    data.set('title', values.title)
    if (values.amount.trim() !== '') data.set('amount', values.amount.trim())
    if (values.note.trim() !== '') data.set('note', values.note)
    if (photo) data.set('photo', photo)
    create.mutate(data)
  })

  return (
    <Card withBorder padding="md" radius="md">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <TextInput label="Name" placeholder="z. B. Beine" withAsterisk {...form.getInputProps('title')} />
          <TextInput
            label="Zahl (optional)"
            placeholder="z. B. Gewicht"
            inputMode="decimal"
            {...form.getInputProps('amount')}
          />
          <Textarea label="Notiz (optional)" autosize minRows={1} {...form.getInputProps('note')} />
          <Group justify="space-between">
            <FileButton onChange={setPhoto} accept="image/*" capture="environment">
              {(props) => (
                <Button {...props} variant="default" leftSection={<IconCamera size={18} />}>
                  {photo ? 'Foto geändert' : 'Foto (optional)'}
                </Button>
              )}
            </FileButton>
            <Button type="submit" leftSection={<IconPlus size={18} />} loading={create.isPending}>
              Hinzufügen
            </Button>
          </Group>
          {photo && (
            <Text size="xs" c="dimmed">
              Ausgewählt: {photo.name}
            </Text>
          )}
          {create.isError && (
            <Text size="sm" c="red">
              {(create.error as Error).message}
            </Text>
          )}
        </Stack>
      </form>
    </Card>
  )
}
```

`src/client/features/workouts/workouts-page.tsx`:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActionIcon, Alert, Card, Group, Image, Loader, Stack, Text, Title } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'

import { deleteWorkout, listWorkouts, photoUrl, workoutsQueryKey } from '../../lib/api'
import { WorkoutsChart } from './workouts-chart'
import { WorkoutForm } from './workout-form'

export function WorkoutsPage() {
  const qc = useQueryClient()
  const workouts = useQuery({ queryKey: workoutsQueryKey, queryFn: listWorkouts })
  const remove = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutsQueryKey }),
  })

  return (
    <Stack gap="lg" py="md">
      <WorkoutForm />

      {workouts.isLoading && <Loader />}
      {workouts.isError && <Alert color="red">Konnte die Workouts nicht laden.</Alert>}

      {workouts.data && workouts.data.length === 0 && (
        <Text c="dimmed" ta="center">
          Noch keine Workouts — füge oben dein erstes hinzu.
        </Text>
      )}

      {workouts.data && workouts.data.length > 0 && (
        <>
          <WorkoutsChart workouts={workouts.data} />
          <Stack gap="sm">
            <Title order={5}>Workouts</Title>
            {workouts.data.map((w) => (
              <Card key={w.id} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Group wrap="nowrap" align="flex-start">
                    {w.photo_key && (
                      <Image src={photoUrl(w.photo_key)} alt="" w={56} h={56} radius="sm" fit="cover" />
                    )}
                    <div>
                      <Text fw={600}>{w.title}</Text>
                      {w.amount !== null && <Text size="sm">{w.amount}</Text>}
                      {w.note && (
                        <Text size="sm" c="dimmed">
                          {w.note}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {new Date(w.created_at).toLocaleString('de-DE')}
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Löschen"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(w.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
```

---

## 6. Wire it into the screen (`src/client/App.tsx`)

Show both lists. The simplest KISS approach: stack the new page under the existing one inside the same
`Container`. Import it and render it in `AppShell.Main`.

```tsx
import { EntriesPage } from './features/entries/entries-page'
import { WorkoutsPage } from './features/workouts/workouts-page'
```

```tsx
<AppShell.Main>
  <Container size="sm">
    <EntriesPage />
    <WorkoutsPage />
  </Container>
</AppShell.Main>
```

If the owner wants the two lists as separate **tabs** instead of stacked, use Mantine's `Tabs`
(`<Tabs defaultValue="...">` with `Tabs.List` / `Tabs.Panel`) — but only if they ask; stacking is the
default.

---

## Verify, then tell the owner

Validate before you say a word to the owner:

1. `npm run fix` — format + lint.
2. `npm run validate` — Biome + type-check + build + **tests** (including the new one). It must pass.
3. If the chrome-devtools MCP is connected, run `npm run dev`, open the app, and screenshot the new
   list to confirm it renders; otherwise ask the owner for a screenshot.

Then say (German):

> "Fertig — du hast jetzt eine zweite Liste für deine **Workouts**, direkt unter den bisherigen Einträgen.
> Du kannst etwas hinzufügen, ein Foto anhängen und die Zahl als Verlauf sehen. Wenn alles passt, sag
> einfach **„veröffentliche"** — dann stelle ich es live."

When they say *"veröffentliche"* / *"deploy"*, run `npm run deploy` (it applies the new migration to the
live database, then publishes).

## The rules you must not break

- Database changes are **always a new numbered migration**. Never edit an applied migration or the DB by hand.
- **Every new route has a test** in `test/`; `npm run validate` must pass before you tell the owner anything.
- **Validate in the Worker** with the zod schema before any SQL; always use parameterized `.bind(...)`.
- **Files/photos go to R2**, only the key in D1. Reuse the shared `/api/photo/:key` route and `photoUrl`.
- Mirror the `entries` patterns exactly (Mantine v9, `@mantine/form`, `@tanstack/react-query`, `@mantine/charts`).
- All owner-facing text is calm, plain German; never show a raw error or stack trace.
