// Shapes shared between the API (Worker) and the screen (React), and reused by the MCP server.
// Define a data shape ONCE here as a Zod schema; the REST route, the OpenAPI contract, and the
// matching MCP tool all reuse it. The Worker validates incoming data; the client uses the types.

import { z } from 'zod'

// What the user may send when creating an entry (the photo is handled separately as a file).
export const newEntrySchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Titel ein.').max(120, 'Der Titel ist zu lang.'),
  amount: z.number().finite().nonnegative('Die Zahl darf nicht negativ sein.').nullable(),
  note: z.string().trim().max(2000).nullable(),
})

export type NewEntry = z.infer<typeof newEntrySchema>

// One row of the `entries` table, as the API returns it. This is the single source for the `Entry`
// shape: the client type, the OpenAPI response schema, and the MCP tool output all derive from it.
export const entrySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  amount: z.number().nullable(),
  note: z.string().nullable(),
  photo_key: z.string().nullable(),
  created_at: z.string(), // ISO 8601
})

export type Entry = z.infer<typeof entrySchema>

// The `:id` path parameter for routes that act on a single entry (validated + documented).
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Ungültige ID.'),
})
