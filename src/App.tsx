import { useEffect, useMemo, useState } from 'react'
import { runPipeline, upgradeNarrative } from './pipeline'
import { createHttpProvider } from './reasoning/provider'
import type { SourceAnchor } from './contract'
import type { IpIndex } from './lib/ipa'
import { Header } from './components/Header'
import { Tabs, type TabId } from './components/Tabs'
import { RiskBanner } from './components/RiskBanner'
import { ScoreHero } from './components/ScoreHero'
import { CategoryBreakdown } from './components/CategoryBreakdown'
import { FinancialTable } from './components/FinancialTable'
import { FindingsTable } from './components/FindingsTable'
import { RiskSummary } from './components/RiskSummary'
import { ReasoningPanel } from './components/ReasoningPanel'
import { DocumentsView } from './components/DocumentsView'
import { SourceViewer } from './components/SourceViewer'
import { UploadView } from './components/UploadView'
import { PipelineErrorView } from './components/PipelineError'
import { fmtCount } from './lib/format'

interface SourceSet {
  index: IpIndex
  filename: string
}

export default function App() {
  const [source, setSource] = useState<SourceSet | null>(null)
  const pipeline = useMemo(() => runPipeline(source ? { index: source.index } : {}), [source])
  const [narrative, setNarrative] = useState(pipeline.ok ? pipeline.narrative : null)
  const [tab, setTab] = useState<TabId>('report')
  const [viewerAnchor, setViewerAnchor] = useState<SourceAnchor | null>(null)

  useEffect(() => {
    if (!pipeline.ok) return
    const url = import.meta.env.VITE_REASONING_URL as string | undefined
    if (!url) return
    let cancelled = false
    const provider = createHttpProvider({
      url,
      apiKey: (import.meta.env.VITE_REASONING_API_KEY as string | undefined) ?? undefined,
      model: (import.meta.env.VITE_REASONING_MODEL as string | undefined) ?? 'dealroom-default',
    })
    upgradeNarrative(pipeline.report, provider).then((result) => {
      if (!cancelled) setNarrative(result)
    })
    return () => {
      cancelled = true
    }
  }, [pipeline])

  if (!pipeline.ok) {
    return <PipelineErrorView failure={pipeline} />
  }

  const { report } = pipeline
  const shownNarrative = narrative ?? pipeline.narrative

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dealroom-${report.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = report.documents.reduce((acc, d) => acc + d.metadata.pagesTotal, 0)

  return (
    <>
      <Header report={report} onExport={exportReport} />
      <main className="app-shell">
        <section className="company-strip" aria-label="Target company">
          <div className="company-name">
            <h1>{report.targetCompany.name}</h1>
            <span className="deal-tag">
              DEAL {report.id} · {report.targetCompany.dealStage.toUpperCase()}
            </span>
          </div>
          <div className="meta-cell">
            <span className="label caps">Sector</span>
            <span className="value">{report.targetCompany.sector}</span>
          </div>
          <div className="meta-cell">
            <span className="label caps">HQ</span>
            <span className="value">{report.targetCompany.hq}</span>
          </div>
          <div className="meta-cell">
            <span className="label caps">Analysis</span>
            <span className="value mono">{report.analysisDate}</span>
          </div>
          <div className="meta-cell">
            <span className="label caps">Source Set</span>
            <span className="value mono">
              {fmtCount(report.documents.length)} docs · {fmtCount(totalPages)} pages
            </span>
          </div>
        </section>

        <RiskBanner report={report} />

        <Tabs
          active={tab}
          onChange={setTab}
          reportCount={report.findings.length}
          documentCount={report.documents.length}
        />

        {tab === 'report' ? (
          <>
            <ScoreHero report={report} />
            <CategoryBreakdown categories={report.compositeRiskScore.categoryScores} />
            <div style={{ marginTop: 'var(--s-5)' }}>
              <FinancialTable report={report} onOpenSource={setViewerAnchor} />
            </div>
            <div style={{ marginTop: 'var(--s-5)' }}>
              <FindingsTable findings={report.findings} onOpenSource={setViewerAnchor} />
            </div>
            <div style={{ marginTop: 'var(--s-5)' }}>
              <RiskSummary report={report} />
            </div>
            <div style={{ marginTop: 'var(--s-5)' }}>
              <ReasoningPanel narrative={shownNarrative} />
            </div>
          </>
        ) : tab === 'documents' ? (
          <DocumentsView report={report} onOpenSource={setViewerAnchor} />
        ) : (
          <UploadView
            activeIndex={
              source
                ? { filename: source.filename, documents: source.index.documents.length, pages: source.index.pages.length }
                : null
            }
            onIndex={(index, filename) => {
              setSource({ index, filename })
              setViewerAnchor(null)
            }}
            onReset={() => {
              setSource(null)
              setViewerAnchor(null)
            }}
          />
        )}

        <footer className="footer">
          <span>
            DEALROOM · {report.dealName} · DEAL {report.id}
          </span>
          <span>
            RUN {report.methodology.runId} · {report.methodology.generatedAt.slice(0, 10)} ·{' '}
            {fmtCount(report.methodology.pagesAnalyzed)} pages analyzed · score v
            {report.compositeRiskScore.scoringVersion}
          </span>
        </footer>
      </main>

      {viewerAnchor && <SourceViewer report={report} anchor={viewerAnchor} onClose={() => setViewerAnchor(null)} />}
    </>
  )
}
