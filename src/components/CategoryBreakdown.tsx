import type { CategoryScore, FindingCategory, Severity } from '../contract'
import { SEVERITY_ORDER, riskLevelFromScore } from '../contract'

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

/** Risk color class for the highest-severity finding in a category. */
function sevColor(sev: Severity): string {
  return sev === 'critical' || sev === 'high' ? 'rk-high' : sev === 'medium' ? 'rk-medium' : 'rk-low'
}

/** Number of filled ticks from severity: low=1, medium=2, high=3, critical=4. */
function tickCount(sev: Severity): number {
  return SEVERITY_ORDER.indexOf(sev) + 1
}

export function CategoryBreakdown({ categories }: { categories: CategoryScore[] }) {
  return (
    <section className="panel categories" aria-label="Risk category breakdown">
      {categories.map((c) => (
        <div className="category-cell" key={c.category}>
          <div className="caps cat-label">{CATEGORY_LABELS[c.category]}</div>
          <div className={`cat-score ${riskClass(c.score)}`}>{c.score}</div>
          <div className={`tickbar ${sevColor(c.highestSeverity)}`} aria-label={`${CATEGORY_LABELS[c.category]} severity ${c.highestSeverity}`}>
            {[1, 2, 3, 4].map((t) => (
              <span key={t} className={`tick ${t <= tickCount(c.highestSeverity) ? 'filled' : ''}`} />
            ))}
          </div>
          <div className="cat-meta">
            weight {Math.round(c.weight * 100)}% · {c.findingCount} findings · top {c.highestSeverity.toUpperCase()}
          </div>
        </div>
      ))}
    </section>
  )
}
