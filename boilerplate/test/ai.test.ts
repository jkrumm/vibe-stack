import { expect, it } from 'vitest'

import { newEntrySchema } from '../src/shared/schema'
import { parseToSchema, translate } from '../src/worker/ai'

// `ai.ts` takes the Workers AI binding (env.AI) as an argument, so these tests inject a STUB instead
// of calling the real model — deterministic and offline. The real model call is only truly exercised
// on a live deploy; here we prove the logic AROUND it: the shared-schema validation, the JSON parsing,
// and the graceful fallbacks (daily limit used up, model refusal, output that doesn't fit the schema).

// The binding type, taken from the function signature so we don't need the global `Ai` type in scope.
type AiBinding = Parameters<typeof parseToSchema>[0]
function stubAi(handler: () => unknown): AiBinding {
  return { run: async () => handler() } as unknown as AiBinding
}

const PARSE_INSTRUCTION = 'Extract one food entry as JSON matching the schema. Keep the language.'

it('parses free text into a row that fits the SHARED entry schema', async () => {
  // The very schema the website form and the MCP tool use is the parse target — one schema, reused.
  const ai = stubAi(() => ({
    response: JSON.stringify({ title: 'Erdbeeren mit Skyr', amount: 180, note: null }),
  }))
  const result = await parseToSchema(ai, {
    text: 'handvoll erdbeeren mit zwei löffel skyr',
    schema: newEntrySchema,
    instruction: PARSE_INSTRUCTION,
  })
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.data.title).toBe('Erdbeeren mit Skyr')
    expect(result.data.amount).toBe(180)
  }
})

it('also accepts a model that returns the object directly (not a JSON string)', async () => {
  const ai = stubAi(() => ({ response: { title: 'Apfel', amount: 95, note: null } }))
  const result = await parseToSchema(ai, {
    text: 'ein apfel',
    schema: newEntrySchema,
    instruction: PARSE_INSTRUCTION,
  })
  expect(result.ok).toBe(true)
})

it('reports "unparseable" when the model output does not fit the schema', async () => {
  // title '' and a negative amount both fail newEntrySchema → never trusted.
  const ai = stubAi(() => ({ response: JSON.stringify({ title: '', amount: -5, note: null }) }))
  const result = await parseToSchema(ai, {
    text: 'unsinn',
    schema: newEntrySchema,
    instruction: PARSE_INSTRUCTION,
  })
  expect(result).toEqual({ ok: false, reason: 'unparseable' })
})

it('reports "unavailable" when the model call throws (e.g. the daily limit is used up)', async () => {
  const ai = stubAi(() => {
    throw new Error('neurons exhausted')
  })
  const result = await parseToSchema(ai, {
    text: 'irgendwas',
    schema: newEntrySchema,
    instruction: PARSE_INSTRUCTION,
  })
  expect(result).toEqual({ ok: false, reason: 'unavailable' })
})

it('translates text and returns the trimmed result', async () => {
  const ai = stubAi(() => ({ response: '  Erdbeeren  ' }))
  const result = await translate(ai, { text: 'strawberries', target: 'Deutsch' })
  expect(result).toEqual({ ok: true, data: 'Erdbeeren' })
})
