/**
 * Gold ground truth for clause detection evaluation.
 *
 * This is the repository's own labeled evaluation set, authored from the
 * seed corpus content model (the same documents the detector scans). The
 * user's private ground truth is not available in this environment; these
 * gold labels stand in for it and are fully checked in.
 *
 * Every entry pins an expected clause type to a (documentId, page) segment.
 * Negative entries (null) assert the detector must NOT emit a taxonomy type
 * for that segment.
 */

import type { DetectedClauseType } from './taxonomy'

export type GoldLabel =
  | { documentId: string; page: number; expected: DetectedClauseType }
  | { documentId: string; page: number; expected: null }

export const GOLD_CLAUSES: GoldLabel[] = [
  /* loan-agreement (doc-loan) */
  { documentId: 'doc-loan', page: 12, expected: 'unusual-obligation' }, // Guarantees — 45% bookings guarantee
  { documentId: 'doc-loan', page: 27, expected: 'liability' }, // Liability Cap — $5.0M cap, warranty excluded
  { documentId: 'doc-loan', page: 33, expected: 'change-of-control' }, // Repayment — acceleration on change of control
  { documentId: 'doc-loan', page: 46, expected: 'assignment-restriction' }, // Assignments and Amendments
  { documentId: 'doc-loan', page: 29, expected: 'change-of-control' }, // Events of Default — acceleration clause
  { documentId: 'doc-loan', page: 4, expected: null }, // Definitions — no clause semantics
  { documentId: 'doc-loan', page: 37, expected: null }, // Miscellaneous — boilerplate
  { documentId: 'doc-loan', page: 81, expected: null }, // Signature pages
  /* governance-document (doc-shareholder) */
  { documentId: 'doc-shareholder', page: 8, expected: 'change-of-control' },
  { documentId: 'doc-shareholder', page: 21, expected: 'non-compete' },
  { documentId: 'doc-shareholder', page: 14, expected: 'assignment-restriction' }, // Transfer Restrictions
  { documentId: 'doc-shareholder', page: 25, expected: 'assignment-restriction' }, // Right of First Refusal
  { documentId: 'doc-shareholder', page: 34, expected: 'change-of-control' }, // Repurchase Rights — lapse upon change of control
  { documentId: 'doc-shareholder', page: 4, expected: null }, // Definitions
  { documentId: 'doc-shareholder', page: 2, expected: null }, // Recitals
  { documentId: 'doc-shareholder', page: 39, expected: null }, // Information Rights — no clause type
  /* contract (doc-insurance) */
  { documentId: 'doc-insurance', page: 9, expected: 'liability' }, // Policy Limits
  { documentId: 'doc-insurance', page: 11, expected: null }, // Exclusions — not a taxonomy clause
  { documentId: 'doc-insurance', page: 6, expected: null }, // Key Person Schedule — schedule, not clause
]

/**
 * Documents expected to yield an expected-but-not-found signal per type.
 * The detector must raise signals exactly for these (document, type) pairs
 * and no others.
 */
export const GOLD_MISSING: { documentType: string; documentId: string; type: DetectedClauseType }[] = [
  { documentType: 'loan-agreement', documentId: 'doc-loan', type: 'indemnification' },
  { documentType: 'loan-agreement', documentId: 'doc-loan', type: 'termination' },
  { documentType: 'governance-document', documentId: 'doc-shareholder', type: 'termination' },
  { documentType: 'contract', documentId: 'doc-insurance', type: 'indemnification' },
  { documentType: 'contract', documentId: 'doc-insurance', type: 'termination' },
]

/** Gold entity expectations: (documentId, page, kind) → name fragment. */
export const GOLD_ENTITIES: { documentId: string; page: number; kind: string; nameFragment: string }[] = [
  { documentId: 'doc-loan', page: 1, kind: 'party', nameFragment: 'Meridian Capital Partners' },
  { documentId: 'doc-loan', page: 1, kind: 'party', nameFragment: 'Aurora Biosystems' },
  { documentId: 'doc-insurance', page: 1, kind: 'policy-identifier', nameFragment: 'KPL-2026-1188' },
  { documentId: 'doc-market', page: 1, kind: 'preparer', nameFragment: 'Sterling Research Partners' },
  { documentId: 'doc-audit-opinion', page: 1, kind: 'company', nameFragment: 'GRANTWOOD' },
]
