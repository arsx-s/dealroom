import type { DealIntelligenceReport, SourceAnchor } from '../contract'

interface DocumentsViewProps {
  report: DealIntelligenceReport
  onOpenSource: (anchor: SourceAnchor) => void
}

export function DocumentsView({ report, onOpenSource }: DocumentsViewProps) {
  return (
    <div className="docs-grid">
      <section className="panel" aria-label="Source documents">
        <div className="section-head">
          <h2 className="panel-title">Source Documents</h2>
          <span className="meta">{report.documents.length} documents</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th className="num">Pages</th>
                <th className="num">Sections</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {report.documents.map((d) => (
                <tr key={d.id} className="doc-row">
                  <td>{d.filename}</td>
                  <td className="caps">{d.documentType.replace(/-/g, ' ')}</td>
                  <td className="num">{d.metadata.pagesTotal}</td>
                  <td className="num">{d.sections.length}</td>
                  <td>
                    <button
                      type="button"
                      className="citation"
                      onClick={() => onOpenSource({ documentId: d.id, page: 1 })}
                    >
                      [open p.1]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-label="Extracted clauses">
        <div className="section-head">
          <h2 className="panel-title">Extracted Clauses</h2>
          <span className="meta">{report.clauses.length} clauses</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th className="num">Conf</th>
                <th>Severity</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {report.clauses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.type.replace(/-/g, ' ')}</span>
                    <br />
                    <span className="muted mono" style={{ fontSize: 12 }}>
                      {c.text.length > 70 ? `${c.text.slice(0, 70)}…` : c.text}
                    </span>
                  </td>
                  <td className="num">{Math.round(c.confidence * 100)}%</td>
                  <td className={`${c.severity === 'high' || c.severity === 'critical' ? 'rk-high' : c.severity === 'medium' ? 'rk-medium' : 'rk-low'} mono`}>
                    {c.severity?.toUpperCase() ?? '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="citation"
                      onClick={() =>
                        onOpenSource({
                          documentId: c.documentId,
                          page: c.page,
                          section: c.section,
                          clause: c.id,
                        })
                      }
                    >
                      [p.{c.page}
                      {c.section ? ` · ${c.section}` : ''}]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
