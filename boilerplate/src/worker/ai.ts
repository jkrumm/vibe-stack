// Optional AI helpers over Cloudflare Workers AI (the `env.AI` binding). Like data.ts, this is a pure
// behavior layer: a REST route (or an autonomous task) passes in the AI binding and gets back a plain,
// already-validated result — no Hono, no HTTP here. The binding is injected as an argument so this
// module is unit-testable with a stub and does not depend on the binding being configured.
//
// This file is DORMANT until the `vibe-ai` skill turns AI on (it adds the `[ai]` binding + an example
// route). Nothing imports it by default, so it adds nothing to the deployed Worker until then.
//
// Why JSON Mode (not the Vercel AI SDK): `env.AI.run(...)` with `response_format` needs no extra
// dependency, no bundle weight, and no API key (you already have Cloudflare). We feed it the SAME Zod
// schema the website + MCP tool use — converted to JSON Schema by Zod v4's native `z.toJSONSchema` —
// and we ALWAYS re-validate the model's output with that schema before trusting it.

import { z } from 'zod'

// The best Workers AI model for German parsing + translation that also supports JSON Mode (verified
// 2026-06-02). Swap to another model id here if a stronger one ships; keep it on the JSON-Mode list.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

// Either a validated value, or a clean reason the caller turns into ONE calm German sentence.
//   - 'unavailable'  → the model call failed (most often the free daily limit is used up).
//   - 'unparseable'  → the model answered, but the answer did not fit the schema.
export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'unavailable' | 'unparseable' }

// Turn free text into a value that fits `schema`, using the model in JSON Mode. `instruction` is the
// system prompt that tells the model what to extract (e.g. "Extract one food entry. Keep German.").
export async function parseToSchema<T>(
  ai: Ai,
  { text, schema, instruction }: { text: string; schema: z.ZodType<T>; instruction: string },
): Promise<AiResult<T>> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>
  // Some validators reject the top-level $schema marker; the schema itself is all JSON Mode needs.
  delete jsonSchema.$schema

  let response: unknown
  try {
    const out = await ai.run(MODEL, {
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_schema', json_schema: jsonSchema },
    })
    response = (out as { response?: unknown }).response
  } catch {
    return { ok: false, reason: 'unavailable' }
  }

  const result = schema.safeParse(toCandidate(response))
  if (!result.success) return { ok: false, reason: 'unparseable' }
  return { ok: true, data: result.data }
}

// Translate text into the target language (default German). Plain text in, plain text out.
export async function translate(
  ai: Ai,
  { text, target = 'Deutsch' }: { text: string; target?: string },
): Promise<AiResult<string>> {
  try {
    const out = await ai.run(MODEL, {
      messages: [
        {
          role: 'system',
          content: `Translate the user's message into ${target}. Reply with ONLY the translation — no quotes, no explanation, no original text.`,
        },
        { role: 'user', content: text },
      ],
    })
    const response = (out as { response?: unknown }).response
    if (typeof response !== 'string' || response.trim() === '') {
      return { ok: false, reason: 'unavailable' }
    }
    return { ok: true, data: response.trim() }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

// JSON Mode normally returns the object as a JSON string in `response`; be tolerant if a model ever
// returns the object directly. Anything unreadable becomes null, which fails safeParse → 'unparseable'.
function toCandidate(response: unknown): unknown {
  if (typeof response !== 'string') return response ?? null
  try {
    return JSON.parse(response)
  } catch {
    return null
  }
}
