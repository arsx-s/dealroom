# Clause / Entity Detection

Deterministic, structure-aware clause and entity detection over the IPA index
(`deal-index.json`), produced by the ingestion pipeline. No model is called;
every classification is rule-based and reproducible.

## Taxonomy

Fixed set of clause types (see `src/intelligence/taxonomy.ts`):

| Type | Evidence examples |
|---|---|
| `change-of-control` | "change of control", "upon a change", "repurchase right", "due immediately" |
| `termination` | "terminat", "lapse", "expires", "cease" |
| `liability` | "liability cap", "capped at", "breach of warranty", "sub-limited" |
| `indemnification` | "indemnif", "hold harmless", "reimburse" |
| `non-compete` | "non-compete", "directly competitive" |
| `unusual-obligation` | "guarantee", "parent shall", "45% of bookings" |
| `assignment-restriction` | "right of first refusal", "assign", "may not transfer", "transfer shares" |
| `other` | fallthrough when no evidence clears the floor |

Each type carries weighted regex evidence rules; negative weights suppress
referential mentions ("Guarantee schedule" in an exhibit list is not an
unusual-obligation clause; a quoted definition "…Change of Control… means…"
is a definition, not a clause). A segment is typed by the highest cumulative
weight; below `MIN_CLASSIFICATION_CONFIDENCE = 0.3` it falls to `other`.

## Detection approach

1. **Segmentation** (`src/intelligence/detect.ts`): a document is walked page
   by page; the page's section window (`page.section`) delimits clause units.
   Consecutive pages in the same window merge into one segment, so
   "— (continued)" pages extend the clause instead of fragmenting it. Pages
   carrying several sections (e.g. loan p.4 "Definitions / Financial
   Covenants") split per ALL-CAPS heading block. Body lines that merely start
   with the section name are not headings.
2. **Classification** of each segment against the taxonomy.
3. **Provenance**: every detection carries a source anchor
   (documentId, page, section, excerpt) and a confidence; when the segment
   matches a known clause hint, it inherits the clause id and severity.
4. **Entities** (`src/intelligence/entities.ts`): parties, company names,
   policy identifiers, and preparers extracted from cover-page blocks via
   pattern rules, each with an anchor and confidence.
5. **Missing clauses** (`src/intelligence/missing.ts`): a registry of
   expected clauses per document type; expectations with no typed detection
   produce `expected-but-not-found` signals with carefully hedged wording —
   absence is an analytical gap, not a proof of legal deficiency.

## Evaluation (seed corpus gold)

The repository's checked-in gold labels (`src/intelligence/groundtruth.ts`)
stand in for the private ground truth (not available in this environment).
Measured on the seed corpus (`evaluateDetection`):

| Metric | Value |
|---|---|
| Gold typed segments | 11 |
| Detection recall | 1.000 (11/11) |
| Classification accuracy | 1.000 (11/11) |
| False positive segments | 0 |
| Missing-clause recall / precision | 5/5, 1.000 |
| Entity recall | 1.000 (5/5) |

Run: `npx vitest run src/intelligence` (the metrics print in the eval test).

## Known failures / caveats

- **Calibration on the same corpus**: the evidence weights were tuned against
  the seed corpus, so these metrics overstate generalization. A private,
  out-of-sample ground truth is needed to validate.
- **Definitions vs clauses**: quoted-term definitions are suppressed by a
  negative rule; documents that define terms differently may still slip
  through.
- **Enumeration / number parsing**: clause text is not parsed for amounts;
  severity inheritance relies on the report's known clause hints. No NLP
  features — a clause phrased entirely differently from any evidence rule
  falls to `other` silently.
- **False negatives by design**: `other` segments are never flagged, so
  unusual clauses outside the taxonomy are invisible to missing-clause
  detection.

Removed caveat (fixed 2026-08-09): "(continued)" pages previously merged
only when the page label matched the prior segment's label **string-equal**,
and any page with multiple inline headings aborted merging entirely. The
detector now canonicalizes per-group section keys (title-cased, hyphen-aware,
"(continued)"-stripped) so continuation pages and multi-section pages fold
into one coherent segment. Regression-tested in `src/intelligence/__tests__/clause.test.ts`.
