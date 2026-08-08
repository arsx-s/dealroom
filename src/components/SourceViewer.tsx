import { useEffect, useMemo, useState } from 'react'
import type { DealIntelligenceReport, SourceAnchor } from '../contract'

interface SourceViewerProps {
  report: DealIntelligenceReport
  anchor: SourceAnchor
  onClose: () => void
}

export function SourceViewer({ report, anchor, onClose }: SourceViewerProps) {
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

  const excerpt = useMemo(
    () => doc.excerpts.find((e) => e.page === page) ?? null,
    [doc, page],
  )
  const isAnchorPage = anchor.documentId === doc.id && anchor.page === page

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
            {isAnchorPage && <span className="viewer-ref-tag">SELECTED REFERENCE</span>}
            <div>
              <div className="caps muted">{doc.documentType}</div>
              <h3 className="mono" style={{ fontWeight: 600, wordBreak: 'break-all' }}>
                {doc.filename}
              </h3>
            </div>

            <div className="viewer-pages">
              <div className={`viewer-page-block ${isAnchorPage ? 'current' : ''}`}>
                <div className="pg">PAGE {page}</div>
                {excerpt ? (
                  <div className="viewer-excerpt">{excerpt.text}</div>
                ) : (
                  <div className="pg-text">NO EXTRACTED TEXT FOR THIS PAGE IN SOURCE SET.</div>
                )}
              </div>
            </div>

            <div className="viewer-loc">
              {doc.id} · page {page} of {doc.metadata.pagesTotal}
              {anchor.section ? ` · section ${anchor.section}` : ''}
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
