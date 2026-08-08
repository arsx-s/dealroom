/**
 * Structure-aware clause detection.
 *
 * Input: the IPA index (per-page blocks with `section`/`statement`/`body`
 * roles) — i.e. the output of the ingestion/extraction pipeline, NOT raw
 * document text.
 *
 * Approach:
 *  1. Segment every document into clause candidates at structural
 *     boundaries: the page's section window (`page.section`) delimits a
 *     clause unit; inline `section`-role blocks split pages that carry
 *     several windows (e.g. "Definitions / Financial Covenants" on one
 *     page). Consecutive pages in the same window (including "— (continued)"
 *     pages) merge into one segment.
 *  2. Classify each segment against the fixed taxonomy using weighted
 *     evidence rules.
 *  3. Attach provenance: document id, page, section, verbatim text, and a
 *     source anchor. When a segment matches a known clause hint (from the
 *     report's clause index), it inherits that clause id and severity.
 *
 * Nothing here calls a model; detection is deterministic over the
 * structural index.
 */

import type { IpIndex } from '../lib/ipa'
import type { SourceAnchor } from '../contract'
import type { DetectedClauseType, KnownClauseHint } from './taxonomy'
import { MIN_CLASSIFICATION_CONFIDENCE, RULES } from './taxonomy'

export interface ClauseSegment {
  id: string
  documentId: string
  page: number
  section: string | null
  text: string
  blocks: string[]
}

export interface DetectedClause {
  id: string
  type: DetectedClauseType
  text: string
  documentId: string
  page: number
  section: string | null
  sourceAnchor: SourceAnchor
  confidence: number
  severity?: Severity
  clauseId?: string
  evidenceHits: Record<string, number>
}

import type { Severity } from '../contract'

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/[ \t]+/g, ' ')
    .trim()

/** Split a page's blocks into groups at heading (`section`-role, ALL-CAPS)
 *  blocks. A body line that merely starts with the section name (e.g.
 *  "Repurchase rights lapse upon a change of control.") is NOT a heading. */
function isHeading(b: { role: string; text: string }): boolean {
  return b.role === 'section' && /^[A-Z0-9 .&'’"–—-]{3,}$/.test(b.text.trim())
}

function splitPageGroups(blocks: { role: string; text: string }[]): string[][] {
  const groups: string[][] = []
  let current: string[] | null = null
  for (const b of blocks) {
    if (isHeading(b)) {
      groups.push([b.text.trim()])
      current = groups[groups.length - 1]
    } else if (current) {
      current.push(b.text.trim())
    } else {
      groups.push([b.text.trim()])
      current = groups[groups.length - 1]
    }
  }
  return groups.length > 0 ? groups : [[]]
}

/**
 * Walk a document's pages and cut segments at section-window boundaries.
 * A page's `section` is the structural boundary; consecutive pages in the
 * same window merge into one segment, so "(continued)" pages extend the
 * clause rather than fragmenting it.
 *
 * Edge cases handled explicitly (regression-tested):
 *  - A page carrying several inline sections yields one segment per
 *    section group, and each group's section label is its OWN window name
 *    (e.g. doc-loan p4 is "Definitions / Financial Covenants" → two
 *    segments named "Definitions" and "Financial Covenants"), so the
 *    Financial Covenants group merges with the pages that follow it.
 *  - "(continued)" suffixes — in window labels (doc-annual "Risk Factors
 *    (continued)") or inline headings (doc-market "PRICING — (continued)") —
 *    normalize to the canonical section name for both merging and the
 *    segment's provenance label.
 *
 * `blocks` holds only the START page's group (the page the clause is
 * cited to), so excerpts are always verbatim on that page; `text` carries
 * the merged text used for classification.
 */
export function segmentDocument(index: IpIndex, documentId: string): ClauseSegment[] {
  const pages = index.pages
    .filter((p) => p.documentId === documentId)
    .sort((a, b) => a.page - b.page)
  const segments: (ClauseSegment & { sectionKey: string })[] = []
  let current: (ClauseSegment & { sectionKey: string }) | null = null

  for (const page of pages) {
    const window = page.section ?? null
    for (const group of splitPageGroups(page.blocks)) {
      if (group.length === 0) continue
      const headed = isHeading({ role: 'section', text: group[0] })
      const key = headed ? canonicalSection(group[0]) : canonicalSection(window ?? '')
      const label = headed ? canonicalSection(group[0]) : canonicalSection(window ?? '')
      if (current && current.sectionKey === key && current.sectionKey !== '') {
        current.text = `${current.text} ${group.join(' ')}`
      } else {
        current = {
          id: `cl-${documentId}-${page.page}-${segments.length + 1}`,
          documentId,
          page: page.page,
          section: label,
          text: group.join(' '),
          blocks: [...group],
        } as ClauseSegment & { sectionKey: string }
        current.sectionKey = key
        segments.push(current)
      }
    }
  }
  return segments.map(({ sectionKey: _sectionKey, ...rest }) => rest)
}

const CONTINUED_SUFFIX = /\s*(?:—\s*)?\(continued\)\s*$/i

/** Drop a trailing "(continued)" marker so continuation pages compare
 *  equal to their canonical section. */
function canonicalSection(raw: string): string {
  const stripped = raw.trim().replace(CONTINUED_SUFFIX, '').trim()
  if (stripped === stripped.toUpperCase()) return titleCase(stripped)
  return stripped
}

const SMALL_WORDS = new Set(['and', 'of', 'to', 'the', 'for', 'with', 'in', 'at', 'on', 'an', 'or', 'by', 'a'])

/** "FINANCIAL COVENANTS" → "Financial Covenants" (registry-style names);
 *  hyphenated compounds capitalize per part: "NON-COMPETE" → "Non-Compete". */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      if (SMALL_WORDS.has(w)) return w
      return w
        .split('-')
        .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
        .join('-')
    })
    .join(' ')
}

/** Score a segment against the taxonomy; returns the best type + confidence. */
export function classifySegment(
  text: string,
): { type: DetectedClauseType; confidence: number; evidenceHits: Record<string, number> } {
  const n = norm(text)
  const hits: Record<string, number> = {}
  let best: DetectedClauseType = 'other'
  let bestScore = 0
  for (const type of Object.keys(RULES) as (keyof typeof RULES)[]) {
    let score = 0
    for (const rule of RULES[type]) {
      if (rule.pattern.test(n)) score += rule.weight
    }
    hits[type] = Math.max(0, Math.round(score * 100) / 100)
    if (score > bestScore) {
      bestScore = score
      best = type
    }
  }
  const confidence = Math.min(0.95, Math.round(Math.abs(bestScore) * 100) / 100)
  const type = bestScore >= MIN_CLASSIFICATION_CONFIDENCE ? best : 'other'
  return {
    type,
    confidence: type === 'other' ? Math.min(confidence, MIN_CLASSIFICATION_CONFIDENCE - 0.01) : confidence,
    evidenceHits: hits,
  }
}

export interface ClauseDetectionOptions {
  /** Known clause hints (typically the report's clause index) used to
   *  inherit ids and severities when a segment lands on the same page. */
  knownClauses?: KnownClauseHint[]
  /** Only these document types are scanned (default: all). */
  documentTypes?: string[]
}

export function detectClauses(
  index: IpIndex,
  options: ClauseDetectionOptions = {},
): DetectedClause[] {
  const known = options.knownClauses ?? []
  const types = options.documentTypes
  const byDoc = index.documents.filter((d) => (types ? types.includes(d.type) : true))
  const out: DetectedClause[] = []
  for (const doc of byDoc) {
    const segments = segmentDocument(index, doc.id)
    for (const seg of segments) {
      const { type, confidence, evidenceHits } = classifySegment(seg.text)
      const hint = known.find(
        (k) => k.documentId === doc.id && k.page === seg.page && (k.section === undefined || k.section === seg.section),
      )
      const excerpt = seg.blocks.filter((b) => !/^[A-Z0-9 .&'’"–—-]{3,}$/.test(b.trim())).join(' ').slice(0, 240)
      const clause: DetectedClause = {
        id: seg.id,
        type,
        text: seg.text,
        documentId: doc.id,
        page: seg.page,
        section: seg.section,
        sourceAnchor: {
          documentId: doc.id,
          page: seg.page,
          section: seg.section ?? undefined,
          excerpt,
        },
        confidence,
        evidenceHits,
      }
      if (hint) {
        clause.clauseId = hint.id
        clause.severity = hint.severity
      }
      out.push(clause)
    }
  }
  return out
}
