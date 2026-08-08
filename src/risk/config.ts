/**
 * Risk engine configuration.
 *
 * The engine's mathematics live in src/contract/scoring.ts (single source of
 * truth). This module makes the *configuration* explicit and auditable:
 * severity multipliers, category weights, and risk-level bands are named
 * constants here and defensively validated.
 */

import type { FindingCategory, RiskLevel, Severity } from '../contract'
import { RISK_LEVEL_BANDS, SEVERITY_MULTIPLIERS } from '../contract'

export const SEVERITY_WEIGHTS: Record<Severity, number> = SEVERITY_MULTIPLIERS

export const CATEGORY_WEIGHTS: Record<FindingCategory, number> = {
  financial: 0.35,
  legal: 0.3,
  operational: 0.25,
  market: 0.1,
}

export const RISK_BANDS: { level: RiskLevel; min: number; max: number }[] = RISK_LEVEL_BANDS

export const SCORING_VERSION = '1.0.0'

/** Weight sum must equal 1 for the weighted mean to be meaningful. */
export function validateWeights(weights: Record<FindingCategory, number>): boolean {
  return Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 1) < 1e-9
}