/**
 * Missing-clause detection — "expected but not found" signals.
 *
 * Per document type, a registry declares the clause types a document of that
 * type normally contains. After structural detection, expectations that did
 * not materialize are surfaced as expected-but-not-found signals with
 * carefully hedged wording: absence is an analytical gap signal, NOT a
 * proof of legal deficiency.
 */

import type { IpIndex } from '../lib/ipa'
import type { DetectedClauseType } from './taxonomy'
import { DEFAULT_EXPECTED_CLAUSES } from './taxonomy'
import type { DetectedClause } from './detect'

export interface ExpectedClauseConfig {
  type: Exclude<DetectedClauseType, 'other'>
  expectedText: string
}

export interface MissingClauseSignal {
  documentId: string
  documentType: string
  clauseType: Exclude<DetectedClauseType, 'other'>
  expectedText: string
  signal: 'expected-but-not-found'
  wording: string
}

export function buildWording(clauseType: string, expectedText: string): string {
  return (
    `The ${expectedText} was expected in this ${clauseType} but was not found in the indexed text. ` +
    `This is an expected-but-not-found signal: absence alone does not establish a legal deficiency — ` +
    `a human review should confirm whether the provision exists outside the indexed pages or is genuinely absent.`
  )
}

export interface MissingClauseResult {
  signals: MissingClauseSignal[]
  /** Expectations satisfied by at least one detected clause, per document. */
  satisfied: { documentId: string; documentType: string; type: DetectedClauseType }[]
  /**
   * Document types that carried expectations but produced no clauses of
   * any type (structural failure — not reported as a missing clause).
   */
  unscanned: { documentId: string; documentType: string }[]
}

export function detectMissingClauses(
  index: IpIndex,
  detections: DetectedClause[],
  expectations: Record<string, ExpectedClauseConfig[]> = DEFAULT_EXPECTED_CLAUSES,
): MissingClauseResult {
  const signals: MissingClauseSignal[] = []
  const satisfied: MissingClauseResult['satisfied'] = []
  const unscanned: MissingClauseResult['unscanned'] = []

  for (const doc of index.documents) {
    const expected = expectations[doc.type]
    if (!expected) continue
    const docDetections = detections.filter((d) => d.documentId === doc.id)
    if (docDetections.length === 0) {
      unscanned.push({ documentId: doc.id, documentType: doc.type })
      continue
    }
    const foundTypes = new Set(docDetections.map((d) => d.type))
    for (const exp of expected) {
      if (foundTypes.has(exp.type)) {
        satisfied.push({ documentId: doc.id, documentType: doc.type, type: exp.type })
      } else {
        signals.push({
          documentId: doc.id,
          documentType: doc.type,
          clauseType: exp.type,
          expectedText: exp.expectedText,
          signal: 'expected-but-not-found',
          wording: buildWording(doc.type, exp.expectedText),
        })
      }
    }
  }

  return { signals, satisfied, unscanned }
}
