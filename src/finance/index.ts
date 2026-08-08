/**
 * Deterministic financial analysis layer — thresholds, derived metrics,
 * anomaly flags, and citation anchors. No risk aggregation and no model
 * here; this layer only describes the numbers.
 */

export * from './config'
export * from './analyze'
export * from './sources'

export { analyzeReportFinancials } from './report'