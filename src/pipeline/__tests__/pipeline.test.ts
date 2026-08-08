/**
 * Pipeline end-to-end tests.
 *
 * The pipeline runs the real corpus (or an injected index) through every
 * stage and must produce a report that satisfies the canonical contract,
 * with every figure and citation traceable to the index.
 */

import { describe, expect, it } from 'vitest'
import { ipIndex } from '../../lib/ipa'
import { parseReportSafe } from '../../contract'
import { RiskEngine } from '../../risk'
import { runPipeline, extractFinancials, extractFacts, extractIdentity } from '../index'
import { buildFindings, severityForClause } from '../findings'
import { CONTRIBUTION_BY_SEVERITY } from '../config'

const fixed = {
  generatedAt: '2026-08-09T00:00:00.000Z',
  runId: 'RUN-TEST-01',
  reportId: 'DR-TEST-01',
  analysisDate: '2026-08-09',
}

function pagesJoined(documentId: string, page: number): string {
  const p = ipIndex.pages.find((x) => x.documentId === documentId && x.page === page)
  return (p?.blocks ?? []).map((b) => b.text).join(' ')
}

describe('pipeline end-to-end (seed corpus)', () => {
  const result = runPipeline(fixed)

  it('completes every stage and validates against the canonical contract', () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.stages.map((s) => s.stage)).toEqual([
      'ingest',
      'extract',
      'analyze',
      'detect',
      'score',
      'validate',
      'reasoning',
    ])
    expect(result.stages.every((s) => s.ok)).toBe(true)
    expect(parseReportSafe(result.report).success).toBe(true)
  })

  it('is deterministic for fixed options', () => {
    const a = runPipeline(fixed)
    const b = runPipeline(fixed)
    expect(a.ok && b.ok).toBe(true)
    if (!(a.ok && b.ok)) return
    expect(a.report).toEqual(b.report)
    expect(a.narrative).toEqual(b.narrative)
    expect(a.stages).toEqual(b.stages)
  })

  it('extracts the expected financial figures', () => {
    if (!result.ok) return
    const f = result.report.financials
    expect(f.revenue!.amount).toBe(12_400_000)
    expect(f.ebitda!.amount).toBe(1_920_000)
    expect(f.operatingCosts!.amount).toBe(10_480_000)
    expect(f.netIncome!.amount).toBe(-340_000)
    expect(f.cash!.amount).toBe(4_810_000)
    expect(f.debt!.amount).toBe(5_450_000)
    expect(f.valuation!.amount).toBe(48_000_000)
    expect(f.ebitdaMargin).toBeCloseTo(0.155, 3)
    expect(f.debtToEbitda).toBeCloseTo(2.84, 2)
    expect(f.valuationMultiple).toBeCloseTo(25, 6)
  })

  it('cross-checks agree across documents', () => {
    const ex = extractFinancials(ipIndex)
    expect(ex.ebitda.crossChecks).toHaveLength(1)
    expect(ex.ebitda.crossChecks[0].value).toBe(1_920_000)
    expect(ex.debt.crossChecks).toHaveLength(1)
    expect(ex.debt.crossChecks[0].value).toBe(5_450_000)
  })

  it('derives the target identity and period from corpus pages', () => {
    const identity = extractIdentity(ipIndex)
    expect(identity.name).toBe('Aurora Biosystems Inc.')
    expect(identity.sector).toBe('Rare-Disease Therapeutics')
    if (!result.ok) return
    expect(result.report.financials.period).toEqual({ start: '2025-01-01', end: '2025-12-31' })
    expect(result.report.targetCompany.name).toBe('Aurora Biosystems Inc.')
  })

  it('extracts all eight narrative facts with verbatim evidence', () => {
    const facts = extractFacts(ipIndex)
    expect(facts.map((f) => f.id)).toEqual([
      'customer-concentration',
      'deferred-revenue-decline',
      'key-person',
      'auditor-change',
      'reimbursement-cut',
      'competitive-ndas',
      'market-share-decline',
      'pricing-erosion',
    ])
    for (const fact of facts) {
      expect(fact.evidence[0]).toBe(fact.anchor.excerpt)
      expect(pagesJoined(fact.anchor.documentId, fact.anchor.page).includes(fact.evidence[0])).toBe(true)
    }
  })

  it('every finding source anchor resolves to an indexed page with a verbatim excerpt', () => {
    if (!result.ok) return
    for (const f of result.report.findings) {
      expect(f.sources.length, `${f.id} cites at least one source`).toBeGreaterThanOrEqual(1)
      for (const a of f.sources) {
        const p = ipIndex.pages.find((x) => x.documentId === a.documentId && x.page === a.page)
        expect(p, `${f.id} → ${a.documentId} p.${a.page}`).toBeDefined()
        if (a.excerpt) {
          const joined = p!.blocks.map((b) => b.text).join(' ')
          expect(joined.includes(a.excerpt), `${f.id} excerpt verbatim on ${a.documentId} p.${a.page}`).toBe(true)
        }
      }
    }
  })

  it('produces findings in every category, legal leading', () => {
    if (!result.ok) return
    const counts = { financial: 0, legal: 0, operational: 0, market: 0 }
    for (const f of result.report.findings) counts[f.category] += 1
    expect(counts.financial).toBeGreaterThanOrEqual(1)
    expect(counts.legal).toBeGreaterThanOrEqual(5)
    expect(counts.operational).toBeGreaterThanOrEqual(1)
    expect(counts.market).toBeGreaterThanOrEqual(1)
    expect(result.report.findings.length).toBeGreaterThanOrEqual(15)
    expect(result.report.methodology.findingsTotal).toBe(result.report.findings.length)
  })

  it('flags exactly the seed baseline anomaly (elevated valuation)', () => {
    if (!result.ok) return
    expect(result.analysis.anomalies.map((a) => a.flag)).toEqual(['elevated-valuation'])
    const f = result.report.findings.find((x) => x.title.includes('Valuation multiple'))
    expect(f?.category).toBe('financial')
    expect(f?.severity).toBe('high')
  })

  it('reports the same score the engine recomputes from findings', () => {
    if (!result.ok) return
    const breakdown = new RiskEngine().scoreFromReport(result.report)
    expect(breakdown.composite).toBe(result.report.compositeRiskScore.score)
    expect(breakdown.level).toBe(result.report.compositeRiskScore.level)
    for (const c of result.report.compositeRiskScore.categoryScores) {
      const bc = breakdown.categories.find((x) => x.category === c.category)
      expect(bc?.score).toBe(c.score)
      expect(bc?.findingCount).toBe(c.findingCount)
    }
  })

  it('surfaces detected clauses with real clause types (no fallback "other")', () => {
    if (!result.ok) return
    const types = result.report.clauses.map((c) => c.type)
    expect(types).toContain('unusual-obligation')
    expect(types).toContain('assignment-restriction')
    expect(types).toContain('change-of-control')
    expect(types).toContain('liability-cap')
    expect(types.filter((t) => t === 'other')).toHaveLength(0)
    for (const c of result.report.clauses) {
      expect(ipIndex.pages.some((p) => p.documentId === c.documentId && p.page === c.page)).toBe(true)
    }
  })

  it('produces a grounded deterministic narrative', () => {
    if (!result.ok) return
    expect(result.narrative.ok).toBe(true)
    if (!result.narrative.ok) return
    expect(result.narrative.narrative.grounded).toBe(true)
    expect(result.narrative.narrative.faithfulness.issues).toEqual([])
    expect(result.narrative.narrative.text).toContain(String(result.report.compositeRiskScore.score))
    expect(result.narrative.narrative.text).toContain(result.report.compositeRiskScore.level.toUpperCase())
  })

  it('fails cleanly on a malformed index', () => {
    const bad = runPipeline({
      ...fixed,
      index: { format: 'dealroom/ipa-index/v1', generatedAt: '', documents: [], sections: [], pages: [] },
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.stages.some((s) => s.stage === 'ingest' && !s.ok)).toBe(true)
    expect(bad.error).toMatch(/ingest/)
  })

  it('fails cleanly when a required figure is missing from the corpus', () => {
    const index = JSON.parse(JSON.stringify(ipIndex)) as typeof ipIndex
    const page26 = index.pages.find((p) => p.documentId === 'doc-annual-fy25' && p.page === 26)!
    page26.blocks = page26.blocks.filter((b) => !/^Revenue:/i.test(b.text))
    const bad = runPipeline({ ...fixed, index })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.stages.some((s) => s.stage === 'extract' && !s.ok)).toBe(true)
  })
})

describe('findings construction', () => {
  it('derives severity per clause type with content upgrades', () => {
    expect(severityForClause('unusual-obligation', 'anything')).toBe('high')
    expect(severityForClause('change-of-control', 'a change of control may occur')).toBe('medium')
    expect(severityForClause('change-of-control', 'due immediately upon a change of control')).toBe('high')
    expect(severityForClause('liability', 'liability is capped at $5M')).toBe('medium')
    expect(severityForClause('liability', 'breach of warranty claims excluded from the cap')).toBe('high')
    expect(severityForClause('non-compete', 'non-compete runs 12 months')).toBe('medium')
    expect(severityForClause('indemnification', 'indemnify the lender')).toBe('low')
  })

  it('maps severity to score contributions via the pipeline config', () => {
    expect(CONTRIBUTION_BY_SEVERITY).toEqual({ low: 2, medium: 5, high: 8, critical: 12 })
  })

  it('skips "other" detections and requires anchors for anomaly findings', () => {
    const input = {
      detections: [
        {
          type: 'other' as const,
          documentId: 'd',
          page: 1,
          section: null,
          text: 'x',
          blocks: ['x'],
          id: 'cl-1',
          sourceAnchor: { documentId: 'd', page: 1 },
          confidence: 0,
          evidenceHits: {},
        },
      ],
      anomalies: [],
      facts: [],
      missing: { signals: [], satisfied: [], unscanned: [] },
    }
    expect(buildFindings(input)).toHaveLength(0)
  })
})
