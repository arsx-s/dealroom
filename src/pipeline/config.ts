/**
 * DealRoom pipeline configuration.
 *
 * Named constants for the deterministic pipeline that turns the indexed
 * source set (IPA index) into a Deal Intelligence Report:
 *  - which document types are scanned for clauses;
 *  - the score contribution attached to each finding severity;
 *  - clause-type default severities and upgrade rules;
 *  - deal-level assumptions (HQ, stage) that are NOT extractable from the
 *    corpus and are therefore declared here as pipeline input.
 */

import type { FindingCategory, Severity } from '../contract'
import type { DetectedClauseType } from '../intelligence'
import { CATEGORY_WEIGHTS, SCORING_VERSION } from '../risk/config'

export const PIPELINE = {
  name: 'dealroom-pipeline',
  version: '1.0.0',
  scoringVersion: SCORING_VERSION,
  categoryWeights: CATEGORY_WEIGHTS,
  currency: 'USD' as const,
  /** Only executed agreements are scanned for clauses. */
  documentTypesScanned: ['loan-agreement', 'governance-document', 'contract'],
  /** Deal-level assumptions with no corpus support are declared here. */
  dealStage: 'Pre-signing',
  hq: 'Boston, MA, USA',
  /** Confidence attached to extraction/fact/detection-derived findings. */
  confidence: { extraction: 0.98, fact: 0.92, detection: 0.9, missingSignal: 0.75 },
} as const

/** Points a finding of a given severity deducts at full weight. */
export const CONTRIBUTION_BY_SEVERITY: Record<Severity, number> = {
  low: 2,
  medium: 5,
  high: 8,
  critical: 12,
}

/** Default severity per detected clause type. */
export const CLAUSE_DEFAULT_SEVERITY: Partial<Record<DetectedClauseType, Severity>> = {
  'unusual-obligation': 'high',
  'change-of-control': 'medium',
  liability: 'medium',
  'non-compete': 'medium',
  'assignment-restriction': 'medium',
  termination: 'medium',
  indemnification: 'low',
}

/** Deterministic severity upgrades: content evidence raises the default. */
export const CLAUSE_SEVERITY_UPGRADES: {
  type: DetectedClauseType
  pattern: RegExp
  severity: Severity
}[] = [
  { type: 'change-of-control', pattern: /due immediately|entire outstanding|accelerat/i, severity: 'high' },
  { type: 'liability', pattern: /breach of warranty|excluded from the cap/i, severity: 'high' },
]

/** Finding titles per clause type. */
export const CLAUSE_FINDING_TITLES: Partial<Record<DetectedClauseType, string>> = {
  'unusual-obligation': 'Guarantee obligation exposes the acquirer',
  'change-of-control': 'Change-of-control clause accelerates obligations',
  liability: 'Liability cap limits counterparty recourse',
  'non-compete': 'Non-compete restricts key personnel',
  'assignment-restriction': 'Assignment and transfer restrictions',
  termination: 'Termination and lapse provisions',
  indemnification: 'Indemnification provision',
}

/** Short analysis note attached to clause findings per severity. */
export const SEVERITY_NOTES: Record<Severity, string> = {
  critical: 'high-severity exposure — escalate and review before signing',
  high: 'material exposure — escalate to counsel for review',
  medium: 'moderate exposure — monitor in the post-close plan',
  low: 'limited exposure — acknowledge in the risk register',
}

/** Category labels used in finding titles. */
export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  financial: 'Financial',
  legal: 'Legal',
  operational: 'Operational',
  market: 'Market',
}
