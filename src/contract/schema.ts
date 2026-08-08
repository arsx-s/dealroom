import { z } from 'zod'
import { riskLevelFromScore } from './scoring'

/**
 * DealRoom canonical data contract.
 *
 * Single source of truth for every layer of the product:
 * - ingestion/extraction pipeline (future)
 * - risk engine (future)
 * - API boundaries (future)
 * - dashboard UI (current)
 *
 * One schema definition. Every consumer imports types from this module;
 * no duplicated or drifted copies of these shapes may exist elsewhere.
 *
 * Score authority: scores are computed by the deterministic functions in
 * ./scoring.ts from structured findings. AI/LLM output is never the
 * source of truth for a numeric score; at most it proposes evidence
 * that must validate against these shapes.
 */

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const Currency = z.enum(['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY'])
export type Currency = z.infer<typeof Currency>

export const DocumentType = z.enum([
  'annual-report',
  'financial-statement',
  'audit-opinion',
  'loan-agreement',
  'governance-document',
  'contract',
  'market-report',
  'business-plan',
  'other',
])
export type DocumentType = z.infer<typeof DocumentType>

export const Severity = z.enum(['low', 'medium', 'high', 'critical'])
export type Severity = z.infer<typeof Severity>

export const FindingCategory = z.enum(['financial', 'legal', 'operational', 'market'])
export type FindingCategory = z.infer<typeof FindingCategory>

export const RiskLevel = z.enum(['low', 'medium', 'high'])
export type RiskLevel = z.infer<typeof RiskLevel>

export const ClauseType = z.enum([
  'guarantee',
  'indemnification',
  'change-of-control',
  'non-compete',
  'termination',
  'liability-cap',
  'warranty',
  'governing-law',
  'repayment',
  'security-interest',
  'unusual-obligation',
  'assignment-restriction',
  'other',
])
export type ClauseType = z.infer<typeof ClauseType>

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected ISO date (YYYY-MM-DD)')

export const Confidence = z.number().min(0).max(1)
export type Confidence = z.infer<typeof Confidence>

export const Money = z.object({
  amount: z.number().finite('amount must be a finite number'),
  currency: Currency,
})
export type Money = z.infer<typeof Money>

export const ReportPeriod = z
  .object({
    start: isoDate,
    end: isoDate,
  })
  .refine((p) => p.end >= p.start, { message: 'report period end must be >= start' })
export type ReportPeriod = z.infer<typeof ReportPeriod>

/* ------------------------------------------------------------------ */
/* Source anchors — every fact is traceable to a location in a document */
/* ------------------------------------------------------------------ */

export const SourceAnchor = z.object({
  /** Must reference a Document.id present in the report. */
  documentId: z.string().min(1, 'documentId is required'),
  /** 1-based page number. */
  page: z.number().int('page must be an integer').positive('page must be >= 1'),
  /** Section heading or identifier where available. */
  section: z.string().min(1).optional(),
  /** Clause identifier where available. */
  clause: z.string().min(1).optional(),
  /** Verbatim source text excerpt where appropriate. */
  excerpt: z.string().min(1).optional(),
})
export type SourceAnchor = z.infer<typeof SourceAnchor>

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export const DocumentPage = z.object({
  number: z.number().int().positive(),
})
export type DocumentPage = z.infer<typeof DocumentPage>

export const DocumentSection = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  pageNumber: z.number().int().positive('section page must be >= 1'),
  clauseIds: z.array(z.string().min(1)).default([]),
})
export type DocumentSection = z.infer<typeof DocumentSection>

export const DocumentExcerpt = z.object({
  page: z.number().int().positive(),
  text: z.string().min(1),
})
export type DocumentExcerpt = z.infer<typeof DocumentExcerpt>

export const Document = z
  .object({
    id: z.string().min(1),
    filename: z.string().min(1),
    documentType: DocumentType,
    metadata: z.object({
      reportPeriod: ReportPeriod.optional(),
      pagesTotal: z.number().int().positive('pagesTotal must be >= 1'),
      extractedAt: z.string().min(1),
    }),
    pages: z.array(DocumentPage).min(1, 'document must declare at least one page'),
    sections: z.array(DocumentSection).default([]),
    excerpts: z.array(DocumentExcerpt).default([]),
  })
  .superRefine((doc, ctx) => {
    const total = doc.metadata.pagesTotal
    const inRange = (p: number) => p >= 1 && p <= total
    for (const page of doc.pages) {
      if (!inRange(page.number)) ctx.addIssue({ code: 'custom', message: 'page number out of range' })
    }
    for (const s of doc.sections) {
      if (!inRange(s.pageNumber)) ctx.addIssue({ code: 'custom', message: 'section page out of range' })
    }
    for (const e of doc.excerpts) {
      if (!inRange(e.page)) ctx.addIssue({ code: 'custom', message: 'excerpt page out of range' })
    }
  })
export type Document = z.infer<typeof Document>

/* ------------------------------------------------------------------ */
/* Clauses                                                             */
/* ------------------------------------------------------------------ */

export const Clause = z.object({
  id: z.string().min(1),
  type: ClauseType,
  text: z.string().min(1),
  documentId: z.string().min(1),
  page: z.number().int().positive(),
  section: z.string().min(1).optional(),
  confidence: Confidence,
  /** Where a clause carries risk relevance. */
  severity: Severity.optional(),
})
export type Clause = z.infer<typeof Clause>

/* ------------------------------------------------------------------ */
/* Financials                                                          */
/* ------------------------------------------------------------------ */

const financialMetricsShape = z.object({
  period: ReportPeriod,
  currency: Currency,
  revenue: Money.optional(),
  ebitda: Money.optional(),
  operatingCosts: Money.optional(),
  netIncome: Money.optional(),
  debt: Money.optional(),
  cash: Money.optional(),
  valuation: Money.optional(),
  /** Ratio, e.g. 0.412 for 41.2%. */
  ebitdaMargin: z.number().min(-1).max(10).optional(),
  /** Multiplier, e.g. 2.84. */
  debtToEbitda: z.number().min(0).optional(),
  /** Multiple of EBITDA, e.g. 25.0. */
  valuationMultiple: z.number().positive().optional(),
})

export const FinancialMetrics = financialMetricsShape
  .superRefine((f, ctx) => {
    const monies: Money[] = [
      f.revenue,
      f.ebitda,
      f.operatingCosts,
      f.netIncome,
      f.debt,
      f.cash,
      f.valuation,
    ].filter((m): m is Money => m !== undefined)
    if (monies.some((m) => m.currency !== f.currency)) {
      ctx.addIssue({ code: 'custom', message: 'all money fields must use financials.currency' })
    }
    const consistent = (a: number, b: number | undefined, label: string) => {
      if (b !== undefined && Math.abs(a - b) > 0.01) {
        ctx.addIssue({ code: 'custom', message: `${label} inconsistent with reported figures` })
      }
    }
    if (f.revenue && f.revenue.amount !== 0 && f.ebitda) {
      consistent(f.ebitda.amount / f.revenue.amount, f.ebitdaMargin, 'ebitdaMargin')
    }
    if (f.ebitda && f.ebitda.amount !== 0 && f.debt) {
      consistent(f.debt.amount / f.ebitda.amount, f.debtToEbitda, 'debtToEbitda')
    }
    if (f.ebitda && f.ebitda.amount !== 0 && f.valuation) {
      consistent(f.valuation.amount / f.ebitda.amount, f.valuationMultiple, 'valuationMultiple')
    }
  })
export type FinancialMetrics = z.infer<typeof FinancialMetrics>

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

export const Finding = z.object({
  id: z.string().min(1),
  category: FindingCategory,
  severity: Severity,
  title: z.string().min(1),
  explanation: z.string().min(1),
  /** Short evidence notes backing the finding. */
  evidence: z.array(z.string().min(1)).default([]),
  /** Citations are REQUIRED: at least one traceable source anchor. */
  sources: z.array(SourceAnchor).min(1, 'a finding must cite at least one source anchor'),
  confidence: Confidence,
  /**
   * Points this finding deducts from its category score at critical
   * severity (0..100); scaled down by the severity multiplier for
   * lower severities. Category score = 100 − Σ(contribution × multiplier)
   * — see scoring.ts.
   */
  scoreContribution: z.number().min(0).max(100),
})
export type Finding = z.infer<typeof Finding>

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export const CategoryScore = z.object({
  category: FindingCategory,
  /** 0..100; higher = more risk. */
  score: z.number().min(0).max(100),
  /** Category weight in the composite; all weights must sum to 1. */
  weight: z.number().min(0).max(1),
  findingCount: z.number().int().nonnegative(),
  highestSeverity: Severity,
})
export type CategoryScore = z.infer<typeof CategoryScore>

export const CompositeRiskScore = z
  .object({
    /** 0..100; higher = more risk. Deterministic, not AI-derived. */
    score: z.number().min(0).max(100),
    level: RiskLevel,
    categoryScores: z.array(CategoryScore).min(1),
    scoringVersion: z.string().min(1),
    rationale: z.string().optional(),
  })
  .superRefine((s, ctx) => {
    const sum = s.categoryScores.reduce((acc, c) => acc + c.weight, 0)
    if (Math.abs(sum - 1) > 0.001) {
      ctx.addIssue({ code: 'custom', message: `category weights must sum to 1 (got ${sum})` })
    }
    const expected = riskLevelFromScore(s.score)
    if (s.level !== expected) {
      ctx.addIssue({
        code: 'custom',
        message: `risk level ${s.level} inconsistent with score ${s.score} (expected ${expected})`,
      })
    }
  })
export type CompositeRiskScore = z.infer<typeof CompositeRiskScore>

/* ------------------------------------------------------------------ */
/* Report aggregate                                                    */
/* ------------------------------------------------------------------ */

export const CompanyIdentity = z.object({
  name: z.string().min(1),
  sector: z.string().min(1),
  hq: z.string().min(1),
  dealStage: z.string().min(1),
})
export type CompanyIdentity = z.infer<typeof CompanyIdentity>

export const Methodology = z.object({
  sourcesAnalyzed: z.number().int().positive(),
  pagesAnalyzed: z.number().int().positive(),
  findingsTotal: z.number().int().nonnegative(),
  runId: z.string().min(1),
  generatedAt: z.string().min(1),
})
export type Methodology = z.infer<typeof Methodology>

export const DealIntelligenceReport = z
  .object({
    id: z.string().min(1),
    dealName: z.string().min(1),
    targetCompany: CompanyIdentity,
    analysisDate: isoDate,
    documents: z.array(Document).min(1),
    clauses: z.array(Clause).default([]),
    findings: z.array(Finding).min(1),
    financials: FinancialMetrics,
    compositeRiskScore: CompositeRiskScore,
    methodology: Methodology,
  })
  .superRefine((report, ctx) => {
    const docIds = new Set(report.documents.map((d) => d.id))
    if (docIds.size !== report.documents.length) {
      ctx.addIssue({ code: 'custom', message: 'document ids must be unique' })
    }
    const anchors = report.findings.flatMap((f) => f.sources)
    for (const a of anchors) {
      if (!docIds.has(a.documentId)) {
        ctx.addIssue({ code: 'custom', message: `source anchor references unknown document ${a.documentId}` })
      }
    }
    for (const c of report.clauses) {
      if (!docIds.has(c.documentId)) {
        ctx.addIssue({ code: 'custom', message: `clause references unknown document ${c.documentId}` })
      }
    }
    const findingsTotal = report.methodology.findingsTotal
    if (findingsTotal !== report.findings.length) {
      ctx.addIssue({
        code: 'custom',
        message: `methodology.findingsTotal (${findingsTotal}) must equal findings count (${report.findings.length})`,
      })
    }
  })
export type DealIntelligenceReport = z.infer<typeof DealIntelligenceReport>

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                     */
/* ------------------------------------------------------------------ */

export function parseReport(input: unknown): DealIntelligenceReport {
  return DealIntelligenceReport.parse(input)
}

export function parseReportSafe(input: unknown): z.SafeParseReturnType<unknown, DealIntelligenceReport> {
  return DealIntelligenceReport.safeParse(input)
}
