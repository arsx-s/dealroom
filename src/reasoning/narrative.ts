/**
 * Grounded risk reasoning — narrative generation.
 *
 * The narrative is produced by an injected provider from a strictly bounded
 * context (src/reasoning/context.ts + prompt.ts), then verified by the
 * faithfulness check. A narrative that fails faithfulness is returned with
 * `status: 'concerns'` and must not be shown as authoritative.
 *
 * The deterministic risk engine remains the source of truth for scores:
 * the narrative may describe scores, never redefine them.
 */

import type { DealIntelligenceReport } from '../contract'
import { buildReasoningContext } from './context'
import { buildReasoningPrompt } from './prompt'
import { checkFaithfulness } from './faithfulness'
import type { FaithfulnessReport } from './faithfulness'
import type { NarrativeProvider } from './provider'

export interface RiskNarrative {
  text: string
  grounded: boolean
  faithfulness: FaithfulnessReport
}

export interface GenerationFailure {
  ok: false
  error: string
}

export type RiskNarrativeResult = { ok: true; narrative: RiskNarrative } | GenerationFailure

/** Generate and verify a risk rationale for a report. */
export async function generateRiskRationale(
  provider: NarrativeProvider,
  report: DealIntelligenceReport,
): Promise<RiskNarrativeResult> {
  const ctx = buildReasoningContext(report)
  const { system, prompt } = buildReasoningPrompt(ctx)

  let text: string
  try {
    text = await provider({ system, prompt })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'provider call failed' }
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, error: 'provider returned an empty or malformed response' }
  }

  const faithfulness = checkFaithfulness(text, ctx)
  return {
    ok: true,
    narrative: {
      text,
      grounded: faithfulness.status === 'grounded',
      faithfulness,
    },
  }
}

/** Run the check over an already-produced text (non-LLM path). */
export function verifyNarrative(text: string, report: DealIntelligenceReport): FaithfulnessReport {
  return checkFaithfulness(text, buildReasoningContext(report))
}

export type { NarrativeProvider } from './provider'