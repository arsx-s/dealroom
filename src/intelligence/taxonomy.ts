/**
 * Clause taxonomy — the fixed set of clause types the detector can assign,
 * with deterministic evidence rules (weighted regex patterns).
 *
 * Rules are normalized lower-case regexes over segment text. Each rule
 * carries a weight; the segment is classified as the type with the highest
 * cumulative weight, when that weight clears the confidence floor; otherwise
 * it falls through to `other`. Negative weights suppress referential
 * mentions (e.g. a form whose title is "Guarantee schedule" is not evidence
 * of an unusual-obligation clause).
 */

import type { ClauseType, Severity } from '../contract'

export const CLAUSE_TAXONOMY = [
  'change-of-control',
  'termination',
  'liability',
  'indemnification',
  'non-compete',
  'unusual-obligation',
  'assignment-restriction',
  'other',
] as const

export type DetectedClauseType = (typeof CLAUSE_TAXONOMY)[number]

export interface EvidenceRule {
  pattern: RegExp
  /** Positive evidence weight; negative suppresses referential mentions. */
  weight: number
}

/**
 * Evidence rules per clause type. Sensory specifics:
 *  - bare `liability` mention (0.25) sits below the floor (0.3) — a lone
 *    "liability" word in an exclusions list is not a liability clause.
 *  - "obligation" alone (0.1) is far below the floor; the type needs real
 *    obligations language (guarantee, parent guarantee, 45% of bookings).
 */
export const RULES: Record<Exclude<DetectedClauseType, 'other'>, EvidenceRule[]> = {
  'change-of-control': [
    { pattern: /\bchange of control\b/, weight: 0.9 },
    { pattern: /\bchange-in-control\b/, weight: 0.9 },
    { pattern: /\bupon a change\b/, weight: 0.7 },
    { pattern: /due immediately/, weight: 0.6 },
    { pattern: /\brepurchase rights?\b/, weight: 0.5 },
    { pattern: /\bacquisition of the company\b/, weight: 0.4 },
    { pattern: /\braises voting control\b/, weight: 0.5 },
    /* a quoted definition ("…Change of Control… means …") is a definition,
       not a clause */
    { pattern: /["“]change of control["”]\s*means/, weight: -0.9 },
  ],
  termination: [
    { pattern: /\bterminat/, weight: 0.8 },
    { pattern: /\blapse/, weight: 0.7 },
    { pattern: /\bexpires\b/, weight: 0.6 },
    { pattern: /\bcease\b/, weight: 0.5 },
  ],
  liability: [
    { pattern: /\bliability\b/, weight: 0.25 },
    { pattern: /breach of warranty/, weight: 0.8 },
    { pattern: /\bcapped at\b/, weight: 0.7 },
    { pattern: /liability cap/, weight: 0.8 },
    { pattern: /excluded from the cap/, weight: 0.6 },
    { pattern: /\bsub-limited\b/, weight: 0.6 },
  ],
  indemnification: [
    { pattern: /\bindemnif/, weight: 0.85 },
    { pattern: /hold harmless/, weight: 0.9 },
    { pattern: /\breimburse\b/, weight: 0.7 },
  ],
  'non-compete': [
    { pattern: /\bnon-compete\b/, weight: 0.95 },
    { pattern: /directly competitive/, weight: 0.6 },
    { pattern: /compete in/i, weight: 0.45 },
  ],
  'unusual-obligation': [
    { pattern: /\bguarantee\b/, weight: 0.8 },
    { pattern: /\bparent shall\b/, weight: 0.6 },
    { pattern: /45%/, weight: 0.6 },
    { pattern: /forty-five percent/, weight: 0.6 },
    { pattern: /\bobligat\b/, weight: 0.1 },
    { pattern: /guarantee schedule/, weight: -0.9 },
  ],
  'assignment-restriction': [
    { pattern: /right of first refusal/, weight: 0.85 },
    { pattern: /transfer restriction/, weight: 0.8 },
    { pattern: /\btransfer shares\b/, weight: 0.5 },
    { pattern: /\btransferring shares\b/, weight: 0.5 },
    { pattern: /\bmay not transfer\b/, weight: 0.6 },
    { pattern: /\bassign\b/, weight: 0.6 },
    { pattern: /form of assignment/, weight: -0.8 },
  ],
}

/** Evidence floor: cumulative weight below this falls through to `other`. */
export const MIN_CLASSIFICATION_CONFIDENCE = 0.3

export const DEFAULT_EXPECTED_CLAUSES: Record<
  string,
  { type: Exclude<DetectedClauseType, 'other'>; expectedText: string }[]
> = {
  'loan-agreement': [
    { type: 'change-of-control', expectedText: 'change-of-control acceleration of the facility' },
    { type: 'liability', expectedText: 'liability cap or limitation of liability' },
    { type: 'assignment-restriction', expectedText: 'assignment restriction' },
    { type: 'indemnification', expectedText: 'borrower indemnity in favor of the lender' },
    { type: 'termination', expectedText: 'termination / maturity provision' },
  ],
  'governance-document': [
    { type: 'change-of-control', expectedText: 'change-of-control clause' },
    { type: 'non-compete', expectedText: 'non-compete covenant' },
    { type: 'assignment-restriction', expectedText: 'transfer restriction' },
    { type: 'termination', expectedText: 'termination provision' },
  ],
  contract: [
    { type: 'liability', expectedText: 'policy limits / liability cap' },
    { type: 'indemnification', expectedText: 'indemnification provision' },
    { type: 'termination', expectedText: 'termination provision' },
  ],
}

/** Severity hints that a matched known clause can carry into the detection. */
export interface KnownClauseHint {
  id: string
  documentId: string
  page: number
  section?: string
  severity: Severity
}

/**
 * Taxonomy → contract mapping. The taxonomy decouples detection from the
 * contract's ClauseType list; this maps a detected type onto the closest
 * contract clause type where one exists, `other` otherwise.
 */
export const CLAUSE_TYPE_IDS: Record<DetectedClauseType, ClauseType> = {
  'change-of-control': 'change-of-control',
  termination: 'termination',
  liability: 'liability-cap',
  indemnification: 'indemnification',
  'non-compete': 'non-compete',
  'unusual-obligation': 'unusual-obligation',
  'assignment-restriction': 'assignment-restriction',
  other: 'other',
}