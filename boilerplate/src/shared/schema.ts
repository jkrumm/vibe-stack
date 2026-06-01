// Shapes shared between the API (Worker) and the screen (React).
// The Worker validates incoming data against `newEntrySchema`; the client uses the `Entry` type.

import { z } from 'zod'

// What the user may send when creating an entry (the photo is handled separately as a file).
export const newEntrySchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Titel ein.').max(120, 'Der Titel ist zu lang.'),
  amount: z.number().finite().nonnegative('Die Zahl darf nicht negativ sein.').nullable(),
  note: z.string().trim().max(2000).nullable(),
})

export type NewEntry = z.infer<typeof newEntrySchema>

// One row of the `entries` table, as the API returns it.
export interface Entry {
  id: number
  title: string
  amount: number | null
  note: string | null
  photo_key: string | null
  created_at: string // ISO 8601
}
