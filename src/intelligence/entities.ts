/**
 * Lightweight deterministic entity extraction (document parties and
 * identifiers) from the structural index.
 *
 * Entities are found from cover-page title/statement blocks via per-document
 * pattern rules — no model, no OCR. Roles are typed so downstream layers can
 * distinguish issuer, counterparties, and document identifiers.
 */

import type { IpIndex } from '../lib/ipa'
import type { SourceAnchor } from '../contract'

export interface DetectedEntity {
  id: string
  /** party | company | policy-identifier | preparer */
  kind: 'party' | 'company' | 'policy-identifier' | 'preparer'
  role?: string
  name: string
  documentId: string
  page: number
  sourceAnchor: SourceAnchor
  confidence: number
}

const PARTY_RE = /^(borrower|lender|insured|parent|issuer|auditor|preparer)\s*:\s*(.+)$/i
const POLICY_NO_RE = /^policy\s*no\.?\s*:?\s*([a-z0-9-]+)/i
const PREPARED_BY_RE = /^prepared by\s+(.+?)\.?\s*$/i

const KNOWN_DOC_ROLES: Record<string, string> = {
  'doc-annual-fy25': 'issuer',
  'doc-audit-fy24': 'issuer',
  'doc-audit-opinion': 'issuer',
  'doc-loan': 'issuer',
  'doc-shareholder': 'issuer',
  'doc-insurance': 'policy-holder',
}

export function detectEntities(index: IpIndex): DetectedEntity[] {
  const out: DetectedEntity[] = []
  for (const doc of index.documents) {
    const cover = index.pages.find((p) => p.documentId === doc.id && p.page === 1)
    if (!cover) continue
    let n = 0
    const push = (e: Omit<DetectedEntity, 'id'>) => {
      n += 1
      out.push({ ...e, id: `ent-${doc.id}-${n}` })
    }
    for (const b of cover.blocks) {
      const t = b.text.trim()
      const party = t.match(PARTY_RE)
      if (party) {
        push({
          kind: 'party',
          role: party[1].toLowerCase(),
          name: party[2].trim(),
          documentId: doc.id,
          page: 1,
          sourceAnchor: { documentId: doc.id, page: 1, excerpt: t.slice(0, 200) },
          confidence: 0.9,
        })
        continue
      }
      const policy = t.match(POLICY_NO_RE)
      if (policy) {
        push({
          kind: 'policy-identifier',
          name: policy[1],
          documentId: doc.id,
          page: 1,
          sourceAnchor: { documentId: doc.id, page: 1, excerpt: t.slice(0, 200) },
          confidence: 0.9,
        })
        continue
      }
      const prep = t.match(PREPARED_BY_RE)
      if (prep) {
        push({
          kind: 'preparer',
          name: prep[1].trim(),
          documentId: doc.id,
          page: 1,
          sourceAnchor: { documentId: doc.id, page: 1, excerpt: t.slice(0, 200) },
          confidence: 0.85,
        })
        continue
      }
      if (b.role === 'title' && KNOWN_DOC_ROLES[doc.id]) {
        // Cover titles that are a bare company name (the majority of cover
        // blocks) — only accept lines that look like a legal entity name.
        if (/^[A-Z][A-Z0-9 .&'-]+$/.test(t) && !/report|agreement|policy|opinion|statement|insurance|sector|biosystems annual/i.test(t)) {
          push({
            kind: 'company',
            role: KNOWN_DOC_ROLES[doc.id],
            name: t,
            documentId: doc.id,
            page: 1,
            sourceAnchor: { documentId: doc.id, page: 1, excerpt: t.slice(0, 200) },
            confidence: 0.7,
          })
        }
      }
    }
  }
  return out
}
