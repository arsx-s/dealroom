/**
 * Citation resolution — evidence navigation for finding citations.
 *
 * Every finding cites SourceAnchors; this module resolves an anchor to the
 * exact document, page, section window, and — when an excerpt is present —
 * the verbatim block text it came from. The source viewer uses the result
 * to open the right page and highlight the cited text.
 *
 * Resolution is strict by design: a citation to an unknown document, an
 * out-of-range page, or an unindexed page is a hard failure (`ok: false`)
 * with a machine-readable reason. A section mismatch or a missing excerpt
 * is a soft warning: the citation still resolves to the page.
 */

import type { IpIndex } from './ipa'
import { ipIndex } from './ipa'
import type { Clause, DealIntelligenceReport, SourceAnchor } from '../contract'

export type CitationFailureReason =
  | 'unknown-document'
  | 'page-out-of-range'
  | 'page-not-indexed'

export type CitationWarning = 'section-mismatch' | 'excerpt-not-found'

export interface CitationResolution {
  ok: true
  anchor: SourceAnchor
  documentId: string
  filename: string
  documentType: string
  pagesTotal: number
  page: number
  /** Section window label of the resolved page, from the index. */
  section: string | null
  /** True when the excerpt was found verbatim inside a block. */
  excerptResolved: boolean
  /** Block containing (or starting) the excerpt, for highlighting. */
  matchedBlock: { index: number; needle: string } | null
  /** Clause ids declared on the resolved page. */
  clauses: string[]
  warnings: CitationWarning[]
}

export interface CitationFailure {
  ok: false
  anchor: SourceAnchor
  reason: CitationFailureReason
  message: string
}

export type CitationResult = CitationResolution | CitationFailure

/** Longest common prefix of two strings (for partial-block matches). */
function commonPrefix(a: string, b: string): string {
  let i = 0
  const limit = Math.min(a.length, b.length)
  while (i < limit && a[i] === b[i]) i += 1
  return a.slice(0, i)
}

export function findBlockMatch(
  blocks: { text: string }[],
  excerpt: string,
): { index: number; needle: string } | null {
  if (!excerpt) return null
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i].text.includes(excerpt)) return { index: i, needle: excerpt }
  }
  let best: { index: number; needle: string } | null = null
  for (let i = 0; i < blocks.length; i += 1) {
    const prefix = commonPrefix(blocks[i].text, excerpt)
    if (prefix.length >= 12 && (!best || prefix.length > best.needle.length)) {
      best = { index: i, needle: prefix }
    }
  }
  return best
}

/** Resolve a citation anchor against the index. */
export function resolveCitation(
  index: IpIndex,
  anchor: SourceAnchor,
  clauses: Clause[] = [],
): CitationResult {
  const doc = index.documents.find((d) => d.id === anchor.documentId)
  if (!doc) {
    return {
      ok: false,
      anchor,
      reason: 'unknown-document',
      message: `Citation references document "${anchor.documentId}", which is not in the source set.`,
    }
  }

  if (anchor.page < 1 || anchor.page > doc.pagesTotal) {
    return {
      ok: false,
      anchor,
      reason: 'page-out-of-range',
      message: `Citation points to page ${anchor.page}, but ${anchor.documentId} has ${doc.pagesTotal} pages.`,
    }
  }

  const page = index.pages.find((p) => p.documentId === doc.id && p.page === anchor.page)
  if (!page) {
    return {
      ok: false,
      anchor,
      reason: 'page-not-indexed',
      message: `Citation points to ${anchor.documentId} p.${anchor.page}, which is not in the indexed source set.`,
    }
  }

  const warnings: CitationWarning[] = []

  const windowOk = (index.sections.find((s) => s.documentId === doc.id && s.start <= anchor.page && anchor.page <= s.end)
    ?.name ?? null) === anchor.section
  const inlineOk = page.blocks.some(
    (b) => b.role === 'section' && b.text.trim().toUpperCase() === (anchor.section ?? '').toUpperCase(),
  )
  const combinedOk = (page.section ?? '')
    .split('/')
    .map((s) => s.trim())
    .includes(anchor.section ?? '')
  if (anchor.section && !windowOk && !inlineOk && !combinedOk) {
    warnings.push('section-mismatch')
  }

  const matchedBlock = anchor.excerpt ? findBlockMatch(page.blocks, anchor.excerpt) : null
  if (anchor.excerpt && !matchedBlock) warnings.push('excerpt-not-found')

  return {
    ok: true,
    anchor,
    documentId: doc.id,
    filename: doc.filename,
    documentType: doc.type,
    pagesTotal: doc.pagesTotal,
    page: anchor.page,
    section: page.section ?? null,
    excerptResolved: matchedBlock !== null,
    matchedBlock,
    clauses: clauses
      .filter((c) => c.documentId === doc.id && c.page === anchor.page)
      .map((c) => c.id),
    warnings,
  }
}

/** Resolve the first source of a finding (findings always cite ≥ 1 source). */
export function resolveFindingCitation(
  report: DealIntelligenceReport,
  findingId: string,
): CitationResult {
  const finding = report.findings.find((f) => f.id === findingId)
  if (!finding) {
    return {
      ok: false,
      anchor: { documentId: '', page: 1 },
      reason: 'unknown-document',
      message: `Finding "${findingId}" does not exist in the report.`,
    }
  }
  return resolveCitation(ipIndex, finding.sources[0], report.clauses)
}
