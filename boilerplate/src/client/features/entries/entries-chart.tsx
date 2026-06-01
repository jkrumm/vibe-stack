import { LineChart } from '@mantine/charts'
import { Card, Title } from '@mantine/core'

import type { Entry } from '../../../shared/schema'

// Plots the `amount` of every entry that has one, oldest → newest.
export function EntriesChart({ entries }: { entries: Entry[] }) {
  const data = entries
    .filter((e) => e.amount !== null)
    .slice()
    .reverse()
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
