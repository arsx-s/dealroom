import type { DealIntelligenceReport, FindingCategory } from '../contract'
import { SEVERITY_MULTIPLIERS, riskLevelFromScore } from '../contract'
import { fmtCount } from '../lib/format'

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  financial: 'Financial',
  legal: 'Legal',
  operational: 'Operational',
  market: 'Market',
}

function riskClass(score: number): string {
  const level = riskLevelFromScore(score)
  return level === 'high' ? 'rk-high' : level === 'medium' ? 'rk-medium' : 'rk-low'
}

export function RiskSummary({ report }: { report: DealIntelligenceReport }) {
  const { compositeRiskScore: c, methodology } = report

  return (
    <section className="panel" id="risk-summary" aria-label="Risk summary and scoring construction">
      <div className="section-head">
        <h2 className="panel-title">How This Score Was Constructed</h2>
        <span className="meta">scoring version {c.scoringVersion}</span>
      </div>

      <div className="risk-summary-grid">
        <div className="summary-left">
          <div className="summary-inner">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Score</th>
                  <th className="num">Weight</th>
                  <th className="num">Findings</th>
                  <th className="num">Top Severity</th>
                  <th className="num">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {c.categoryScores.map((cat) => (
                  <tr key={cat.category}>
                    <td>{CATEGORY_LABELS[cat.category]}</td>
                    <td className={`num ${riskClass(cat.score)}`}>{cat.score}</td>
                    <td className="num">{Math.round(cat.weight * 100)}%</td>
                    <td className="num">{cat.findingCount}</td>
                    <td className={`num ${riskClass(cat.score)}`}>{cat.highestSeverity.toUpperCase()}</td>
                    <td className="num">
                      {Math.round(cat.score * cat.weight)} / {Math.round(100 * cat.weight)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 600 }}>Composite</td>
                  <td className={`num ${riskClass(c.score)}`} style={{ fontWeight: 600 }}>
                    {c.score}
                  </td>
                  <td className="num">100%</td>
                  <td className="num">{report.findings.length}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="summary-inner">
          <div className="formula">
            <div className="formula-label caps">Formula</div>
            <p style={{ marginTop: '6px' }}>
              category = 100 − Σ(contribution × severity multiplier)
              <br />
              composite = Σ(category × weight)
            </p>
            <p className="mono" style={{ marginTop: '8px' }}>
              multipliers: LOW {SEVERITY_MULTIPLIERS.low} · MED {SEVERITY_MULTIPLIERS.medium} · HIGH{' '}
              {SEVERITY_MULTIPLIERS.high} · CRIT {SEVERITY_MULTIPLIERS.critical}
            </p>
          </div>

          <div className="authority-note">
            <div className="note-label caps">Score Authority</div>
            <p>
              Every number above is computed by DealRoom&rsquo;s deterministic scoring engine from
              structured findings. AI/LLM reasoning is used to propose findings and evidence — it is
              never the source of truth for a score.
            </p>
          </div>

          <p className="mono-note">
            RUN {methodology.runId} · {methodology.generatedAt.slice(0, 10)} · {fmtCount(methodology.sourcesAnalyzed)} sources
            analyzed · {fmtCount(methodology.pagesAnalyzed)} pages · {methodology.findingsTotal} findings
          </p>
        </div>
      </div>
    </section>
  )
}
