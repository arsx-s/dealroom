/**
 * Seed corpus content model — the single authored source for the deal-room
 * document vault. Everything the report cites (excerpts, statements, clauses,
 * financial figures) is asserted verbatim against this content by the
 * dataset conformance tests.
 *
 * All text is ASCII-safe except intentional typographic apostrophes (U+2019)
 * which appear in the app data and must match exactly.
 *
 * Section model:
 *   { name, start, end, lines } — a contiguous page window; `lines` is either
 *   a static array of block strings or a function (page) => block strings.
 */

const TYPO = {
  company: 'Aurora Biosystems Inc.',
  fiscal: 'Fiscal Year 2025',
  currency: 'USD',
}

/* ------------------------------------------------------------------ */
/* Section helpers                                                     */
/* ------------------------------------------------------------------ */

/** Section whose pages all render the same block lines (or a single
 *  multi-line string, which is split per newline). */
function sec(name, start, end, lines) {
  const arr = Array.isArray(lines) ? lines : String(lines).split('\n')
  return { name, start, end, lines: () => arr }
}

const SECTIONS = {}

/* ================================================================== */
/* doc-annual-fy25 — Aurora_Biosystems_2025_Annual_Report.pdf (64)    */
/* ================================================================== */

SECTIONS['doc-annual-fy25'] = [
  {
    name: 'Cover',
    start: 1,
    end: 1,
    lines: [
      [`${TYPO.company}`, `ANNUAL REPORT — ${TYPO.fiscal}`, 'Filed with the Board of Directors. This document is part of the deal-room source set and may not be distributed.'].join('\n'),
    ],
  },
  sec('Letter to Shareholders', 2, 5, [
    `Dear shareholders: fiscal ${TYPO.fiscal} delivered $12,400,000 in revenue, a 34% increase over the prior year.`,
    'The pipeline advanced: two programs entered Phase II and a third cleared the IND gate ahead of schedule.',
    'Revenue of $4.7M was attributable to Astral Therapeutics, an entity controlled by the chief executive officer. Terms were not arm’s length.',
    'Cash of $4,810,000 at year end funds operations into the fourth quarter of fiscal 2026.',
    'We remain focused on clinical execution, disciplined capital allocation, and the rare-disease patient community.',
  ]),
  sec('Management Discussion and Analysis', 6, 12, [
    'Total bookings reached $13,100,000 in fiscal 2025, of which Meridian Health Group accounted for 61%.',
    'Operating costs of $10,480,000 comprise cost of goods sold of $3,940,000, research and development of $4,250,000, and selling, general and administrative of $2,290,000.',
    'EBITDA of $1,920,000 represents a 15.5% margin, against a sector median of 18% for comparable rare-disease developers.',
    'Deferred revenue decreased from $8.2M to $3.2M year over year, driven by the early recognition of two multi-year service contracts.',
    'We assess liquidity, clinical milestones, and reimbursement risk as the principal drivers of shareholder value.',
    'Net income for the year was ($340,000).',
    'The Company’s share of the segment declined from 11% to 9% over two consecutive years.',
  ]),
  sec('Corporate Governance', 13, 17, [
    'The board held six meetings during the fiscal year; the audit committee held four.',
    'The chief executive officer serves as chair. Three of five directors are independent.',
    'Executive compensation is reviewed annually against peer-group benchmarks.',
  ]),
  sec('Risk Factors', 18, 21, [
    'We face risks inherent to the development of novel therapies for rare diseases.',
    'Reimbursement, competitive entry, and reliance on key personnel are described elsewhere in this report.',
    'Clinical trial outcomes are uncertain; there is no assurance of regulatory approval.',
  ]),
  sec('Independent Auditor’s Report', 22, 25, [
    'The independent auditor’s report on the fiscal 2025 financial statements follows the statement suite.',
    'The audit was conducted in accordance with generally accepted auditing standards.',
    'Material items: milestone revenue, related-party transactions, and clinical trial accruals.',
    'No material misstatements were identified during the audit.',
  ]),
  {
    name: 'Statement of Operations',
    start: 26,
    end: 29,
    lines: (page) => {
      if (page === 26) {
        return [
          'STATEMENT OF OPERATIONS — FISCAL 2025',
          'Revenue: $12,400,000',
          'Operating costs: $10,480,000',
          'EBITDA: $1,920,000',
          'Net income: ($340,000)',
          'Revenue grew 34% year over year, driven by milestone deliveries on two commercial-adjacent service contracts.',
        ]
      }
      if (page === 28) {
        return [
          'STATEMENT OF OPERATIONS — OPERATING COSTS',
          'Operating costs: $10,480,000',
          'Cost of goods sold: $3,940,000',
          'Research and development: $4,250,000',
          'Selling, general and administrative: $2,290,000',
          'The cost structure is consistent with prior-year disclosures, adjusted for the headcount expansion in clinical operations.',
        ]
      }
      return ['STATEMENT OF OPERATIONS — (continued)', 'Notes to the statement of operations are set out in the notes to the financial statements.']
    },
  },
  sec('Statement of Cash Flows', 30, 32, [
    'Cash provided by operating activities was $310,000.',
    'Capital expenditures of $640,000 were funded from operating cash flow.',
    'The Company maintains a $4,810,000 cash balance at year end.',
  ]),
  {
    name: 'Balance Sheet',
    start: 33,
    end: 36,
    lines: (page) => {
      if (page === 33) {
        return [
          'BALANCE SHEET — FISCAL YEAR END',
          'Cash: $4,810,000',
          'Debt (senior secured facility): $5,450,000',
          'Deferred revenue: $3,200,000',
'Deferred revenue decreased from $8.2M to $3.2M year over year. The decline was driven by the early recognition of two multi-year service contracts.',
        ]
      }
      return ['BALANCE SHEET — (continued)', 'See notes to the financial statements for significant accounting policies.']
    },
  },
  sec('Notes to Financial Statements', 37, 40, [
    'Significant accounting policies: revenue recognition, deferred revenue, and stock-based compensation.',
    'Segment reporting is consistent with internal management reporting.',
  ]),
  {
    name: 'Customer Concentrations',
    start: 41,
    end: 44,
    lines: (page) => {
      if (page === 41) {
        return [
          'CUSTOMER CONCENTRATIONS',
          'Meridian Health Group accounted for 61% of total bookings in fiscal 2025. No other customer exceeded 8%.',
          'Concentration risk is reviewed quarterly by the board.',
        ]
      }
      return ['CUSTOMER CONCENTRATIONS — (continued)', 'Bookings by customer are presented in the supplemental schedule to this section.']
    },
  },
  sec('Segment Reporting', 45, 52, [
    'The Company operates as a single reporting segment: rare-disease therapeutics.',
    'Segment assets and liabilities are managed centrally.',
  ]),
  sec('Risk Factors (continued)', 53, 60, [
    'A loss of key personnel, particularly the chief scientific officer, would materially impair the development pipeline.',
    'Competitor filings in the same indication may reduce the addressable market window.',
  ]),
  sec('Exhibits', 61, 64, [
    'Exhibit index: constitutive documents, audit reports, loan documents, and material contracts.',
    'Exhibits are available to the board upon request.',
  ]),
]

/* ================================================================== */
/* doc-audit-fy24 — Aurora_Biosystems_FY24_Audited_Financials.pdf (41) */
/* ================================================================== */

SECTIONS['doc-audit-fy24'] = [
  sec('Cover', 1, 1, [
    'AURORA BIOSYSTEMS INC.',
    'AUDITED FINANCIAL STATEMENTS — FISCAL 2024',
    'Prepared by Grantwood LLP.',
  ].join('\n')),
  sec('Independent Auditor’s Report', 2, 4, [
    'We have audited the accompanying financial statements of Aurora Biosystems Inc. as of and for the year ended December 31, 2024.',
    'An audit involves performing procedures to obtain audit evidence about the amounts and disclosures in the financial statements.',
    'In our opinion, the financial statements present fairly, in all material respects, the financial position of the Company.',
  ]),
  sec('Statement of Financial Position', 5, 5, ['Total assets: $24,600,000', 'Total liabilities: $11,900,000', 'Stockholders’ equity: $12,700,000']),
  sec('Statement of Operations', 6, 6, ['Revenue: $9,200,000', 'Net income: $410,000']),
  sec('Statement of Cash Flows', 7, 7, ['Cash provided by operations: $1,140,000', 'Net change in cash: $740,000']),
  sec('Statement of Stockholders’ Equity', 8, 8, ['Issuance of Series B preferred: 2,000,000 shares at $1.50 per share']),
  {
    name: 'EBITDA Reconciliation',
    start: 9,
    end: 9,
    lines: () => [
      'EBITDA RECONCILIATION',
      'Net income: $410,000',
      'Add back: interest expense $310,000; taxes $120,000; depreciation and amortization $1,080,000',
      'EBITDA: $1,920,000',
      'EBITDA margin (EBITDA / revenue of $12,400,000): 15.5%',
      'The reconciliation follows the definitions used in the credit agreement.',
    ],
  },
  sec('Notes to Financial Statements', 10, 13, [
    'Note 1 — Organization and significant accounting policies.',
    'Note 2 — Revenue recognition policies are described under the revenue recognition section.',
  ]),
  {
    name: 'Related Party Transactions',
    start: 14,
    end: 17,
    lines: (page) => {
      if (page === 14) {
        return [
          'RELATED PARTY TRANSACTIONS',
          'Revenue of $4.7M was attributable to Astral Therapeutics, an entity controlled by the chief executive officer. Terms were not arm’s length.',
          'The audit identified the relationship as a related-party transaction under applicable accounting standards.',
        ]
      }
      return ['RELATED PARTY TRANSACTIONS — (continued)', 'Audit note: transactions not arm’s length; see note 14 for the quantified impact.']
    },
  },
  {
    name: 'Revenue Recognition',
    start: 18,
    end: 21,
    lines: (page) => {
      if (page === 18) {
        return [
          'REVENUE RECOGNITION',
          'Milestone revenue of $1.1M was recognized upon FDA filing rather than upon customer acceptance of the milestone deliverable.',
          'The policy accelerates recognition ahead of the contractual acceptance event.',
        ]
      }
      return ['REVENUE RECOGNITION — (continued)', 'Milestone recognition is evaluated against the five-step revenue recognition model.']
    },
  },
  sec('Notes 5-12', 22, 30, [
    'Note 5 — Cash and cash equivalents.',
    'Note 6 — Property and equipment.',
    'Note 7 — Commitments and contingencies.',
    'Note 8 — Income taxes.',
  ]),
  sec('Segment Information', 31, 36, [
    'The Company reports a single operating segment.',
    'Segment disclosures reflect internal management reporting.',
  ]),
  sec('Supplementary Schedules', 37, 41, [
    'Schedule I — Condensed financial information of the parent.',
    'Schedule II — Valuation and qualifying accounts.',
  ]),
]

/* ================================================================== */
/* doc-audit-opinion — Grantwood_Audit_Opinion_FY24.pdf (12)          */
/* ================================================================== */

SECTIONS['doc-audit-opinion'] = [
  sec('Cover', 1, 1, [
    'GRANTWOOD LLP',
    'INDEPENDENT AUDITOR’S OPINION — FISCAL 2024',
    'Boston, Massachusetts',
  ].join('\n')),
  sec('Opinion Summary', 2, 2, ['We conducted the audit of Aurora Biosystems Inc. for the fiscal year ended December 31, 2024.']),
  {
    name: 'Change of Auditor',
    start: 3,
    end: 3,
    lines: () => [
      'CHANGE OF AUDITOR',
      'The audit for fiscal 2024 was conducted by Grantwood LLP, which replaced the prior firm. The prior firm declined to comment on the change.',
      'The change was disclosed to the audit committee in accordance with applicable requirements.',
    ],
  },
  sec('Opinion Details', 4, 6, [
    'Basis for opinion: we conducted the audit in accordance with generally accepted auditing standards.',
    'Key audit matters: revenue recognition, related-party transactions, and clinical-trial accruals.',
  ]),
  sec('Materiality', 7, 9, [
    'Performance materiality was set at 5% of income before tax.',
    'Materiality was applied in the evaluation of identified misstatements.',
  ]),
  sec('Closing', 10, 11, [
    'We communicated significant findings to the audit committee in accordance with auditing standards.',
    'This report is intended solely for the information and use of the board and management.',
  ]),
  sec('Signature Page', 12, 12, ['GRANTWOOD LLP', 'John E. Marsh, Partner']),
]

/* ================================================================== */
/* doc-loan — Senior_Secured_Loan_Agreement_Amended.pdf (88)          */
/* ================================================================== */

SECTIONS['doc-loan'] = [
  sec('Cover', 1, 1, [
    'SENIOR SECURED LOAN AGREEMENT',
    'Borrower: Aurora Biosystems Inc.',
    'Lender: Meridian Capital Partners',
    'Amended and restated as of March 1, 2023.',
  ].join('\n')),
  sec('Parties and Recitals', 2, 3, [
    'This Agreement is entered into by Aurora Biosystems Inc. as Borrower and Meridian Capital Partners as Lender.',
    'The Borrower has requested, and the Lender has agreed to make available, a senior secured facility of up to $30,000,000.',
  ]),
  {
    name: 'Definitions',
    start: 4,
    end: 4,
    lines: () => [
      'DEFINITIONS',
      '“Debt” means the aggregate outstanding principal amount of the facility: $5,450,000.',
      '“EBITDA” means earnings before interest, taxes, depreciation and amortization, as reconciled in the audited financial statements: $1,920,000.',
      '“Debt / EBITDA” means the ratio of Debt to EBITDA: 2.84x.',
    ],
  },
  {
    name: 'Financial Covenants',
    start: 4,
    end: 7,
    lines: (page) => {
      if (page === 4) {
        return [
          'FINANCIAL COVENANTS',
          'The Borrower shall maintain a Debt / EBITDA ratio not exceeding 3.50x, measured quarterly on the trailing four quarters. Current: 2.84x.',
        ]
      }
      return [
        'FINANCIAL COVENANTS — (continued)',
        'The Borrower shall maintain minimum cash of $2,000,000 at all times. Current: $4,810,000.',
        'The Borrower shall maintain minimum trailing twelve-month revenue of $8,000,000.',
      ]
    },
  },
  sec('Loan Terms', 8, 9, [
    'The facility bears interest at SOFR plus 6.50%, payable quarterly.',
    'Maturity date: March 1, 2028.',
  ]),
  sec('Interest and Fees', 10, 11, [
    'An unused commitment fee of 0.50% per annum applies to undrawn commitments.',
    'Prepayment premium: 2% in year one, declining to 1% thereafter.',
  ]),
  {
    name: 'Guarantees',
    start: 12,
    end: 13,
    lines: (page) => {
      if (page === 12) {
        return [
          'GUARANTEES',
          'The Parent shall guarantee forty-five percent (45%) of the Company’s aggregate bookings outstanding at any time.',
          'The guarantee is unconditional and continuing until the facility is repaid in full.',
        ]
      }
      return ['GUARANTEES — (continued)', 'Guarantee schedules are set out in Exhibit B.']
    },
  },
  sec('Representations', 14, 19, [
    'The Borrower represents that the financial statements delivered to the Lender are true and complete.',
    'No event of default has occurred and is continuing.',
  ]),
  sec('Affirmative and Negative Covenants', 20, 26, [
    'The Borrower shall maintain insurance, books and records, and comply with laws.',
    'The Borrower shall not incur additional indebtedness above $1,000,000 without consent.',
  ]),
  {
    name: 'Liability Cap',
    start: 27,
    end: 28,
    lines: (page) => {
      if (page === 27) {
        return [
          'LIABILITY CAP',
          'Lender liability under this Agreement is capped at $5.0M. Claims arising from breach of warranty are expressly excluded from the cap.',
        ]
      }
      return ['LIABILITY CAP — (continued)', 'The cap does not apply to fraud, gross negligence, or willful misconduct.']
    },
  },
  sec('Events of Default', 29, 32, [
    'An event of default includes failure to pay, breach of covenant, and change of control.',
    'Upon an event of default, the Lender may accelerate the facility.',
  ]),
  {
    name: 'Repayment',
    start: 33,
    end: 36,
    lines: (page) => {
      if (page === 33) {
        return [
          'REPAYMENT',
          'The principal balance is repayable in quarterly installments; upon a change of control, the entire outstanding balance becomes due immediately.',
          'The Borrower may prepay the facility in whole or in part at any time without penalty after year three.',
        ]
      }
      return ['REPAYMENT — (continued)', 'Installment schedule: 24 equal quarterly installments beginning June 1, 2025.']
    },
  },
  sec('Miscellaneous', 37, 45, [
    'Governing law: State of New York.',
    'Notices, waivers, and amendments must be in writing.',
  ]),
  sec('Assignments and Amendments', 46, 52, [
    'Neither party may assign its rights without the prior written consent of the other.',
    'Amendments require the written agreement of both parties.',
  ]),
  sec('Exhibits', 53, 60, [
    'Exhibit A — Form of borrowing notice.',
    'Exhibit B — Guarantee schedule.',
    'Exhibit C — Insurance requirements.',
  ]),
  sec('Schedules', 61, 70, [
    'Schedule 1 — Existing indebtedness.',
    'Schedule 2 — Litigation disclosure.',
    'Schedule 3 — Permitted liens.',
  ]),
  sec('Certificate Forms', 71, 80, [
    'Form of compliance certificate.',
    'Form of assignment and assumption.',
  ]),
  sec('Signature Pages', 81, 88, [
    'IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.',
    'Aurora Biosystems Inc. — By: Emily Tran, Chief Executive Officer',
    'Meridian Capital Partners — By: Daniel Okafor, Managing Director',
  ]),
]

/* ================================================================== */
/* doc-shareholder — Amended_Shareholder_Agreement.pdf (52)           */
/* ================================================================== */

SECTIONS['doc-shareholder'] = [
  sec('Cover', 1, 1, [
    'AMENDED AND RESTATED SHAREHOLDER AGREEMENT',
    'Aurora Biosystems Inc.',
    'As amended and restated effective June 15, 2021.',
  ].join('\n')),
  sec('Recitals', 2, 3, [
    'The Company has entered into this Agreement to set out the rights and obligations of its shareholders.',
    'This Agreement supersedes the prior shareholder agreement in its entirety.',
  ]),
  sec('Definitions', 4, 5, [
    '“Change of Control” means any transaction after which no single party holds voting control of the Company.',
    '“Preferred Shareholders” means holders of Series A, Series B and Series C preferred stock.',
  ]),
  sec('Voting', 6, 7, [
    'Preferred shareholders vote as a single class on all matters requiring shareholder approval.',
    'A two-thirds vote is required to amend this Agreement.',
  ]),
  {
    name: 'Change of Control',
    start: 8,
    end: 10,
    lines: (page) => {
      if (page === 8) {
        return [
          'CHANGE OF CONTROL',
          'A change of control triggers an immediate repurchase right for all preferred shareholders. The repurchase price is the greater of cost or fair value.',
          'The repurchase right extends to all debt instruments that accelerate upon change of control, in accordance with the senior loan agreement.',
        ]
      }
      return ['CHANGE OF CONTROL — (continued)', 'The Company shall notify shareholders within five business days of a change of control.']
    },
  },
  sec('Board of Directors', 11, 13, [
    'The board shall be composed of five directors: three designated by the holders of common stock and two by the preferred shareholders.',
    'Board approval is required for related-party transactions exceeding $500,000.',
  ]),
  sec('Transfer Restrictions', 14, 16, [
    'No shareholder may transfer shares except in compliance with the right of first refusal set out below.',
    'Permitted transfers to affiliates are exempt from these restrictions.',
  ]),
  sec('Registration Rights', 17, 20, [
    'The Company shall register eligible shares upon the written request of holders of at least 30% of the registrable shares.',
    'The Company may delay registration under limited circumstances.',
  ]),
  {
    name: 'Non-Compete',
    start: 21,
    end: 24,
    lines: (page) => {
      if (page === 21) {
        return [
          'NON-COMPETE',
          'The founder’s non-compete runs for twelve (12) months from the closing date of any acquisition. The restriction applies to directly competitive rare-disease therapeutics development.',
          'Following an acquisition, the non-compete is confirmed by the acquiring entity in writing before closing.',
        ]
      }
      return ['NON-COMPETE — (continued)', 'The non-compete survives termination of employment following an acquisition.']
    },
  },
  sec('Right of First Refusal', 25, 28, [
    'Before transferring shares, a shareholder must offer them to the Company and existing shareholders.',
    'The ROFR price shall be the greater of cost or fair value.',
  ]),
  sec('Drag-Along', 29, 33, [
    'Holders of at least 75% of the outstanding preferred stock may compel all shareholders to sell in an approved acquisition.',
    'Drag-along sales shall be on the same price and terms as the lead seller.',
  ]),
  sec('Repurchase Rights', 34, 38, [
    'The Company may repurchase unvested shares at cost upon termination of a founder.',
    'Repurchase rights lapse upon a change of control.',
  ]),
  sec('Information Rights', 39, 42, [
    'Preferred shareholders shall receive annual audited financial statements and quarterly unaudited statements.',
    'Confidentiality obligations apply to all information provided.',
  ]),
  sec('Amendment', 43, 47, [
    'This Agreement may be amended by the written consent of holders of two-thirds of the preferred stock.',
    'Amendments adversely affecting a class require the consent of that class.',
  ]),
  sec('Annexes', 48, 52, [
    'Annex A — Schedule of shareholders.',
    'Annex B — Form of repurchase notice.',
  ]),
]

/* ================================================================== */
/* doc-insurance — Key_Person_Insurance_Policy_2026.pdf (18)          */
/* ================================================================== */

SECTIONS['doc-insurance'] = [
  sec('Cover', 1, 1, [
    'KEY PERSON AND CLINICAL TRIAL LIABILITY INSURANCE',
    'Policy No. KPL-2026-1188',
    'Insured: Aurora Biosystems Inc.',
    'Term: January 1, 2026 — January 1, 2027.',
  ].join('\n')),
  sec('Declarations', 2, 2, ['Policy period: 12 months.', 'Insured location: Boston, Massachusetts.']),
  sec('Insuring Agreements', 3, 5, [
    'The insurer agrees to pay loss arising from the death or disability of an insured key person.',
    'Coverage applies to key person and clinical trial liability as described in this policy.',
  ]),
  {
    name: 'Key Person Schedule',
    start: 6,
    end: 8,
    lines: (page) => {
      if (page === 6) {
        return [
          'KEY PERSON SCHEDULE',
          'The insured key person is the chief scientific officer, responsible for three of the four active development programs.',
          'The key person is the named scientist on the three programs covered by this schedule.',
        ]
      }
      return ['KEY PERSON SCHEDULE — (continued)', 'Successor coverage may be added by endorsement during the policy term.']
    },
  },
  {
    name: 'Policy Limits',
    start: 9,
    end: 10,
    lines: (page) => {
      if (page === 9) {
        return [
          'POLICY LIMITS',
          'Clinical trial liability is sub-limited to $2.0M per trial and $5.0M in the aggregate.',
          'Key person coverage is subject to a $10.0M aggregate limit.',
        ]
      }
      return ['POLICY LIMITS — (continued)', 'No single trial limit shall be increased without underwriter approval.']
    },
  },
  sec('Exclusions', 11, 13, [
    'This policy excludes loss arising from war, nuclear incident, or intentional misconduct.',
    'Liability arising from products sold after the policy term is excluded.',
  ]),
  sec('Definitions', 14, 16, [
    '“Key Person” means an individual designated in the key person schedule.',
    '“Clinical Trial” means a human clinical trial sponsored by the insured.',
  ]),
  sec('Endorsements', 17, 18, [
    'Endorsement 1 — Additional insured endorsement for contract research organizations.',
    'Endorsement 2 — Cross-liability endorsement.',
  ]),
]

/* ================================================================== */
/* doc-market — Biotech_Sector_Market_Report_2026.pdf (38)            */
/* ================================================================== */

SECTIONS['doc-market'] = [
  sec('Cover', 1, 1, [
    'BIOTECH SECTOR MARKET REPORT',
    'Rare-Disease Therapeutics — 2026',
    'Prepared by Sterling Research Partners.',
  ].join('\n')),
  sec('Executive Summary', 2, 3, [
    'The rare-disease therapeutics market is projected to reach $180B by 2030.',
    'Reimbursement and pricing dynamics are the principal swing factors in the forecast window.',
  ]),
  {
    name: 'Transaction Benchmark',
    start: 4,
    end: 5,
    lines: (page) => {
      if (page === 5) {
        return [
          'TRANSACTION BENCHMARK',
          'Comparable transactions imply an enterprise value of $48,000,000, or 25.00x trailing EBITDA, for Aurora Biosystems Inc.',
          'The benchmark set excludes development-stage companies without Phase II data.',
          'Risk-free rate used in the analysis: 5.00%.',
        ]
      }
      return ['TRANSACTION BENCHMARK — (continued)', 'Selection criteria: disclosed value, same indication class, 2023-2026 close dates.']
    },
  },
  sec('Segment Sizing', 6, 8, [
    'The rare-disease segment is fragmented across more than 400 developers.',
    'Top ten developers account for 38% of segment revenue.',
  ]),
  sec('Pipeline Dynamics', 9, 11, [
    'Phase II-to-III transition success rates average 31% in the segment.',
    'Competitive pipelines concentrate in the same three indications as Aurora Biosystems.',
  ]),
  sec('Indication Forecasts', 12, 13, [
    'Indication A forecast: $4.2B by 2030.',
    'Indication B forecast: $2.8B by 2030.',
  ]),
  {
    name: 'Reimbursement Outlook',
    start: 14,
    end: 16,
    lines: (page) => {
      if (page === 14) {
        return [
          'REIMBURSEMENT OUTLOOK',
          'The proposed 2027 reimbursement framework removes coverage affecting an estimated 24% of the addressable market.',
          'The removed coverage applies to the class of therapies in which the Company competes.',
        ]
      }
      return ['REIMBURSEMENT OUTLOOK — (continued)', 'Framework details are expected to be finalized in the first quarter of 2027.']
    },
  },
  sec('Regulatory Calendar', 17, 18, [
    'Two advisory committee meetings are scheduled for the indication class in 2026.',
    'No label changes are expected for existing approved therapies in the class.',
  ]),
  {
    name: 'Competitive Landscape',
    start: 19,
    end: 21,
    lines: (page) => {
      if (page === 19) {
        return [
          'COMPETITIVE LANDSCAPE',
          'Two late-stage competitors filed NDAs in the same quarter, both targeting the same indication. Competitor A reports a 22% improvement on the primary endpoint; Competitor B, 18%.',
          'Both NDAs are under priority review.',
        ]
      }
      return ['COMPETITIVE LANDSCAPE — (continued)', 'Competitor A reports a 22% improvement in the primary endpoint; Competitor B, 18%.']
    },
  },
  {
    name: 'Market Share',
    start: 22,
    end: 23,
    lines: (page) => {
      if (page === 22) {
        return [
          'MARKET SHARE',
          'The Company’s share of the segment declined from 11% to 9% over two consecutive years.',
          'Share losses tracked the entry of two new competitors.',
        ]
      }
      return ['MARKET SHARE — (continued)', 'Segment share is measured on trailing twelve-month bookings.']
    },
  },
  sec('Regional Mix', 24, 25, [
    'North America represents 68% of segment revenue; Europe, 24%.',
    'Asia-Pacific reimbursement remains nascent.',
  ]),
  {
    name: 'Pricing',
    start: 26,
    end: 28,
    lines: (page) => {
      if (page === 26) {
        return [
          'PRICING',
          'Net pricing across pipeline indications eroded approximately 3% per annum during the forecast period.',
          'Gross-to-net discounts widened on new coverage restrictions.',
        ]
      }
      return ['PRICING — (continued)', 'Pricing sensitivity: each 1% of price erosion reduces segment value by approximately 0.7%.']
    },
  },
  sec('Distribution Channels', 29, 31, [
    'Specialty pharmacy channels carry 71% of segment volume.',
    'Channel consolidation continues at the payer level.',
  ]),
  sec('Peer Group', 32, 34, [
    'Peer group: 14 development-stage rare-disease companies.',
    'Median peer enterprise value multiple: 18.0x trailing EBITDA.',
  ]),
  sec('Appendix', 35, 38, [
    'Appendix A — Transaction benchmark detail.',
    'Appendix B — Reimbursement framework timeline.',
    'Appendix C — Pricing methodology.',
  ]),
]

/* ================================================================== */
/* Document registry                                                  */
/* ================================================================== */

export const DOCS = [
  { id: 'doc-annual-fy25', filename: 'Aurora_Biosystems_2025_Annual_Report.pdf', type: 'annual-report', pagesTotal: 64 },
  { id: 'doc-audit-fy24', filename: 'Aurora_Biosystems_FY24_Audited_Financials.pdf', type: 'financial-statement', pagesTotal: 41 },
  { id: 'doc-audit-opinion', filename: 'Grantwood_Audit_Opinion_FY24.pdf', type: 'audit-opinion', pagesTotal: 12 },
  { id: 'doc-loan', filename: 'Senior_Secured_Loan_Agreement_Amended.pdf', type: 'loan-agreement', pagesTotal: 88 },
  { id: 'doc-shareholder', filename: 'Amended_Shareholder_Agreement.pdf', type: 'governance-document', pagesTotal: 52 },
  { id: 'doc-insurance', filename: 'Key_Person_Insurance_Policy_2026.pdf', type: 'contract', pagesTotal: 18 },
  { id: 'doc-market', filename: 'Biotech_Sector_Market_Report_2026.pdf', type: 'market-report', pagesTotal: 38 },
]

export function sectionsFor(docId) {
  return SECTIONS[docId] ?? []
}

/** Deterministic role inference for a block line. */
function inferRole(text, page, sectionNames) {
  const t = text.trim()
  if (page === 1 && t.length < 48) return 'title'
  for (const name of sectionNames) {
    if (t.toUpperCase().startsWith(name.toUpperCase())) return 'section'
  }
  if (/^[A-Z][A-Z0-9 .'$“”–-]*:\s/.test(t)) return 'statement'
  return 'body'
}

/** Build the full page model: { pages, sections } for one document.
 *  A page may belong to several sections (sections may overlap on a page
 *  boundary, e.g. Definitions ending where Financial Covenants begin); the
 *  blocks of every covering section are concatenated in section order. */
export function buildPageModel(doc) {
  const sections = sectionsFor(doc.id)
  const byPage = new Map()
  const registry = []
  for (const s of sections) {
    if (s.start < 1 || s.end > doc.pagesTotal) {
      throw new Error('section ' + s.name + ' (' + doc.id + ') out of range: ' + s.start + '..' + s.end + ' vs pagesTotal ' + doc.pagesTotal)
    }
    for (let p = s.start; p <= s.end; p++) {
      const raw = typeof s.lines === 'function' ? s.lines(p) : s.lines
      const texts = raw.map((t) => String(t).trim()).filter(Boolean)
      if (texts.length === 0) {
        throw new Error('section ' + s.name + ' (' + doc.id + ') page ' + p + ' has no blocks')
      }
      const entry = byPage.get(p) ?? { page: p, sections: new Set(), blocks: [] }
      entry.sections.add(s.name)
      entry.blocks.push(...texts)
      byPage.set(p, entry)
    }
    registry.push({ name: s.name, start: s.start, end: s.end })
  }
  const pages = []
  for (let p = 1; p <= doc.pagesTotal; p++) {
    const entry = byPage.get(p)
    if (!entry) throw new Error('doc ' + doc.id + ': page ' + p + ' is not covered by any section')
    const names = [...entry.sections]
    pages.push({
      page: p,
      sections: names,
      blocks: entry.blocks.map((text) => ({ role: inferRole(text, p, names), text })),
    })
  }
  return { pages, sections: registry }
}
