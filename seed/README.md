# Seed corpus generator

DealRoom's sample vault is generated, not hand-typed: the seven deal
documents exist as real PDFs, and the app's citation layer is backed by a
machine-checked index of their contents.

```
npm run seed
```

Outputs:

- `seed/out/*.pdf` — seven real PDFs (US Letter, Helvetica, flate-compressed
  content streams), one per vault document. Generated — git-ignored.
- `src/data/deal-index.json` — the IPA (Indexed Packet Asset) index: every
  page of every document with its extracted text blocks, plus the section
  registry the citation layer resolves against.

## Pipeline stages

1. **Content model** (`seed/src/content.mjs`) — the single authored source:
   per-document sections with page windows, statement lines, and boilerplate.
   Every sentence the app displays that comes from a "document" (excerpts,
   clause quotes, financial figures, citation contexts) is authored here,
   verbatim.
2. **PDF writer** (`seed/src/pdf.mjs`) — a small deterministic PDF 1.4
   writer (no runtime dependencies): title band, section headings, wrapped
   paragraphs, page footer. Byte-stable for identical input.
3. **IPA indexer** (`seed/src/indexer.mjs`) — compiles the page model into
   `deal-index.json` with block roles (`title`, `section`, `statement`,
   `body`).

## Conformance guarantees (enforced by tests)

`src/__tests__/dataset.test.ts` asserts, against the app's own seed report:

- every document's page count equals its indexed page count;
- every page has at least one non-empty block;
- every Document excerpt is a verbatim substring of a block on its page;
- every Document section heading resolves to a section window containing the
  heading's page;
- every finding citation (document, page, section) resolves, and its excerpt
  appears verbatim in a block on the cited page;
- every clause page resolves;
- every displayed financial figure (as formatted by `fmtMoney` /
  `fmtRatio` / `fmtMultiple`) appears verbatim on its cited page.

So a citation is never decorative: each one is traceable to real text in the
vault, and the text is what the source viewer renders.

## Determinism

Content, page geometry, PDF bytes, and the index are fully deterministic
between runs; the seed script re-checks byte-stability on each invocation.

## Honest scope note

The PDFs are real files, but the index is derived from the layout model that
produced them — not from a separate byte-level PDF text extraction pass. A
real extractor (e.g. `pdfjs`, `mupdf`, or an OCR layer) can be swapped in
behind the same `IpIndex` interface; the conformance suite would then be the
gate for that swap.
