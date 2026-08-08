import type { DealIntelligenceReport, SourceAnchor } from '../contract'
import { fmtMoney, fmtMultiple, fmtRatio } from '../lib/format'

interface FinancialTableProps {
  report: DealIntelligenceReport
  onOpenSource: (anchor: SourceAnchor) => void
}

interface FinancialRow {
  label: string
  value: string
  valueClass?: string
  source: SourceAnchor
}

export function FinancialTable({ report, onOpenSource }: FinancialTableProps) {
  const f = report.financials
  const cite = (documentId: string, page: number, section?: string): SourceAnchor => ({
    documentId,
    page,
    section,
  })

  const rows: FinancialRow[] = [
    { label: 'Revenue', value: f.revenue ? fmtMoney(f.revenue) : '—', source: cite('doc-annual-fy25', 26, 'Statement of Operations') },
    { label: 'EBITDA', value: f.ebitda ? fmtMoney(f.ebitda) : '—', source: cite('doc-audit-fy24', 9, 'EBITDA Reconciliation') },
    { label: 'EBITDA margin', value: f.ebitdaMargin !== undefined ? fmtRatio(f.ebitdaMargin) : '—', source: cite('doc-audit-fy24', 9, 'EBITDA Reconciliation') },
    { label: 'Operating costs', value: f.operatingCosts ? fmtMoney(f.operatingCosts) : '—', source: cite('doc-annual-fy25', 28, 'Statement of Operations') },
    { label: 'Net income', value: f.netIncome ? fmtMoney(f.netIncome) : '—', source: cite('doc-annual-fy25', 26, 'Statement of Operations') },
    { label: 'Debt', value: f.debt ? fmtMoney(f.debt) : '—', source: cite('doc-loan', 4, 'Definitions') },
    { label: 'Cash', value: f.cash ? fmtMoney(f.cash) : '—', source: cite('doc-annual-fy25', 33, 'Balance Sheet') },
    { label: 'Debt / EBITDA', value: f.debtToEbitda !== undefined ? fmtMultiple(f.debtToEbitda) : '—', source: cite('doc-loan', 4, 'Financial Covenants') },
    { label: 'Valuation', value: f.valuation ? fmtMoney(f.valuation) : '—', source: cite('doc-market', 5, 'Transaction Benchmark') },
    { label: 'Valuation multiple', value: f.valuationMultiple !== undefined ? fmtMultiple(f.valuationMultiple) : '—', source: cite('doc-market', 5, 'Transaction Benchmark') },
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
              <td className={`num ${r.valueClass ?? ''}`}>{r.value}</td>
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
