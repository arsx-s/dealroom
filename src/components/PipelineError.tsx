import type { PipelineFailure } from '../pipeline'

export function PipelineErrorView({ failure }: { failure: PipelineFailure }) {
  return (
    <div className="app-shell">
      <section className="panel pipeline-error" role="alert">
        <div className="section-head">
          <h2 className="panel-title">Deal Room — Analysis Failed</h2>
          <span className="meta">no report rendered</span>
        </div>
        <p>
          The pipeline could not produce a Deal Intelligence Report for this source set. The dashboard
          only renders validated pipeline output — nothing below is fabricated.
        </p>
        <p className="mono pipeline-error-msg">{failure.error}</p>
        <div className="pipeline-stages">
          <div className="note-label caps">Stage trace</div>
          {failure.stages.map((s) => (
            <div key={s.stage} className={`stage-line ${s.ok ? 'ok' : 'bad'}`}>
              <span className="mono">{s.ok ? '✓' : '✕'} {s.stage}</span>
              {s.error && <span className="mono muted">{s.error}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
