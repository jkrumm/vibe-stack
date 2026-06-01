---
name: add-page
description: Grow the UI with a new screen, section, tab, or navigation — use when the owner wants "a new page / another screen / a second section / a tab / navigation" or says "neue Seite / noch ein Bildschirm / Bereich / Tab / Navigation".
---

# add-page — grow the app's UI

The boilerplate is a **single-page app with no router** (see `src/client/App.tsx`: one `AppShell`
rendering `<EntriesPage />` inside a `<Container>`). Growing the UI almost never needs URLs. Pick the
**smallest** option that fits the owner's request.

## Decision (KISS — go top to bottom, stop at the first match)

1. **One more block on the same screen** (e.g. a summary card above the list) → just add a component
   to the feature and render it. No navigation.
2. **A few distinct screens the owner switches between** (e.g. "Eintragen" vs "Auswertung" vs
   "Einstellungen") → **Mantine `Tabs`** inside `AppShell.Main`. This is the default for "another
   screen / section / tab". No new dependency, no URLs.
3. **Many sections / a persistent side menu feel** → `AppShell.Navbar` with a list of buttons that
   set the active section. Still no router.
4. **The owner truly needs shareable/bookmarkable URLs** (each screen a real address, browser back
   button per screen, deep links) → only then add a router. This is a **new dependency** and a real
   step up in complexity — confirm with the owner first (see last section).

Before editing, read `src/client/App.tsx` and `src/client/features/entries/entries-page.tsx` so the
new code matches the existing style.

---

## Option 1 — A new section/feature folder (no navigation)

Create a feature folder, build the component, render it in the existing layout.

`src/client/features/summary/summary-panel.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Card, Group, Text, Title } from '@mantine/core'

import { entriesQueryKey, listEntries } from '../../lib/api'

export function SummaryPanel() {
  const entries = useQuery({ queryKey: entriesQueryKey, queryFn: listEntries })
  const total = entries.data?.length ?? 0

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between">
        <Title order={5}>Übersicht</Title>
        <Text fw={600}>{total} Einträge</Text>
      </Group>
    </Card>
  )
}
```

Render it in `App.tsx` inside the `Container`:

```tsx
import { SummaryPanel } from './features/summary/summary-panel'
// ...
<Container size="sm">
  <Stack gap="lg">
    <SummaryPanel />
    <EntriesPage />
  </Stack>
</Container>
```

(`Stack` comes from `@mantine/core` — add it to the existing import in `App.tsx`.)

Say to the owner:
> „Ich habe oben einen kleinen Übersichts-Bereich ergänzt. Schau mal — passt das so?"

---

## Option 2 — Tabs (the default for multiple screens)

Each tab is its own feature component. The active tab lives in React state — nothing else changes.

`src/client/App.tsx`:

```tsx
import {
  ActionIcon,
  AppShell,
  Container,
  Group,
  Tabs,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { IconChartBar, IconMoon, IconPencil, IconSun } from '@tabler/icons-react'

import { EntriesPage } from './features/entries/entries-page'
import { SummaryPanel } from './features/summary/summary-panel'

// ColorSchemeToggle stays exactly as it is.

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
          <Tabs defaultValue="entries">
            <Tabs.List grow mb="md">
              <Tabs.Tab value="entries" leftSection={<IconPencil size={16} />}>
                Eintragen
              </Tabs.Tab>
              <Tabs.Tab value="summary" leftSection={<IconChartBar size={16} />}>
                Auswertung
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="entries">
              <EntriesPage />
            </Tabs.Panel>
            <Tabs.Panel value="summary">
              <SummaryPanel />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
```

Notes:
- `defaultValue` picks the tab shown first. Mantine handles the switching — no extra state needed.
- Each `Tabs.Panel value="..."` must match a `Tabs.Tab value="..."`.
- Icons come from `@tabler/icons-react` (already used in this project). Drop `leftSection` if you
  don't want icons.
- Adding a third screen later = one more `Tabs.Tab` + one more `Tabs.Panel`.

Say to the owner:
> „Deine App hat jetzt zwei Bereiche oben zum Umschalten: „Eintragen" und „Auswertung". Tipp oben
> drauf, um zu wechseln. Möchtest du noch einen Bereich?"

---

## Option 3 — Side navigation (`AppShell.Navbar`)

Use when there are several sections and a side menu feels right. The active section is React state.

`src/client/App.tsx`:

```tsx
import { useState } from 'react'
import { AppShell, Burger, Container, NavLink, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

import { EntriesPage } from './features/entries/entries-page'
import { SummaryPanel } from './features/summary/summary-panel'

type Section = 'entries' | 'summary'

export function App() {
  const [opened, { toggle }] = useDisclosure()
  const [section, setSection] = useState<Section>('entries')

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>Meine App</Title>
          </Group>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Eintragen"
          active={section === 'entries'}
          onClick={() => setSection('entries')}
        />
        <NavLink
          label="Auswertung"
          active={section === 'summary'}
          onClick={() => setSection('summary')}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="sm">
          {section === 'entries' && <EntriesPage />}
          {section === 'summary' && <SummaryPanel />}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
```

`useDisclosure` (from `@mantine/hooks`, already a dependency) + the `Burger` give a working menu on
phones. Keep `ColorSchemeToggle` and the `Group` import as they are.

Say to the owner:
> „Links gibt es jetzt ein Menü, um zwischen den Bereichen zu wechseln. Auf dem Handy öffnet das
> Symbol oben links das Menü. Passt das?"

---

## Option 4 — Real URLs (router) — only if truly needed, confirm first

Only reach for this when the owner wants each screen to be its own **address** (shareable links,
the browser back button moving between screens, bookmarks). It adds a dependency and meaningfully
more moving parts — against KISS for most apps.

First ask the owner (don't just install it):
> „Sollen die einzelnen Bildschirme jeweils eine eigene Internet-Adresse bekommen — zum Teilen oder
> als Lesezeichen? Das ist möglich, macht die App aber etwas aufwendiger. Wenn du nur zwischen
> Bildschirmen wechseln willst, reichen Tabs und es bleibt einfacher. Was möchtest du?"

If they confirm they need URLs, use **`react-router`** (smallest fit for a single Worker SPA):

```bash
npm install react-router
```

Wrap the app in a `BrowserRouter` in `main.tsx` (around `<App />`, inside the existing providers),
then use `Routes`/`Route` in `App.tsx` and `<Link>`/`NavLink` for navigation. Each route renders a
feature component.

Cloudflare routing note: with `assets.run_worker_first: ["/api/*"]` in `wrangler.jsonc`, the Worker
only runs for `/api/*` and Cloudflare serves the SPA for everything else — so a hard refresh on a
client route like `/auswertung` already returns `index.html`. No extra fallback config is needed.
Keep all API paths under `/api/*` so they never collide with client routes.

After the change, deploy when the owner says „veröffentliche": `npm run deploy`.
