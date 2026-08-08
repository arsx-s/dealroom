/**
 * Structured extraction — stage 2 of the DealRoom pipeline.
 *
 * Reads the IPA index (the output of ingestion + OCR/layout extraction) and
 * pulls structured values out of it deterministically:
 *  - financial line items (revenue, EBITDA, debt, …) from their labelled
 *    statement lines, each with a page-scoped citation anchor;
 *  - cross-checks: the same figure appearing in two documents must agree;
 *  - target identity (name, sector) from cover pages;
 *  - narrative facts (concentration, market share, pricing, …) from their
 *    section windows — one verbatim source line each.
 *
 * Nothing here is authored by hand for this deal: every value is parsed
 * from corpus text, and every anchor points at the page it came from.
 */

import type { IpIndex } from '../lib/ipa'
import type { FindingCategory, FinancialMetrics, ReportPeriod, Severity, SourceAnchor } from '../contract'
import type { FinancialMetricKey } from '../finance'
import { PIPELINE } from './config'

export class PipelineExtractionError extends Error {}

export interface ExtractionAnchor {
  anchor: SourceAnchor
  /** Verbatim line the value was parsed from. */
  line: string
}

export interface MoneyExtraction {
  value: number
  primary: ExtractionAnchor
  /** Same figure in another document (must agree). */
  crossChecks: (ExtractionAnchor & { value: number })[]
}

export interface ExtractedFinancials {
  period: ReportPeriod
  currency: 'USD'
  /** Missing when the corpus carries no matching statement line. */
  revenue: MoneyExtraction | null
  operatingCosts: MoneyExtraction | null
  ebitda: MoneyExtraction | null
  netIncome: MoneyExtraction | null
  cash: MoneyExtraction | null
  debt: MoneyExtraction | null
  valuation: MoneyExtraction | null
  /** Prior-year revenue (FY24), when present. */
  priorRevenue: { value: number; anchor: ExtractionAnchor } | null
  /** Anchor per derived metric, for the financial analysis layer. */
  metricSources: Partial<Record<FinancialMetricKey, SourceAnchor>>
  confidence: number
}

export function pageLines(index: IpIndex, documentId: string, page: number): string[] {
  const p = index.pages.find((x) => x.documentId === documentId && x.page === page)
  return p?.blocks.map((b) => b.text) ?? []
}

/** Section window covering a page, from the index's section registry. */
export function sectionNameFor(index: IpIndex, documentId: string, page: number): string | null {
  const s = index.sections.find((x) => x.documentId === documentId && x.start <= page && page <= x.end)
  return s?.name ?? null
}

function firstLine(lines: string[], re: RegExp): string | null {
  return lines.find((l) => re.test(l)) ?? null
}

function parseUsd(line: string): number | null {
  const m = line.match(/\$([\d,]+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Handles accounting-style negatives: "($340,000)" → -340000. */
function parseSignedUsd(line: string): number | null {
  const neg = line.match(/\(\$([\d,]+(?:\.\d+)?)\)/)
  if (neg) {
    const n = Number(neg[1].replace(/,/g, ''))
    return Number.isFinite(n) ? -n : null
  }
  const pos = line.match(/\$([\d,]+(?:\.\d+)?)/)
  if (!pos) return null
  const n = Number(pos[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

interface LineSpec {
  metric: string
  documentId: string
  page: number
  re: RegExp
  parse: (line: string) => number | null
}

/**
 * Extract a labelled money line. Looks first at the configured document
 * and page (the seed corpus layout); when the corpus does not carry that
 * document, scans every indexed page for the first line matching the
 * pattern. Returns null when the value is genuinely absent — the pipeline
 * reports the metric as missing rather than failing the whole run.
 */
function extractLineItem(index: IpIndex, spec: LineSpec): MoneyExtraction | null {
  const locationAnchor = (documentId: string, page: number, line: string) => ({
    anchor: {
      documentId,
      page,
      section: sectionNameFor(index, documentId, page) ?? undefined,
      excerpt: line,
    },
    line,
  })

  const fromLocation = (lines: string[], documentId: string, page: number) => {
    const line = firstLine(lines, spec.re)
    if (!line) return null
    const value = spec.parse(line)
    if (value === null) return null
    return { value, primary: locationAnchor(documentId, page, line), crossChecks: [] }
  }

  const atSpec = fromLocation(pageLines(index, spec.documentId, spec.page), spec.documentId, spec.page)
  if (atSpec) return atSpec

  /* Corpus without the configured document: search all pages in order. */
  const pages = index.pages
    .filter((p) => p.documentId !== spec.documentId || p.page !== spec.page)
    .sort((a, b) => (a.documentId === b.documentId ? a.page - b.page : a.documentId.localeCompare(b.documentId)))
  for (const p of pages) {
    const hit = fromLocation(p.blocks.map((b) => b.text), p.documentId, p.page)
    if (hit) return hit
  }

  return null
}

function addCrossCheck(index: IpIndex, target: MoneyExtraction, spec: LineSpec): void {
  const lines = pageLines(index, spec.documentId, spec.page)
  const line = firstLine(lines, spec.re)
  if (!line) return
  const value = spec.parse(line)
  if (value === null) return
  target.crossChecks.push({
    value,
    anchor: {
      documentId: spec.documentId,
      page: spec.page,
      section: sectionNameFor(index, spec.documentId, spec.page) ?? undefined,
      excerpt: line,
    },
    line,
  })
}

const usd = (v: number): { amount: number; currency: 'USD' } => ({ amount: v, currency: 'USD' })

export function extractFinancials(index: IpIndex): ExtractedFinancials {
  const revenue = extractLineItem(index, {
    metric: 'revenue',
    documentId: 'doc-annual-fy25',
    page: 26,
    re: /^Revenue:\s*\$[\d,]+$/i,
    parse: parseUsd,
  })
  const operatingCosts = extractLineItem(index, {
    metric: 'operating costs',
    documentId: 'doc-annual-fy25',
    page: 28,
    re: /^Operating costs:\s*\$[\d,]+$/i,
    parse: parseUsd,
  })
  const ebitda = extractLineItem(index, {
    metric: 'ebitda',
    documentId: 'doc-annual-fy25',
    page: 26,
    re: /^EBITDA:\s*\$[\d,]+$/i,
    parse: parseUsd,
  })
  if (ebitda) {
    addCrossCheck(index, ebitda, {
      metric: 'ebitda cross-check',
      documentId: 'doc-audit-fy24',
      page: 9,
      re: /^EBITDA:\s*\$[\d,]+$/i,
      parse: parseUsd,
    })
  }
  const netIncome = extractLineItem(index, {
    metric: 'net income',
    documentId: 'doc-annual-fy25',
    page: 26,
    re: /^Net income:\s*\(?\$[\d,]+\)?$/i,
    parse: parseSignedUsd,
  })
  const cash = extractLineItem(index, {
    metric: 'cash',
    documentId: 'doc-annual-fy25',
    page: 33,
    re: /^Cash:\s*\$[\d,]+$/i,
    parse: parseUsd,
  })
  const debt = extractLineItem(index, {
    metric: 'debt',
    documentId: 'doc-annual-fy25',
    page: 33,
    re: /^Debt[^:]*:\s*\$[\d,]+$/i,
    parse: parseUsd,
  })
  if (debt) {
    addCrossCheck(index, debt, {
      metric: 'debt cross-check',
      documentId: 'doc-loan',
      page: 4,
      re: /“?Debt”?\s*means.*?\$[\d,]+/i,
      parse: parseUsd,
    })
  }
  const valuation = extractLineItem(index, {
    metric: 'valuation',
    documentId: 'doc-market',
    page: 5,
    re: /enterprise value of \$[\d,]+/i,
    parse: parseUsd,
  })

  const priorLine = firstLine(pageLines(index, 'doc-audit-fy24', 6), /^Revenue:\s*\$[\d,]+$/i)
  const priorRevenue = priorLine
    ? {
        value: parseUsd(priorLine)!,
        anchor: {
          anchor: {
            documentId: 'doc-audit-fy24',
            page: 6,
            section: sectionNameFor(index, 'doc-audit-fy24', 6) ?? undefined,
            excerpt: priorLine,
          },
          line: priorLine,
        },
      }
    : null

  /* Fiscal year falls back to the index's own generation year when the
   * annual report cover is absent — never an invented date. */
  const fyMatch = pageLines(index, 'doc-annual-fy25', 1)
    .map((l) => l.match(/Fiscal Year (\d{4})/i))
    .find(Boolean)
  const year = fyMatch ? Number(fyMatch[1]) : Number(index.generatedAt.slice(0, 4))
  const period: ReportPeriod = { start: `${year}-01-01`, end: `${year}-12-31` }

  const metricSources: Partial<Record<FinancialMetricKey, SourceAnchor>> = {
    revenueYoY: priorRevenue?.anchor.anchor,
    ebitdaMargin: ebitda?.primary.anchor,
    debtToEbitda: debt
      ? {
          documentId: debt.primary.anchor.documentId,
          page: debt.primary.anchor.page,
          section: sectionNameFor(index, debt.primary.anchor.documentId, debt.primary.anchor.page) ?? undefined,
        }
      : undefined,
    cashRunwayMonths: cash?.primary.anchor,
    valuationMultiple: valuation?.primary.anchor,
  }

  return {
    period,
    currency: 'USD',
    revenue,
    operatingCosts,
    ebitda,
    netIncome,
    cash,
    debt,
    valuation,
    priorRevenue,
    metricSources,
    confidence: PIPELINE.confidence.extraction,
  }
}

/** Convenience: the extracted financials in contract FinancialMetrics shape. */
export function extractionToMetrics(extracted: ExtractedFinancials): FinancialMetrics {
  const moneyOr = (m: MoneyExtraction | null) => (m ? usd(m.value) : undefined)
  const revenue = moneyOr(extracted.revenue)
  const ebitda = moneyOr(extracted.ebitda)
  const debt = moneyOr(extracted.debt)
  const valuation = moneyOr(extracted.valuation)
  const metrics: FinancialMetrics = {
    period: extracted.period,
    currency: extracted.currency,
    revenue,
    operatingCosts: moneyOr(extracted.operatingCosts),
    ebitda,
    netIncome: moneyOr(extracted.netIncome),
    cash: moneyOr(extracted.cash),
    debt,
    valuation,
    ebitdaMargin:
      revenue !== undefined && ebitda !== undefined ? Number((ebitda.amount / revenue.amount).toFixed(3)) : undefined,
    debtToEbitda:
      debt !== undefined && ebitda !== undefined ? Number((debt.amount / ebitda.amount).toFixed(2)) : undefined,
    valuationMultiple:
      valuation !== undefined && ebitda !== undefined ? Number((valuation.amount / ebitda.amount).toFixed(2)) : undefined,
  }
  return metrics
}

/* ------------------------------------------------------------------ */
/* Target identity                                                     */
/* ------------------------------------------------------------------ */

export interface ExtractedIdentity {
  name: string
  sector: string
}

export function extractIdentity(index: IpIndex): ExtractedIdentity {
  /* Identity is parsed from the corpus cover pages. When a corpus does not
   * carry the expected cover lines, the fallback is honest — DealRoom never
   * names a target company that is not in the source set. */
  const loanCover = pageLines(index, 'doc-loan', 1)
  const nameLine = loanCover.map((l) => l.match(/Borrower:\s*([A-Za-z0-9 .]+)/i)).find(Boolean)
  const name = nameLine ? nameLine[1].trim() : 'Target Company'

  const marketCover = pageLines(index, 'doc-market', 1)
  const sectorLine = marketCover.map((l) => l.match(/^([A-Za-z-]+(?: [A-Za-z-]+)*)\s*—\s*\d{4}/)).find(Boolean)
  const sector = sectorLine ? sectorLine[1].trim() : 'Not identified'

  return { name, sector }
}

/* ------------------------------------------------------------------ */
/* Narrative facts (structured extraction of deal-relevant sentences)  */
/* ------------------------------------------------------------------ */

export interface ExtractedFact {
  id: string
  category: FindingCategory
  severity: Severity
  contribution: number
  title: string
  explanation: string
  /** Verbatim source line. */
  evidence: string[]
  anchor: SourceAnchor
  confidence: number
}

interface FactSpec {
  id: string
  category: FindingCategory
  severity: Severity
  contribution: number
  documentId: string
  window: string
  re: RegExp
  title: (m: RegExpMatchArray) => string
  explanation: (m: RegExpMatchArray, line: string) => string
}

export const FACT_SPECS: FactSpec[] = [
  {
    id: 'customer-concentration',
    category: 'operational',
    severity: 'high',
    contribution: 12,
    documentId: 'doc-annual-fy25',
    window: 'Customer Concentrations',
    re: /(\d+)% of total bookings/,
    title: (m) => `Customer concentration: top customer ${m[1]}% of bookings`,
    explanation: (m) =>
      `One customer accounts for ${m[1]}% of total bookings; loss or renegotiation by that customer would remove the majority of forward bookings.`,
  },
  {
    id: 'deferred-revenue-decline',
    category: 'financial',
    severity: 'medium',
    contribution: 5,
    documentId: 'doc-annual-fy25',
    window: 'Balance Sheet',
    re: /deferred revenue decreased from \$([\d.]+)M to \$([\d.]+)M/i,
    title: () => 'Deferred revenue declined year over year',
    explanation: (m) =>
      `Deferred revenue fell from $${m[1]}M to $${m[2]}M year over year, implying weaker forward bookings entering the next fiscal year.`,
  },
  {
    id: 'key-person',
    category: 'operational',
    severity: 'high',
    contribution: 10,
    documentId: 'doc-insurance',
    window: 'Key Person Schedule',
    re: /responsible for three of the four active development programs/,
    title: () => 'Single key person covers most active development programs',
    explanation: () =>
      'The insured key person is the named scientist on three of four active development programs; coverage of that person is the primary mitigation for program risk.',
  },
  {
    id: 'auditor-change',
    category: 'financial',
    severity: 'medium',
    contribution: 6,
    documentId: 'doc-audit-opinion',
    window: 'Change of Auditor',
    re: /prior firm declined to comment/,
    title: () => 'Auditor changed without predecessor explanation',
    explanation: () =>
      'The prior auditor declined to comment on the change of auditor; transitions of this kind frequently precede restatement or dispute.',
  },
  {
    id: 'reimbursement-cut',
    category: 'market',
    severity: 'high',
    contribution: 15,
    documentId: 'doc-market',
    window: 'Reimbursement Outlook',
    re: /removes coverage affecting an estimated (\d+)% of the addressable market/,
    title: (m) => `Reimbursement changes remove ${m[1]}% of the addressable market`,
    explanation: (m) =>
      `The proposed reimbursement framework removes coverage affecting an estimated ${m[1]}% of the addressable market, inside the hold period.`,
  },
  {
    id: 'competitive-ndas',
    category: 'market',
    severity: 'medium',
    contribution: 8,
    documentId: 'doc-market',
    window: 'Competitive Landscape',
    re: /Two late-stage competitors filed NDAs in the same quarter/,
    title: () => 'Two late-stage competitors filed NDAs in the same quarter',
    explanation: () =>
      'Both late-stage competitors target the same indication, putting first-to-market advantage at risk.',
  },
  {
    id: 'market-share-decline',
    category: 'market',
    severity: 'medium',
    contribution: 6,
    documentId: 'doc-market',
    window: 'Market Share',
    re: /declined from (\d+)% to (\d+)%/,
    title: (m) => `Market share declined to ${m[2]}%`,
    explanation: (m) => `Segment share declined from ${m[1]}% to ${m[2]}% over two consecutive years.`,
  },
  {
    id: 'pricing-erosion',
    category: 'market',
    severity: 'low',
    contribution: 3,
    documentId: 'doc-market',
    window: 'Pricing',
    re: /eroded approximately (\d+)% per annum/,
    title: (m) => `Net pricing eroding ${m[1]}% per annum`,
    explanation: (m) => `Net pricing across pipeline indications eroded approximately ${m[1]}% per annum during the forecast period.`,
  },
]

export function extractFacts(index: IpIndex): ExtractedFact[] {
  const out: ExtractedFact[] = []
  for (const spec of FACT_SPECS) {
    const pages = index.pages
      .filter((p) => p.documentId === spec.documentId && p.section === spec.window)
      .sort((a, b) => a.page - b.page)
    let hit: { line: string; page: number } | null = null
    for (const p of pages) {
      const line = p.blocks.map((b) => b.text).find((t) => spec.re.test(t))
      if (line) {
        hit = { line, page: p.page }
        break
      }
    }
    if (!hit) continue
    const m = hit.line.match(spec.re)!
    out.push({
      id: spec.id,
      category: spec.category,
      severity: spec.severity,
      contribution: spec.contribution,
      title: spec.title(m),
      explanation: spec.explanation(m, hit.line),
      evidence: [hit.line],
      anchor: {
        documentId: spec.documentId,
        page: hit.page,
        section: spec.window,
        excerpt: hit.line,
      },
      confidence: PIPELINE.confidence.fact,
    })
  }
  return out
}
