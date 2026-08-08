import { describe, expect, it } from 'vitest'
import { parseIndexSafe } from '../ipa'

const valid = {
  format: 'dealroom/ipa-index/v1',
  generatedAt: '2026-08-09T00:00:00.000Z',
  documents: [{ id: 'doc-a', filename: 'a.pdf', type: 'loan-agreement', pagesTotal: 1 }],
  sections: [{ documentId: 'doc-a', name: 'Financial Covenants', start: 1, end: 1 }],
  pages: [
    {
      documentId: 'doc-a',
      page: 1,
      section: 'Financial Covenants',
      blocks: [{ role: 'body', text: 'Revenue: $10,000,000' }],
    },
  ],
}

describe('parseIndexSafe', () => {
  it('accepts a well-formed IPA index', () => {
    const result = parseIndexSafe(JSON.stringify(valid))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.index.documents).toHaveLength(1)
      expect(result.index.pages[0].blocks[0].text).toBe('Revenue: $10,000,000')
    }
  })

  it('rejects malformed JSON', () => {
    const result = parseIndexSafe('{not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('not valid JSON')
  })

  it('rejects a non-index JSON document', () => {
    const result = parseIndexSafe(JSON.stringify({ hello: 'world' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('format')
  })

  it('rejects an unknown block role', () => {
    const bad = JSON.parse(JSON.stringify(valid))
    bad.pages[0].blocks[0].role = 'footnote'
    const result = parseIndexSafe(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('role')
  })

  it('rejects an index with no documents or pages', () => {
    const bad = JSON.parse(JSON.stringify(valid))
    bad.documents = []
    bad.pages = []
    const result = parseIndexSafe(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('no documents or pages')
  })

  it('rejects a negative page number', () => {
    const bad = JSON.parse(JSON.stringify(valid))
    bad.pages[0].page = -3
    const result = parseIndexSafe(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('page')
  })
})
