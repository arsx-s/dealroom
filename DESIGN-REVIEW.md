# Design Review — Pass 1 (Milestone 3)

> Status: historical record. Superseded by the implemented design (see README →
> Design history). Retained for audit trail.

Review method: source-level audit of every rendered element, its token usage, copy,
and interaction behavior against `BRUTAL(c) — the programming brief` (levels, guides,
durability) and the CSS token proposal (section 11), using the production build for
HTML/CSS output. No browser-level visual regression suite exists yet (see
"Limitations"), so render assurance is code-level plus Vitest DOM checks.

## Issues found and fixed in this pass

| # | Issue | Fix |
|---|-------|-----|
| 1 | Score ruler needle floated 18px above the band track and overlapped the
scale row (`.ruler` had `padding-top: 18px` while needle spanned `top: 0`). | Bands
and needle now live in a dedicated `.ruler-track`; the needle spans exactly the
band track. |
| 2 | Needle marker used a `▼` glyph, outside the identity's squared geometry. |
Replace with a solid 10px square marker (`::before`). |
| 3 | Category tick bars filled black instead of the category's risk color (violated
the "active segments filled with the category's risk color" spec). | `.tick.filled`
now uses `currentColor`; the `.tickbar` carries the same `rk-*` class as its score
cell, so filled ticks take the risk color, unfilled keep a neutral outline. |
| 4 | Half-filled HIGH marker (`::after`) was hard-coded `--surface`, so on row hover
it looked like broken/white blob on grey. | The marker overlay now reads a
`--marker-bg` custom property set by the `.finding-row` (surface idle / surface-alt
on hover). |
| 5 | Score numeral hard-coded `64px` — broke the type scale (display token is 44px)
and the proposal's "numerals use the display token". | Now `var(--t-display)` with
the existing ≤800px 44px override kept. |
| 6 | Bare `94%` under CONF with no label; the findings list had no column headers. |
Added a full header row (SEVERITY / FINDING / CONF / CITATION) aligned to the
4-column grid, and a small-caps `CONF` label above the confidence value. The header
row degrades with the responsive grid (citation column drops ≤1100px, whole header
drops ≤800px). |
| 7 | Banner and hero both printed "72/100 · HIGH · 2 critical findings". | Banner
keeps the summary + signing call-out; the hero readout now states
"Composite of N categories · N findings · weighted deterministic engine", pointing
to the methodology panel. Also removed the redundant `onClick` (the `<a href>` was
already doing the navigation). |
| 8 | Negative net income rendered `-$340,000` with a red risk tint; conventions in
equity/debt financial print use parenthesized negatives and reserve risk tints for
risk findings. | `fmtMoney` now prints `($340,000)`; the red tint was removed from
the net-income row. |
| 9 | `.tab` count (`· 15`) used default muted grey on the black active tab (weak
contrast). | `rgba(255,255,255,.75)` for `.muted` on `[aria-selected]` tabs. |
| 10 | Empty-findings copy "FILTER CLEARED?" read as a glitch, not a
state transition. | "NO FINDINGS AT THIS SEVERITY — ADJUST OR CLEAR THE
FILTER". |
| 11 | `window.print()` drops backgrounds, gutting the black-strip system chrome. |
Print styles force exact color rendering for the topbar/banner/panel/stat
structures and re-tint light-mode buttons. |

## Known limitations

- **Citation coverage**: every source citation in the seed data references the four
  seeded documents (`doc-annual-fy25`, `doc-audit-fy24`, `doc-loan`,
  `doc-market-bench`); the source viewer will render a documented empty-ish state
  for ids outside that vault. Real coverage depends on the ingestion milestone
  (extraction + multi-document manifest index).
- **No browser screenshot baseline**: visual QA is currently code-review + DOM
  tests only. Worth an approved screenshot-diff harness before the next styling
  sweep.
- **Print**: the CSS handles system chrome but not page-break tuning for long
  findings lists (paper pagination milestone).