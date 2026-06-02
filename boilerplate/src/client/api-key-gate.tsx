import { Button, Center, PasswordInput, Stack, Text, Title } from '@mantine/core'
import { type ReactNode, useState } from 'react'

import { getApiKey, setApiKey } from './lib/api'

// A tiny login screen: the owner enters their access key once, it is saved in this browser, and the
// app opens. The key is the same OWNER_SECRET the Worker checks. If the key is later rejected (e.g.
// it was rotated) the app reloads and lands back here (see api.ts → apiFetch).
export function ApiKeyGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => getApiKey() !== '')
  const [value, setValue] = useState('')

  if (unlocked) return <>{children}</>

  return (
    <Center h="100vh" p="md">
      <Stack maw={360} w="100%">
        <Title order={4}>Anmeldung</Title>
        <Text size="sm" c="dimmed">
          Gib deinen Zugangsschlüssel ein, um deine App zu öffnen.
        </Text>
        <PasswordInput
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="Zugangsschlüssel"
        />
        <Button
          disabled={value.trim() === ''}
          onClick={() => {
            setApiKey(value)
            setUnlocked(true)
          }}
        >
          Öffnen
        </Button>
      </Stack>
    </Center>
  )
}
