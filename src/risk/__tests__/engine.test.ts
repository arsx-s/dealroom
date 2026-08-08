/**
 * Risk engine — unit tests.
 *
 * Proves: determinism (same findings → same score), severity sensitivity,
 * weighted aggregation, per-finding/per-category breakdown transparency,
 * and edge cases: empty findings, missing categories, all-critical.
 */

import { describe, expect, it } from 'vitest'
import type { Finding, FindingCategory, SourceAnchor } from '../../contract'
import { buildMockReport } from '../../data/mock'
import { RiskEngine, categoryDeduction } from '../engine'
import { CATEGORY_WEIGHTS, RISK_BANDS } from '../config'

const ANCHOR: SourceAnchor = { documentId: 'doc-loan', page: 4, section: 'Definitions' }

const f = (partial: Partial<Finding>): Finding => ({
  id: 'F-1',
  category: 'financial',
  severity: 'medium',
  title: 'Finding',
  explanation: 'Explanation',
  evidence: [],
  sources: [ANCHOR],
  confidence: 0.9,
  scoreContribution: 20,
  ...partial,
})

describe('RiskEngine determinism', () => {
  it('produces identical breakdowns for identical findings', () => {
    const findings = [
      f({ id: 'a', category: 'financial', severity: 'critical', scoreContribution: 30 }),
      f({ id: 'b', category: 'legal', severity: 'high', scoreContribution: 15 }),
    ]
    const e = new RiskEngine()
    expect(e.buildBreakdown(findings)).toEqual(e.buildBreakdown(findings))
  })

  it('is order-independent', () => {
    const e = new RiskEngine()
    const base = [f({ id: 'a', category: 'financial', severity: 'high', scoreContribution: 25 }), f({ id: 'b', category: 'market', severity: 'low', scoreContribution: 10 })]
    expect(e.buildBreakdown(base).composite).toBe(e.buildBreakdown([...base].reverse()).composite)
  })
})

describe('RiskEngine severity handling', () => {
  it('a higher severity yields a lower (riskier) category score, everything else equal', () => {
    const e = new RiskEngine()
    const mild = e.buildBreakdown([f({ id: 'a', category: 'financial', severity: 'high', scoreContribution: 50 })])
    const severe = e.buildBreakdown([f({ id: 'a', category: 'financial', severity: 'critical', scoreContribution: 50 })])
    expect(severe.categories.find((c) => c.category === 'financial')!.score).toBeLessThan(
      mild.categories.find((c) => c.category === 'financial')!.score,
    )
  })

  it('exposes the exact severity-weighted math per finding', () => {
    const b = new RiskEngine().buildBreakdown([f({ id: 'a', category: 'legal', severity: 'critical', scoreContribution: 40 })])
    const legal = b.categories.find((c) => c.category === 'legal')!
    expect(legal.findings[0].severityMultiplier).toBe(1)
    expect(legal.findings[0].weightedContribution).toBe(40)
    expect(legal.score).toBe(60) // 100 − 40×1
    expect(categoryDeduction([f({ id: 'a', category: 'legal', severity: 'critical', scoreContribution: 40 })])).toBe(40)
  })
})

describe('RiskEngine weighted aggregation', () => {
  it('weights categories as a weighted mean', () => {
    const e = new RiskEngine()
    const findings = [
      f({ id: 'fin', category: 'financial', severity: 'critical', scoreContribution: 100 }),
      f({ id: 'mkt', category: 'market', severity: 'critical', scoreContribution: 100 }),
    ]
    const b = e.buildBreakdown(findings)
    expect(b.categories.find((c) => c.category === 'financial')!.score).toBe(0)
    expect(b.categories.find((c) => c.category === 'market')!.score).toBe(0)
    /* legal (0.3) and operational (0.25) carry no findings → score 100 each */
    expect(b.composite).toBe(Math.round(100 * 0.3 + 100 * 0.25))
    expect(b.level).toBe('medium') // 55 sits in the 40–64 band
  })

  it('a weighted clean category set produces a 100 composite', () => {
    const b = new RiskEngine().buildBreakdown([f({ id: 'op', category: 'operational', severity: 'low', scoreContribution: 0 })])
    expect(b.composite).toBe(100)
  })

  it('exposes per-finding weighted contribution in the breakdown', () => {
    const b = new RiskEngine().buildBreakdown([f({ id: 'x1', category: 'financial', severity: 'high', scoreContribution: 20 })])
    const contrib = b.categories[0].findings[0]
    expect(contrib.findingId).toBe('x1')
    expect(contrib.scoreContribution).toBe(20)
    expect(contrib.weightedContribution).toBe(15) // 0.75 × 20
  })
})

describe('RiskEngine edge cases', () => {
  it('empty findings → no risk (score 0, level low), categories empty', () => {
    const b = new RiskEngine().buildBreakdown([])
    expect(b.categories.every((c) => c.empty && c.score === 100)).toBe(true)
    expect(b.composite).toBe(0)
    expect(b.level).toBe('low')
    expect(b.worstCategory).toBeNull()
  })

  it('missing categories are flagged empty but still weighed at 100', () => {
    const b = new RiskEngine().buildBreakdown([f({ id: 'f1', category: 'financial', severity: 'medium', scoreContribution: 40 })])
    const market = b.categories.find((c) => c.category === 'market')!
    expect(market.empty).toBe(true)
    expect(market.score).toBe(100)
    expect(market.findings).toHaveLength(0)
  })

  it('all-critical findings floor every category', () => {
    const categories: FindingCategory[] = ['financial', 'legal', 'operational', 'market']
    const findings = categories.map((category, i) =>
      f({ id: `c${i}`, category, severity: 'critical', scoreContribution: 100 }),
    )
    const b = new RiskEngine().buildBreakdown(findings)
    expect(b.categories.every((c) => c.score === 0)).toBe(true)
    expect(b.composite).toBe(0)
    expect(b.worstCategory).not.toBeNull()
  })

  it('rejects category weights that do not sum to 1', () => {
    expect(
      () => new RiskEngine({ categoryWeights: { financial: 0.5, legal: 0.5, operational: 0.5, market: 0 } }),
    ).toThrow(/must sum to 1/)
  })
})

describe('RiskEngine vs the seeded report', () => {
  it('reproduces the report scoring exactly (same authority, same numbers)', () => {
    const e = new RiskEngine()
    const report = buildMockReport()
    const b = e.scoreFromReport(report)
    expect(b.composite).toBe(report.compositeRiskScore.score)
    expect(b.level).toBe(report.compositeRiskScore.level)
    for (const cat of b.categories) {
      const cs = report.compositeRiskScore.categoryScores.find((c) => c.category === cat.category)!
      expect(cat.score).toBe(cs.score)
      expect(cat.weight).toBe(cs.weight)
    }
    expect(b.categories.map((c) => c.category).sort()).toEqual(
      report.compositeRiskScore.categoryScores.map((c) => c.category).sort(),
    )
  })
})

describe('RiskEngine config surface', () => {
  it('weights sum to 1 and bands are ordered', () => {
    expect(Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(RISK_BANDS.map((x) => x.min)).toEqual([0, 40, 65])
  })

  it('exposes severity multipliers, bands, and version in the breakdown', () => {
    const b = new RiskEngine().buildBreakdown([])
    expect(b.config.severityWeights.critical).toBe(1)
    expect(b.config.severityWeights.low).toBe(0.25)
    expect(b.config.bands.length).toBe(3)
    expect(b.scoringVersion).toBe('1.0.0')
  })
})