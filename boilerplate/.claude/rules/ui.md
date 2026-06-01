---
paths:
  - "src/client/**/*.{ts,tsx}"
---

# UI conventions (Mantine v9 + charts)

This is the **screen** layer. Match the existing style in `src/client/features/entries/`.

## Components & styling

- Build UI only from **`@mantine/core`** components (Button, Card, Stack, Group, TextInput, …) and
  **`@tabler/icons-react`** icons. Don't hand-write raw HTML/CSS or add another UI library.
- **No raw hex colors.** Use Mantine color names (`'indigo.6'`, `'teal.6'`, `'red'`). The primary
  color is `indigo` (set in `theme.ts`). Dark mode is automatic — never read or set the theme by hand.
- The layout lives in `App.tsx` (`AppShell`). Wrap content in a `Card` with a short `Title`, like the
  entries example. Leave inputs at the theme's default `size="md"` (16px font stops iPhones from
  zooming when a field is tapped).
- Each screen/feature is a folder under `features/`. To switch between screens, prefer Mantine `Tabs`
  (see the `add-page` skill) — don't add a router unless the owner truly needs shareable URLs.

## Data on the screen

- Fetch with **`@tanstack/react-query`** (`useQuery` / `useMutation`) via the helpers in `lib/api.ts`
  — never call `fetch` directly in a component or track loading/error state by hand.
- Reuse the query key (like `entriesQueryKey`) and **invalidate** it after a mutation so the list and
  chart refresh (see `entry-form.tsx`).
- Always handle the three states: loading (`<Loader/>`), error (`<Alert/>`), and empty (a friendly
  German hint) — like `entries-page.tsx`.

## Charts

- Charts come from **`@mantine/charts`** (`LineChart`, `BarChart`, `AreaChart`, `DonutChart`) — never
  import `recharts` directly. The chart CSS is already loaded in `main.tsx`.
- Put each chart in a `Card` + `Title`, give series Mantine color names, and guard against too little
  data (`if (data.length < 2) return null` for trends). See `entries-chart.tsx` and the `add-chart`
  skill. (A one-time `width(-1)/height(-1)` console warning on first render is harmless.)
