/**
 * Deterministic financial analysis.
 *
 * Computes derived metrics from raw financials and flags anomalies against
 * the threshold config. Pure functions: same inputs, same outputs. No risk
 * aggregation, no model — this layer only describes the numbers.
 *
 * Every anomaly carries `references`: the underlying data values and, where
 * an anchor is known, the document/page/section location the value was
 * extracted from.
 */

import type { FinancialMetrics, SourceAnchor } from '../contract'
import type { FinancialThresholds } from './config'
import { DEFAULT_FINANCIAL_THRESHOLDS } from './config'

export type FinancialMetricKey =
  | 'revenueYoY'
  | 'ebitdaMargin'
  | 'debtToEbitda'
  | 'cashRunwayMonths'
  | 'valuationMultiple'

export interface FinancialMetricsSnapshot {
  revenueYoY: number | null
  ebitdaMargin: number | null
  debtToEbitda: number | null
  cashRunwayMonths: number | null
  valuationMultiple: number | null
}

export type FinancialFlag =
  | 'revenue-decline'
  | 'margin-below-floor'
  | 'elevated-leverage'
  | 'short-cash-runway'
  | 'elevated-valuation'

export interface FinancialAnomaly {
  id: string
  metric: FinancialMetricKey
  flag: FinancialFlag
  /** Value that tripped the flag (the metric value, not the raw input). */
  value: number
  threshold: number
  direction: 'below' | 'above'
  severity: 'watch' | 'elevated'
  /** Underlying data values that produced the metric. */
  dataValues: Record<string, number | undefined>
  /** Source anchors the metric was extracted from, when known. */
  sources: SourceAnchor[]
}

export interface FinancialAnalysis {
  metrics: FinancialMetricsSnapshot
  anomalies: FinancialAnomaly[]
}

/** Amount in money units (USD default). */
const amount = (m: FinancialMetrics['revenue'] | undefined): number | undefined =>
  m ? m.amount : undefined

function ratio(numerator: number | undefined, denominator: number | undefined): number | null {
  if (numerator === undefined || denominator === undefined || denominator === 0) return null
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  return numerator / denominator
}

export interface AnalyzeOptions {
  /** Prior-year metrics to enable year-over-year trend analysis. */
  prior?: FinancialMetrics
  thresholds?: FinancialThresholds
  /** Source anchor per metric, used to attach provenance to anomalies. */
  sources?: Partial<Record<FinancialMetricKey, SourceAnchor>>
}

const asMoney = (m: FinancialMetrics | undefined, key: keyof FinancialMetrics) =>
  m ? amount(m[key] as FinancialMetrics['revenue']) : undefined

/** Derive the metric snapshot. Every metric is null when insufficient data. */
export function computeFinancialMetrics(
  current: FinancialMetrics,
  prior?: FinancialMetrics,
): FinancialMetricsSnapshot {
  const revenue = amount(current.revenue)
  const ebitda = amount(current.ebitda)
  const debt = amount(current.debt)
  const cash = amount(current.cash)
  const netIncome = amount(current.netIncome)
  const valuation = amount(current.valuation)

  let revenueYoY: number | null = null
  if (prior) {
    const priorRevenue = asMoney(prior, 'revenue')
    if (priorRevenue !== undefined && priorRevenue > 0 && revenue !== undefined) {
      revenueYoY = (revenue - priorRevenue) / priorRevenue
    }
  }

  let cashRunwayMonths: number | null = null
  if (cash !== undefined && netIncome !== undefined) {
    const annualBurn = -netIncome
    if (annualBurn > 0) {
      cashRunwayMonths = cash / (annualBurn / 12)
    }
  }

  let valuationMultiple: number | null = null
  if (valuation !== undefined && ebitda !== undefined && ebitda > 0) {
    valuationMultiple = valuation / ebitda
  }

  return {
    revenueYoY,
    ebitdaMargin: ratio(ebitda, revenue),
    debtToEbitda: ratio(debt, ebitda),
    cashRunwayMonths,
    valuationMultiple,
  }
}

/** Flag anomalies: pure comparisons against the thresholds. */
export function analyzeFinancials(
  current: FinancialMetrics,
  opts: AnalyzeOptions = {},
): FinancialAnalysis {
  const { prior, thresholds = DEFAULT_FINANCIAL_THRESHOLDS, sources = {} } = opts
  const metrics = computeFinancialMetrics(current, prior)
  const anomalies: FinancialAnomaly[] = []

  const flag = (
    metric: FinancialMetricKey,
    flagName: FinancialFlag,
    value: number,
    threshold: number,
    direction: 'below' | 'above',
    dataValues: Record<string, number | undefined>,
  ) => {
    const severity = direction === 'above' ? 'elevated' : 'watch'
    anomalies.push({
      id: `FIN-${anomalies.length + 1}`,
      metric,
      flag: flagName,
      value,
      threshold,
      direction,
      severity,
      dataValues,
      sources: sources[metric] ? [sources[metric]!] : [],
    })
  }

  const d = {
    revenue: amount(current.revenue),
    ebitda: amount(current.ebitda),
    debt: amount(current.debt),
    cash: amount(current.cash),
    netIncome: amount(current.netIncome),
    valuation: amount(current.valuation),
    priorRevenue: prior ? asMoney(prior, 'revenue') : undefined,
  }

  if (metrics.revenueYoY !== null && metrics.revenueYoY < thresholds.revenueYoYMin) {
    flag('revenueYoY', 'revenue-decline', metrics.revenueYoY, thresholds.revenueYoYMin, 'below', d)
  }
  if (metrics.ebitdaMargin !== null && metrics.ebitdaMargin < thresholds.ebitdaMarginMin) {
    flag('ebitdaMargin', 'margin-below-floor', metrics.ebitdaMargin, thresholds.ebitdaMarginMin, 'below', d)
  }
  if (metrics.debtToEbitda !== null && metrics.debtToEbitda > thresholds.debtToEbitdaMax) {
    flag('debtToEbitda', 'elevated-leverage', metrics.debtToEbitda, thresholds.debtToEbitdaMax, 'above', d)
  }
  if (metrics.cashRunwayMonths !== null && metrics.cashRunwayMonths < thresholds.cashRunwayMinMonths) {
    flag('cashRunwayMonths', 'short-cash-runway', metrics.cashRunwayMonths, thresholds.cashRunwayMinMonths, 'below', d)
  }
  if (metrics.valuationMultiple !== null && metrics.valuationMultiple > thresholds.valuationMultipleMax) {
    flag('valuationMultiple', 'elevated-valuation', metrics.valuationMultiple, thresholds.valuationMultipleMax, 'above', d)
  }

  return { metrics, anomalies }
}
