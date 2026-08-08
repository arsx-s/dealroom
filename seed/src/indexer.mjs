/**
 * IPA — Indexed Packet Asset manifest builder.
 *
 * The seed's "extraction" stage: the page model (author-controlled layout)
 * is compiled into an index that mirrors what an independent text-extraction
 * pipeline would emit for the same PDFs. Every page of every document is
 * present, every citation anchor resolves to a page, and block texts are
 * verbatim from the content model.
 *
 * Output schema (dealroom/ipa-index/v1):
 *   documents[]  registry of vault documents
 *   sections[]   { documentId, name, pageStart, pageEnd } in document order
 *   pages[]      { documentId, page, section, blocks: [{ role, text }] }
 */

export function buildIpIndex({ documents, pageModels, generatedAt }) {
  const sections = []
  const pages = []
  for (const doc of documents) {
    const model = pageModels[doc.id]
    if (!model) throw new Error(`missing page model for ${doc.id}`)
    if (model.pages.length !== doc.pagesTotal) {
      throw new Error(`doc ${doc.id}: model has ${model.pages.length} pages, expected ${doc.pagesTotal}`)
    }
    for (const s of model.sections) {
      sections.push({ documentId: doc.id, name: s.name, start: s.start, end: s.end })
    }
    for (const p of model.pages) {
      pages.push({
        documentId: doc.id,
        page: p.page,
        section: [...p.sections].join(' / '),
        blocks: p.blocks.map((b) => ({ role: b.role ?? 'body', text: b.text })),
      })
    }
  }

  return {
    format: 'dealroom/ipa-index/v1',
    generatedAt,
    documents: documents.map((d) => ({ id: d.id, filename: d.filename, type: d.type, pagesTotal: d.pagesTotal })),
    sections,
    pages,
  }
}