/**
 * The DealRoom risk engine.
 *
 * Fully transparent scoring:
 *  - severity multipliers, category weights, and bands come from
 *    src/risk/config.ts (which re-exports the contract's authoritative
 *    scoring math — one source of truth);
 *  - each category scores 100 minus the sum of its findings'
 *    severity-weighted contributions; the composite is the weighted mean of
 *    category scores;
 *  - `buildScoreBreakdown` exposes the entire computation as structured
 *    data — per-category and per-finding contributions — so the dashboard
 *    can render the breakdown without re-deriving anything.
 *
 * Deterministic: identical findings produce identical breakdowns. The
 * engine never invents numbers; nothing here calls a model.
 */

import type {
  CategoryScore,
  DealIntelligenceReport,
  Finding,
  FindingCategory,
  RiskLevel,
  Severity,
} from '../contract'
import {
  buildCategoryScore,
  compositeScoreFromCategories,
  riskLevelFromScore,
  SEVERITY_MULTIPLIERS,
  SEVERITY_ORDER,
} from '../contract'
import { CATEGORY_WEIGHTS, RISK_BANDS, SCORING_VERSION, validateWeights } from './config'

export interface FindingContribution {
  findingId: string
  category: FindingCategory
  severity: Severity
  severityMultiplier: number
  /** Raw points this finding contributes (0..100). */
  scoreContribution: number
  /** Severity-weighted points: contribution × multiplier. */
  weightedContribution: number
}

export interface CategoryBreakdown {
  category: FindingCategory
  weight: number
  score: number
  highestSeverity: Severity
  findingCount: number
  /** True when the category carried no findings at all. */
  empty: boolean
  findings: FindingContribution[]
}

export interface ScoreBreakdown {
  composite: number
  level: RiskLevel
  categories: CategoryBreakdown[]
  scoringVersion: string
  config: {
    severityWeights: Record<Severity, number>
    categoryWeights: Record<FindingCategory, number>
    bands: { level: RiskLevel; min: number; max: number }[]
  }
  /** Highest-severity category, for at-a-glance review. */
  worstCategory: FindingCategory | null
}

export interface RiskEngineOptions {
  categoryWeights?: Record<FindingCategory, number>
}

export class RiskEngine {
  readonly categoryWeights: Record<FindingCategory, number>

  constructor(opts: RiskEngineOptions = {}) {
    this.categoryWeights = opts.categoryWeights ?? CATEGORY_WEIGHTS
    if (!validateWeights(this.categoryWeights)) {
      throw new Error(`risk engine: category weights must sum to 1 (got ${JSON.stringify(this.categoryWeights)})`)
    }
  }

  private contributionOf(f: Finding): FindingContribution {
    return {
      findingId: f.id,
      category: f.category,
      severity: f.severity,
      severityMultiplier: SEVERITY_MULTIPLIERS[f.severity],
      scoreContribution: f.scoreContribution,
      weightedContribution: Math.round(f.scoreContribution * SEVERITY_MULTIPLIERS[f.severity] * 100) / 100,
    }
  }

  private categoryScore = (category: FindingCategory, findings: Finding[]): CategoryScore =>
    buildCategoryScore(category, findings, this.categoryWeights[category])

  /** The fully transparent breakdown for a finding set. */
  buildBreakdown(findings: Finding[]): ScoreBreakdown {
    const categories: CategoryBreakdown[] = (
      Object.keys(this.categoryWeights) as FindingCategory[]
    ).map((category) => {
      const list = findings.filter((f) => f.category === category)
      const cs = this.categoryScore(category, list)
      return {
        category,
        weight: this.categoryWeights[category],
        score: cs.score,
        highestSeverity: cs.highestSeverity,
        findingCount: cs.findingCount,
        empty: list.length === 0,
        findings: list.map((f) => this.contributionOf(f)),
      }
    })

    /* No findings at all = no identifiable risk: the composite is 0, not
     * the weighted mean of clean (100) categories. */
    const composite =
      findings.length === 0
        ? 0
        : compositeScoreFromCategories(
            categories.map((c) => this.categoryScore(c.category, findings.filter((f) => f.category === c.category))),
          )

    const worst = categories.reduce<{ category: FindingCategory | null; score: number }>(
      (acc, c) => (c.score < acc.score ? { category: c.category, score: c.score } : acc),
      { category: null, score: findings.length === 0 ? 0 : 101 },
    )

    return {
      composite,
      level: riskLevelFromScore(composite),
      categories,
      scoringVersion: SCORING_VERSION,
      config: {
        severityWeights: SEVERITY_MULTIPLIERS,
        categoryWeights: this.categoryWeights,
        bands: RISK_BANDS,
      },
      worstCategory: worst.category,
    }
  }

  /** Convenience: score a full report's findings. */
  scoreFromReport(report: Pick<DealIntelligenceReport, 'findings'>): ScoreBreakdown {
    return this.buildBreakdown(report.findings)
  }
}

/** Score the numbers a category's findings deduct (for aggregated views). */
export function categoryDeduction(findings: Finding[]): number {
  return findings.reduce((acc, f) => acc + f.scoreContribution * SEVERITY_MULTIPLIERS[f.severity], 0)
}

export { SEVERITY_ORDER }