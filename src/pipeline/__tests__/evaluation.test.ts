/**
 * End-to-end pipeline evaluation — measures the FINAL report, not the
 * intermediate detection layer.
 *
 * Three integrity surfaces:
 *
 *  1. Clause coverage    — do the report's emitted clauses match the gold
 *                          (type, documentId, page) labels, and do typed
 *                          clauses ever land on gold-null pages?
 *  2. Citation integrity — every finding must cite a resolvable anchor
 *                          (via the evidence resolver); warnings are
 *                          reported because a warning means the citation
 *                          still opens the page but with a caveat.
 *  3. Determinism        — identical inputs yield an identical report.
 *
 * This file is the durable measurement record for the portfolio: the
 * headline numbers are printed on every run and locked as thresholds.
 * Changes to pipeline behavior that move these numbers must be deliberate
 * and visible in the evaluation record (docs/EVALUATION.md).
 */

import { describe, expect, it } from 'vitest'
import { runPipeline } from '../index'
import { ipIndex } from '../../lib/ipa'
import { resolveCitation } from '../../lib/evidence'
import { GOLD_CLAUSES } from '../../intelligence/groundtruth'
import { CLAUSE_TYPE_IDS } from '../../intelligence/taxonomy'

const result = runPipeline({
  generatedAt: '2026-08-09T00:00:00.000Z',
  runId: 'EVAL-2026-08-09',
  reportId: 'DR-2026-0089',
})
if (!result.ok) throw new Error(`pipeline must succeed for evaluation: ${result.error}`)
const { report, stages } = result

/* contract ClauseType → detection taxonomy */
const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CLAUSE_TYPE_IDS).map(([k, v]) => [v, k]),
)

const goldTyped = GOLD_CLAUSES.filter((g) => g.expected !== null)
const goldNull = GOLD_CLAUSES.filter((g) => g.expected === null)

const reportClauses = report.clauses
const reportKeys = new Map<string, string>()
for (const c of reportClauses) {
  const key = `${c.documentId}:${c.page}`
  reportKeys.set(key, c.type)
}

let matched = 0
let fpG = 0
const misses: string[] = []
for (const g of goldTyped) {
  const key = `${g.documentId}:${g.page}`
  const got = reportKeys.get(key)
  if (got && REVERSE[got] === g.expected) matched += 1
  else misses.push(`gold ${g.documentId} p.${g.page} wanted ${g.expected}, report has ${got ?? 'nothing'}`)
}
for (const g of goldNull) {
  const key = `${g.documentId}:${g.page}`
  if (reportKeys.has(key)) {
    fpG += 1
    misses.push(`gold-null ${g.documentId} p.${g.page} got ${reportKeys.get(key)}`)
  }
}
const reportRecall = matched / goldTyped.length

/* every report clause must sit on a gold page (typed or null) — anything
 * else is a misplaced detection the report exposes as a clause */
const knownPages = new Set(GOLD_CLAUSES.map((g) => `${g.documentId}:${g.page}`))
const stray = reportClauses.filter((c) => !knownPages.has(`${c.documentId}:${c.page}`))
/* citation integrity */
let citations = 0
let citationsOk = 0
let citationsWarned = 0
const warningFindings: string[] = []
for (const f of report.findings) {
  for (const src of f.sources) {
    citations += 1
    const r = resolveCitation(ipIndex, src, report.clauses)
    if (r.ok) {
      citationsOk += 1
      if (r.warnings.length > 0) {
        citationsWarned += 1
        warningFindings.push(`${f.id} → ${src.documentId} p.${src.page}: ${r.warnings.join(',')}`)
      }
    } else {
      warningFindings.push(`${f.id} → UNRESOLVED ${r.reason}`)
    }
  }
}

const citationRate = citations > 0 ? citationsOk / citations : 1

/* evidence coverage — the honest caveat: findings about ABSENT clauses
 * cannot quote a clause that does not exist, so their citations carry no
 * excerpt and their evidence lists are empty. Measured, documented,
 * deliberately NOT fixed in this milestone. */
const noExcerptFindings = report.findings
  .filter((f) => f.sources.every((s) => !s.excerpt))
  .map((f) => f.id)
const noEvidenceFindings = report.findings.filter((f) => f.evidence.length === 0).map((f) => f.id)

const summary = {
  clausesEmitted: reportClauses.length,
  goldTypedSegments: goldTyped.length,
  goldTypedMatched: matched,
  clauseRecall: reportRecall,
  falsePositiveOnGoldNull: fpG,
  strayClauses: stray.length,
  findingsTotal: report.findings.length,
  citations,
  citationsOk,
  citationsWarned,
  citationResolutionRate: citationRate,
  findingsWithoutExcerpt: noExcerptFindings.length,
  findingsWithoutEvidence: noEvidenceFindings.length,
  stagesOk: stages.filter((s) => s.ok).length,
  stagesTotal: stages.length,
}

console.log('[e2e-eval] ' + JSON.stringify(summary, null, 2))
if (misses.length) console.log('[e2e-eval] misses:\n' + misses.map((m) => '  - ' + m).join('\n'))

describe('end-to-end pipeline evaluation', () => {
  it('reports a complete, validated run (7/7 stages ok)', () => {
    expect(stages.filter((s) => s.ok).length).toBe(stages.length)
    expect(report.methodology.pagesAnalyzed).toBeGreaterThan(0)
    expect(report.methodology.findingsTotal).toBe(report.findings.length)
  })

  it('emits report clauses matching the gold typed segments (recall ≥ 0.85)', () => {
    expect(summary.clauseRecall).toBeGreaterThanOrEqual(0.85)
  })

  it('never types a gold-null page and never strays off the gold pages', () => {
    expect(summary.falsePositiveOnGoldNull).toBe(0)
    expect(summary.strayClauses).toBe(0)
  })

  it('resolves every finding citation to a real, indexed anchor', () => {
    expect(summary.citations).toBeGreaterThan(0)
    expect(summary.citationsOk).toBe(summary.citations)
    expect(summary.citationResolutionRate).toBe(1)
  })

  it('documents the absence-evidence caveat without fixing it', () => {
    /* Findings about expected-but-not-found clauses cannot quote text that
     * does not exist. Their citations open the document cover as evidence
     * of absence and carry no excerpt. This is measured and documented
     * (docs/EVALUATION.md); a fix is deliberately out of scope here. */
    expect(summary.findingsWithoutExcerpt).toBeGreaterThan(0)
    console.log('[evaluation] known failure #1 — absence-evidence findings (see docs/EVALUATION.md):')
    for (const id of noExcerptFindings) console.log('  - ' + id)
  })

  it('produces identical reports for identical inputs (determinism)', () => {
    const again = runPipeline({
      generatedAt: '2026-08-09T00:00:00.000Z',
      runId: 'EVAL-2026-08-09',
      reportId: 'DR-2026-0089',
    })
    if (!again.ok) throw new Error(`second pipeline run failed: ${again.error}`)
    expect(JSON.stringify(again.report)).toBe(JSON.stringify(report))
  })
})