import { env, exports } from 'cloudflare:workers'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { expect, it } from 'vitest'

import { listEntries } from '../src/worker/data'
import { buildMcpServer } from '../src/worker/mcp'

// Two levels of test:
// 1. The TOOLS, driven through the SDK's in-memory transport against the REAL local D1 + R2 — proves
//    each tool does the right data operation (the same data.ts functions the REST API uses).
// 2. The HTTP wiring at /mcp, hit exactly as a connector would — proves @hono/mcp serves the Worker.

it('exposes the entry tools and runs them against real D1/R2', async () => {
  const server = buildMcpServer(env)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test', version: '1.0.0' })
  await server.connect(serverTransport)
  await client.connect(clientTransport)

  const { tools } = await client.listTools()
  expect(tools.map((t) => t.name).sort()).toEqual(['create_entry', 'delete_entry', 'list_entries'])

  const created = await client.callTool({
    name: 'create_entry',
    arguments: { title: 'MCP Eintrag', amount: 5 },
  })
  expect(created.isError).toBeFalsy()

  // The tool actually persisted through data.ts into the local D1 database.
  const entries = await listEntries(env.DB)
  const match = entries.find((e) => e.title === 'MCP Eintrag')
  expect(match?.amount).toBe(5)

  const deleted = await client.callTool({
    name: 'delete_entry',
    arguments: { id: match?.id ?? 0 },
  })
  expect(deleted.isError).toBeFalsy()

  await client.close()
  await server.close()
})

it('serves the MCP endpoint over HTTP (initialize handshake)', async () => {
  const res = await exports.default.fetch('https://example.com/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    }),
  })
  expect(res.status).toBe(200)
  // serverInfo.name comes back in the initialize result (JSON or SSE framing — match the text).
  expect(await res.text()).toContain('vibe-stack app')
})
