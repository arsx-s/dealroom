import { useState } from 'react'
import type { Finding, FindingCategory, Severity, SourceAnchor } from '../contract'

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  financial: 'Financial',
  legal: 'Legal',
  operational: 'Operational',
  market: 'Market',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
}

function SeverityMarker({ severity }: { severity: Severity }) {
  return <span className={`sev-marker ${severity}`} aria-hidden="true" />
}

interface FindingRowProps {
  finding: Finding
  onOpenSource: (anchor: SourceAnchor) => void
}

function FindingRow({ finding, onOpenSource }: FindingRowProps) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`finding-row sev-${finding.severity}`}>
      <div className="finding-sev">
        <SeverityMarker severity={finding.severity} />
        <span className={`sev-label ${finding.severity === 'low' ? 'rk-low' : finding.severity === 'medium' ? 'rk-medium' : 'rk-high'}`}>
          {SEVERITY_LABELS[finding.severity]}
        </span>
      </div>
      <div className="finding-main">
        <h3 className="finding-title">{finding.title}</h3>
        <div className="finding-cat caps muted">{CATEGORY_LABELS[finding.category]}</div>
        <p className="finding-explanation">{finding.explanation}</p>
        {finding.evidence.length > 0 && (
          <button
            type="button"
            className="finding-evidence-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? '▾' : '▸'} EVIDENCE ({finding.evidence.length})
          </button>
        )}
        {open && (
          <div className="finding-evidence">
            {finding.evidence.map((e, i) => (
              <span key={i} className="ev-line">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="finding-conf">
        <span className="conf-label">Conf</span>
        <span className="conf-value">{Math.round(finding.confidence * 100)}%</span>
      </div>
      <div className="finding-cites">
        {finding.sources.map((s, i) => (
          <button
            key={i}
            type="button"
            className="citation"
            onClick={() => onOpenSource(s)}
            title={`${s.documentId} · page ${s.page}${s.section ? ` · ${s.section}` : ''}`}
          >
            [p.{s.page}
            {s.section ? ` · ${s.section}` : ''}]
            <span className="src-doc"> {s.documentId}</span>
          </button>
        ))}
      </div>
    </article>
  )
}

type Filter = 'all' | Severity

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'critical', label: 'CRITICAL' },
  { id: 'high', label: 'HIGH' },
  { id: 'medium', label: 'MEDIUM' },
  { id: 'low', label: 'LOW' },
]

interface FindingsTableProps {
  findings: Finding[]
  onOpenSource: (anchor: SourceAnchor) => void
}

export function FindingsTable({ findings, onOpenSource }: FindingsTableProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const countFor = (f: Filter) =>
    f === 'all' ? findings.length : findings.filter((x) => x.severity === f).length

  const visible = filter === 'all' ? findings : findings.filter((f) => f.severity === filter)

  if (findings.length === 0) {
    return (
      <section className="panel" aria-label="Findings">
        <div className="section-head">
          <h2 className="panel-title">Findings</h2>
          <span className="meta">0 findings</span>
        </div>
        <div className="empty-findings">
          NO FINDINGS — THIS SOURCE SET PRODUCED NO DETECTED RISK SIGNALS. UPLOAD A SOURCE SET VIA THE INGEST
          TAB TO BEGIN ANALYSIS.
        </div>
      </section>
    )
  }

  return (
    <section className="panel" aria-label="Findings">
      <div className="section-head">
        <h2 className="panel-title">Findings</h2>
        <span className="meta">{visible.length} shown / {findings.length} total</span>
      </div>
      <div className="filters" role="group" aria-label="Filter findings by severity">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="chip"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} <span className="count">({countFor(f.id)})</span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty-findings">NO FINDINGS AT THIS SEVERITY — ADJUST OR CLEAR THE FILTER</div>
      ) : (
        <div className="finding-list">
          <div className="finding-head" aria-hidden="true">
            <span>Severity</span>
            <span>Finding / Category</span>
            <span className="head-right">Conf</span>
            <span className="head-right head-cites">Citation</span>
          </div>
          {visible.map((f) => (
            <FindingRow key={f.id} finding={f} onOpenSource={onOpenSource} />
          ))}
        </div>
      )}
    </section>
  )
}
