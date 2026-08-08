/**
 * LLM provider interface for the reasoning layer.
 *
 * The reasoning layer never calls an API: a provider (any LLM client the
 * host application supplies) is injected. Providers return raw text; the
 * layer is responsible for faithfulness — an ungrounded provider response
 * is rejected, never propagated.
 */

export interface NarrativeRequest {
  system: string
  prompt: string
}

export type NarrativeProvider = (request: NarrativeRequest) => Promise<string>

export interface NarrativeProviderError {
  ok: false
  error: string
}

export interface NarrativeProviderResult {
  ok: true
  text: string
}

export type NarrativeProviderOutcome = NarrativeProviderResult | NarrativeProviderError

/** Provider for demos/tests that simply returns a canned verdict. */
export function createStaticProvider(text: string): NarrativeProvider {
  return async () => text
}

/**
 * Thin HTTPS wrapper used when an endpoint is configured. Falls back to an
 * explicit failure — never to a made-up narrative.
 */
export function createHttpProvider(opts: {
  url: string
  apiKey?: string
  model: string
  timeoutMs?: number
}): NarrativeProvider {
  return async (request) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000)
    try {
      const res = await fetch(opts.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`provider HTTP ${res.status}`)
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const text = json.choices?.[0]?.message?.content
      if (typeof text !== 'string' || text.length === 0) throw new Error('provider returned an empty response')
      return text
    } finally {
      clearTimeout(timer)
    }
  }
}