/**
 * Evaluation of clause detection against the repository gold ground truth.
 *
 * The gold set is the checked-in labels (see groundtruth.ts) — a stand-in
 * for the private ground truth that is not available in this environment.
 *
 * Metrics:
 *   - detection recall     : gold TYPED segments the detector surfaced (a
 *                            non-`other` classification at the gold page)
 *                            / total gold typed segments.
 *   - classification acc   : among surfaced gold segments, the fraction
 *                            typed exactly the gold label ("where
 *                            applicable" — pages the gold marks `other`
 *                            don't count against this).
 *   - false positive rate  : typed segments that match no gold typed page
 *                            (incl. gold `other` pages that got a type)
 *                            over all typed segments.
 *   - missing-clause       : expected-but-not-found signals raised for the
 *                            gold (document, type) pairs — verified through
 *                            the real missing-clause module; recall =
 *                            matching raised / expected, precision =
 *                            matching raised / all raised.
 *   - entity               : recall of gold entity kinds with
 *                            name-fragment match.
 */

import type { IpIndex } from '../lib/ipa'
import type { DetectedClause } from './detect'
import { detectEntities } from './entities'
import { detectMissingClauses } from './missing'
import { GOLD_CLAUSES, GOLD_ENTITIES, GOLD_MISSING } from './groundtruth'

export interface ClauseEvalMetrics {
  goldTypedSegments: number
  goldTypedFound: number
  detectionRecall: number
  correctlyClassified: number
  classificationAccuracy: number
  falsePositiveSegments: number
  falsePositiveRate: number
  missingSignalsExpected: number
  missingSignalsRaised: number
  missingRaisedMatching: number
  missingRecall: number
  missingPrecision: number
  entityExpected: number
  entityFound: number
  entityFragmentsCorrect: number
  entityRecall: number
}

export function evaluateDetection(index: IpIndex, detections: DetectedClause[]): ClauseEvalMetrics {
  const goldTyped = GOLD_CLAUSES.filter((g) => g.expected !== null)
  const goldTypedPages = new Set(goldTyped.map((g) => `${g.documentId}:${g.page}`))

  const typed = detections.filter((d) => d.type !== 'other')

  let goldTypedFound = 0
  let correctlyClassified = 0
  for (const g of goldTyped) {
    const hit = typed.find((d) => d.documentId === g.documentId && d.page === g.page)
    if (hit) {
      goldTypedFound += 1
      if (g.expected === hit.type) correctlyClassified += 1
    }
  }

  /* false positives: typed segments off the gold typed pages, plus any
   * gold-null page that received a taxonomy type */
  const falsePositivePages = new Set<string>()
  for (const d of typed) {
    const key = `${d.documentId}:${d.page}`
    if (!goldTypedPages.has(key)) falsePositivePages.add(key)
  }
  for (const g of GOLD_CLAUSES) {
    if (g.expected !== null) continue
    const key = `${g.documentId}:${g.page}`
    if (typed.some((d) => d.documentId === g.documentId && d.page === g.page)) falsePositivePages.add(key)
  }

  /* missing-clause signals via the real module, vs the gold pairs */
  const missing = detectMissingClauses(
    index,
    detections,
  )
  const raised = new Set(missing.signals.map((s) => `${s.documentId}:${s.clauseType}`))
  const expected = new Set(GOLD_MISSING.map((g) => `${g.documentId}:${g.type}`))
  const missingRaisedMatching = [...raised].filter((k) => expected.has(k)).length

  /* entity resolution */
  const entities = detectEntities(index)
  let entityFound = 0
  let entityFragmentsCorrect = 0
  for (const g of GOLD_ENTITIES) {
    const hits = entities.filter(
      (e) => e.documentId === g.documentId && e.page === g.page && e.kind === g.kind,
    )
    const match = hits.find((e) => e.name.toLowerCase().includes(g.nameFragment.toLowerCase()))
    if (match) {
      entityFound += 1
      entityFragmentsCorrect += 1
    }
  }

  const typedTotal = typed.length
  const detectionRecall = goldTyped.length > 0 ? goldTypedFound / goldTyped.length : 1
  const classificationAccuracy = goldTypedFound > 0 ? correctlyClassified / goldTypedFound : 1
  const falsePositives = falsePositivePages.size
  const falsePositiveRate = typedTotal > 0 ? falsePositives / typedTotal : 0

  return {
    goldTypedSegments: goldTyped.length,
    goldTypedFound,
    detectionRecall,
    correctlyClassified,
    classificationAccuracy,
    falsePositiveSegments: falsePositives,
    falsePositiveRate,
    missingSignalsExpected: expected.size,
    missingSignalsRaised: raised.size,
    missingRaisedMatching,
    missingRecall: expected.size > 0 ? missingRaisedMatching / expected.size : 1,
    missingPrecision: raised.size > 0 ? missingRaisedMatching / raised.size : 1,
    entityExpected: GOLD_ENTITIES.length,
    entityFound,
    entityFragmentsCorrect,
    entityRecall: GOLD_ENTITIES.length > 0 ? entityFound / GOLD_ENTITIES.length : 1,
  }
}