# DealRoom — Deal Intelligence Report

A working product simulation of an automated deal-intelligence platform:
ingest deal-room documents, extract structured signals, score risk
deterministically, and present a decision-ready report with every claim
traceable to a citation.

All data is **fictitious** (company, documents, figures) — invented for
development and design purposes.

## Run

```
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build
npm test          # full test suite (contract, interactions, dataset conformance)
npm run seed      # regenerate the sample document corpus + IPA index
```

## What's inside

- **Data contract** (`src/contract/`) — Zod schemas for the report payload:
  findings, clauses, financials, composite risk score, source anchors. Every
  report object is validated end-to-end; category and composite scores are
  computed by a deterministic scoring engine, never authored.
- **Report UI** (`src/`) — brutalist report dashboard: composite score with
  band ruler, category breakdown, severity-filtered findings with evidence
  and citations, financial table with per-line citations, extracted-clause
  index, source document viewer, and a methodology panel explaining exactly
  how the score is constructed.
- **Seed corpus** (`seed/`) — generates the sample vault: seven real PDFs
  plus an IPA index of every page's text blocks. The conformance suite
  (`src/__tests__/dataset.test.ts`) verifies that every excerpt, citation,
  clause, and financial figure in the app traces verbatim to the indexed
  vault.
- **Design** — `DESIGN-SYSTEM-PROPOSAL.md` (token and component proposal),
  `DESIGN-REVIEW.md` (self-review pass notes and known limitations).

## Roadmap (as planned)

1. ✅ App skeleton, design tokens, data contract, README
2. ✅ Deterministic scoring engine (weighted composites + severity math)
3. ✅ Report dashboard (all views, interactions, export)
4. ✅ Seed dataset generator (PDFs + IPA: extraction + manifest)
5. ⏳ Ingestion pipeline (real document intake → same IPA format)
6. ⏳ Visual QA harness (screenshot diff), pagination, real text extraction

## Notes

- Windows dev environment; PowerShell commands in docs are for that shell.
- The source viewer renders extracted text from the IPA index; the PDFs
  themselves are generated artifacts (see `seed/README.md`).
