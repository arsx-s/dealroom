import type { DealIntelligenceReport } from '../contract'

export function RiskBanner({ report }: { report: DealIntelligenceReport }) {
  const { score, level } = report.compositeRiskScore
  if (level !== 'high') return null

  const criticalCount = report.findings.filter((f) => f.severity === 'critical').length

  return (
    <div className="risk-banner" role="status">
      <span className="level caps">High Risk</span>
      <span className="statement mono">
        {score}/100 — {criticalCount} critical finding{criticalCount === 1 ? '' : 's'}
      </span>
      <span className="detail">Deal requires escalation review before signing.</span>
      <a href="#risk-summary" className="btn" onClick={() => window.location.hash = 'risk-summary'}>
        Open Risk Summary
      </a>
    </div>
  )
}
