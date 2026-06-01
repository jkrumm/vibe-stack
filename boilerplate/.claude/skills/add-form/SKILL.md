---
name: add-form
description: Build a Mantine form to let the owner enter data (text, number, note, choice, photo) and save it via the API. Use when the owner says "form / input / add a field / let me enter / Formular / Eingabe / eingeben".
---

# add-form

Build a `@mantine/form` form on a page that collects input and saves it via a `useMutation` that
POSTs to the Worker and refreshes the list. The boilerplate already ships one working example:
`src/client/features/entries/entry-form.tsx`. Read it first — copy its shape, don't reinvent it.

## When to use

The owner wants to type something in and save it: a new entry, a new field on an entry, a settings
form, anything with inputs and a save button. Triggers: *"ein Formular"*, *"ein Eingabefeld"*,
*"ich möchte eingeben…"*, *"add a field"*, *"let me enter…"*.

If the form needs a **new kind of field that the database doesn't store yet** (e.g. a new column),
use the `add-data` skill first to add the migration + API field, then come back here for the input.

## German you say to the owner

- Before: *"Ich baue dir ein Formular mit den Feldern: <Liste>. Passt das so?"*
- Validation: *"Falsche Eingaben fange ich ab und sage dir auf Deutsch, was fehlt."*
- After: *"Fertig — du kannst jetzt <X> eingeben und auf ‚Speichern' tippen. Sag ‚veröffentliche', wenn es live gehen soll."*

## The pattern (matches entry-form.tsx)

### 1. The form: `useForm` with `mode: 'uncontrolled'` + `initialValues` + `validate`

`initialValues` are all **strings** (text inputs give strings; convert numbers when sending).
Each `validate` message is **one plain-German sentence**. Return `null` when the value is fine.

```tsx
const form = useForm({
  mode: 'uncontrolled',
  initialValues: { title: '', amount: '', note: '', category: '' },
  validate: {
    title: (v) => (v.trim().length === 0 ? 'Bitte gib einen Titel ein.' : null),
    amount: (v) =>
      v.trim() !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)
        ? 'Bitte gib eine gültige, positive Zahl ein.'
        : null,
  },
})
```

### 2. The inputs — pick what fits, always spread `form.getInputProps(name)`

`label` and `placeholder` are German. Use `withAsterisk` for required fields. The 16px font that
stops iPhones zooming on focus is already set in `theme.ts` — do NOT add `size` props.

```tsx
import { Select, Textarea, TextInput } from '@mantine/core'

// Text
<TextInput label="Titel" placeholder="z. B. Mittagessen" withAsterisk {...form.getInputProps('title')} />

// A number typed by the owner — keep it a TextInput with inputMode="decimal"
// (the example does this; values stay strings and you convert on send).
<TextInput label="Zahl (optional)" placeholder="z. B. Kalorien" inputMode="decimal" {...form.getInputProps('amount')} />

// Longer free text
<Textarea label="Notiz (optional)" autosize minRows={1} {...form.getInputProps('note')} />

// One choice from a fixed list
<Select
  label="Kategorie"
  placeholder="Bitte wählen"
  data={['Essen', 'Sport', 'Arbeit']}
  {...form.getInputProps('category')}
/>
```

If you want a real spinner-number field instead of a text field, use `NumberInput` (also in
`theme.ts`). It binds a `number`, so don't `.trim()` it later:

```tsx
import { NumberInput } from '@mantine/core'
<NumberInput label="Menge" min={0} {...form.getInputProps('amount')} />
```

### 3. A photo / file — `FileButton` (with camera on phones)

A file is **not** part of `useForm`; hold it in its own `useState`. `capture="environment"` opens
the rear camera directly on phones. The button label is German.

```tsx
import { useState } from 'react'
import { Button, FileButton, Group, Text } from '@mantine/core'
import { IconCamera } from '@tabler/icons-react'

const [photo, setPhoto] = useState<File | null>(null)

<FileButton onChange={setPhoto} accept="image/*" capture="environment">
  {(props) => (
    <Button {...props} variant="default" leftSection={<IconCamera size={18} />}>
      {photo ? 'Foto geändert' : 'Foto (optional)'}
    </Button>
  )}
</FileButton>
{photo && <Text size="xs" c="dimmed">Ausgewählt: {photo.name}</Text>}
```

### 4. Save: `useMutation` that POSTs, then invalidates the query key + resets the form

Build a `FormData` (so a file can ride along), call the api helper from `src/client/lib/api.ts`, and
on success `invalidateQueries` the **same query key the list uses** so the screen refreshes, then
`form.reset()`. The button shows the spinner via `create.isPending`; errors show one German line.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntry, entriesQueryKey } from '../../lib/api'

const qc = useQueryClient()

const create = useMutation({
  mutationFn: createEntry,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: entriesQueryKey })
    form.reset()
    setPhoto(null)
  },
})

const submit = form.onSubmit((values) => {
  const data = new FormData()
  data.set('title', values.title)
  if (values.amount.trim() !== '') data.set('amount', values.amount.trim())
  if (values.note.trim() !== '') data.set('note', values.note)
  if (values.category !== '') data.set('category', values.category)
  if (photo) data.set('photo', photo)
  create.mutate(data)
})
```

### 5. The markup — wrap in a `<form onSubmit={submit}>`, with loading + error state

```tsx
import { Button, Card, Group, Stack, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'

return (
  <Card withBorder padding="md" radius="md">
    <form onSubmit={submit}>
      <Stack gap="sm">
        {/* ...inputs from step 2 + the FileButton from step 3... */}
        <Group justify="flex-end">
          <Button type="submit" leftSection={<IconPlus size={18} />} loading={create.isPending}>
            Hinzufügen
          </Button>
        </Group>
        {create.isError && (
          <Text size="sm" c="red">
            {(create.error as Error).message}
          </Text>
        )}
      </Stack>
    </form>
  </Card>
)
```

## Wiring up

- A **brand-new field** must also exist on the API/DB end. If `data.set('category', …)` sends
  something the Worker and `newEntrySchema` (`src/shared/schema.ts`) don't yet accept, run the
  `add-data` skill first, or the Worker will reject it (the owner sees your German error line).
- The api helper (`createEntry` / `listEntries`) and `entriesQueryKey` live in
  `src/client/lib/api.ts`. Reuse them; add a new helper there only for a genuinely new endpoint.
- Drop the form component onto its page (e.g. `features/entries/entries-page.tsx`) above the list.

## Check it

Tell the owner in German once it's in: *"Ich hab das Formular eingebaut. Sag ‚veröffentliche', dann
schalte ich es live, und du kannst es ausprobieren."* You don't run `npm run dev` for them — the
live URL is the real thing.
