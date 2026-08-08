/**
 * Seed pipeline runner.
 *
 *   npm run seed
 *
 * 1. Builds the page model for every document (authored content).
 * 2. Renders the PDF corpus into seed/out/.
 * 3. Compiles the IPA index into src/data/deal-index.json (consumed by the
 *    app and verified by tests).
 * 4. Runs the self-check and prints a summary table.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DOCS, buildPageModel } from '../seed/src/content.mjs'
import { renderPdf } from '../seed/src/pdf.mjs'
import { buildIpIndex } from '../seed/src/indexer.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(root, 'seed', 'out')
const INDEX_PATH = join(root, 'src', 'data', 'deal-index.json')

const generatedAt = new Date().toISOString()

const pageModels = {}
for (const doc of DOCS) {
  pageModels[doc.id] = buildPageModel(doc)
}

mkdirSync(OUT, { recursive: true })
const pdfFiles = []
for (const doc of DOCS) {
  const model = pageModels[doc.id]
  const pages = model.pages.map((p) => ({
    blocks: p.blocks.map((b) => ({ text: b.text, role: b.role })),
  }))
  const buf = renderPdf({ title: doc.filename.replace(/\.pdf$/, ''), pages })
  const path = join(OUT, doc.filename)
  writeFileSync(path, buf)
  pdfFiles.push({ doc, path, bytes: buf.length, hash: createHash('sha256').update(buf).digest('hex').slice(0, 12) })
}

const index = buildIpIndex({ documents: DOCS, pageModels, generatedAt })
writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2))

/* ---------- self-check ---------- */
const problems = []
for (const doc of DOCS) {
  const model = pageModels[doc.id]
  if (model.pages.length !== doc.pagesTotal) problems.push(`pages mismatch ${doc.id}`)
  for (const p of model.pages) {
    if (p.blocks.length === 0) problems.push(`empty page ${doc.id} p.${p.page}`)
    for (const b of p.blocks) {
      if (!b.text || b.text.trim().length === 0) problems.push(`empty block ${doc.id} p.${p.page}`)
    }
  }
}

const pageCount = Object.values(pageModels).reduce((a, m) => a + m.pages.length, 0)

console.log('=== seed pipeline ===')
for (const f of pdfFiles) {
  console.log(`pdf   ${f.doc.id.padEnd(18)} ${String(f.bytes).padStart(8)} bytes  sha256:${f.hash}  ${f.path.replace(root + '\\', '')}`)
}
console.log(`index ${INDEX_PATH.replace(root + '\\', '')}  (${index.pages.length} pages, ${index.sections.length} sections)`)

if (problems.length > 0) {
  console.error('\nPROBLEMS:')
  for (const p of problems) console.error(' - ' + p)
  process.exit(1)
}
console.log(`\nOK — ${pdfFiles.length} pdfs, ${pageCount} pages, deterministic (seed mode)`)

/* Determinism guard: identical input must produce identical bytes. */
const sample = pdfFiles[0]
if (existsSync(sample.path)) {
  const again = renderPdf({
    title: sample.doc.filename.replace(/\.pdf$/, ''),
    pages: pageModels[sample.doc.id].pages.map((p) => ({ blocks: p.blocks.map((b) => ({ text: b.text, role: b.role })) })),
  })
  const againHash = createHash('sha256').update(again).digest('hex').slice(0, 12)
  if (againHash !== sample.hash) {
    console.error(`determinism check failed for ${sample.doc.id}: ${sample.hash} != ${againHash}`)
    process.exit(1)
  }
}
