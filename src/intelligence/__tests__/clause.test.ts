/**
 * Clause detection — unit tests over the real seed corpus index.
 *
 * The gold ground truth (src/intelligence/groundtruth.ts) is the
 * repository's own labeled evaluation set, authored from the seed content
 * model. These tests assert behavior on real corpus text; the evaluator
 * computes the headline metrics.
 */

import { describe, expect, it } from 'vitest'
import { ipIndex } from '../../lib/ipa'
import {
  classifySegment,
  detectClauses,
  segmentDocument,
} from '../detect'
import { detectEntities } from '../entities'
import { detectMissingClauses } from '../missing'
import { evaluateDetection } from '../evaluate'
import { GOLD_CLAUSES } from '../groundtruth'

describe('classifySegment (unit rules)', () => {
  const cases: [string, ReturnType<typeof classifySegment>['type']][] = [
    ['A change of control triggers an immediate repurchase right.', 'change-of-control'],
    ['Change-in-control events accelerate the facility.', 'change-of-control'],
    ['The entire outstanding balance becomes due immediately upon a change.', 'change-of-control'],
    ['The non-compete runs for twelve months from closing.', 'non-compete'],
    ['Lender liability under this Agreement is capped at $5.0M.', 'liability'],
    ['Clinical trial liability is sub-limited to $2.0M per trial.', 'liability'],
    ['The Parent shall guarantee forty-five percent (45%) of aggregate bookings.', 'unusual-obligation'],
    ['Neither party may assign its rights without written consent.', 'assignment-restriction'],
    ['No shareholder may transfer shares except with consent.', 'assignment-restriction'],
    ['Holders must offer shares to the Company by right of first refusal.', 'assignment-restriction'],
    ['The Company indemnifies the Lender against third-party claims.', 'indemnification'],
    ['This agreement terminates upon maturity or earlier lapse.', 'termination'],
    ['Governing law is the State of New York.', 'other'],
    ['The board held six meetings during the fiscal year.', 'other'],
    ['This policy excludes loss arising from war or nuclear incident.', 'other'],
    ['Exhibit B — Guarantee schedule.', 'other'],
    ['Form of assignment and assumption.', 'other'],
  ]
  for (const [text, expected] of cases) {
    it(`classifies "${text.slice(0, 60)}…" as ${expected}`, () => {
      const { type } = classifySegment(text)
      expect(type).toBe(expected)
    })
  }
})

describe('segmentDocument (structural boundaries)', () => {
  it('merges (continued) pages of the same section into one segment', () => {
    const segs = segmentDocument(ipIndex, 'doc-loan')
    const repayment = segs.find((s) => s.section === 'Repayment')
    expect(repayment).toBeDefined()
    expect(repayment!.page).toBe(33)
    expect(repayment!.text).toContain('change of control')
    const events = segs.find((s) => s.section === 'Events of Default')
    expect(events!.page).toBe(29)
  })

  it('splits pages that carry several sections into per-section segments', () => {
    const segs = segmentDocument(ipIndex, 'doc-loan')
    const p4 = segs.filter((s) => s.page === 4)
    expect(p4.length).toBe(2)
    expect(p4.some((s) => s.text.includes('DEFINITIONS'))).toBe(true)
    expect(p4.some((s) => s.text.includes('FINANCIAL COVENANTS'))).toBe(true)
  })

  /* M8 regression: the "Definitions / Financial Covenants" page must not
   * fragment the Financial Covenants clause. Its per-section groups keep
   * their own clean window names, and the Financial Covenants group merges
   * with the following pages of the same window into a single segment. */
  it('end-to-end: multi-window pages keep per-section segment names (edge case)', () => {
    const segs = segmentDocument(ipIndex, 'doc-loan')
    const fc = segs.filter((s) => s.section === 'Financial Covenants')
    expect(fc.length).toBe(1)
    expect(fc[0].page).toBe(4)
    expect(fc[0].text).toContain('3.50x')
    expect(segs.some((s) => s.section === 'Definitions / Financial Covenants')).toBe(false)
  })

  /* Edge case regression: "(continued)" window labels must normalize —
     doc-annual pages 53–60 are window "Risk Factors (continued)"; the
     segment should carry the canonical window name and merge within the
     window. */
  it('end-to-end: "(continued)" window labels normalize to the canonical name (edge case)', () => {
    const segs = segmentDocument(ipIndex, 'doc-annual-fy25')
    const risk = segs.filter((s) => s.section === 'Risk Factors')
    expect(risk.length).toBe(2) // windows 18–21 and 53–60, both canonical
    const continuation = risk.find((s) => s.page === 53)!
    expect(continuation.text).toContain('A loss of key personnel')
    expect(segs.some((s) => s.section?.includes('(continued)'))).toBe(false)
  })

  it('never emits an empty segment', () => {
    for (const doc of ipIndex.documents) {
      for (const s of segmentDocument(ipIndex, doc.id)) {
        expect(s.text.trim().length).toBeGreaterThan(0)
        expect(s.blocks.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('detectClauses (real corpus)', () => {
  const detections = detectClauses(ipIndex)

  const expectTypeAt = (documentId: string, page: number, type: string) => {
    const d = detections.find((x) => x.documentId === documentId && x.page === page)
    expect(d, `${documentId} p${page} not detected`).toBeDefined()
    expect(d!.type).toBe(type)
  }

  it('detects the loan agreement clauses', () => {
    expectTypeAt('doc-loan', 12, 'unusual-obligation')
    expectTypeAt('doc-loan', 27, 'liability')
    expectTypeAt('doc-loan', 29, 'change-of-control')
    expectTypeAt('doc-loan', 33, 'change-of-control')
    expectTypeAt('doc-loan', 46, 'assignment-restriction')
  })

  it('detects the shareholder agreement clauses', () => {
    expectTypeAt('doc-shareholder', 8, 'change-of-control')
    expectTypeAt('doc-shareholder', 14, 'assignment-restriction')
    expectTypeAt('doc-shareholder', 21, 'non-compete')
    expectTypeAt('doc-shareholder', 25, 'assignment-restriction')
    expectTypeAt('doc-shareholder', 34, 'change-of-control')
  })

  it('detects the insurance policy clauses', () => {
    expectTypeAt('doc-insurance', 9, 'liability')
  })

  it('attaches provenance (anchor, excerpt, confidence) to every detection', () => {
    const d = detections.find((x) => x.documentId === 'doc-loan' && x.page === 27)!
    expect(d.sourceAnchor.documentId).toBe('doc-loan')
    expect(d.sourceAnchor.page).toBe(27)
    expect(d.sourceAnchor.section).toBe('Liability Cap')
    expect(d.sourceAnchor.excerpt!.length).toBeGreaterThan(0)
    expect(d.confidence).toBeGreaterThanOrEqual(0)
    expect(d.confidence).toBeLessThanOrEqual(1)
    expect(d.text.length).toBeGreaterThan(0)
  })

  it('does not type annual-report / market-report / audit-opinion pages', () => {
    const unwanted = detections.filter((d) =>
      ['annual-report', 'financial-statement', 'market-report', 'audit-opinion'].includes(
        ipIndex.documents.find((doc) => doc.id === d.documentId)!.type,
      ) && d.type !== 'other',
    )
    expect(unwanted).toHaveLength(0)
  })

  it('inherits severity from known clause hints', () => {
    const withHints = detectClauses(ipIndex, {
      knownClauses: [{ id: 'cl-known', documentId: 'doc-loan', page: 33, severity: 'critical' }],
    })
    const d = withHints.find((x) => x.documentId === 'doc-loan' && x.page === 33)!
    expect(d.clauseId).toBe('cl-known')
    expect(d.severity).toBe('critical')
  })
})

describe('detectMissingClauses (expected-but-not-found)', () => {
  const detections = detectClauses(ipIndex)
  const { signals } = detectMissingClauses(ipIndex, detections)

  it('raises indemnification and termination for the loan agreement', () => {
    const loan = signals.filter((s) => s.documentId === 'doc-loan')
    expect(loan.map((s) => s.clauseType).sort()).toEqual(['indemnification', 'termination'])
  })

  it('raises termination for the shareholder agreement', () => {
    const sh = signals.filter((s) => s.documentId === 'doc-shareholder')
    expect(sh.map((s) => s.clauseType)).toEqual(['termination'])
  })

  it('raises indemnification and termination for the insurance policy', () => {
    const ins = signals.filter((s) => s.documentId === 'doc-insurance')
    expect(ins.map((s) => s.clauseType).sort()).toEqual(['indemnification', 'termination'])
  })

  it('does not raise signals for expectations that were satisfied', () => {
    const keys = signals.map((s) => `${s.documentId}:${s.clauseType}`)
    expect(keys).not.toContain('doc-loan:change-of-control')
    expect(keys).not.toContain('doc-loan:liability')
    expect(keys).not.toContain('doc-shareholder:non-compete')
  })

  it('words the signal as an analytical gap, not a legal deficiency', () => {
    const s = signals.find((x) => x.documentId === 'doc-loan' && x.clauseType === 'indemnification')!
    expect(s.signal).toBe('expected-but-not-found')
    expect(s.wording).toContain('expected')
    expect(s.wording).toMatch(/does not establish a legal deficiency/i)
    expect(s.wording).toContain('human review')
  })
})

describe('detectEntities (parties, identifiers, preparers)', () => {
  const entities = detectEntities(ipIndex)

  it('extracts loan parties from the cover page', () => {
    const loan = entities.filter((e) => e.documentId === 'doc-loan' && e.page === 1 && e.kind === 'party')
    const names = loan.map((e) => e.name)
    expect(names).toContain('Aurora Biosystems Inc.')
    expect(names).toContain('Meridian Capital Partners')
  })

  it('extracts the insurance policy number', () => {
    const pol = entities.find((e) => e.documentId === 'doc-insurance' && e.kind === 'policy-identifier')
    expect(pol?.name).toBe('KPL-2026-1188')
  })

  it('extracts the market report preparer', () => {
    const prep = entities.find((e) => e.documentId === 'doc-market' && e.kind === 'preparer')
    expect(prep?.name).toContain('Sterling Research Partners')
  })

  it('extracts the audit firm from the opinion cover', () => {
    const firm = entities.find((e) => e.documentId === 'doc-audit-opinion' && e.kind === 'company')
    expect(firm?.name).toContain('GRANTWOOD')
  })
})

describe('evaluation against gold ground truth', () => {
  const detections = detectClauses(ipIndex)
  const metrics = evaluateDetection(ipIndex, detections)

  it('produces credible headline metrics on the seed corpus', () => {
    /* printed for the report — the numbers are computed, not asserted as
     * fabricated values */
    console.log(
      `[clause-eval] gold=${metrics.goldTypedSegments} found=${metrics.goldTypedFound} ` +
        `recall=${metrics.detectionRecall.toFixed(3)} acc=${metrics.classificationAccuracy.toFixed(3)} ` +
        `fp=${metrics.falsePositiveSegments} fpRate=${metrics.falsePositiveRate.toFixed(3)} ` +
        `missing=${metrics.missingRaisedMatching}/${metrics.missingSignalsExpected} ` +
        `entities=${metrics.entityFragmentsCorrect}/${metrics.entityExpected}`,
    )
    expect(metrics.detectionRecall).toBeGreaterThanOrEqual(0.9)
    expect(metrics.classificationAccuracy).toBeGreaterThanOrEqual(0.9)
    expect(metrics.falsePositiveSegments).toBeLessThanOrEqual(2)
    expect(metrics.missingRecall).toBe(1)
    expect(metrics.missingPrecision).toBe(1)
    expect(metrics.entityRecall).toBeGreaterThanOrEqual(0.8)
  })

  it('gold labels are internally consistent with the corpus', () => {
    for (const g of GOLD_CLAUSES) {
      const doc = ipIndex.documents.find((d) => d.id === g.documentId)
      expect(doc, `gold references unknown doc ${g.documentId}`).toBeDefined()
      expect(g.page).toBeGreaterThanOrEqual(1)
      expect(g.page).toBeLessThanOrEqual(doc!.pagesTotal)
    }
  })
})
