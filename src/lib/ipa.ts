/**
 * IPA — Indexed Packet Asset (deal data resolution layer.
 *
 * DealRoom citations are backed by an IPA index (the seeded corpus by
 * default, or a corpus uploaded through the Ingest tab). This module is
 * the read-side query surface the UI uses: page lookup, section
 * resolution, and anchor text. `parseIndexSafe` is the validation gate
 * every ingested index must pass before the pipeline accepts it.
 */

import { z } from 'zod'

import dealIndex from '../data/deal-index.json'

export interface IpBlock {
  role: 'title' | 'section' | 'statement' | 'body'
  text: string
}

export interface IpPage {
  documentId: string
  page: number
  section?: string
  blocks: IpBlock[]
}

export interface IpSection {
  documentId: string
  name: string
  start: number
  end: number
}

export interface IpIndex {
  format: 'dealroom/ipa-index/v1'
  generatedAt: string
  documents: { id: string; filename: string; type: string; pagesTotal: number }[]
  sections: IpSection[]
  pages: IpPage[]
}

export const ipIndex = dealIndex as unknown as IpIndex

/** Validation gate for ingested indexes (uploads and pipelines). */
const IpIndexSchema = z.object({
  format: z.literal('dealroom/ipa-index/v1'),
  generatedAt: z.string().min(1),
  documents: z.array(
    z.object({
      id: z.string().min(1),
      filename: z.string().min(1),
      type: z.string().min(1),
      pagesTotal: z.number().int().positive(),
    }),
  ),
  sections: z.array(
    z.object({
      documentId: z.string().min(1),
      name: z.string().min(1),
      start: z.number().int().positive(),
      end: z.number().int().positive(),
    }),
  ),
  pages: z.array(
    z.object({
      documentId: z.string().min(1),
      page: z.number().int().positive(),
      section: z.string().optional(),
      blocks: z.array(
        z.object({
          role: z.enum(['title', 'section', 'statement', 'body']),
          text: z.string().min(1),
        }),
      ),
    }),
  ),
})

export interface IndexParseOk {
  ok: true
  index: IpIndex
}

export interface IndexParseFailure {
  ok: false
  /** The first schema issue, or null when the shape is fine but the index is unusable. */
  error: string
}

export type IndexParseResult = IndexParseOk | IndexParseFailure

/** Parse and validate an IPA index from raw text. Never throws. */
export function parseIndexSafe(raw: string): IndexParseResult {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'not valid JSON' }
  }
  const parsed = IpIndexSchema.safeParse(value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: `${first?.path.join('.') ?? 'index'}: ${first?.message ?? 'invalid'}` }
  }
  if (parsed.data.documents.length === 0 || parsed.data.pages.length === 0) {
    return { ok: false, error: 'index contains no documents or pages' }
  }
  return { ok: true, index: parsed.data as IpIndex }
}

/** All blocks on a document page, in layout order. */
export function pageBlocks(documentId: string, page: number): IpBlock[] {
  const p = ipIndex.pages.find((x) => x.documentId === documentId && x.page === page)
  return p?.blocks ?? []
}

/** Section names covering the page, or null when the page is indexed. */
export function pageSectionLabel(documentId: string, page: number): string | null {
  const p = ipIndex.pages.find((x) => x.documentId === documentId && x.page === page)
  return p?.section ?? null
}