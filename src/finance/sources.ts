/**
 * Source of truth for financial metric citation anchors.
 *
 * Owned by the finance layer so the analysis functions can attach document
 * provenance to every flagged metric. The dashboard's financial table
 * re-exports this list for its own rows.
 */

import type { SourceAnchor } from '../contract'
import type { FinancialMetricKey } from './analyze'

export const FINANCIAL_CITATIONS: SourceAnchor[] = [
  { documentId: 'doc-annual-fy25', page: 26, section: 'Statement of Operations' }, // revenue / net income
  { documentId: 'doc-audit-fy24', page: 9, section: 'EBITDA Reconciliation' }, // EBITDA / margin
  { documentId: 'doc-annual-fy25', page: 28, section: 'Statement of Operations' }, // operating costs
  { documentId: 'doc-annual-fy25', page: 33, section: 'Balance Sheet' }, // cash
  { documentId: 'doc-loan', page: 4, section: 'Definitions' }, // debt
  { documentId: 'doc-loan', page: 4, section: 'Financial Covenants' }, // debt / EBITDA
  { documentId: 'doc-market', page: 5, section: 'Transaction Benchmark' }, // valuation / multiple
]

/** Anchor per derived metric (where one exists in the corpus). */
export const FINANCIAL_SOURCE_MAP: Partial<Record<FinancialMetricKey, SourceAnchor>> = {
  revenueYoY: FINANCIAL_CITATIONS[0],
  ebitdaMargin: FINANCIAL_CITATIONS[1],
  debtToEbitda: FINANCIAL_CITATIONS[5],
  cashRunwayMonths: FINANCIAL_CITATIONS[3],
  valuationMultiple: FINANCIAL_CITATIONS[6],
}