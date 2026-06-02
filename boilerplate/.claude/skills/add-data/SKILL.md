---
name: add-data
description: Add a NEW kind of data end-to-end (new table + data layer + REST route + MCP tool + screen + tests). Use when the owner wants to store/save/track a new kind of thing — "ich will auch X speichern", a new table, a new list, a new record type (e.g. workouts, books, expenses) that is separate from the existing entries.
---

# add-data — add a new kind of data, end to end

Use this when the owner wants to store a **new kind of thing** that doesn't fit the existing `entries`
example — e.g. "ich will auch meine Workouts speichern", "ich will Bücher festhalten", "kannst du auch
meine Ausgaben tracken". You build the full vertical slice, **mirroring the `entries` feature exactly**:
migration → shared Zod schema → a pure **data.ts** function → a **REST route** (documented) → an **MCP
tool** → client helpers → a feature page → **tests** (REST + tool).

The architecture rule (see `.claude/rules/worker-data.md`): **define each operation once in `data.ts`,
then expose it as both a REST route and an MCP tool, reusing the same Zod schema.** That way the owner
gets the new data on the website *and* through the connector (phone / Chat) automatically.

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

Throughout this skill, replace `workouts` / `workout` / `Workout` with the owner's real word (kebab-case
for files and the table, e.g. `workouts`, `books`, `expenses`). Keep the table name lowercase and plural.

---

## 1. New migration (NEVER edit an applied one)

Migrations are **append-only**. Create the **next** number — if the highest is `0001_init.sql`, the new
file is `0002_<name>.sql`. Never edit an applied migration; never change the database by hand.

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

Apply it to the **local** database (the live one is updated by `npm run deploy`):

```bash
npm run db:apply:local
```

---

## 2. Shared schema + type (`src/shared/schema.ts`)

Add a Zod schema for input and one for the row, mirroring `newEntrySchema` / `entrySchema`. Derive the
type from the row schema (single source of the shape). German validation messages matter — they're what
the owner sees. Reuse the existing `idParamSchema` for the delete route; don't add a new one.

```ts
// New: workouts.
export const newWorkoutSchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(120, 'Der Name ist zu lang.'),
  amount: z.number().finite().nonnegative('Die Zahl darf nicht negativ sein.').nullable(),
  note: z.string().trim().max(2000).nullable(),
})
export type NewWorkout = z.infer<typeof newWorkoutSchema>

export const workoutSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  amount: z.number().nullable(),
  note: z.string().nullable(),
  photo_key: z.string().nullable(),
  created_at: z.string(),
})
export type Workout = z.infer<typeof workoutSchema>
```

---

## 3. The data layer (`src/worker/data.ts`) — the single source of behavior

Add pure functions for the new table, mirroring `listEntries` / `createEntry` / `deleteEntry`. No Hono,
no HTTP — just D1 + R2. The REST route AND the MCP tool will both call these.

```ts
const WORKOUT_COLUMNS = 'id, title, amount, note, photo_key, created_at'

export async function listWorkouts(db: D1Database, limit = 200): Promise<Workout[]> {
  const { results } = await db
    .prepare(`SELECT ${WORKOUT_COLUMNS} FROM workouts ORDER BY created_at DESC LIMIT ?`)
    .bind(limit)
    .all<Workout>()
  return results
}

export async function createWorkout(
  db: D1Database,
  bucket: R2Bucket,
  input: NewWorkout,
  photo?: File | null,
): Promise<Workout> {
  let photoKey: string | null = null
  if (photo instanceof File && photo.size > 0) {
    photoKey = `photos/${crypto.randomUUID()}`
    await bucket.put(photoKey, photo, {
      httpMetadata: { contentType: photo.type || 'application/octet-stream' },
    })
  }
  const createdAt = new Date().toISOString()
  const inserted = await db
    .prepare('INSERT INTO workouts (title, amount, note, photo_key, created_at) VALUES (?, ?, ?, ?, ?)')
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

export async function deleteWorkout(db: D1Database, bucket: R2Bucket, id: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT photo_key FROM workouts WHERE id = ?')
    .bind(id)
    .first<{ photo_key: string | null }>()
  if (!row) return false
  if (row.photo_key) await bucket.delete(row.photo_key)
  await db.prepare('DELETE FROM workouts WHERE id = ?').bind(id).run()
  return true
}
```

`getPhoto` is shared — reuse it for any table; don't add another.

---

## 4. REST routes (`src/worker/api.ts`) — documented, calling `data.ts`

Add the routes next to the `entries` routes (they're automatically Bearer-protected — they're below the
guard). Each wraps `describeRoute` so it lands in `/api/openapi.json`, and just parses input + calls a
`data.ts` function. Add the schemas to the existing import from `../shared/schema`.

```ts
// List the most recent workouts.
api.get(
  '/workouts',
  describeRoute({
    description: 'List the most recent workouts, newest first.',
    responses: {
      200: {
        description: 'The workouts.',
        content: { 'application/json': { schema: resolver(z.array(workoutSchema)) } },
      },
    },
  }),
  async (c) => c.json(await data.listWorkouts(c.env.DB)),
)

// Create a workout (multipart form so it can carry an optional photo).
api.post(
  '/workouts',
  describeRoute({
    description: 'Create a workout. multipart/form-data: title, optional amount, optional note, optional photo.',
    responses: {
      201: {
        description: 'The created workout.',
        content: { 'application/json': { schema: resolver(workoutSchema) } },
      },
      400: { description: 'Invalid input.' },
    },
  }),
  async (c) => {
    const form = await c.req.parseBody()
    const parsed = newWorkoutSchema.safeParse({
      title: typeof form.title === 'string' ? form.title : '',
      amount: form.amount === undefined || form.amount === '' ? null : Number(form.amount),
      note: typeof form.note === 'string' && form.note !== '' ? form.note : null,
    })
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, 400)
    }
    const photo = form.photo instanceof File ? form.photo : null
    const workout = await data.createWorkout(c.env.DB, c.env.BUCKET, parsed.data, photo)
    return c.json(workout, 201)
  },
)

// Delete a workout (and its photo, if any).
api.delete(
  '/workouts/:id',
  validator('param', idParamSchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Ungültige ID.' }, 400)
  }),
  describeRoute({
    description: 'Delete a workout by id (and its photo, if any).',
    responses: { 200: { description: 'Deleted.' }, 400: { description: 'Invalid id.' } },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    await data.deleteWorkout(c.env.DB, c.env.BUCKET, id)
    return c.json({ ok: true })
  },
)
```

The existing `/api/photo/:key` route already serves photos for any table — do **not** add another.

---

## 5. MCP tools (`src/worker/mcp.ts`) — same data, for the connector

So the owner can manage workouts from their phone/Chat too, add one tool per operation inside
`buildMcpServer`, reusing the **same Zod schema** and the **same `data.ts` functions**. Keep each
`description` under 500 characters. Photos stay website-only — no photo tool.

```ts
server.registerTool(
  'list_workouts',
  {
    title: 'List workouts',
    description: 'List the most recent workouts (newest first) as JSON: id, title, amount, note, created_at.',
    inputSchema: {},
  },
  async () => {
    const workouts = await data.listWorkouts(env.DB)
    return { content: [{ type: 'text', text: JSON.stringify(workouts) }] }
  },
)

server.registerTool(
  'create_workout',
  {
    title: 'Create workout',
    description:
      'Create a workout. Required: title. Optional: amount (a number) and note. Photos are added on the website. Returns the created workout as JSON.',
    inputSchema: {
      title: newWorkoutSchema.shape.title,
      amount: newWorkoutSchema.shape.amount.optional(),
      note: newWorkoutSchema.shape.note.optional(),
    },
  },
  async ({ title, amount, note }) => {
    const workout = await data.createWorkout(env.DB, env.BUCKET, {
      title,
      amount: amount ?? null,
      note: note ?? null,
    })
    return { content: [{ type: 'text', text: JSON.stringify(workout) }] }
  },
)

server.registerTool(
  'delete_workout',
  {
    title: 'Delete workout',
    description: 'Delete a workout by its id. Tell the owner what was removed before calling this.',
    inputSchema: { id: z.number().int().positive() },
  },
  async ({ id }) => {
    const existed = await data.deleteWorkout(env.DB, env.BUCKET, id)
    const text = existed ? `Workout ${id} gelöscht.` : `Kein Workout mit der id ${id} gefunden.`
    return { content: [{ type: 'text', text }] }
  },
)
```

If the owner uses the connector, **regenerate `claude-setup/PROJEKT-ANWEISUNGEN.md`** with the new tool
names and offer the 30-second re-paste (see the `vibe-connector` skill). New tools change behavior.

---

## 6. Tests (required) — the REST routes AND the MCP tools

**Every route and every tool gets a test.** Tests run the real Worker against a local D1 + R2.

`test/workouts.test.ts` (REST — mirror `test/entries.test.ts`, which sends the Bearer test key):

```ts
import { exports } from 'cloudflare:workers'
import { expect, it } from 'vitest'

const API = 'https://example.com/api'
const AUTH = { Authorization: 'Bearer test-secret' }

function workoutForm(fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.set(key, value)
  return form
}

it('creates a workout and lists it back', async () => {
  const created = await exports.default.fetch(`${API}/workouts`, {
    method: 'POST',
    headers: AUTH,
    body: workoutForm({ title: 'Beine', amount: '80' }),
  })
  expect(created.status).toBe(201)

  const list = await exports.default.fetch(`${API}/workouts`, { headers: AUTH })
  const workouts = (await list.json()) as Array<{ title: string }>
  expect(workouts.some((w) => w.title === 'Beine')).toBe(true)
})

it('rejects a workout without a name', async () => {
  const res = await exports.default.fetch(`${API}/workouts`, {
    method: 'POST',
    headers: AUTH,
    body: workoutForm({ title: '' }),
  })
  expect(res.status).toBe(400)
})
```

For the MCP tool, extend `test/mcp.test.ts` (or add a sibling) using the in-memory transport pattern —
prove the tool actually persists through `data.ts`:

```ts
it('creates a workout through the MCP tool', async () => {
  const server = buildMcpServer(env)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test', version: '1.0.0' })
  await server.connect(serverTransport)
  await client.connect(clientTransport)

  const res = await client.callTool({ name: 'create_workout', arguments: { title: 'Rücken', amount: 60 } })
  expect(res.isError).toBeFalsy()
  const workouts = await listWorkouts(env.DB)
  expect(workouts.some((w) => w.title === 'Rücken')).toBe(true)

  await client.close()
  await server.close()
})
```

---

## 7. Client fetch helpers + query key (`src/client/lib/api.ts`)

Add helpers next to the `entries` ones, routed through the existing **`apiFetch`** (it sends the access
key and handles the login) — never plain `fetch`. Add the type to the existing import.

```ts
export const workoutsQueryKey = ['workouts'] as const

export function listWorkouts(): Promise<Workout[]> {
  return apiFetch('/api/workouts').then((r) => jsonOrThrow<Workout[]>(r))
}

export function createWorkout(input: FormData): Promise<Workout> {
  return apiFetch('/api/workouts', { method: 'POST', body: input }).then((r) => jsonOrThrow<Workout>(r))
}

export function deleteWorkout(id: number): Promise<{ ok: true }> {
  return apiFetch(`/api/workouts/${id}`, { method: 'DELETE' }).then((r) => jsonOrThrow<{ ok: true }>(r))
}
```

`photoUrl` is shared — reuse it, don't add another.

---

## 8. Feature folder (`src/client/features/workouts/`)

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

## 9. Wire it into the screen (`src/client/App.tsx`)

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

If the owner wants the two lists as separate **tabs** instead of stacked, use Mantine's `Tabs` — but
only if they ask; stacking is the default.

---

## Verify, then tell the owner

Validate before you say a word to the owner:

1. `npm run fix` — format + lint.
2. `npm run validate` — Biome + type-check + build + **tests** (including the new ones). It must pass.
3. If the chrome-devtools MCP is connected, run `npm run dev`, open the app, and screenshot the new
   list to confirm it renders; otherwise ask the owner for a screenshot.

Then say (German):

> "Fertig — du hast jetzt eine zweite Liste für deine **Workouts**, direkt unter den bisherigen Einträgen.
> Du kannst etwas hinzufügen, ein Foto anhängen und die Zahl als Verlauf sehen — auf der Webseite und (wenn
> verbunden) auch per Connector vom Handy. Wenn alles passt, sag einfach **„veröffentliche"**."

When they say *"veröffentliche"* / *"deploy"*, run `npm run deploy` (it applies the new migration to the
live database, then publishes).

## The rules you must not break

- **Define the operation once in `data.ts`**, then expose it as a REST route (with `describeRoute`) AND
  an MCP tool reusing the same Zod schema. Tool descriptions stay **under 500 characters**.
- Database changes are **always a new numbered migration**. Never edit an applied migration or the DB by hand.
- **Every new route AND every new tool has a test** in `test/`; `npm run validate` must pass first.
- **Validate in the Worker** with the zod schema before any SQL; always use parameterized `.bind(...)`.
- **Files/photos go to R2**, only the key in D1. Reuse the shared `/api/photo/:key` route + `photoUrl`;
  photos are never an MCP tool.
- Mirror the `entries` patterns exactly (Mantine v9, `@mantine/form`, `@tanstack/react-query`, `@mantine/charts`).
- All owner-facing text is calm, plain German; never show a raw error or stack trace.
