import type { DealIntelligenceReport, FindingCategory } from '../contract'
import { riskLevelFromScore } from '../contract'

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

/** Ruler position of the needle, as a percentage of the 0–100 scale. */
function needlePosition(score: number): number {
  return Math.min(100, Math.max(0, score))
}

export function ScoreHero({ report }: { report: DealIntelligenceReport }) {
  const { score, level, categoryScores } = report.compositeRiskScore
  const top = [...categoryScores].sort((a, b) => b.score - a.score).slice(0, 3)

  return (
    <section className="score-hero" aria-label="Composite deal risk score">
      <div className="score-block">
        <div className="caps hero-label">Composite Deal Risk Score</div>
        <div className="score-line">
          <span className={`score-num ${riskClass(score)}`}>{score}</span>
          <span className="score-denom">/100</span>
          <span className={`score-level ${riskClass(score)}`}>{level.toUpperCase()}</span>
        </div>
        <p className="score-readout">
          Composite of {categoryScores.length} categories · {report.findings.length} findings · weighted
          deterministic engine — see “How This Score Was Constructed”
        </p>
        <div className="top-findings">
          <span className="caps hero-label" style={{ color: 'var(--text-muted)' }}>
            Highest-Risk Categories
          </span>
          {top.map((c) => (
            <div className="top-finding" key={c.category}>
              <span className="cat caps">{CATEGORY_LABELS[c.category]}</span>
              <span className={`val ${riskClass(c.score)}`}>{c.score}</span>
              <span className="reason mono">
                weight {Math.round(c.weight * 100)}% · {c.findingCount} findings
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="ruler-block">
        <div className="caps hero-label">Risk Scale — 0 = Low Risk, 100 = High Risk</div>
        <div className="ruler" aria-hidden="true">
          <div className="ruler-track">
            <div className="ruler-bands">
              <div className="ruler-band low" />
              <div className="ruler-band medium" />
              <div className="ruler-band high" />
            </div>
            <div className="ruler-needle" style={{ left: `${needlePosition(score)}%` }} />
          </div>
          <div className="ruler-scale" aria-hidden="true">
            <span>0</span>
            <span>40</span>
            <span>65</span>
            <span>100</span>
          </div>
        </div>
        <div className="ruler-legend">
          <div className="legend-item">
            <div className="band-label rk-low">LOW</div>
            <div className="band-range">0–39</div>
          </div>
          <div className="legend-item">
            <div className="band-label rk-medium">MEDIUM</div>
            <div className="band-range">40–64</div>
          </div>
          <div className="legend-item">
            <div className="band-label rk-high">HIGH</div>
            <div className="band-range">65–100</div>
          </div>
        </div>
        <p className="mono-note">
          Category bands: {categoryScores.map((c) => `${CATEGORY_LABELS[c.category]} ${c.score}`).join(' · ')}
        </p>
      </div>
    </section>
  )
}
