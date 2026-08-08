import { useEffect, useMemo, useState } from 'react'
import type { DealIntelligenceReport, SourceAnchor } from '../contract'
import { pageBlocks, pageSectionLabel, ipIndex } from '../lib/ipa'
import { resolveCitation, type CitationFailure } from '../lib/evidence'

interface SourceViewerProps {
  report: DealIntelligenceReport
  anchor: SourceAnchor
  onClose: () => void
}

function CiteMark({ text, needle }: { text: string; needle: string }) {
  if (!needle) return <>{text}</>
  const idx = text.indexOf(needle)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="cite-mark">{needle}</mark>
      {text.slice(idx + needle.length)}
    </>
  )
}

function Unresolved({ failure }: { failure: CitationFailure }) {
  return (
    <div className="cite-unresolved" role="status">
      <div className="caps rk-high">CITATION COULD NOT BE RESOLVED</div>
      <p className="muted">{failure.message}</p>
    </div>
  )
}

export function SourceViewer({ report, anchor, onClose }: SourceViewerProps) {
  const resolution = useMemo(() => resolveCitation(ipIndex, anchor, report.clauses), [anchor, report])
  const docIds = report.documents.map((d) => d.id)
  const initialDoc = Math.max(0, docIds.indexOf(anchor.documentId))
  const [docIndex, setDocIndex] = useState(initialDoc)
  const [page, setPage] = useState(anchor.page)

  const doc = report.documents[docIndex]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const blocks = pageBlocks(doc.id, page)
  const sectionLabel = pageSectionLabel(doc.id, page)
  const isAnchorPage = anchor.documentId === doc.id && anchor.page === page
  const citationOpen = resolution.ok && isAnchorPage && resolution.excerptResolved

  const gotoDoc = (index: number) => {
    setDocIndex(index)
    setPage(1)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Source document viewer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title caps">Source Viewer</span>
          <span className="mono muted">
            {anchor.documentId} · p.{anchor.page}
            {anchor.section ? ` · ${anchor.section}` : ''}
            {anchor.clause ? ` · §${anchor.clause}` : ''}
          </span>
          <button type="button" className="btn modal-close" onClick={onClose}>
            Close ✕
          </button>
        </div>

        <div className="modal-body">
          <nav className="viewer-rail" aria-label="Documents">
            <div className="rail-title caps">Documents ({report.documents.length})</div>
            {report.documents.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className="rail-doc"
                aria-current={i === docIndex}
                onClick={() => gotoDoc(i)}
              >
                <div className="doc-filename">{d.filename}</div>
                <div className="doc-meta">
                  {d.documentType} · {d.metadata.pagesTotal} pages · {d.sections.length} sections
                </div>
              </button>
            ))}
          </nav>

          <div className="viewer-pane">
            {!resolution.ok && <Unresolved failure={resolution} />}

            {resolution.ok && isAnchorPage && (
              <span className="viewer-ref-tag">SELECTED REFERENCE</span>
            )}
            <div>
              <div className="caps muted">{doc.documentType}</div>
              <h3 className="mono" style={{ fontWeight: 600, wordBreak: 'break-all' }}>
                {doc.filename}
              </h3>
            </div>

            <div className="viewer-pages">
              <div className={`viewer-page-block ${citationOpen ? 'current' : ''}`}>
                <div className="pg">
                  PAGE {page}
                  {sectionLabel ? ` — ${sectionLabel}` : ''}
                </div>
                {blocks.length > 0 ? (
                  blocks.map((b, i) => (
                    <div
                      key={i}
                      className={`viewer-block ${b.role}${citationOpen && resolution.ok && resolution.matchedBlock?.index === i ? ' cited' : ''}`}
                    >
                      {citationOpen && resolution.ok ? (
                        <CiteMark text={b.text} needle={resolution.matchedBlock?.needle ?? ''} />
                      ) : (
                        b.text
                      )}
                    </div>
                  ))
                ) : (
                  <div className="pg-text">NO EXTRACTED TEXT FOR THIS PAGE IN SOURCE SET.</div>
                )}
              </div>
            </div>

            {resolution.ok && anchor.excerpt && citationOpen && (
              <div className="viewer-excerpt mono">
                <span className="caps muted">CITED TEXT</span> “{anchor.excerpt}”
              </div>
            )}

            <div className="viewer-loc">
              {doc.id} · page {page} of {doc.metadata.pagesTotal}
              {anchor.section ? ` · section ${anchor.section}` : ''}
              {resolution.ok && resolution.warnings.length > 0 ? (
                <span className="cite-warning"> · {resolution.warnings.join(', ')}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ◂ Prev Page
          </button>
          <button
            type="button"
            className="btn"
            disabled={page >= doc.metadata.pagesTotal}
            onClick={() => setPage((p) => Math.min(doc.metadata.pagesTotal, p + 1))}
          >
            Next Page ▸
          </button>
          <span className="page-indicator">
            {page} / {doc.metadata.pagesTotal}
          </span>
          <button type="button" className="btn btn-dark" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
