import { describe, expect, it } from 'vitest'
import {
  CompositeRiskScore,
  Finding,
  FinancialMetrics,
  Money,
  ReportPeriod,
  SourceAnchor,
  buildCategoryScore,
  categoryScoreFromFindings,
  compositeScoreFromCategories,
  parseReport,
  parseReportSafe,
  riskLevelFromScore,
  severityRank,
} from '../index'
import { buildMockReport } from '../../data/mock'

/* ------------------------------------------------------------------ */
/* Fixture helpers                                                     */
/* ------------------------------------------------------------------ */

const money = (amount: number, currency = 'USD' as const) => ({ amount, currency })

const validAnchor = (overrides: Partial<z.infer<typeof SourceAnchor>> = {}): z.infer<typeof SourceAnchor> => ({
  documentId: 'doc-1',
  page: 12,
  section: 'Section 12.4',
  clause: '12.4',
  excerpt: 'The Company shall not assume obligations of the Parent...',
  ...overrides,
})

import type { z } from 'zod'

const validFinding = (overrides: Partial<z.infer<typeof Finding>> = {}): z.infer<typeof Finding> => ({
  id: 'F-001',
  category: 'financial',
  severity: 'high',
  title: 'Revenue recognition mismatch',
  explanation: 'Policies deviate from IFRS 15 on milestone billing.',
  evidence: ['Audit note 4.1', 'Restatement footnote'],
  sources: [validAnchor()],
  confidence: 0.92,
  scoreContribution: 0.08,
  ...overrides,
})

const validFinancials = (overrides: Partial<z.infer<typeof FinancialMetrics>> = {}): z.infer<typeof FinancialMetrics> => ({
  period: { start: '2025-01-01', end: '2025-12-31' },
  currency: 'USD',
  revenue: money(12_400_000),
  ebitda: money(1_920_000),
  operatingCosts: money(10_480_000),
  netIncome: money(-340_000),
  debt: money(5_450_000),
  cash: money(4_810_000),
  valuation: money(48_000_000),
  ebitdaMargin: 0.155,
  debtToEbitda: 2.84,
  valuationMultiple: 25,
  ...overrides,
})

/* ------------------------------------------------------------------ */
/* Financials                                                          */
/* ------------------------------------------------------------------ */

describe('FinancialMetrics', () => {
  it('accepts valid financial data', () => {
    expect(FinancialMetrics.safeParse(validFinancials()).success).toBe(true)
  })

  it('accepts partially populated financial data (only revenue)', () => {
    expect(FinancialMetrics.safeParse({ period: { start: '2024-01-01', end: '2024-12-31' }, currency: 'USD', revenue: money(5000) }).success).toBe(true)
  })

  it('rejects negative reporting period (end before start)', () => {
    expect(ReportPeriod.safeParse({ start: '2025-12-31', end: '2025-01-01' }).success).toBe(false)
  })

  it('rejects malformed ISO dates', () => {
    expect(ReportPeriod.safeParse({ start: '31/12/2025', end: '2025-12-31' }).success).toBe(false)
  })

  it('rejects non-finite amounts', () => {
    expect(Money.safeParse({ amount: Number.NaN, currency: 'USD' }).success).toBe(false)
    expect(Money.safeParse({ amount: Number.POSITIVE_INFINITY, currency: 'USD' }).success).toBe(false)
  })

  it('rejects money in a different currency than the report', () => {
    const mixed = validFinancials({ revenue: { amount: 100, currency: 'EUR' } })
    expect(FinancialMetrics.safeParse(mixed).success).toBe(false)
  })

  it('rejects internally inconsistent derived ratios', () => {
    const badMargin = validFinancials({ ebitdaMargin: 0.9 })
    const badCoverage = validFinancials({ debtToEbitda: 9.9 })
    const badMultiple = validFinancials({ valuationMultiple: 2.5 })
    expect(FinancialMetrics.safeParse(badMargin).success).toBe(false)
    expect(FinancialMetrics.safeParse(badCoverage).success).toBe(false)
    expect(FinancialMetrics.safeParse(badMultiple).success).toBe(false)
  })

  it('rejects unknown currency values', () => {
    const bad = validFinancials() as unknown
    ;(bad as { currency: string }).currency = 'XRP'
    expect(FinancialMetrics.safeParse(bad).success).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

describe('Finding', () => {
  it('accepts a valid finding with full evidence and citations', () => {
    expect(Finding.safeParse(validFinding()).success).toBe(true)
  })

  it('accepts a finding with a minimal single anchor (documentId + page)', () => {
    const minimal = validFinding({ sources: [validAnchor({ section: undefined, clause: undefined, excerpt: undefined })] })
    expect(Finding.safeParse(minimal).success).toBe(true)
  })

  it('requires at least one citation — empty sources fail', () => {
    const noSources = validFinding({ sources: [] })
    const result = Finding.safeParse(noSources)
    expect(result.success).toBe(false)
  })

  it('requires citations — missing sources field fails', () => {
    const missing = { ...validFinding() }
    delete (missing as { sources?: unknown }).sources
    expect(Finding.safeParse(missing).success).toBe(false)
  })

  it('rejects findings without a title or explanation', () => {
    expect(Finding.safeParse(validFinding({ title: '' })).success).toBe(false)
    expect(Finding.safeParse(validFinding({ explanation: '' })).success).toBe(false)
  })

  it('rejects malformed source anchors (missing documentId, page 0, negative page)', () => {
    expect(SourceAnchor.safeParse(validAnchor({ documentId: '' })).success).toBe(false)
    expect(SourceAnchor.safeParse(validAnchor({ page: 0 })).success).toBe(false)
    expect(SourceAnchor.safeParse(validAnchor({ page: -3 })).success).toBe(false)
    expect(SourceAnchor.safeParse(validAnchor({ page: 1.5 })).success).toBe(false)
  })

  it('rejects out-of-range confidence values', () => {
    expect(Finding.safeParse(validFinding({ confidence: 1.4 })).success).toBe(false)
    expect(Finding.safeParse(validFinding({ confidence: -0.1 })).success).toBe(false)
  })

  it('rejects out-of-range score contributions', () => {
    expect(Finding.safeParse(validFinding({ scoreContribution: 101 })).success).toBe(false)
    expect(Finding.safeParse(validFinding({ scoreContribution: -1 })).success).toBe(false)
  })

  it('constrains category to the four allowed values', () => {
    expect(Finding.safeParse(validFinding({ category: 'financial' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ category: 'legal' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ category: 'operational' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ category: 'market' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ category: 'hr' as never })).success).toBe(false)
    expect(Finding.safeParse(validFinding({ category: 'compliance' as never })).success).toBe(false)
  })

  it('constrains severity to the four allowed values', () => {
    expect(Finding.safeParse(validFinding({ severity: 'low' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ severity: 'medium' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ severity: 'high' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ severity: 'critical' })).success).toBe(true)
    expect(Finding.safeParse(validFinding({ severity: 'urgent' as never })).success).toBe(false)
    expect(Finding.safeParse(validFinding({ severity: 'severe' as never })).success).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

describe('risk scoring', () => {
  it('derives risk levels from deterministic score bands', () => {
    expect(riskLevelFromScore(0)).toBe('low')
    expect(riskLevelFromScore(39)).toBe('low')
    expect(riskLevelFromScore(40)).toBe('medium')
    expect(riskLevelFromScore(64)).toBe('medium')
    expect(riskLevelFromScore(65)).toBe('high')
    expect(riskLevelFromScore(100)).toBe('high')
  })

  it('accepts a valid composite score structure', () => {
    const composite = {
      score: 72,
      level: 'high',
      scoringVersion: '1.0.0',
      categoryScores: [
        { category: 'financial', score: 83, weight: 0.35, findingCount: 4, highestSeverity: 'critical' },
        { category: 'legal', score: 74, weight: 0.3, findingCount: 3, highestSeverity: 'high' },
        { category: 'operational', score: 63, weight: 0.25, findingCount: 3, highestSeverity: 'high' },
        { category: 'market', score: 47, weight: 0.1, findingCount: 3, highestSeverity: 'high' },
      ],
    }
    expect(CompositeRiskScore.safeParse(composite).success).toBe(true)
  })

  it('rejects scores outside 0..100', () => {
    expect(CompositeRiskScore.safeParse({ score: 101, level: 'high', categoryScores: [], scoringVersion: '1' }).success).toBe(false)
    expect(CompositeRiskScore.safeParse({ score: -1, level: 'low', categoryScores: [], scoringVersion: '1' }).success).toBe(false)
  })

  it('rejects category weights that do not sum to 1', () => {
    const composite = {
      score: 72,
      level: 'high',
      scoringVersion: '1.0.0',
      categoryScores: [
        { category: 'financial', score: 83, weight: 0.5, findingCount: 4, highestSeverity: 'critical' },
        { category: 'legal', score: 74, weight: 0.3, findingCount: 3, highestSeverity: 'high' },
      ],
    }
    expect(CompositeRiskScore.safeParse(composite).success).toBe(false)
  })

  it('rejects a risk level inconsistent with the score', () => {
    const composite = {
      score: 30,
      level: 'high',
      scoringVersion: '1.0.0',
      categoryScores: [{ category: 'financial', score: 30, weight: 1, findingCount: 1, highestSeverity: 'medium' }],
    }
    expect(CompositeRiskScore.safeParse(composite).success).toBe(false)
  })

  it('computes category scores deterministically from findings', () => {
    const findings: Finding[] = [
      { ...validFinding(), severity: 'critical', scoreContribution: 10 },
      { ...validFinding(), severity: 'high', scoreContribution: 20 },
    ]
    // deduction = 10*1.0 + 20*0.75 = 25 → 100 − 25 = 75
    expect(categoryScoreFromFindings(findings)).toBe(75)
  })

  it('computes the composite as a weighted mean', () => {
    const categories = [
      buildCategoryScore('financial', [], 0.5),
      buildCategoryScore('legal', [], 0.5),
    ]
    const withScores = categories.map((c, i) => ({ ...c, score: i === 0 ? 80 : 60 }))
    expect(compositeScoreFromCategories(withScores)).toBe(70)
  })

  it('ranks severities in order low < medium < high < critical', () => {
    expect(severityRank('low')).toBeLessThan(severityRank('medium'))
    expect(severityRank('medium')).toBeLessThan(severityRank('high'))
    expect(severityRank('high')).toBeLessThan(severityRank('critical'))
  })
})

/* ------------------------------------------------------------------ */
/* Report aggregate                                                    */
/* ------------------------------------------------------------------ */

describe('DealIntelligenceReport', () => {
  it('accepts the full mock report fixture', () => {
    const report = buildMockReport()
    const parsed = parseReport(report)
    expect(parsed.compositeRiskScore.score).toBe(72)
    expect(parsed.compositeRiskScore.level).toBe('high')
  })

  it('is parseable and returns the same shape (safeParse round trip)', () => {
    const report = buildMockReport()
    const result = parseReportSafe(report)
    expect(result.success).toBe(true)
  })

  it('rejects source anchors that reference unknown documents', () => {
    const report = buildMockReport()
    report.findings[0].sources[0].documentId = 'doc-does-not-exist'
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('rejects duplicate document ids', () => {
    const report = buildMockReport()
    report.documents[1] = report.documents[0]
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('rejects a findingsTotal that disagrees with the finding list', () => {
    const report = buildMockReport()
    report.methodology.findingsTotal = 999
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('rejects reports with no findings', () => {
    const report = buildMockReport()
    report.findings = []
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('rejects reports with no documents', () => {
    const report = buildMockReport()
    report.documents = []
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('rejects missing required identity fields', () => {
    const report = buildMockReport()
    ;(report.targetCompany as { name: string }).name = ''
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('rejects a clause pointing at an unknown document', () => {
    const report = buildMockReport()
    report.clauses[0].documentId = 'ghost-doc'
    expect(parseReportSafe(report).success).toBe(false)
  })

  it('validates the fixture: declared category scores match findings-derived scores', () => {
    const report = buildMockReport()
    for (const cat of report.compositeRiskScore.categoryScores) {
      const findings = report.findings.filter((f) => f.category === cat.category)
      const derived = categoryScoreFromFindings(findings)
      expect(Math.abs(derived - cat.score)).toBeLessThanOrEqual(1)
      expect(cat.findingCount).toBe(findings.length)
    }
  })
})
