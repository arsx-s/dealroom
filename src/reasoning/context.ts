/**
 * Reasoning context — the ONLY information the narrative generator may use.
 *
 * Built exclusively from the deterministic risk engine's output plus the
 * report's own findings and anchors. It carries a whitelist of every number
 * the narrative is allowed to cite, so the faithfulness check can verify
 * claims mechanically.
 */

import type { DealIntelligenceReport } from '../contract'
import { RiskEngine } from '../risk'

export interface ContextFinding {
  id: string
  category: string
  severity: string
  title: string
  scoreContribution: number
  weightedContribution: number
  /** Absolute source text the finding is anchored to. */
  evidence: string[]
  anchors: { documentId: string; page: number; section?: string }[]
}

export interface ReasoningContext {
  dealName: string
  composite: number
  level: string
  categoryScores: { category: string; score: number; weight: number }[]
  findings: ContextFinding[]
  /** Numbers the narrative may cite (structured values only). */
  allowedNumbers: number[]
  /** Lower-cased tokens from finding titles (for verbatim quoting). */
  allowedTokens: string[]
  scoringVersion: string
}

export function buildReasoningContext(report: DealIntelligenceReport): ReasoningContext {
  const engine = new RiskEngine()
  const breakdown = engine.scoreFromReport(report)

  const findings: ContextFinding[] = report.findings.map((f) => {
    const cat = breakdown.categories.find((c) => c.category === f.category)
    const contrib = cat?.findings.find((x) => x.findingId === f.id)
    return {
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
      scoreContribution: f.scoreContribution,
      weightedContribution: contrib?.weightedContribution ?? f.scoreContribution,
      evidence: f.evidence,
      anchors: f.sources.map((s) => ({ documentId: s.documentId, page: s.page, section: s.section })),
    }
  })

  const allowedNumbers = [breakdown.composite]
  for (const c of breakdown.categories) {
    allowedNumbers.push(c.score, Math.round(c.weight * 100) / 100)
    for (const x of c.findings) allowedNumbers.push(x.scoreContribution, x.weightedContribution)
  }

  const tokens = new Set<string>()
  const addTokens = (s: string) => {
    for (const m of s.toLowerCase().match(/[a-z0-9][a-z0-9 ._'’–-]{2,}/g) ?? []) tokens.add(m)
  }
  for (const f of findings) addTokens(f.title)
  addTokens(`level ${breakdown.level}`)

  return {
    dealName: report.dealName,
    composite: breakdown.composite,
    level: breakdown.level,
    categoryScores: breakdown.categories.map((c) => ({ category: c.category, score: c.score, weight: c.weight })),
    findings,
    allowedNumbers,
    allowedTokens: [...tokens],
    scoringVersion: breakdown.scoringVersion,
  }
}

/** Every number token in a text (used by the faithfulness check). */
export function numbersIn(text: string): number[] {
  const out: number[] = []
  for (const m of text.match(/\d+(?:\.\d+)?/g) ?? []) {
    const n = Number(m)
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}