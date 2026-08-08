/**
 * Deterministic financial analysis — unit tests.
 *
 * Covers: normal metrics, all flag conditions, zero / near-zero
 * denominators, missing data, multi-year (prior-period) trends, threshold
 * overrides, and the provenance requirement that every anomaly references
 * underlying data values and source anchors.
 */

import { describe, expect, it } from 'vitest'
import type { FinancialMetrics, SourceAnchor } from '../../contract'
import { analyzeFinancials, computeFinancialMetrics } from '../analyze'
import { analyzeReportFinancials } from '../report'
import { FINANCIAL_SOURCE_MAP } from '../sources'
import { DEFAULT_FINANCIAL_THRESHOLDS } from '../config'
import { buildMockReport } from '../../data/mock'

const money = (amount: number) => ({ amount, currency: 'USD' as const })

const ANCHOR: SourceAnchor = { documentId: 'doc-audit-fy24', page: 9, section: 'EBITDA Reconciliation' }

const fin = (partial: Partial<FinancialMetrics> = {}): FinancialMetrics => ({
  period: { start: '2025-01-01', end: '2025-12-31' },
  currency: 'USD',
  revenue: money(10_000),
  ebitda: money(2_000),
  operatingCosts: money(8_000),
  netIncome: money(-500),
  debt: money(5_000),
  cash: money(3_000),
  valuation: money(60_000),
  ...partial,
})

describe('computeFinancialMetrics (derived metrics)', () => {
  it('computes ratios and multiples from raw values', () => {
    const m = computeFinancialMetrics(fin())
    expect(m.ebitdaMargin).toBe(0.2)
    expect(m.debtToEbitda).toBe(2.5)
    expect(m.valuationMultiple).toBe(30)
    expect(m.cashRunwayMonths).toBeCloseTo(72) // 3000 / (500/12)
    expect(m.revenueYoY).toBeNull() // no prior year supplied
  })

  it('computes year-over-year revenue trend when prior data exists', () => {
    const m = computeFinancialMetrics(fin(), fin({ revenue: money(8_000) }))
    expect(m.revenueYoY).toBeCloseTo(0.25)
    const declined = computeFinancialMetrics(fin({ revenue: money(7_000) }), fin())
    expect(declined.revenueYoY).toBeCloseTo(-0.3)
  })

  it('returns null (not NaN/Infinity) on zero and near-zero denominators', () => {
    const zeroRev = computeFinancialMetrics(fin({ revenue: money(0) }))
    expect(zeroRev.ebitdaMargin).toBeNull()
    const zeroEbitda = computeFinancialMetrics(fin({ ebitda: money(0) }))
    expect(zeroEbitda.debtToEbitda).toBeNull()
    expect(zeroEbitda.valuationMultiple).toBeNull()
    const zeroNet = computeFinancialMetrics(fin({ netIncome: money(0) }))
    expect(zeroNet.cashRunwayMonths).toBeNull() // cash-generating: no constraint
    const negEbitda = computeFinancialMetrics(fin({ ebitda: money(-50) }))
    expect(negEbitda.valuationMultiple).toBeNull() // negative denominator guard
    expect(negEbitda.debtToEbitda).toBe(-100)
  })

  it('returns null when data is missing entirely', () => {
    const sparse = fin() as any
    delete sparse.debt
    delete sparse.cash
    delete sparse.valuation
    const m = computeFinancialMetrics(sparse)
    expect(m.debtToEbitda).toBeNull()
    expect(m.cashRunwayMonths).toBeNull()
    expect(m.valuationMultiple).toBeNull()
  })
})

describe('analyzeFinancials (anomaly flags)', () => {
  it('flags none on a scenario inside every threshold', () => {
    const { anomalies } = analyzeFinancials(
      fin({ ebitda: money(4_000), debt: money(5_000), valuation: money(40_000) }, ),
    )
    expect(anomalies).toHaveLength(0)
  })

  it('flags elevated leverage above the threshold with provenance', () => {
    const { anomalies } = analyzeFinancials(fin({ debt: money(20_000) }), {
      sources: { debtToEbitda: ANCHOR },
    })
    const flag = anomalies.find((a) => a.flag === 'elevated-leverage')
    expect(flag).toBeDefined()
    expect(flag!.metric).toBe('debtToEbitda')
    expect(flag!.value).toBe(10)
    expect(flag!.direction).toBe('above')
    expect(flag!.sources[0]).toEqual(ANCHOR)
    expect(flag!.dataValues.debt).toBe(20_000)
  })

  it('flags a below-threshold margin', () => {
    const { anomalies } = analyzeFinancials(fin({ ebitda: money(500) }))
    expect(anomalies.map((a) => a.flag)).toContain('margin-below-floor')
  })

  it('flags a short cash runway', () => {
    const { anomalies } = analyzeFinancials(fin({ cash: money(100), netIncome: money(-600) }))
    const a = anomalies.find((x) => x.flag === 'short-cash-runway')
    expect(a).toBeDefined()
    expect(a!.value).toBeCloseTo(2) // 100 / 50 per month
  })

  it('flags year-over-year revenue decline with prior-year data', () => {
    const { anomalies } = analyzeFinancials(fin(), { prior: fin({ revenue: money(20_000) }) })
    const a = anomalies.find((x) => x.flag === 'revenue-decline')
    expect(a).toBeDefined()
    expect(a!.value).toBeCloseTo(-0.5)
  })

  it('never flags growth as a decline', () => {
    const { anomalies } = analyzeFinancials(fin({ revenue: money(20_000) }), {
      prior: fin(),
    })
    expect(anomalies.some((a) => a.flag === 'revenue-decline')).toBe(false)
  })

  it('flags a valuation multiple above the ceiling', () => {
    const { anomalies } = analyzeFinancials(fin({ valuation: money(100_000) }))
    const a = anomalies.find((x) => x.flag === 'elevated-valuation')
    expect(a).toBeDefined()
    expect(a!.direction).toBe('above')
  })

  it('respects threshold overrides', () => {
    const loose = analyzeFinancials(fin({ debt: money(20_000) }), {
      thresholds: { ...DEFAULT_FINANCIAL_THRESHOLDS, debtToEbitdaMax: 12 },
    })
    expect(loose.anomalies.some((a) => a.flag === 'elevated-leverage')).toBe(false)
    const strict = analyzeFinancials(fin(), {
      thresholds: { ...DEFAULT_FINANCIAL_THRESHOLDS, ebitdaMarginMin: 0.25 },
    })
    expect(strict.anomalies.some((a) => a.flag === 'margin-below-floor')).toBe(true)
  })

  it('every anomaly references underlying data and anchors when available', () => {
    const { anomalies } = analyzeFinancials(
      fin({ debt: money(20_000), valuation: money(100_000), revenue: money(7_000) }),
      { prior: fin(), sources: FINANCIAL_SOURCE_MAP },
    )
    expect(anomalies.length).toBeGreaterThan(0)
    for (const a of anomalies) {
      expect(Object.keys(a.dataValues).length).toBeGreaterThan(0)
      // revenue-decline lacks a corpus anchor path, others carry one
      if (a.flag !== 'revenue-decline') expect(a.sources.length).toBe(1)
    }
  })
})

describe('analyzeReportFinancials (report wiring)', () => {
  it('produces the expected baseline for the seed report', () => {
    const result = analyzeReportFinancials(buildMockReport())
    expect(result.metrics.ebitdaMargin).toBeCloseTo(0.155)
    expect(result.metrics.debtToEbitda).toBeCloseTo(2.84)
    expect(result.metrics.valuationMultiple).toBeCloseTo(25)
    expect(result.metrics.cashRunwayMonths).toBeGreaterThan(100) // 4.8M / ~28K monthly burn
    expect(result.metrics.revenueYoY).toBeNull() // single year in the mock report
    // the deal carries one anomaly on the baseline: the elevated 25x multiple
    expect(result.anomalies.map((a) => a.flag)).toEqual(['elevated-valuation'])
    expect(result.anomalies[0].sources[0]!.documentId).toBe('doc-market')
  })
})