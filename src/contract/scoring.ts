import type { CategoryScore, Finding, FindingCategory, RiskLevel, Severity } from './schema'

/**
 * Deterministic scoring engine.
 *
 * The Deal Risk Score is an arithmetic function of structured findings —
 * never a free-form LLM estimate. This module is the single authority for
 * how numbers become scores and scores become risk levels.
 */

export const SEVERITY_MULTIPLIERS: Record<Severity, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
}

export const SEVERITY_ORDER: Severity[] = ['low', 'medium', 'high', 'critical']

export const RISK_LEVEL_BANDS: { level: RiskLevel; min: number; max: number }[] = [
  { level: 'low', min: 0, max: 39 },
  { level: 'medium', min: 40, max: 64 },
  { level: 'high', min: 65, max: 100 },
]

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s)
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (!Number.isFinite(score)) return 'high'
  if (score < 40) return 'low'
  if (score <= 64) return 'medium'
  return 'high'
}

/**
 * Category score from its findings:
 * score = clamp(round(100 − Σ(contribution × severity multiplier)), 0, 100)
 * where contribution is expressed in points (0..100).
 */
export function categoryScoreFromFindings(findings: Finding[]): number {
  const deduction = findings.reduce((acc, f) => acc + f.scoreContribution * SEVERITY_MULTIPLIERS[f.severity], 0)
  return clampScore(Math.round(100 - deduction))
}

/** Highest severity present among findings. */
export function highestSeverity(findings: Finding[]): Severity {
  return findings.reduce<Severity>(
    (acc, f) => (severityRank(f.severity) > severityRank(acc) ? f.severity : acc),
    'low',
  )
}

export function buildCategoryScore(category: FindingCategory, findings: Finding[], weight: number): CategoryScore {
  return {
    category,
    score: categoryScoreFromFindings(findings),
    weight,
    findingCount: findings.length,
    highestSeverity: highestSeverity(findings),
  }
}

/**
 * Composite score: weighted mean of category scores.
 * Weights are validated to sum to 1 by the contract; the mean is
 * normalized by the actual sum for defensive robustness.
 */
export function compositeScoreFromCategories(categoryScores: CategoryScore[]): number {
  const sumW = categoryScores.reduce((acc, c) => acc + c.weight, 0)
  if (sumW === 0) return 0
  const weighted = categoryScores.reduce((acc, c) => acc + c.score * c.weight, 0)
  return clampScore(Math.round(weighted / sumW))
}

export function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}
