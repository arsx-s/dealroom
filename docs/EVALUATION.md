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

## Thresholds

The evaluation suite locks the following thresholds; moving them requires
a deliberate change visible in this file:

- end-to-end clause recall ≥ 0.85 (current 1.0)
- false positives on gold-null pages = 0
- stray clauses = 0
- citation resolution rate = 1 (every finding opens a real, indexed page)
- ≥ 1 absence-evidence findings exist (the caveat stays measured)
- identical inputs → byte-identical report