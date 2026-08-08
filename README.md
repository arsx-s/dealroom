# DealRoom — Deal Intelligence Report

A working product simulation of an automated deal-intelligence platform:
ingest deal-room documents, extract structured signals, detect clauses,
score risk deterministically, and present a decision-ready report where
every claim is traceable to a citation.

**All data is fictitious** — company, documents, and figures are invented
for development and design purposes.

## Architecture

```
documents (seed PDFs) ──► IPA index ──► pipeline ──► Deal Intelligence Report
                                        │
   ingest → extract → analyze → detect → score → validate → reasoning
   (each stage recorded; a failure returns { ok:false }, never a partial report)
```

The pipeline (`src/pipeline/`) is deterministic and synchronous: identical
inputs produce byte-identical reports (verified by the evaluation suite).
The reasoning layer is grounded — it paraphrases only recorded evidence,
and an optional LLM upgrade is gated by a faithfulness check that rejects
ungrounded output. Nothing calls a model by default.

The dashboard (`src/App.tsx`) renders the real pipeline output: composite
risk banner, severity-filtered findings, financial table with per-line
citations, extracted-clause index, and a source viewer that opens the
exact page and highlights the cited text. Every number in the UI is
computed from the active source set — nothing is hardcoded.

## Ingestion

The Ingest tab accepts an IPA index (`.json`) — the extracted-page
representation the seed pipeline writes. Upload a corpus to re-run the
entire pipeline against it:

- the index is schema-validated on upload (format, documents, pages,
  block roles)
- a figure that the corpus does not carry is reported missing (`—`),
  never invented; extractions fall back to a corpus-wide scan with the
  citation anchored at the page the figure actually came from
- a corrupt, empty, unsupported, or oversized index fails with an
  explicit error — no partial report is ever rendered

Generate a corpus with `npm run seed` and upload
`src/data/deal-index.json` to try it.

## Environment variables

None are required. Optional reasoning upgrade (never used by default):

| Variable | Purpose |
|---|---|
| `VITE_REASONING_URL` | HTTPS endpoint of a chat-completions-style provider |
| `VITE_REASONING_API_KEY` | bearer credential for that endpoint |
| `VITE_REASONING_MODEL` | model name (default `dealroom-default`) |

When unset, reasoning is the deterministic grounded rationale; when set,
provider output passes the same faithfulness gate or is rejected.

## Scripts

```
npm install
npm run dev             # local dev server
npm test                # full suite: contract, pipeline, intelligence,
                        # findings, evidence, ingestion, interactions (184 tests)
npm run typecheck       # tsc --noEmit
npm run build           # typecheck + production build
npm run seed            # regenerate corpus PDFs + IPA index (deterministic)
npm run audit:secrets   # credential scan over tracked files (CI-safe)
```

## Repository layout

| Path | Contents |
|---|---|
| `src/pipeline/` | end-to-end pipeline: config, extraction, findings, narrative |
| `src/intelligence/` | clause detection, taxonomy, entities, missing-clause, **gold ground truth** |
| `src/finance/`, `src/risk/` | financial analysis, composite score engine |
| `src/reasoning/` | grounded narrative, faithfulness gate, LLM provider interface |
| `src/lib/` | IPA index access, citation resolution, evidence navigation |
| `src/contract/` | Zod data contract validated end-to-end |
| `seed/` | corpus authoring, PDF renderer, IPA indexer |
| `docs/` | EVALUATION.md, clause-detection.md |
| `SECURITY.md` | hardening audit + credential handling |

## Evaluation

`docs/EVALUATION.md` is the durable measurement record. Current status
(2026-08-09):

- clause recall **1.0** (11/11 gold), zero false positives, zero strays
- every finding citation resolves to a real indexed page (25/25)
- determinism verified run-to-run
- one documented failure — absence-evidence findings (M7) — plus the M8
  segmentation fix record

## Milestones

| # | Milestone | Ship |
|---|---|---|
| M1 | App skeleton, design tokens, data contract, README | ✅ |
| M2 | Deterministic scoring engine | ✅ |
| M3 | Report dashboard (views, interactions, export) | ✅ |
| M4 | Seed dataset generator (PDFs + IPA) | ✅ |
| M5 | Pipeline connected to the dashboard | ✅ |
| M6 | Finding citations + evidence navigation | ✅ |
| M7 | End-to-end evaluation + documented failure | ✅ |
| M8 | Clause-segmentation edge case fixed | ✅ |
| M9 | Hardening: audit, secrets scan, security doc | ✅ |
| M10 | Dashboard polish (focus, a11y, reduced motion) | ✅ |
| M11 | Portfolio README + stale docs | ✅ |
| M12 | Repository cleanup (verified dead material) | ✅ |
| M13 | Release audit | ✅ |
| M14 | Deployment readiness | ✅ |
| M15 | Final portfolio pass | ✅ |

## Deployment

```
npm run build          # typecheck + production build (relative asset paths)
npm run preview        # serve the built app locally for a production check
```

GitHub Pages: enable Pages → Source: GitHub Actions. On every push to
`main`, `.github/workflows/deploy.yml` runs the full gate (typecheck, 171
tests, build) and deploys `dist/` to Pages. The app has no client-side
routing and ships relative asset URLs, so it also works from any static
host (Netlify, S3, folder drop).

## Design history

- `DESIGN-SYSTEM-PROPOSAL.md` — pre-implementation token/component
  proposal (historical record; the system is implemented in
  `src/styles/tokens.css` + `global.css`).
- `DESIGN-REVIEW.md` — source-level self-review of the implemented design
  and its known limitations.

## Known limitations

- **Ingestion boundary is the IPA index, not raw PDFs**: the pipeline
  consumes an extracted-page index. An on-page PDF extractor (e.g.
  `pdfjs-dist`) can be swapped in behind the `IpIndex` interface; the
  seed conformance suite would be the gate for that swap.
- **No persistence**: every load re-runs the pipeline over the active
  source set. Reports are ephemeral until exported (`Export` → JSON).
  There is deliberately no database or localStorage pretending to be one.
- **Evaluation is in-sample**: the detection weights were tuned against
  the generated corpus; the metrics in `docs/EVALUATION.md` overstate
  out-of-sample generalization.
- **Extraction is pattern-based**: line items are found by labelled
  patterns (e.g. `Revenue: $…`). A corpus that structures its statements
  differently yields missing (`—`) metrics — honestly reported, never
  estimated.