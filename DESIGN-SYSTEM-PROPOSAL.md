# DealRoom — Design System Proposal

**Design Step 1 — Approval Document (historical record, 2026-08-09)**
**Status:** Proposal only. No source code, components, or styling implemented.
**Current status:** superseded — the system is implemented; tokens live in
`src/styles/tokens.css`, components in `src/styles/global.css` + `src/components/`.
This document is retained as design history — the README is the current reference.

---

## 0. Repo Inspection Notes

The repository at `C:\Users\ARYAN\Documents\DealRoom` was inspected exhaustively
(recursive listing, depth 5, including hidden files). It is **completely empty** —
no source files, no `package.json`, no config, no `.git`, no style files.

Implications for this proposal:

- There is **no existing framework, styling approach, fonts, tokens, components, or
  dashboard code** to conflict with. The design system below is proposed as the
  **foundation** the implementation (Step 2+) should build on.
- Because nothing exists, the proposal specifies the initial framework/tooling that
  the token system will target (see Section 13), so the proposal is concrete rather
  than abstract.
- Because nothing exists, there is nothing to retain — Section "patterns removed"
  in the final report is therefore N/A.

---

## 1. Design Philosophy

DealRoom is a machine that converts documents into decisions. Every design decision
serves one sentence: **these numbers matter.**

1. **Evidence → Analysis → Risk → Decision.** The visual hierarchy must follow this
   exact chain top to bottom, left to right. The report reads like a verdict built
   on citations, never like a chat.
2. **The risk score is the loudest thing in the room.** One thing may be visually
   dominant. Everything else is structured, not shouted.
3. **Documented certainty.** Findings are worthless without citations. Citations
   (source document, page, clause) must be visually inseparable from their findings.
4. **Density is competence.** Analysts are fluent readers. Tight tables, small
   labels, packed rows communicate "we work in this all day."
5. **Typographic structure.** Layout hierarchy is built with type size/weight/color
   and rules — not shadows, not gradients, not blur. Black rules do the work that
   "soft UI" does with elevation.
6. **Severity is semantic.** Red means risk, and only risk. Color is never decoration.
   The interface stays black/white/grey except where risk is being conveyed.
7. **Numbers look like numbers.** Financial values are monospaced, tabular, aligned
   on the decimal point, and formatted like a terminal, not like marketing stat cards.
8. **Zero roundness, zero playfulness.** `border-radius: 0`. Sharp corners say
   "internal tool; no one is trying to charm you."
9. **Print editorial rigor.** Density, rules, and column structure should feel like
   a financial daily or legal brief — information with a deadline.
10. **Quiet chrome, loud content.** Navigation, buttons, and utility UI are grey
     and neutral. The data and only the data carries color.

---

## 2. Color System

### 2.1 Palette (exact HEX)

| Token name          | HEX       | Allowed usage                                                                 |
|---------------------|-----------|-------------------------------------------------------------------------------|
| `--bg`              | `#FAFAF8` | Page background. Off-paper white; slightly removed setting, screen charting. |
| `--surface`         | `#FFFFFF` | Panel, tables, input fields, sunken content wells (when 1px black rule present). |
| `--surface-alt`     | `#F0EEEA` | Zebra table rows, subtle section banding, disabled field fill, hover fill. |
| `--text-primary`    | `#111111` | Headings, key numbers, bold labels, structural text. |
| `--text-secondary`  | `#454545` | Body text, explanatory copy. |
| `--text-muted`      | `#8A8A85` | Metadata (dates, doc IDs, page/line refs), captions, placeholders. |
| `--border`          | `#D6D6D3` | Standard 1px rules inside panels, `hr`-level dividers, table row spines. |
| `--border-strong`   | `#1A1A18` | Structural 2px borders: panel frames, section dividers, header rules. |
| `--accent-black`    | `#111110` | Interactive surfaces: primary buttons, active tab, selected row, focus ring, table headers (inverted). |
| `--high-risk`       | `#C4111B` | High/critical risk only: score badges, severity chip fill, risk table cell text when HIGH. |
| `--medium-risk`     | `#B44900` | Medium risk only: severity chips, category score numerals, borders on medium findings. |
| `--low-risk`        | `#1B6E4C` | Low risk only: severity chips, small check-oriented markers. |
| `--warning`         | `#B44900` | **Same hex as medium risk, deliberately.** System warnings (upload fail, missing page) — context and label differentiate, not hue. |
| `--success`         | `#1B6E4C` | **Same hex as low risk, deliberately.** System confirmations. |
| `--focus-outline`   | `#111110` | Keyboard focus: 2px outline with 2px white gap (see §5). |
| `--link`            | `#111110` | Links are black, underlined. Hover → underline doubles thickness, no color change. |

### 2.2 Rules of restraint

- **One red, one amber, one green. Total.** Warning/success reuse the risk hues;
  introducing more greens or ambers would start the rainbow slide.
- Colors appear **only** where they carry semantic meaning: severity chips, score
  numerals, critical-flag borders left edge, priority table cells.
- **Never** fill an entire panel with a risk color. At most: 2px left border +
  tinted (`~6%` alpha) background on the finding row. No saturated pill floods.
- The default chrome is black/white/grey. On a white dashboard, a single red chip
  is unmistakable; if half the interface is red, red means nothing.
- Chrome is the `--border` family. Text is `--text-*` family. Accent risk colors
  only exist in the "risk layer."
- For cross-support (print/copy in grayscale): risk is also encoded by **typography
  and shape** (see §8), not by color alone.

---

## 3. Typography

### 3.1 Faces (2 total, Google Fonts)

| Role      | Family             | Notes |
|-----------|--------------------|-------|
| Display + Body | **Archivo** (Google Fonts, weights 100–900 variable) | Strong grotesk with a squared, archival character; heavy weights read editorial, 400/500 read calm body. Used for all UI text. |
| Data/Mono | **IBM Plex Mono** (Google Fonts, 400/500/600) | All numerals, codes, tables, IDs, case numbers, evidence references, formula outputs. |

Fallbacks: `Archivo, 'Helvetica Neue', Arial, sans-serif` and
`'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`.

Rejected candidates with reason: *Inter* (the cliché AI-SaaS face; instantly
"generated"), *Space Grotesk* (same trend-signal problem), *Untitled Sans*
(not on Google Fonts), *JetBrains Mono* (developer-forward, slightly off-tone
for financials; Plex reads more archival).

### 3.2 Weights

- Body text: **400**
- Secondary/labels: **500**
- Emphasis, small bold, table headers: **600**
- Headings & score numerals: **700**
- Display (deal title, big numerals) **800–900** — used sparingly

### 3.3 Type scale (px / line-height)

| Token | Size | Lh | Weight | Usage |
|-------|-----|----|--------|-------|
| `display` | 44 | 48 | 800 | Page title (deal name), Report cover "Deal Intelligence Report" |
| `h1` | 30 | 34 | 700 | Section headings (Risk Score, Financial Data...) |
| `h2` | 20 | 24 | 600 | Panel grouping headers, key stat rows |
| `body` | 15 | 22 | 400 | Default copy, panel descriptions |
| `label` | 12 | 16 | 600 (uppercase, letter-spacing 0.6px) | All forms of metadata, row labels, "EVIDENCE", headers |
| `caption` | 11 | 15 | 400 | Footers, disclaimers, legal captions |
| `data` (mono) | 15 | 22 | 400 | Numbers in report body and tables |
| `data-lg` (mono) | 22–26 | 28 | 600 | Score numerals, hero "$" quantities |
| `data-sm` (mono) | 12 | 16 | 400 | Mock IDs, doc/page refs, timestamps |

### 3.4 Numeric & data principles

- **Everything numeric is mono (IBM Plex Mono), tabular, right-aligned in
  columns.** Exercises like `2.84x`, `18.7%`, `$12,400,000` align on the hundreds
  and right edge like ledger columns.
- Numbers never clip: `$12.4M` is fine in tight cells but the **canonical form
  is full width with thousands separators** (US locale) for report values.
  Suffixed compact forms (`3.1M`) allowed only in headers/labels, never in tables.
- **Units scribe inline:** `2.84x`, `18.7%`, `72/100` keep the unit attached in
  mono. Never "72 / 100" with decorative slash spacing.
- Percentages: one decimal, signed where meaningful (`+3.2%`), colouring follows
  risk semantics, never greed-green vs loss-red everywhere.
- Tabular alignment: use `font-feature-settings: "tnum"`, `font-variant-numeric:
  tabular-nums` so IDs and amounts stack into true columns.
- Labels for the number pairs read as composition: number left, unit right,
  always vertical-centering in the cell.

---

## 4. Spacing System

Compact, proportionate, fractal scale — nothing decorative.

```
space-1  4px   — intra-cell gap; chip padding 2px vertical / 6px horizontal
space-2  8px   — inside cells, between label & value, chip gaps
space-3  12px  — panel inner padding (comfort), button padding (10px 12px)
space-4  16px  — section chunk gap, between table & its caption
space-5  24px  — between adjacent panels (horizontal)
space-6  32px  — between major regions/section groups (vertical)
space-7  48px  — between Dashboard mega-sections
space-8  64px  — page bottom breather only, never as decorative void
```

Rules

- Page/section void never exceeds `space-7` (48px). Anything bigger reads as a
  marketing landing page, not an analyst tool.
- Panels are internally `space-3` padded; stacked panels carry the 2px section
  rule (see §5) between them, so the effective vertical gap is rule + `space-4`.
- Table `tr` height: **naturally compact**, 32px base (12px cell padding-y).
- Left rail (if category nav) uses space-1/2 increments; nav items 32px tall.

---

## 5. Border System

| Token | Width | Color | Usage |
|-------|-------|-------|-------|
| `rule` | 1px | `#D6D6D3` | Row separators inside tables, `hr`-level breaks, subtle inner panel hairlines |
| `structure` | 1px | `#111110` | Panel frame (surround), data wells |
| `section` | 2px | `#111110` | Section dividers, card-to-card separation, header bottom rule, table <thead> bottom rule |
| `focus` | 2px | `#111110` (offset 2px, gap 2px) | Keyboard focus on any interactive element (outline double-rule `outline: 2px solid #111; outline-offset: 2px`) |
| `risk-edge` | 3px (left) | `high/medium/low` color | Findings & priority rows: left accent edge per severity |

- **Hierarchy by rules, not shadows.** No drop shadows anywhere in the default
  state. Selected/sunken states swap fills instead: selected tab = black fill +
  white text; hover fill = `#F0F0F0`; keyboard focus = 2px black outline (see
  `focus` above).
- Tables: `1px` vertical rules inside data cells (column grid visible), thick
  bottom rule on header row, zebra rows optional (`surface-alt`) — recommended
  for legibility in 8-col tables.

---

## 6. Layout System

- **Max width:** 1280px content column (`--max-w: 1440` on very wide screens,
  but the report panel keeps 1280 max). Centered with gutters, black side
  borders visible on large gaps via a full-width structure line.
- **Grid:** 12-col CSS grid. Gutters: `24px` (screen ≥1280), `16px` (tablet),
  8px (mobile).
- **Dashboard column plan:**

```
 [ Header row (full width) ]
 [ Company strip (full width) ]
 | 6 | 6 |        (Risk score + risk categories split 50/50)
 | 12 |            financial table band
 | 7 | 5 |        (Findings | Signals/Notes)
 | 12 |           Evidence/Citations
```

(Swappable 4/8 patterns for very wide screens, but the proposal default is the
above — see §10.) 
- **Section pads:** vertical `space-6` (32px) between bands, `space-7` (48px)
  after the risk score hero; sections split with `2px` black rules.
- **Screen margins:** `24` horizontal desktop, snug mobile `12`.
- **Responsive behavior:**
  - ≥1280: 12-col full layout.
  - 800–1279: grid collapses to 2 cols; hero score stays full width; financial band
    stays full; findings+signals stack.
  - 480–799: 1 col — panels full-width stacked in the fixed order of importance;
    tables become horizontally scrollable (sticky first column) rather than
    wrapping; never nonlinear reorder.
    - Hero score locks to top, sticky on scroll (small bar).
  - ≤479: full-bleed panel padding 12px; hero compresses (score drops to 20px
    mono; metrics in 2-up raw grids).
- **Information density stiffness:** no collage zones with floating cards. On
  mobile, avoid any "feed" reorganization that turns the report into a vertical
  stack of marketing cards.

---

## 7. Component Principles

*(Description only — no code.)*

- **Header (app top bar):** 48px tall, black (`#111`) full-width bar, white text.
  Left: product wordmark "DealRoom" mono. Center: project name (truncates),
  right: export / print / settings (ghost white-outline buttons). No logo art
  beyond a square glyph; no gradients on chrome.
- **Company identity block:** Left-anchored: company name (display weight 700 or
  800 on deal name), right of it a column of label/pair metadata rows
  (Sector, HQ, Deal stage, Currency). Width ratio 7/5 with `surface` panel +
  `structure` border; identity is the first thing read.
- **Deal Risk Score:** large landscape zone. Left: `COMPOSITE DEAL RISK SCORE`
  label caps. Center: **score numeral** mono `28px`, weight 800, risk-color
  inherit. Right of numeral: donut or radial indicator in *risk color*, ring
  110px; 100-scale markers ("0 SHORT·  HIGH  ·MED ·LOW  100" axis labels);
  near the numeral, an automatic readout statement line:
  "72/100 — HIGH — ≥3 critical findings." Under: 3 mono chips listing the three
  highest category scores (Financial 81, Legal 74, Operations 63).
  - **Background color: never filled; risk communicated by numeral color, ring,
    and label only.**
- **Risk banner:** 48px tall, fill = 6% tint of severity color (or `surface-alt`
  on grey), left 3px severity rule, mono uppercase label `HIGH RISK`,
  sentence summary, `Visualize` link. Banner only shows when composite score is
  HIGH; for MEDIUM/LOW, renders a slimmer informational line instead.
- **Category scores:** 4-up strip of `h2`-sized numeral (mono, colored by risk),
  category label, and a 4-tick segmented bar (4 boxes, fill count = severity
  tick count). Ticks are square — sharp; active segments filled with risk color,
  inactive outline only. Hover: 1px black outline + surface-alt fill.
- **Financial metric cards (hero band):** `3-6` metrics in one bordered row
  (`1px` structure). Each: label caps (12/600), figure mono 20/700, right-aligned
  in the cell. No more than 6; ordering fixed: Revenue, EBITDA, Margin, Debt,
  Cash, Net Loss. All same row height; dividers between columns are `rule`.
- **Tables:** mono figures, right-aligned numeric columns, left-aligned text;
  zebra `surface-alt`; header caps mono, 2px bottom rule; 1px vertical gridlines;
  row height 32px. Sortable headers show `▲`/`▼ `; hover row = `surface-alt`.
- **Findings (list):** each finding is a bordered row (`structure` 1px,
  radius 0). Left: severity chip + marker; title 600/15px; body 400. On the
  right: Citation (n) exposed chip counting. Hover opens affordance.
- **Severity markers:** three icons in one consistent set — filled square for
  HIGH, half-filled square for MEDIUM, outline square for LOW — implemented via
  CSS (no icon library). Marker 8×8px sits left of findings; grayscale-safe.
  Filled marker + red text color both fire for HIGH.
- **Citation links:** mono text `[p. 12 · Clause 4.2]` inline, underlined,
  clickable — color stays `--text-primary`, hover thickness 2px; opens the
  source modal (see Modal). Never styled like a friendly blue chat link.
- **Evidence/source references:** bottom band, table with columns Doc/Page/Clause/
  Excerpt (prefix mono ID `#03`), grouped by finding. Rows clickable to open the
  in-app reader.
- **Tabs:** flat top-row tabs, active = black fill/white text; inactive = hollow
  with rule underline; no pill container; bottom border connecting tab bar to
  panel with 1px rule.
- **Filters:** black checkbox squares (2px border, filled black when selected,
  check glyph centered) + mono label; native `<select>` given
  `appearance: none`, `border-radius: 0`, black 1px border, the native
  caret replaced with a drawn `▾` glyph in the cell.
- **Buttons:** flat, 1px black border, transparent fill; hover = fill `#111` +
  white text; primary variant = fill black; disabled = 40% opacity + `not-allowed`.
  Corner radius `0`. Minimum height 34px for touch.
- **Inputs:** 1px black border, fill white, `border-radius: 0`, focus = 2px black
  outline, inset caret; placeholders in `--text-muted`; native focus styles
  removed for ours.
- **Dropdowns**: native `select` + custom `option` styling not required; the
  portal dropdown container: 1px black border, white, shadowless, list items
  28px, hover = black fill white text, selected item has `✓`.
- **Modals:** oversized black-strip: 2px black border; backdrop = `#000` at 45%
  opacity, no blur; header (caps label) + close ✕ at top-right (mono, 20px);
  content scrolls; footer aligned right with `Cancel` (bare) / `Apply` (black).
  Focus trap.
- **Empty states:** single-column centered iconless: hollow square in severity
  grey, headline h2 600, 1 sentence 400, CTA bare button. No illustration,
  no clouds, no confetti.
- **Loading states:** `Loading…` in mono caps plus a 10px-tall, 1px-bordered
  black progress bar that fills; no spinner, no shimmer skeleton. Concurrent
  jobs render as a stacked list of percent-complete bars.
- **Error states:** black-bordered panel, left 3px high-risk red accent, mono
  caps label `ERROR`, message 400, retry black button. Error coloring is
  required-safety — but display severity never uses error styling for
  risk-threshold violations (risk is a finding, not an error).

---

## 8. Risk Visualization Rules

Core law: **grayscale-adapted three-step register.** At 100% grayscale, risk
levels must still be distinguishable by shape, weight, and position.

| Level | Color | Typography | Marker shape | Label | Placement |
|-------|-------|-----------|--------------|-------|-----------|
| HIGH | `--high-risk` `#C4111B` | 700 mono, same size | Filled square ▪ | "HIGH" caps 11px 600, letter-spaced | Left 3px rule + score-tint; first row of every findings list |
| MEDIUM | `--medium-risk` `#B44900` | 600 mono | Half-filled ◨ | "MEDIUM" | After HIGH in severity clusters |
| LOW | `--low-risk` `#1B6E4C` | 500 mono, outline | Hollow square □ | "LOW" | Last; often the *absence* of emphasis does the work |
| UNKNOWN | `--text-muted` | 400 italic caps `UNKNOWN` | Dashed outline | — | Insurance row when doc missing section; never shows as red |

Encoding recap (redundant, so grayscale loses nothing):

```
Colour      +  Weight (800/600/500)      +  Shape (filled/half/hollow/dashed)   +  Label text     +  Position (top/any)
```

- Severity is always **leftmost** on a finding row; in score cells, the numeric
  digits are colored but the leading `72/100` denominator stays grey, so the eye
  separates the number from the grade.
- **No rainbow:** finding rows are otherwise all black/grey; only the strip,
  the marker, and the numeral hydrate. A sea of colored badges is a bug.
- Category score bars: tick fill counts differentiate beyond color
  (4/4 vs 2/4 fills).
- Danger of confusion — **error (system failure) ≠ risk (finding)**. System
  errors use error-layouts (§7) and never say "risk." Visual agreements:
  -   border rule + red bar = finding HIGH.
  -   solid red panel + "ERROR" = system.
- The red/amber/green trio is checked under deuteranopia/protanopia simulation;
  LOW green differs strongly from HIGH red in lightness (L*), and the marker
  shapes + label text carry the information regardless. Add `aria-label` on
  every severity-carrying node.

---

## 9. Dashboard Information Hierarchy

Priority order (the brief's order) → first viewport:

1. **Company** — top strip. Never more than 2 rows tall; renders as a slim
   strip.
2. **Deal Risk Score** — hero. First thing a user seeks. 22% of vertical space.
3. **Risk category breakdown** — directly beneath the score, 4-across.
4. **Key financial metrics** — band below categories.
5. **Critical findings** (red only) — first findings band, always onscreen if
   any HIGH exists. If none, the band is omitted entirely (no empty "breaking
   news" box).
6. **Detailed findings** — full list*.
7. **Evidence / citations** — attached under each finding inline, and
   consolidated in a bottom table.
8. **Supporting information** — document list, notes on methods, reader links —
   bottom or collapsible caps, never noisy.

Rules:
- The score zone is `display` scale. Anything after it is a ladder down.
- Findings #5 and #6 are not visually different skin-wise; they differ in span:
  critical findings band is *short* (3–6 rows) and is itself a panel with its
  own black border + `HIGH` heading fill.
- Dashboard never starts with a hero/banner/search field; it opens on the score.

---

## 10. Example Layout (ASCII wireframe)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ DEALROOM ◴ AURORA BIOSYSTEMS ACQUISITION                        EXPORT ▾  │
├──────────────────────────────────────────────────────────────────────────┤
│ AURORA BIOSYSTEMS   (DEAL ID 88-B · STAGE: PRE-SIGNING · CUR USD)        │
├──────────────────────────────────────────────────────────────────────────┤
│  COMPOSITE DEAL RISK SCORE                                              │
│                                                                          │
│   72 / 100         ████████     HIGH · ≥ 3 CRITICAL FINDINGS             │
│   HIGH             ██     ██    FINANCIAL 81 · LEGAL 74 · OPER. 63       │
│                     ██████     0───────────72──────────100               │
├──────────────────────────────┬───────────────────────────────────────────┤
│  RISK CATEGORIES              │  FINANCIAL METRICS                       │
│  ▪ FINANCIAL   81  ████       │  REVENUE      $12,400,000                │
│  ▪ LEGAL       74  ████       │  GROSS MARGIN 41.2%                      │
│  ▪ OPERATIONAL 63  ███        │  EBITDA       $1,920,000  2.84x          │
│  ▪ MARKET      48  ███        │  NET LOSS     -$340,000                  │
│                               │  CASH        $4,810,000                  │
├───────────────────────────────┴──────────────────────────────────────────┤
│  CRITICAL FINDINGS (3)                                                   │
│  ▪  HIGH   Guarantee clause (12.4) exposes parent 45% of bookings        │
│           citation [p.212 · s.12.4] · legal · AurorQA-198.docx           │
│  ▪  HIGH   Related-party rev 38% of FY25-1 top line, auditor conc..      │
├──────────────────────────────────────┬───────────────────────────────────┤
│  ALL FINDINGS (23)                    │  RISK SIGNALS                    │
│  ▪ HIGH   ...                        │  ▪ Customer concentration 61%     │
│  ▪ MEDIUM ...                        │  ▪ Auditor change 2025            │
│  ▪ LOW    ...                        │  ▪ Insurance gap 2.1x            │
├──────────────────────────────────────┴───────────────────────────────────┤
│  EVIDENCE / CITATIONS (source table)                                      │
│  #012 · p.212 · clause 12.4 · AURORA_MDA_2025_Q4.pdf    excerpt ▾         │
│  #018 · p. 41 · audited fields       · FY25_Audit_opinion.pdf  excerpt ▾  │
├──────────────────────────────────────────────────────────────────────────┤
│   METHODOLOGY · 23 sources · 1,204 pages · 41 signals · RUN 2026-08-08  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Anti-Patterns (Never in DealRoom)

**Must never appear:**

1. `border-radius` on any surface except 2px max on interactive primitives
   (buttons/inputs). No pill shapes anywhere, no "card iOS corners."
2. Gradients — backgrounds, buttons, charts, skeletons. Flat fills only.
3. Glassmorphism, backdrop-blur (modals excluded), translucent surfaces.
4. Drop shadows of *any* purpose: no `box-shadow` in defaults; hover effects
   swap fills, not elevation. No tooth glitter reflections.
5. AI-purple / indigo / gradient colorways entirely; the only non-neutral
   hue family in the product is the risk register (one red, one amber, one green).
6. Floating cards: panels must be inset/ruled, not visually levitating;
   connected hierarchy remains visible to the eye.
7. Large empty whitespace: no 120px paddings, no centered single column of
   copy, no unused margins so big only cover photo fits.
8. Decorative animation: no spin, pulse, parallax, ribbons, marquee. Only
   short progress fills on loading bars and hover transitions ≤150ms.
9. Icon libraries with 40 glyphs (chat bubble icons, rockets, smile faces).
   Square fills/hollows/mono arrows; maximum 6 icons per screen.
10. Fake dashboard statistics: decorative counters ("processing… 7 signals
    today") that could be static; every number must derive from an actual
    analyzed series.
11. Chatbot/bubble UI idioms completely: no right gray bubble rows, no
    "Talk to our analysts" hover bubble, no typing-skeleton.
12. Green = good everywhere (profit green for all positives). Green only
    shows when it's about *low risk*; wins are presented black.
13. Rounded table headers that clash with 1px-rule tables; hairline borders
    that collapse or vanish at different zoom levels.
14. Semantic carpet-bombing: the same risk painted as chip + card fill +
    colored subtitle at once. One color channel per cell, maximum.

---

## 12. Portfolio Standard

A genuine due-diligence tool and $12B AI-Gen dashboard are distinguishable in a
15-second scroll. This system signals "serious product," not "coursework":

- **Deliberately borrowed from the genre:** financial terminals (Bloomberg-like
  output layout), legal research (citation grammar), technical docs — not
  from "dark-mode AI template."
- **The score is the thesis.** Brutalist layout says: this number was computed
  from 1,204 cited pages, not typed as a widget stat.
- **Zero AI-cosmetic cues** — no aurora gradients (the name is earned, not
  applied). Copy is dry and sourcing-disciplined ("84 citations across 23
  documents"), never chatty or emoji-laced.
- **Evidence adjacency**: every finding row stands beside its citation →
  the UI demonstrates evidentiary discipline, which is the product itself.
- **Grayscale test** passes with flying colors: architecture works when
  printed, faxed, or glanced in devtools — a machine-certifiable detail.
- **Density shows domain comfort.** The layout does not pad, because the team
  knows DD work is dense; over-padding is the tell of a portfolio-cleaner.
- Portfolio judges likely compare DealRoom against 5–8 other AI projects all
  using gradient-glass-purple. This design is the deterministic opposite.

The result — an interface where the million-dollar numbers THEMSELVES are the
visual decoration — reads as *a professional tool someone is deploying*, which
is exactly the impression a portfolio piece should create.

---

## 13. Implementation Target (for Step 2 planning only)

Because the repo is empty, the proposal assumes the following foundation so that
all tokens remain implementable in one file:

- **Framework:** Vite + React + TypeScript (assumed per typical builds —
  confirm in Step 2).
- **Styling:** plain CSS with a single `tokens.css` custom-property sheet
  (names = sections above), plus `reset.css`. No Tailwind dependency would
  be proposed, but if preferred, `@theme` mapping the identical tokens is
  trivial. **No additional CSS framework.**
- Fonts via `@import` Google Fonts, preloaded critical variants.
- Responsive: CSS custom-properties-driven, container queries for panels.

This plan minimizes both the token surface and the visual workload in the
implementation step. No implementation decision is final until approval.

---

## Appendix — Design step 1 final report

1. **Existing styling system discovered:** NONE — the repository directory is
   empty (verified recursive, incl. hidden, count 0).
2. **Existing UI patterns to retain:** None (nothing exists).
3. **Existing UI patterns to remove:** None.
4. **Proposed design direction:** strict brutalism: black structural rules on
   off-white, Archivo + IBM Plex Mono, compact fractal spacing, one semantic
   red/amber/green layer, evidence-first layout, dense tables. See sections 1–12.
5. **Files inspected:** `C:\Users\ARYAN\Documents\DealRoom` — directory listing
   (recursive, hidden, depth 5): **0 files found**.
6. **DESIGN-SYSTEM-PROPOSAL.md created:** yes — this file.
7. **Uncertainties requiring approval:**
   - (a) Focus treatment: black 2px double-outline by default everywhere;
        approve one chromatic exception (e.g., contrast ring on black fills)
        or keep it all-black.
   - (b) Typefaces: approve Archivo + IBM Plex Mono as the final duo, or
        switch the UI face to IBM Plex Sans.
   - (c) Page background: approve off-white `#FAFAF8` (proposed) or switch
        to crisp `#FFFFFF`.
   - (d) Warning/success sharing the medium/low risk hexes (restraint) —
        approve, or grow the palette by 2 tokens for system-only colors.
   - (e) Display usage: confirm the deal title at 44px/800 inside the 1280
        layout, or drop to 34px for very long deal names.
   - (f) Confirm kebab-case CSS custom properties (`--surface`,
        `--high-risk`) as the Step 2 `tokens.css` naming convention.

---

## 14. Addendum — Design & Architecture Audit (Step 2 output)

Addressed to the follow-up brief. Preserves everything above; adds the
sections the follow-up requested explicitly. Decisions below are final for the
dashboard shell build (Step 3).

### 14.1 Radius rules (explicit)

| Element | Radius | Exception rule |
|---------|--------|----------------|
| All surfaces, panels, tables, tabs, chips, cards, modals, dropdowns | **0** | None. |
| Buttons, inputs, selects | **0** | None — flat, sharp, terminal-like. |
| Checkbox, severity markers, tick bars | 0 (square) | Square is a *feature*: filled square = HIGH, half = MEDIUM, hollow = LOW. |
| Focus ring | 0 | 2px black double-outline, `outline-offset: 2px`. |

`--radius: 0` is a single token so it can be audited in one place. The only
radius ever permitted on screen: **none**. If a future exception is needed
(accessibility research rarely demands one), it must be a named token
`--radius-interactive` and approved in review.

### 14.2 Data visualization rules

- **Bar meters:** square ticks or stepped segments only. 4-tick severity bar
  (filled count = severity). Composite score rendered as a horizontal stepped
  ruler with ticks at 0/25/50/75/100, a `72` needle marker in risk color,
  band labels (`LOW · MEDIUM · HIGH`). No donut charts, no smooth line charts.
- **Sparkline-free zone:** no decorative mini-charts. Trend arrows `▲▼` mono
  glyphs only, colored by risk semantics.
- **Axes/legends:** mono, 11–12px, `--text-muted`. Grid lines 1px `--border`.
- **Grayscale survival:** every chart encodes via shape + label in addition to
  color (tick counts, filled vs hollow, text labels always present).
- **One rule about numbers:** charts never show rounded marketing figures —
  same figures as the tables, same tabular mono typeface.

### 14.3 Finding row anatomy (card/table concept)

Each finding row is a flat bordered strip (1px `--border-strong`), height
auto, padding 12px, composed of fixed columns:

```
[SEV ▪]  [CATEGORY]  [TITLE 600]  [EXPLANATION 400]  [CONF]  [CITATION chip]
```

- Column order: severity marker (8px square + label), category (caps 11px),
  title (600/15), explanation (400/15, wraps), confidence (`data-sm` mono),
  citation chip (`[p.212 · s.12.4]` mono, underlined, clickable).
- Severity edges: 3px left rule in severity color on the row; no row fill
  beyond a 6% severity tint at HIGH only.
- Hover: `--surface-alt` fill; row expands nothing — evidence list lives
  beneath the explanation as a collapsed mono block revealed by a `▾ EVIDENCE`
  caret toggle (works, keyboard accessible).
- Finding density: 6–8 rows per screen at 1280. No pagination illusions —
  a scrollbar is honest.

### 14.4 Citation interaction concept

- Citation text is **mono, underlined, black** — `[p.212 · s.12.4]`. It is a
  *reference*, not a styled link pill.
- Click: opens the **source viewer modal** (§14.5) anchored at document +
  page + section; the target excerpt is scrolled to and boxed with a 2px black
  border + `SELECTED REFERENCE` mono tag; page thumbnails context is optional.
- Hover: underline thickens (2px), cursor = crosshair-on-pointer, title
  tooltip shows document filename + page + section (native `title` attr — no
  custom tooltip chrome).
- Citation chip shows count when a finding cites multiple anchors:
  `[1/3] ▸` toggles anchor list inline.
- Semantics: citations are **required** by the data contract (validation
  fails without ≥1 source anchor per finding).

### 14.5 Document viewer concept

Modal-driven reader, `86vw × 88vh`, 2px black frame, no shadow:

- **Left rail (280px):** document list (filename mono, page count, doc-type
  caps), active doc = black fill white text.
- **Main pane:** mono page header (`DOC · PAGE 212 · SECTION 12.4`), then the
  document excerpt region: white surface, 1px rules, page-break ticks. The
  referenced excerpt sits inside a 2px black box with `SELECTED REFERENCE`
  caps tag above it.
- **Footer bar:** `PREV PAGE ▾` `NEXT PAGE` buttons (bare style), `OPEN
  FULL DOC` (black primary), `CLOSE` (bare). Page indicator mono
  `212 / 240`.
- Focus trap, `Esc` closes, backdrop 45% black **no blur**.
- No rendering of full PDFs in this milestone — the viewer shows extracted
  text excerpts + page/section metadata from the contract; the structure
  supports real document frames later.

### 14.6 Responsive behavior (additions to §6)

- Breakpoints: `1280 / 800 / 480`.
- Findings table: ≥800px keeps fixed columns with horizontal scroll + sticky
  severity column; <800px columns collapse to stacked rows (title + meta
  line), never reordered by importance.
- Source viewer modal: <800px left rail collapses to a `<select>` (native,
  styled per §7 filters).
- Score ruler and 4-tick bars scale fluidly (ticks are flex items).
- **No hamburger icon; no floating action buttons; no bottom-sheet menus.**
  The tab bar remains the single navigation primitive at all sizes.

### 14.7 Proposed reusable design tokens (final — implemented as CSS variables in `src/styles/tokens.css`)

```css
:root {
  /* surfaces */
  --bg: #FAFAF8; --surface: #FFFFFF; --surface-alt: #F0EEEA;
  /* text */
  --text-primary: #111111; --text-secondary: #454545; --text-muted: #8A8A85;
  /* borders */
  --border: #D6D6D3; --border-strong: #111110;
  /* risk register */
  --high-risk: #C4111B; --medium-risk: #B44900; --low-risk: #1B6E4C;
  --unknown: #8A8A85;
  /* warning/success reuse risk hues deliberately (restraint) */
  --warning: #B44900; --success: #1B6E4C;
  /* chrome */
  --accent-black: #111110; --focus-outline: #111110; --link: #111110;
  /* typography */
  --font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  /* scale */
  --t-display: 44px; --t-h1: 30px; --t-h2: 20px; --t-body: 15px;
  --t-label: 12px; --t-caption: 11px; --t-data: 15px; --t-data-lg: 24px; --t-data-sm: 12px;
  /* spacing */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px;
  /* borders */
  --b-rule: 1px solid var(--border);
  --b-structure: 1px solid var(--border-strong);
  --b-section: 2px solid var(--border-strong);
  --b-focus: 2px solid var(--focus-outline);
  --radius: 0;
  /* layout */
  --max-w: 1280px; --gutter: 24px;
}
```

### 14.8 Current UI problems (audit of the repo at this milestone)

At the time of this audit the repository contains **no application code**
(only this proposal). Therefore:

- There are **no existing UI patterns to replace**; the dashboard shell is
  greenfield and will implement the tokens above from day one.
- The only "problems" are forward-looking obligations the shell must honor to
  avoid drifting back into generic AI-SaaS styling: no default border-radius
  anywhere, no box-shadows, no gradients, no purple, mono for all numbers,
  black rules as the only hierarchy device.

### 14.9 Implementation notes (Step 3, dashboard shell)

- Stack: Vite + React + TypeScript, plain CSS custom properties, no CSS
  framework, no icon library (CSS-drawn markers), no animation beyond
  ≤150ms hover transitions and progress fills.
- Fonts: Google Fonts `Archivo` (400/500/600/700/800) + `IBM Plex Mono`
  (400/500/600), preloaded.
- The dashboard consumes the canonical contract types (`src/contract/`) and a
  mock fixture file (fictional company) — no backend, no AI calls.
- Components: header bar, risk banner, score ruler, category grid, financial
  table, findings table, citation chips, source viewer modal, risk summary
  panel, tabs, severity filter. All visible controls functional; no dead
  buttons.
- Tests: contract validation (vitest + zod) + typecheck + production build.

END OF ADDENDUM. Still no implementation in this document.