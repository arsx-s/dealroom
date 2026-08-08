/**
 * Evidence navigation tests — citation resolution.
 *
 * Every citation shape the dashboard must handle:
 *   valid citation, citation without an excerpt, unknown document,
 *   out-of-range page, unindexed page, clause anchor, section mismatch.
 */

import { describe, expect, it } from 'vitest'
import type { Clause } from '../../contract'
import { ipIndex } from '../ipa'
import { findBlockMatch, resolveCitation } from '../evidence'

const GUARANTEE_EXCERPT =
  'The Parent shall guarantee forty-five percent (45%) of the Company’s aggregate bookings outstanding at any time.'

const loanAnchor = {
  documentId: 'doc-loan',
  page: 12,
  section: 'Guarantees',
  excerpt: GUARANTEE_EXCERPT,
}

const loanClauses: Clause[] = [
  {
    id: 'cl-doc-loan-12',
    type: 'guarantee',
    text: GUARANTEE_EXCERPT,
    documentId: 'doc-loan',
    page: 12,
    section: 'Guarantees',
    confidence: 1,
  },
]

describe('resolveCitation', () => {
  it('resolves a valid citation to the exact page and verbatim source text', () => {
    const r = resolveCitation(ipIndex, loanAnchor, loanClauses)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.documentId).toBe('doc-loan')
    expect(r.page).toBe(12)
    expect(r.filename).toContain('Loan_Agreement')
    expect(r.excerptResolved).toBe(true)
    expect(r.matchedBlock?.needle).toBe(GUARANTEE_EXCERPT)
    expect(r.warnings).toEqual([])
    expect(r.clauses).toContain('cl-doc-loan-12')
  })

  it('treats a citation without an excerpt as valid but unverified text', () => {
    const r = resolveCitation(ipIndex, { documentId: 'doc-loan', page: 12, section: 'Guarantees' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.excerptResolved).toBe(false)
    expect(r.matchedBlock).toBeNull()
  })

  it('rejects citations to an unknown document', () => {
    const r = resolveCitation(ipIndex, { documentId: 'doc-ghost', page: 1 })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('unknown-document')
    expect(r.message).toContain('doc-ghost')
  })

  it('rejects citations to pages outside the document range', () => {
    const r = resolveCitation(ipIndex, { documentId: 'doc-loan', page: 999, excerpt: 'x' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('page-out-of-range')
  })

  it('rejects citations to pages missing from the index', () => {
    const sparse = JSON.parse(JSON.stringify(ipIndex)) as typeof ipIndex
    sparse.pages = sparse.pages.filter((p) => !(p.documentId === 'doc-loan' && p.page === 12))
    const r = resolveCitation(sparse, loanAnchor)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('page-not-indexed')
  })

  it('resolves clause anchors to the clauses declared on the page', () => {
    const r = resolveCitation(ipIndex, { documentId: 'doc-loan', page: 12, clause: 'cl-doc-loan-12', excerpt: GUARANTEE_EXCERPT }, loanClauses)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.clauses).toEqual(['cl-doc-loan-12'])
  })

  it('warns — but still resolves — when the cited section does not match the index', () => {
    const r = resolveCitation(ipIndex, { documentId: 'doc-loan', page: 12, section: 'Definitions', excerpt: GUARANTEE_EXCERPT })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.warnings).toContain('section-mismatch')
    expect(r.section).not.toBe('Definitions')
  })
})

describe('findBlockMatch', () => {
  const blocks = [
    { text: 'GUARANTEES' },
    { text: 'The Parent shall guarantee forty-five percent (45%) of the aggregate bookings.' },
    { text: 'The guarantee is unconditional.' },
  ]

  it('finds an excerpt verbatim inside a single block', () => {
    const m = findBlockMatch(blocks, 'The guarantee is unconditional.')
    expect(m).toEqual({ index: 2, needle: 'The guarantee is unconditional.' })
  })

  it('falls back to the longest prefix overlap when the excerpt spans blocks', () => {
    const m = findBlockMatch(blocks, 'The Parent shall guarantee forty-five percent (45%) of the aggregate bookings. The guarantee is unconditional.')
    expect(m?.index).toBe(1)
    expect(m?.needle.length).toBeGreaterThanOrEqual(12)
  })

  it('returns null for empty or unmatched excerpts', () => {
    expect(findBlockMatch(blocks, '')).toBeNull()
    expect(findBlockMatch(blocks, 'no such text anywhere')).toBeNull()
  })
})
