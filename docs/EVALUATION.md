# DealRoom Evaluation

Measurement record for the DealRoom pipeline. Updated each time the
headline numbers change meaningfully; generated from the end-to-end
evaluation suite (`src/pipeline/__tests__/evaluation.test.ts`) and the
detection evaluation suite (`src/intelligence/__tests__/clause.test.ts`).

Run the suites to reproduce this file's numbers:

```
npm test
```

## Methodology

The repository's own labeled gold set stands in for the private ground
truth (`src/intelligence/groundtruth.ts`): 19 (document, page) segments of
which 11 are typed clauses and 8 are declared clause-free, 5
expected-but-not-found (document, clause type) pairs, and 5 entity
expectations. The gold set is fully checked in and pinned to the seeded
corpus.

Three surfaces are measured end-to-end on the FINAL report (not on the
intermediate detection layer):

| Surface | What it measures | Metric |
| --- | --- | --- |
| Clause coverage | report clauses vs gold (type, page) | recall, FP rate |
| Citation integrity | every finding's sources resolve via the evidence resolver | resolution rate, warnings |
| Determinism | identical inputs → identical report | deep equality |

A "gold-null" page is one the labeler declares must NOT receive a clause
type; a "stray" clause is one the report emits on a page outside the gold
set entirely.

## Record — 2026-08-09

```json
{
  "clausesEmitted": 11,
  "goldTypedSegments": 11,
  "goldTypedMatched": 11,
  "clauseRecall": 1,
  "falsePositiveOnGoldNull": 0,
  "strayClauses": 0,
  "findingsTotal": 25,
  "citations": 25,
  "citationsOk": 25,
  "citationsWarned": 0,
  "citationResolutionRate": 1,
  "findingsWithoutExcerpt": 5,
  "findingsWithoutEvidence": 0,
  "stagesOk": 7,
  "stagesTotal": 7
}
```

Detection-layer evaluation (intelligence suite): gold=11 found=11
recall=1.000 acc=1.000 fp=0 fpRate=0.000 missing=5/5 entities=5/5.

## Known failure #1 — absence-evidence findings carry no citation excerpt

**Measured:** 5 of 25 findings (F-021…F-025) cite sources with no excerpt
and therefore no quotable text to highlight in the source viewer.

**Root cause:** those findings are *expected-but-not-found* signals. The
pipeline searched a document type for a clause (indemnification,
termination), found none, and reported the absence. You cannot quote a
clause that does not exist, so the citation intentionally points at the
document cover as evidence of absence — the page opens but the
`mark` highlight has nothing to wrap.

**Decision:** documented, deliberately NOT fixed in this milestone. Making
these findings quotable requires deciding what "evidence of absence" means
in the source viewer (e.g., annotating the cover with the scanned-window
report), a scope change with product implications. The finding itself is
traceable (document, page, reason) and the page opens.

## M8 fix record — clause segmentation on multi-window and "(continued)" pages

**Date:** 2026-08-09. **Measured after fix:** clause recall 1.0, gold-null
FP 0, stray clauses 0, citations 25/25 — identical to the pre-fix record;
the fix changes structural quality, not headline accuracy.

**Edge case (root cause):** `segmentDocument` merged clause segments only
when a page's window label compared **string-equal** to the previous
segment's, and aborted merging entirely on any page with more than one
group (`multiWindow`). Two corpus patterns broke it:

- **Multi-window pages** — doc-loan p4 carries two inline sections
  ("Definitions / Financial Covenants"); every group became a segment
  labeled with the combined window name, and the Financial Covenants group
  never merged with pages 5–7 of the same window (clause fragmented into
  two+ segments, citations carried the "Definitions / Financial Covenants"
  label).
- **"(continued)" labels** — doc-shareholder p22–24 ("NON-COMPETE —
  (continued)") and doc-annual-fy25 p53–60 ("Risk Factors (continued)")
  compare unequal to their canonical window names, so continuation pages
  split into fragments with stale suffixes in their labels.

**Fix (detect.ts):** segmentation is now keyed per group: a group led by
an inline heading derives its window key from that heading (title-cased,
hyphen-aware, "(continued)" stripped); otherwise from the page window
(also "(continued)"-stripped). Groups with equal keys merge across pages;
each segment's `section` label is the canonical name. The Financial
Covenants clause is one segment (p4–7), the Non-Compete clause one segment
(p21–24), Risk Factors windows carry clean names.

**Regression tests:** three end-to-end assertions in
`src/intelligence/__tests__/clause.test.ts` (multi-window naming,
"(continued)" headings, "(continued)" window labels). They failed before
the fix and pass after; full suite 173/173.

## Thresholds

The evaluation suite locks the following thresholds; moving them requires
a deliberate change visible in this file:

- end-to-end clause recall ≥ 0.85 (current 1.0)
- false positives on gold-null pages = 0
- stray clauses = 0
- citation resolution rate = 1 (every finding opens a real, indexed page)
- ≥ 1 absence-evidence findings exist (the caveat stays measured)
- identical inputs → byte-identical report