// The MCP server: the SAME data operations as the REST API (data.ts), exposed as tools a Claude
// connector can call from phone / desktop Chat / routines. One tool per data op, reusing the shared
// Zod schemas. Tool descriptions are kept short (< 500 chars) because consumer Claude surfaces drive
// behavior from the tool descriptions, not from server instructions.
//
// Stateless: a fresh McpServer + transport is built per request (no Durable Objects, no sessions),
// which is the correct shape for a Worker. Photos are NOT an MCP tool — binaries don't belong in
// tool calls; add photos on the website.

import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Hono } from 'hono'
import { z } from 'zod'

import { newEntrySchema } from '../shared/schema'
import type { Bindings } from './api'
import * as data from './data'

// The MCP tools only ever touch the database and file storage, never the access secret.
type DataEnv = { DB: D1Database; BUCKET: R2Bucket }

// Build the MCP server with its tools bound to one request's environment. Exported so tests can
// drive it directly through an in-memory transport.
export function buildMcpServer(env: DataEnv): McpServer {
  const server = new McpServer({ name: 'vibe-stack app', version: '1.0.0' })

  server.registerTool(
    'list_entries',
    {
      title: 'List entries',
      description:
        'List the most recent entries (newest first) as JSON: id, title, amount, note, created_at.',
      inputSchema: {},
    },
    async () => {
      const entries = await data.listEntries(env.DB)
      return { content: [{ type: 'text', text: JSON.stringify(entries) }] }
    },
  )

  server.registerTool(
    'create_entry',
    {
      title: 'Create entry',
      description:
        'Create an entry. Required: title. Optional: amount (a number) and note. Photos are added on the website, not here. Returns the created entry as JSON.',
      // Reuse the website schema; relax amount/note to optional so the model may omit them.
      inputSchema: {
        title: newEntrySchema.shape.title,
        amount: newEntrySchema.shape.amount.optional(),
        note: newEntrySchema.shape.note.optional(),
      },
    },
    async ({ title, amount, note }) => {
      const entry = await data.createEntry(env.DB, env.BUCKET, {
        title,
        amount: amount ?? null,
        note: note ?? null,
      })
      return { content: [{ type: 'text', text: JSON.stringify(entry) }] }
    },
  )

  server.registerTool(
    'delete_entry',
    {
      title: 'Delete entry',
      description:
        'Delete an entry by its id. Tell the owner what was removed before calling this.',
      inputSchema: { id: z.number().int().positive() },
    },
    async ({ id }) => {
      const existed = await data.deleteEntry(env.DB, env.BUCKET, id)
      const text = existed ? `Eintrag ${id} gelöscht.` : `Kein Eintrag mit der id ${id} gefunden.`
      return { content: [{ type: 'text', text }] }
    },
  )

  return server
}

// The HTTP endpoint. The OAuth provider (see vibe-connector) routes /mcp here once the connector is
// set up; until then index.ts serves it directly. A valid token always means "the owner".
const mcp = new Hono<{ Bindings: Bindings }>()

mcp.all('/mcp', async (c) => {
  const server = buildMcpServer(c.env)
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(c)
})

export default mcp
