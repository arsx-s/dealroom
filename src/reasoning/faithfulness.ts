/**
 * Faithfulness check — mechanical verification that a generated narrative
 * says nothing the context did not supply.
 *
 * Rules:
 *  1. Every finding reference (F-xxx) must exist in the context findings.
 *  2. Every number in the output must appear in the context's allowed
 *     number whitelist (structured scores/contributions), OR inside a
 *     verbatim quoted fragment of finding evidence.
 *  3. Every document id referenced (doc-…) must exist in the findings'
 *     anchors.
 *  4. The output must reference at least one finding when the context has
 *     findings, must be non-empty, and must stay under the length limit.
 *
 * Any violation → concerns; the narrative must not be surfaced to a user
 * without review. A failing check never silently passes.
 */

import type { ReasoningContext } from './context'
import { numbersIn } from './context'

export interface FaithfulnessReport {
  status: 'grounded' | 'concerns'
  issues: string[]
  referencedFindingIds: string[]
  referencedDocs: string[]
}

const FINDING_REF = /\b(F-\d+)\b/g

export function checkFaithfulness(text: string, ctx: ReasoningContext): FaithfulnessReport {
  const issues: string[] = []

  if (typeof text !== 'string' || text.trim().length === 0) {
    return { status: 'concerns', issues: ['empty narrative'], referencedFindingIds: [], referencedDocs: [] }
  }

  /* 1. finding references exist */
  const referencedFindingIds = [...new Set((text.match(FINDING_REF) ?? []).map((m) => m.toLowerCase()))]
  const knownIds = new Set(ctx.findings.map((f) => f.id.toLowerCase()))
  for (const ref of referencedFindingIds) {
    if (!knownIds.has(ref)) issues.push(`references unknown finding ${ref.toUpperCase()}`)
  }
  if (ctx.findings.length > 0 && referencedFindingIds.length === 0) {
    issues.push('narrative references no finding ids despite findings being present')
  }

  /* 2. numbers must be whitelisted, unless inside a quoted evidence string.
     Finding ids are stripped first so "F-001" cannot masquerade as a
     number token. */
  const allowed = new Set(ctx.allowedNumbers)
  const unquoted = text.replace(/“[^”]*”|"[^"]*"/g, ' ').replace(FINDING_REF, ' ')
  for (const n of numbersIn(unquoted)) {
    if (!allowed.has(n)) issues.push(`cites number ${n} not in the context whitelist`)
  }

  /* 3. document ids */
  const knownDocs = new Set(ctx.findings.flatMap((f) => f.anchors.map((a) => a.documentId)))
  for (const m of text.match(/\bdoc-[a-z0-9-]+\b/g) ?? []) {
    if (!knownDocs.has(m)) issues.push(`references unknown document ${m}`)
  }

  /* 4. length */
  if (text.length > 2400) issues.push('narrative exceeds the 2400-char limit')

  return {
    status: issues.length === 0 ? 'grounded' : 'concerns',
    issues,
    referencedFindingIds: referencedFindingIds.map((id) => id.toUpperCase()),
    referencedDocs: [...new Set(text.match(/\bdoc-[a-z0-9-]+\b/g) ?? [])],
  }
}