import { useState } from 'react'
import { useForm } from '@mantine/form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  FileButton,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { IconCamera, IconPlus } from '@tabler/icons-react'

import { createEntry, entriesQueryKey } from '../../lib/api'

export function EntryForm() {
  const qc = useQueryClient()
  const [photo, setPhoto] = useState<File | null>(null)

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { title: '', amount: '', note: '' },
    validate: {
      title: (v) => (v.trim().length === 0 ? 'Bitte gib einen Titel ein.' : null),
      amount: (v) =>
        v.trim() !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)
          ? 'Bitte gib eine gültige, positive Zahl ein.'
          : null,
    },
  })

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
    if (photo) data.set('photo', photo)
    create.mutate(data)
  })

  return (
    <Card withBorder padding="md" radius="md">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <TextInput label="Titel" placeholder="z. B. Mittagessen" withAsterisk {...form.getInputProps('title')} />
          <TextInput
            label="Zahl (optional)"
            placeholder="z. B. Kalorien"
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
