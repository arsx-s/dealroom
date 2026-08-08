import type { RiskNarrativeResult } from '../reasoning/narrative'

export function ReasoningPanel({ narrative }: { narrative: RiskNarrativeResult }) {
  if (!narrative.ok) {
    return (
      <section className="panel" aria-label="Risk rationale">
        <div className="section-head">
          <h2 className="panel-title">Risk Rationale</h2>
          <span className="meta">reasoning unavailable</span>
        </div>
        <div className="reasoning-unavailable">
          <span className="caps rk-high">REASONING NOT AVAILABLE</span>
          <p className="mono">{narrative.error}</p>
          <p className="muted">
            The pipeline never fabricates reasoning: when no narrative provider is configured or the
            provider fails, this section shows the failure instead.
          </p>
        </div>
      </section>
    )
  }

  const n = narrative.narrative
  return (
    <section className="panel" aria-label="Risk rationale">
      <div className="section-head">
        <h2 className="panel-title">Risk Rationale</h2>
        <span
          className={`reasoning-badge ${n.grounded ? 'badge-grounded' : 'badge-concerns'}`}
          title={
            n.grounded
              ? 'Verified: every claim is grounded in the report context'
              : 'Faithfulness check raised concerns — review before relying on this text'
          }
        >
          {n.grounded ? 'GROUNDED' : 'CONCERNS'}
        </span>
      </div>
      <p className="reasoning-text">{n.text}</p>
      {!n.grounded && (
        <div className="reasoning-issues">
          <div className="note-label caps">Faithfulness concerns</div>
          {n.faithfulness.issues.map((issue, i) => (
            <div key={i} className="ev-line">
              {issue}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
