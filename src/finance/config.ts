/**
 * Threshold configuration for the deterministic financial analysis layer.
 *
 * Every threshold is a named constant here so the analysis behavior is
 * fully auditable and overridable per environment (e.g. a lender's board
 * may tighten the leverage threshold without touching the engine).
 */

/**
 * A threshold places a *flag* on a metric. Flags mean: "outside the
 * expectation". They are signals for review, not risk scores — risk
 * aggregation lives in the scoring engine, not here.
 */
export interface FinancialThresholds {
  /** EBITDAA margin below this (e.g. profit-generating but thin) flags
   *  'margin-below-floor'. */
  ebitdaMarginMin: number
  /** Debt / EBITDA above this flags 'elevated-leverage'. */
  debtToEbitdaMax: number
  /** Cash runway (months) below this flags 'short-cash-runway'. */
  cashRunwayMinMonths: number
  /** Year-over-year revenue change (fraction) below this flags
   *  'revenue-decline'. Positive = growth; negative = decline. */
  revenueYoYMin: number
  /** Valuation multiple above this flags 'elevated-valuation'. */
  valuationMultipleMax: number
}

export const DEFAULT_FINANCIAL_THRESHOLDS: FinancialThresholds = {
  ebitdaMarginMin: 0.1,
  debtToEbitdaMax: 4.0,
  cashRunwayMinMonths: 12,
  revenueYoYMin: 0, // any decline year-over-year warrants a flag
  valuationMultipleMax: 15,
}