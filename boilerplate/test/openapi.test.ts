import { exports } from 'cloudflare:workers'
import { expect, it } from 'vitest'

// The API serves its own machine-readable contract at /api/openapi.json (public). Other tools and
// the Claude connector read it to discover the routes. This test confirms it is a valid OpenAPI
// document that lists the entries routes.

const API = 'https://example.com/api'

it('serves a valid OpenAPI spec listing the routes', async () => {
  const res = await exports.default.fetch(`${API}/openapi.json`)
  expect(res.status).toBe(200)

  const spec = (await res.json()) as {
    openapi?: string
    info?: { title?: string }
    paths?: Record<string, unknown>
  }
  expect(spec.openapi).toMatch(/^3\./)
  expect(spec.info?.title).toBeTruthy()
  expect(spec.paths?.['/api/entries']).toBeDefined()
})

it('exposes the docs page without a token', async () => {
  const res = await exports.default.fetch(`${API}/docs`)
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch(/text\/html/)
})
