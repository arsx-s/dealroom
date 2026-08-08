import type { DealIntelligenceReport, SourceAnchor } from '../contract'
import { fmtMoney, fmtMultiple, fmtRatio } from '../lib/format'

/**
 * Citation anchors backing the financial table. Exported so the dataset
 * conformance suite can verify every one resolves in the IPA index.
 */
export const FINANCIAL_CITATIONS: SourceAnchor[] = [
  { documentId: 'doc-annual-fy25', page: 26, section: 'Statement of Operations' },
  { documentId: 'doc-audit-fy24', page: 9, section: 'EBITDA Reconciliation' },
  { documentId: 'doc-annual-fy25', page: 28, section: 'Statement of Operations' },
  { documentId: 'doc-annual-fy25', page: 33, section: 'Balance Sheet' },
  { documentId: 'doc-loan', page: 4, section: 'Definitions' },
  { documentId: 'doc-loan', page: 4, section: 'Financial Covenants' },
  { documentId: 'doc-market', page: 5, section: 'Transaction Benchmark' },
]

interface FinancialTableProps {
  report: DealIntelligenceReport
  onOpenSource: (anchor: SourceAnchor) => void
}

interface FinancialRow {
  label: string
  value: string
  source: SourceAnchor
}

export function FinancialTable({ report, onOpenSource }: FinancialTableProps) {
  const f = report.financials

  const rows: FinancialRow[] = [
    { label: 'Revenue', value: f.revenue ? fmtMoney(f.revenue) : '—', source: FINANCIAL_CITATIONS[0] },
    { label: 'EBITDA', value: f.ebitda ? fmtMoney(f.ebitda) : '—', source: FINANCIAL_CITATIONS[1] },
    { label: 'EBITDA margin', value: f.ebitdaMargin !== undefined ? fmtRatio(f.ebitdaMargin) : '—', source: FINANCIAL_CITATIONS[1] },
    { label: 'Operating costs', value: f.operatingCosts ? fmtMoney(f.operatingCosts) : '—', source: FINANCIAL_CITATIONS[2] },
    { label: 'Net income', value: f.netIncome ? fmtMoney(f.netIncome) : '—', source: FINANCIAL_CITATIONS[0] },
    { label: 'Debt', value: f.debt ? fmtMoney(f.debt) : '—', source: FINANCIAL_CITATIONS[4] },
    { label: 'Cash', value: f.cash ? fmtMoney(f.cash) : '—', source: FINANCIAL_CITATIONS[3] },
    { label: 'Debt / EBITDA', value: f.debtToEbitda !== undefined ? fmtMultiple(f.debtToEbitda) : '—', source: FINANCIAL_CITATIONS[5] },
    { label: 'Valuation', value: f.valuation ? fmtMoney(f.valuation) : '—', source: FINANCIAL_CITATIONS[6] },
    { label: 'Valuation multiple', value: f.valuationMultiple !== undefined ? fmtMultiple(f.valuationMultiple) : '—', source: FINANCIAL_CITATIONS[6] },
  ]

  return (
    <section className="panel" aria-label="Key financial metrics">
      <div className="section-head">
        <h2 className="panel-title">Key Financial Metrics</h2>
        <span className="meta">
          FY {f.period.start.slice(0, 4)}–{f.period.end.slice(0, 4)} · {f.currency}
        </span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="num">Value</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td className="num">{r.value}</td>
              <td>
                <button
                  type="button"
                  className="citation"
                  onClick={() => onOpenSource(r.source)}
                  title={`Open ${r.source.documentId} page ${r.source.page}`}
                >
                  [p.{r.source.page} · {r.source.section}]
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
