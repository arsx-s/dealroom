/**
 * DealRoom pipeline — end-to-end report construction.
 *
 *   documents → ingestion (IPA index) → structured extraction →
 *   clause detection → financial analysis → risk engine →
 *   grounded reasoning → Deal Intelligence Report
 *
 * `runPipeline` is deterministic and synchronous over the indexed source
 * set: identical inputs produce identical reports (timestamps and run ids
 * are injectable for reproducibility). Every stage is recorded in
 * `stages`; a failure at any stage returns `{ ok: false, error }` instead
 * of a partially fabricated report.
 *
 * The reasoning stage runs locally (deterministic grounded rationale).
 * Host applications may call `upgradeNarrative` with an LLM provider; the
 * provider's output passes the same faithfulness gate.
 */

import type {
  DealIntelligenceReport,
  Document,
  FinancialMetrics,
} from '../contract'
import { parseReportSafe } from '../contract'
import type { IpIndex } from '../lib/ipa'
import { ipIndex } from '../lib/ipa'
import { analyzeFinancials, type FinancialAnalysis } from '../finance'
import { detectClauses, detectMissingClauses, type DetectedClause, type MissingClauseResult } from '../intelligence'
import { CLAUSE_TYPE_IDS } from '../intelligence'
import { RiskEngine } from '../risk'
import { buildDeterministicNarrative, upgradeNarrative } from './narrative'
import {
  extractFacts,
  extractFinancials,
  extractIdentity,
  extractionToMetrics,
  type ExtractedFact,
  type ExtractedFinancials,
} from './extract'
import { buildFindings } from './findings'
import { PIPELINE } from './config'

export { upgradeNarrative }
export type { NarrativeProvider } from '../reasoning/provider'

export { extractFacts, extractFinancials, extractIdentity, extractionToMetrics, FACT_SPECS } from './extract'
export type { ExtractedFact, ExtractedFinancials, ExtractionAnchor, MoneyExtraction } from './extract'
export { buildFindings, severityForClause } from './findings'
export { buildDeterministicNarrative } from './narrative'
export { PIPELINE, CONTRIBUTION_BY_SEVERITY, CLAUSE_DEFAULT_SEVERITY, CLAUSE_SEVERITY_UPGRADES } from './config'

export type PipelineStageName =
  | 'ingest'
  | 'extract'
  | 'detect'
  | 'analyze'
  | 'score'
  | 'reasoning'
  | 'validate'

export interface PipelineStage {
  stage: PipelineStageName
  ok: boolean
  error?: string
}

export interface PipelineSuccess {
  ok: true
  report: DealIntelligenceReport
  stages: PipelineStage[]
  narrative: ReturnType<typeof buildDeterministicNarrative>
  analysis: FinancialAnalysis
  detections: DetectedClause[]
  missing: MissingClauseResult
  facts: ExtractedFact[]
  extraction: ExtractedFinancials
}

export interface PipelineFailure {
  ok: false
  stages: PipelineStage[]
  error: string
}

export type PipelineResult = PipelineSuccess | PipelineFailure

export interface PipelineOptions {
  /** IPA index to analyze (defaults to the seeded corpus). */
  index?: IpIndex
  /** Fixed generation timestamp (ISO) for reproducible runs. */
  generatedAt?: string
  runId?: string
  reportId?: string
  analysisDate?: string
}

const money = (amount: number): { amount: number; currency: 'USD' } => ({ amount, currency: 'USD' })

function buildDocuments(index: IpIndex, generatedAt: string): Document[] {
  return index.documents.map((d) => ({
    id: d.id,
    filename: d.filename,
    documentType: d.type as Document['documentType'],
    metadata: { pagesTotal: d.pagesTotal, extractedAt: generatedAt },
    pages: Array.from({ length: d.pagesTotal }, (_, i) => ({ number: i + 1 })),
    sections: index.sections
      .filter((s) => s.documentId === d.id)
      .map((s, i) => ({ id: `s-${d.id}-${i + 1}`, heading: s.name, pageNumber: s.start, clauseIds: [] })),
    excerpts: [],
  }))
}

export function runPipeline(opts: PipelineOptions = {}): PipelineResult {
  const index = opts.index ?? ipIndex
  const stages: PipelineStage[] = []
  const now = opts.generatedAt ?? new Date().toISOString()
  const runId = opts.runId ?? `RUN-${now.slice(0, 10)}-${now.slice(11, 13)}${now.slice(14, 16)}`

  const fail = (stage: PipelineStageName, error: string): PipelineFailure => {
    stages.push({ stage, ok: false, error })
    return { ok: false, stages, error: `pipeline failed at ${stage}: ${error}` }
  }
  const okStage = (stage: PipelineStageName): void => {
    stages.push({ stage, ok: true })
  }

  /* 1. ingestion */
  if (!index || !Array.isArray(index.documents) || !Array.isArray(index.pages) || !Array.isArray(index.sections)) {
    return fail('ingest', 'index is malformed (missing documents/pages/sections)')
  }
  if (index.documents.length === 0 || index.pages.length === 0) {
    return fail('ingest', 'index contains no documents or pages')
  }
  okStage('ingest')

  /* 2. structured extraction */
  let extraction: ExtractedFinancials
  try {
    extraction = extractFinancials(index)
  } catch (err) {
    return fail('extract', err instanceof Error ? err.message : 'financial extraction failed')
  }
  okStage('extract')

  /* 3. financial analysis */
  const financials: FinancialMetrics = extractionToMetrics(extraction)
  const prior: FinancialMetrics | undefined = extraction.priorRevenue
    ? { period: { start: '2024-01-01', end: '2024-12-31' }, currency: 'USD', revenue: money(extraction.priorRevenue.value) }
    : undefined
  const analysis = analyzeFinancials(financials, { prior, sources: extraction.metricSources })
  okStage('analyze')

  /* 4. clause detection + missing-clause signals + narrative facts */
  const detections = detectClauses(index, { documentTypes: [...PIPELINE.documentTypesScanned] })
  const missing = detectMissingClauses(index, detections)
  const facts = extractFacts(index)
  okStage('detect')

  /* 5. findings + risk engine */
  const findings = buildFindings({ detections, anomalies: analysis.anomalies, facts, missing })
  const engine = new RiskEngine()
  const breakdown = engine.buildBreakdown(findings)
  okStage('score')

  /* 6. identity + report assembly */
  const identity = extractIdentity(index)
  const dealName = `${identity.name.replace(/ Inc\.?$/i, '')} Acquisition`
  const report: DealIntelligenceReport = {
    id: opts.reportId ?? 'DR-2026-0089',
    dealName,
    targetCompany: {
      name: identity.name,
      sector: identity.sector,
      hq: PIPELINE.hq,
      dealStage: PIPELINE.dealStage,
    },
    analysisDate: opts.analysisDate ?? now.slice(0, 10),
    documents: buildDocuments(index, now),
    clauses: detections
      .filter((d) => d.type !== 'other')
      .map((d) => ({
        id: `cl-${d.documentId}-${d.page}`,
        type: CLAUSE_TYPE_IDS[d.type],
        text: d.text,
        documentId: d.documentId,
        page: d.page,
        section: d.section ?? undefined,
        confidence: d.confidence,
        severity: d.severity,
      })),
    findings,
    financials,
    compositeRiskScore: {
      score: breakdown.composite,
      level: breakdown.level,
      categoryScores: breakdown.categories.map((c) => ({
        category: c.category,
        score: c.score,
        weight: c.weight,
        findingCount: c.findingCount,
        highestSeverity: c.highestSeverity,
      })),
      scoringVersion: breakdown.scoringVersion,
      rationale:
        'Composite = weighted mean of category scores (weights validated to sum to 1). ' +
        'Category scores = 100 − Σ(finding contribution × severity multiplier). ' +
        'Every number is computed by the deterministic scoring engine from extracted findings; ' +
        'reasoning describes the scores, never redefines them.',
    },
    methodology: {
      sourcesAnalyzed: index.documents.length,
      pagesAnalyzed: index.documents.reduce((acc, d) => acc + d.pagesTotal, 0),
      findingsTotal: findings.length,
      runId,
      generatedAt: now,
    },
  }

  /* 7. schema validation — the report must satisfy the canonical contract */
  const parsed = parseReportSafe(report)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return fail('validate', `${first?.path.join('.') ?? 'report'}: ${first?.message ?? 'invalid report'}`)
  }
  okStage('validate')

  /* 8. grounded reasoning */
  const narrative = buildDeterministicNarrative(parsed.data)
  okStage('reasoning')

  return {
    ok: true,
    report: parsed.data,
    stages,
    narrative,
    analysis,
    detections,
    missing,
    facts,
    extraction,
  }
}
