import type { DealIntelligenceReport } from '../contract'

interface HeaderProps {
  report: DealIntelligenceReport
  onExport: () => void
}

export function Header({ report, onExport }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="wordmark">DEALROOM</span>
        <span className="topbar-divider" aria-hidden="true" />
        <span className="topbar-deal">{report.dealName}</span>
        <div className="topbar-actions">
          <button type="button" className="btn btn-ghost-light" onClick={onExport} title="Download report as JSON">
            Export
          </button>
          <button type="button" className="btn btn-ghost-light" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
    </header>
  )
}
