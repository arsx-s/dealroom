import { useRef, useState } from 'react'
import { parseIndexSafe } from '../lib/ipa'
import { ipIndex } from '../lib/ipa'

const MAX_BYTES = 15 * 1024 * 1024
const MAX_PAGES = 5_000

type IngestState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; filename: string; documents: number; pages: number }

interface UploadViewProps {
  /** Active source set, or null when the seeded corpus is in use. */
  activeIndex: { filename: string; documents: number; pages: number } | null
  onIndex: (index: typeof ipIndex, filename: string) => void
  onReset: () => void
}

export function UploadView({ activeIndex, onIndex, onReset }: UploadViewProps) {
  const [state, setState] = useState<IngestState>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const ingestFile = async (file: File | undefined) => {
    if (!file) return
    setState({ kind: 'reading' })

    if (!file.name.toLowerCase().endsWith('.json')) {
      setState({ kind: 'error', message: `unsupported file type — expected an IPA index (.json), got "${file.name}"` })
      return
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: 'error', message: `file too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — limit is ${MAX_BYTES / 1024 / 1024} MB` })
      return
    }

    const raw = await file.text()
    const parsed = parseIndexSafe(raw)
    if (!parsed.ok) {
      setState({ kind: 'error', message: `index rejected: ${parsed.error}` })
      return
    }
    if (parsed.index.pages.length > MAX_PAGES) {
      setState({ kind: 'error', message: `index too large (${parsed.index.pages.length} pages) — limit is ${MAX_PAGES}` })
      return
    }

    setState({
      kind: 'done',
      filename: file.name,
      documents: parsed.index.documents.length,
      pages: parsed.index.pages.length,
    })
    onIndex(parsed.index, file.name)
  }

  return (
    <section className="panel" aria-label="Document ingestion">
      <div className="section-head">
        <h2 className="panel-title">Ingest Source Set</h2>
        <span className="meta">IPA index (.json)</span>
      </div>

      <p className="muted">
        DealRoom analyzes an IPA index: the extracted-page representation the seed pipeline writes to{' '}
        <span className="mono">src/data/deal-index.json</span>. Upload an index to run the full analysis
        pipeline against your own source set. The default analysis uses the bundled seed corpus.
      </p>

      <div className="upload-row">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Choose an IPA index file"
          onChange={(e) => {
            void ingestFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {state.kind === 'reading' && <span className="muted mono">reading index…</span>}
        {state.kind === 'error' && (
          <span className="upload-error" role="alert">
            {state.message}
          </span>
        )}
      </div>

      {state.kind === 'done' && (
        <div className="upload-status">
          <span className="caps rk-high">INGESTED</span>
          <span className="mono">
            {state.filename} — {state.documents} documents · {state.pages} pages
          </span>
        </div>
      )}

      <div className="source-status">
        <span className="note-label caps">Active source set</span>
        {activeIndex ? (
          <div className="ev-line">
            <span className="mono">{activeIndex.filename}</span> — {activeIndex.documents} documents ·{' '}
            {activeIndex.pages} pages
            <button type="button" className="btn btn-ghost" onClick={onReset}>
              Reset to seed corpus
            </button>
          </div>
        ) : (
          <div className="empty-findings">NO SOURCE SET UPLOADED — ANALYSIS RUNS ON THE SEED CORPUS</div>
        )}
      </div>

      <div className="note-label caps" style={{ marginTop: 'var(--s-4)' }}>
        Index requirements
      </div>
      <ul className="muted" style={{ margin: 'var(--s-2) 0 0 var(--s-3)', fontSize: 13 }}>
        <li>
          <span className="mono">format</span>: <span className="mono">"dealroom/ipa-index/v1"</span> (schema
          validated on upload)
        </li>
        <li>
          every page carries its text blocks with roles (<span className="mono">title · section · statement · body</span>)
        </li>
        <li>
          the section registry is what citations resolve against — an index without section windows still
          analyzes, but clause segmentation degrades to per-page units
        </li>
        <li>generate one with <span className="mono">npm run seed</span>, then upload <span className="mono">src/data/deal-index.json</span></li>
      </ul>
    </section>
  )
}
