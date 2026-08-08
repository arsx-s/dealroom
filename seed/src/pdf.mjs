/**
 * Minimal deterministic PDF writer (PDF 1.4, single font Helvetica).
 *
 * Renders text pages from the seed page model into real PDF files with
 * xref tables and flate-compressed content streams. Output is byte-stable
 * for identical input. Not a general PDF library — it serves exactly the
 * shapes the seed corpus needs (title band, section headings, statement
 * lines, wrapped paragraphs).
 *
 * Text is normalized to a printable ASCII range before embedding.
 */

import { deflateSync } from 'node:zlib'

export const PAGE = { width: 612, height: 792 } // US Letter, points
const MARGIN = 54
const TEXT_W = PAGE.width - MARGIN * 2
const TOP_Y = PAGE.height - 64
const BOTTOM_Y = 48
const LEAD = 14

/* Standard Helvetica AFM widths, per-1000 em (ASCII 33..126). */
const W = {
  33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333,
  41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
  111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556,
  118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260,
  125: 334, 126: 584,
}

function charW(ch, size) {
  return ((W[ch.charCodeAt(0)] ?? 556) / 1000) * size
}

function textWidth(text, size) {
  let w = 0
  for (const ch of text) w += charW(ch, size)
  return w
}

/** Wrap text into lines whose rendered width fits TEXT_W. */
function wrap(text, size) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word
    if (textWidth(candidate, size) <= TEXT_W || !cur) {
      cur = candidate
    } else {
      lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/** ASCII-safe string for embedding; typographic chars are mapped. */
function ascii(text) {
  return String(text)
    .replace(/\u2019|\u2018/g, "'")
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
}

/** Escape parentheses and backslashes for PDF literal strings. */
function esc(text) {
  return ascii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

const ROLE_SIZE = { title: 18, section: 13, statement: 10.5, body: 10.5 }

/**
 * Compose the content stream for one page.
 * Y is top-down; baseline runs from TOP_Y downward to BOTTOM_Y.
 */
function composeContent({ docTitle, pageNo, pagesTotal, blocks }) {
  const ops = []
  let y = TOP_Y

  const emit = (text, size) => {
    for (const ln of wrap(ascii(text.trim()), size)) {
      if (y < BOTTOM_Y + 14) return false
      ops.push(`BT /F1 ${size} Tf ${MARGIN} ${y} Td (${ln}) Tj ET`)
      y -= LEAD
    }
    return true
  }

  emit(`${docTitle} — page ${pageNo} of ${pagesTotal}`, 8)
  y -= 4
  ops.push(`0.5 w ${MARGIN} ${y} m ${PAGE.width - MARGIN} ${y} l S`)
  y -= 10

  for (const b of blocks) {
    const size = ROLE_SIZE[b.role ?? 'body'] ?? 10.5
    if (!emit(b.text, size)) break
    y -= 5
  }

  emit('DealRoom seed corpus — fictitious company, generated document', 8)
  return ops.join('\n')
}

/**
 * Render a multi-page PDF to a Buffer.
 * Object layout: 1 catalog, 2 pages tree, 3 font, then per page i:
 *   4+2i = content stream, 5+2i = page object.
 */
export function renderPdf({ title, pages }) {
  const N = pages.length
  const total = 3 + N * 2

  const contents = pages.map((p, i) =>
    deflateSync(
      Buffer.from(
        composeContent({ docTitle: title, pageNo: i + 1, pagesTotal: N, blocks: p.blocks }),
        'utf8',
      ),
    ),
  )

  const body = []
  body[1] = Buffer.from('<< /Type /Catalog /Pages 2 0 R >>')
  body[2] = Buffer.from(`<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${N} >>`)
  body[3] = Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  for (let i = 0; i < N; i++) {
    const stream = contents[i]
    body[4 + i * 2] = Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`),
      stream,
      Buffer.from('\nendstream'),
    ])
    body[5 + i * 2] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${4 + i * 2} 0 R >>`,
    )
  }

  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')]
  const offsets = new Array(total + 1).fill(0)
  for (let n = 1; n <= total; n++) {
    const head = Buffer.from(`${n} 0 obj\n`)
    const tail = Buffer.from('\nendobj\n')
    offsets[n] = Buffer.concat(chunks).length
    chunks.push(head, body[n], tail)
  }

  const xrefStart = Buffer.concat(chunks).length
  const xrefLines = ['xref', `0 ${total + 1}`, '0000000000 65535 f ']
  for (let n = 1; n <= total; n++) {
    xrefLines.push(String(offsets[n]).padStart(10, '0') + ' 00000 n ')
  }
  chunks.push(
    Buffer.from(xrefLines.join('\n') + '\n'),
    Buffer.from(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`),
  )

  return Buffer.concat(chunks)
}
