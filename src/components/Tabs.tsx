export type TabId = 'report' | 'documents'

interface TabsProps {
  active: TabId
  onChange: (tab: TabId) => void
  reportCount: number
  documentCount: number
}

export function Tabs({ active, onChange, reportCount, documentCount }: TabsProps) {
  return (
    <nav className="tabs" role="tablist" aria-label="Report views">
      <button
        type="button"
        role="tab"
        className="tab"
        aria-selected={active === 'report'}
        onClick={() => onChange('report')}
      >
        Deal Report
        <span className="muted mono"> · {reportCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        className="tab"
        aria-selected={active === 'documents'}
        onClick={() => onChange('documents')}
      >
        Source Documents
        <span className="muted mono"> · {documentCount}</span>
      </button>
    </nav>
  )
}
