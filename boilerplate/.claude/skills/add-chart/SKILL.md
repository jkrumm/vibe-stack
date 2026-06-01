---
name: add-chart
description: Add a chart/graph to visualize data with @mantine/charts. Use when the owner wants a chart, graph, diagram, to visualize numbers, see a Verlauf/trend, a Diagramm, or split data by category/proportion.
---

# Add a chart

Visualize query data with **`@mantine/charts`** (which wraps Recharts). The boilerplate already
ships one chart — `src/client/features/entries/entries-chart.tsx` — that plots each entry's `amount`
over time. Copy that pattern; do not pull in `recharts` directly.

## Before you build: confirm what to chart (talk to the owner in German)

Charts need numbers. Ask one short question, then pick the kind for them — don't make the owner
choose a chart type.

> "Was möchtest du sehen? Zum Beispiel: den **Verlauf** einer Zahl über die Zeit, einen **Vergleich**
> nach Kategorie, oder die **Aufteilung** in Anteile (Kuchendiagramm)?"

Then map their answer to a chart kind:

| Owner says (German) | Chart kind | Use for |
|-|-|-|
| "Verlauf", "über die Zeit", "Entwicklung" | `LineChart` (or `AreaChart`) | A number changing over time |
| "Vergleich", "nach Kategorie", "wie viele pro …", "Anzahl" | `BarChart` | Comparing/counting groups |
| "Aufteilung", "Anteile", "Kuchen", "wie viel Prozent" | `DonutChart` | Proportions of a whole |

If their data has **no number to plot** (only text/titles), say so kindly and offer a count instead:

> "Es gibt hier noch keine Zahl zum Zeichnen. Ich kann dir aber **zählen**, wie viele Einträge es pro
> [Kategorie] gibt — soll ich das als Balkendiagramm machen?"

## Facts you must not regress

- **`@mantine/charts`, never raw `recharts`.** Import the chart component from `@mantine/charts`.
- **Styles are already imported** in `src/client/main.tsx` (core CSS, then charts CSS). Do nothing.
- **Colors are Mantine color names**, e.g. `'indigo.6'`, `'teal.6'`, `'grape.6'` — never raw hex.
  The app's primary color is `indigo`.
- Every chart lives in a Mantine **`Card`** with a short **`Title`** (German label).
- A chart needs an **array of plain objects**. Shape it from the query result with `.map(...)`.
  Reverse if the API returns newest-first and you want oldest → newest left-to-right.
- Guard against too little data: `if (data.length < 2) return null` for trends.

## How to add one

1. Decide where the numbers come from. The page already loads data with React Query
   (`useQuery({ queryKey: entriesQueryKey, queryFn: listEntries })` in
   `features/entries/entries-page.tsx`). Pass that data into your chart component.
2. Create or edit a chart component next to the feature (e.g.
   `src/client/features/entries/<name>-chart.tsx`).
3. Shape the data array, pick the kind, render it inside a `Card` + `Title`.
4. Render the chart in the page (the entries page already does `<EntriesChart entries={entries.data} />`).

The three shapes below cover almost everything. Adapt names to the owner's data.

### Example 1 — line over time (a number changing day by day)

This is the shipped pattern (`entries-chart.tsx`). `dataKey` is the X axis; each `series` entry is
one plotted line.

```tsx
import { LineChart } from '@mantine/charts'
import { Card, Title } from '@mantine/core'

import type { Entry } from '../../../shared/schema'

export function AmountOverTimeChart({ entries }: { entries: Entry[] }) {
  const data = entries
    .filter((e) => e.amount !== null)
    .slice()
    .reverse() // API returns newest-first; show oldest → newest
    .map((e) => ({
      date: new Date(e.created_at).toLocaleDateString('de-DE'),
      amount: e.amount as number,
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

Want a filled line instead? Swap `LineChart` for `AreaChart` with the same props (it accepts
`dataKey` + `series`).

### Example 2 — bar by category (a count per group)

Group the rows in JS, then plot one bar per group. Here we count entries by the first word of the
title as a stand-in "category" — adapt to whatever field is the category.

```tsx
import { BarChart } from '@mantine/charts'
import { Card, Title } from '@mantine/core'

import type { Entry } from '../../../shared/schema'

export function CountByCategoryChart({ entries }: { entries: Entry[] }) {
  const counts = new Map<string, number>()
  for (const e of entries) {
    const category = e.title.split(' ')[0] || 'Sonstige'
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }

  const data = [...counts.entries()].map(([category, anzahl]) => ({ category, anzahl }))

  if (data.length === 0) return null

  return (
    <Card withBorder padding="md" radius="md">
      <Title order={5} mb="sm">
        Anzahl pro Kategorie
      </Title>
      <BarChart
        h={220}
        data={data}
        dataKey="category"
        series={[{ name: 'anzahl', label: 'Anzahl', color: 'teal.6' }]}
      />
    </Card>
  )
}
```

### Example 3 — donut split (proportions of a whole)

`DonutChart` takes a flat `data` array where each slice is `{ name, value, color }` — there is no
`series`/`dataKey`. Give each slice a distinct Mantine color.

```tsx
import { DonutChart } from '@mantine/charts'
import { Card, Title } from '@mantine/core'

import type { Entry } from '../../../shared/schema'

const SLICE_COLORS = ['indigo.6', 'teal.6', 'grape.6', 'orange.6', 'cyan.6', 'pink.6']

export function CategorySplitChart({ entries }: { entries: Entry[] }) {
  const counts = new Map<string, number>()
  for (const e of entries) {
    const category = e.title.split(' ')[0] || 'Sonstige'
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }

  const data = [...counts.entries()].map(([name, value], i) => ({
    name,
    value,
    color: SLICE_COLORS[i % SLICE_COLORS.length],
  }))

  if (data.length === 0) return null

  return (
    <Card withBorder padding="md" radius="md">
      <Title order={5} mb="sm">
        Aufteilung
      </Title>
      <DonutChart h={220} data={data} withLabelsLine withLabels />
    </Card>
  )
}
```

## Prop cheat-sheet

- **`LineChart` / `AreaChart` / `BarChart`**: `data` (array), `dataKey` (the X-axis field name),
  `series` (array of `{ name, label, color }` — `name` is the object key to plot), `h` (height in px).
- **`DonutChart`**: `data` (array of `{ name, value, color }`), `h`. No `series`/`dataKey`.
- Common extras: `LineChart` accepts `curveType="monotone"` and `withDots`; add a second
  `{ name, label, color }` to `series` to plot two lines/bars at once.

## When you're done (tell the owner in German)

> "Fertig — das Diagramm ist auf dem Bildschirm. Schau es dir an. Wenn es passt und du es online
> haben willst, sag **„veröffentliche“**."

Do not run `npm run deploy` until the owner asks ("veröffentliche" / "deploy").
