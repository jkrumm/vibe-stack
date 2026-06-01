import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ActionIcon,
  Alert,
  Card,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'

import { deleteEntry, entriesQueryKey, listEntries, photoUrl } from '../../lib/api'
import { EntriesChart } from './entries-chart'
import { EntryForm } from './entry-form'

export function EntriesPage() {
  const qc = useQueryClient()
  const entries = useQuery({ queryKey: entriesQueryKey, queryFn: listEntries })
  const remove = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesQueryKey }),
  })

  return (
    <Stack gap="lg" py="md">
      <EntryForm />

      {entries.isLoading && <Loader />}
      {entries.isError && <Alert color="red">Konnte die Einträge nicht laden.</Alert>}

      {entries.data && entries.data.length === 0 && (
        <Text c="dimmed" ta="center">
          Noch keine Einträge — füge oben deinen ersten hinzu.
        </Text>
      )}

      {entries.data && entries.data.length > 0 && (
        <>
          <EntriesChart entries={entries.data} />
          <Stack gap="sm">
            <Title order={5}>Einträge</Title>
            {entries.data.map((e) => (
              <Card key={e.id} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Group wrap="nowrap" align="flex-start">
                    {e.photo_key && (
                      <Image src={photoUrl(e.photo_key)} alt="" w={56} h={56} radius="sm" fit="cover" />
                    )}
                    <div>
                      <Text fw={600}>{e.title}</Text>
                      {e.amount !== null && <Text size="sm">{e.amount}</Text>}
                      {e.note && (
                        <Text size="sm" c="dimmed">
                          {e.note}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {new Date(e.created_at).toLocaleString('de-DE')}
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Löschen"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(e.id)}
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
