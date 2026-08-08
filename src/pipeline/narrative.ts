/**
 * Grounded risk rationale — the reasoning stage of the DealRoom pipeline.
 *
 * The pipeline's default reasoning output is a deterministic rationale
 * assembled from the scoring engine's structured output (composite score,
 * category scores, worst category, and the top findings by weighted
 * contribution). It is then run through the same faithfulness check an
 * LLM-produced narrative must pass, so the pipeline can never emit an
 * ungrounded narrative:
 *  - every number cited is in the context whitelist;
 *  - finding titles are quoted verbatim (their numbers are exempt only as
 *    quotations);
 *  - no document ids are cited beyond those anchored to findings.
 *
 * When a host application supplies an LLM provider, `upgradeNarrative`
 * replaces this rationale with provider output — through the same
 * verification gate.
 */

import type { DealIntelligenceReport } from '../contract'
import { buildReasoningContext } from '../reasoning/context'
import { checkFaithfulness } from '../reasoning/faithfulness'
import type { RiskNarrativeResult } from '../reasoning/narrative'
import { generateRiskRationale } from '../reasoning/narrative'
import type { NarrativeProvider } from '../reasoning/provider'

export function buildDeterministicNarrative(report: DealIntelligenceReport): RiskNarrativeResult {
  const ctx = buildReasoningContext(report)

  const worst = ctx.categoryScores.reduce((acc, c) => (c.score < acc.score ? c : acc), ctx.categoryScores[0])
  const top = [...ctx.findings].sort((a, b) => b.weightedContribution - a.weightedContribution).slice(0, 3)

  const parts: string[] = [
    `DealRoom rationale for ${ctx.dealName}.`,
    `Composite deal risk score ${ctx.composite} — ${ctx.level.toUpperCase()}. ` +
      `Category scores: ${ctx.categoryScores.map((c) => `${c.category} ${c.score}`).join(', ')}.`,
    `Highest-risk category: ${worst.category} (${worst.score}).`,
    `Primary drivers by weighted contribution: ` +
      top
        .map((f) => `${f.id} (${f.severity}) “${f.title}”`)
        .join('; ') +
      '.',
    `This rationale is generated deterministically from the scoring engine ` +
      `and contains no claims beyond the findings and scores above.`,
  ]
  const text = parts.join(' ')

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

/** Swap in provider-generated reasoning, gated by the faithfulness check. */
export async function upgradeNarrative(
  report: DealIntelligenceReport,
  provider: NarrativeProvider,
): Promise<RiskNarrativeResult> {
  return generateRiskRationale(provider, report)
}
