import {
  ActionIcon,
  AppShell,
  Container,
  Group,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { IconMoon, IconSun } from '@tabler/icons-react'

import { EntriesPage } from './features/entries/entries-page'

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const computed = useComputedColorScheme('light')
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Farbschema wechseln"
      onClick={() => setColorScheme(computed === 'dark' ? 'light' : 'dark')}
    >
      {computed === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  )
}

export function App() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4}>Meine App</Title>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="sm">
          <EntriesPage />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
