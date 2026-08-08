/**
 * Convenience wiring: run the deterministic analysis over a report's
 * financials, attaching the corpus's citation anchors by default.
 */

import type { DealIntelligenceReport } from '../contract'
import type { AnalyzeOptions } from './analyze'
import { analyzeFinancials } from './analyze'
import { FINANCIAL_SOURCE_MAP } from './sources'

export function analyzeReportFinancials(
  report: DealIntelligenceReport,
  opts: Omit<AnalyzeOptions, 'sources'> & { sources?: Partial<AnalyzeOptions['sources']> } = {},
) {
  const { prior, thresholds, sources = FINANCIAL_SOURCE_MAP } = opts
  return analyzeFinancials(report.financials, { prior, thresholds, sources })
}