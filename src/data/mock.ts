import type { DealIntelligenceReport, Document, Money } from '../contract'
import {
  buildCategoryScore,
  compositeScoreFromCategories,
  riskLevelFromScore,
} from '../contract'

/**
 * Mock Deal Intelligence Report fixture.
 *
 * FICTIONAL DATA â€” company, documents, and figures are invented for
 * development/design purposes. No real company, document, or financial
 * figure is referenced. The fixture exercises the canonical contract
 * end-to-end: category scores are DERIVED from findings by the contract
 * scoring engine (never hardcoded), and the composite score is computed
 * from category scores the same way the real engine will.
 */

const money = (amount: number): Money => ({ amount, currency: 'USD' })

const pageList = (n: number) => Array.from({ length: n }, (_, i) => ({ number: i + 1 }))

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

const docs = (): Document[] => [
  {
    id: 'doc-annual-fy25',
    filename: 'Aurora_Biosystems_2025_Annual_Report.pdf',
    documentType: 'annual-report',
    metadata: { reportPeriod: { start: '2025-01-01', end: '2025-12-31' }, pagesTotal: 64, extractedAt: '2026-08-05T09:12:00Z' },
    pages: pageList(64),
    sections: [
      { id: 's-annual-4', heading: 'Balance Sheet', pageNumber: 33, clauseIds: [] },
      { id: 's-annual-5', heading: 'Customer Concentrations', pageNumber: 41, clauseIds: [] },
    ],
    excerpts: [
      { page: 33, text: 'Deferred revenue decreased from $8.2M to $3.2M year over year. The decline was driven by the early recognition of two multi-year service contracts.' },
      { page: 41, text: 'Meridian Health Group accounted for 61% of total bookings in fiscal 2025. No other customer exceeded 8%.' },
    ],
  },
  {
    id: 'doc-audit-fy24',
    filename: 'Aurora_Biosystems_FY24_Audited_Financials.pdf',
    documentType: 'financial-statement',
    metadata: { reportPeriod: { start: '2024-01-01', end: '2024-12-31' }, pagesTotal: 41, extractedAt: '2026-08-05T09:31:00Z' },
    pages: pageList(41),
    sections: [
      { id: 's-audit-3', heading: 'Related Party Transactions', pageNumber: 14, clauseIds: [] },
      { id: 's-audit-4', heading: 'Revenue Recognition', pageNumber: 18, clauseIds: [] },
    ],
    excerpts: [
      { page: 14, text: 'Revenue of $4.7M was attributable to Astral Therapeutics, an entity controlled by the chief executive officer. Terms were not arm\u2019s length.' },
      { page: 18, text: 'Milestone revenue of $1.1M was recognized upon FDA filing rather than upon customer acceptance of the milestone deliverable.' },
    ],
  },
  {
    id: 'doc-audit-opinion',
    filename: 'Grantwood_Audit_Opinion_FY24.pdf',
    documentType: 'audit-opinion',
    metadata: { reportPeriod: { start: '2024-01-01', end: '2024-12-31' }, pagesTotal: 12, extractedAt: '2026-08-05T09:40:00Z' },
    pages: pageList(12),
    sections: [{ id: 's-opinion-1', heading: 'Change of Auditor', pageNumber: 3, clauseIds: [] }],
    excerpts: [
      { page: 3, text: 'The audit for fiscal 2024 was conducted by Grantwood LLP, which replaced the prior firm. The prior firm declined to comment on the change.' },
    ],
  },
  {
    id: 'doc-loan',
    filename: 'Senior_Secured_Loan_Agreement_Amended.pdf',
    documentType: 'loan-agreement',
    metadata: { reportPeriod: { start: '2023-03-01', end: '2028-03-01' }, pagesTotal: 88, extractedAt: '2026-08-05T10:02:00Z' },
    pages: pageList(88),
    sections: [
      { id: 's-loan-9', heading: 'Guarantees', pageNumber: 12, clauseIds: ['cl-guarantee'] },
      { id: 's-loan-8', heading: 'Liability Cap', pageNumber: 27, clauseIds: ['cl-liability'] },
      { id: 's-loan-11', heading: 'Repayment', pageNumber: 33, clauseIds: ['cl-repayment'] },
    ],
    excerpts: [
      { page: 12, text: 'The Parent shall guarantee forty-five percent (45%) of the Company\u2019s aggregate bookings outstanding at any time.' },
      { page: 27, text: 'Lender liability under this Agreement is capped at $5.0M. Claims arising from breach of warranty are expressly excluded from the cap.' },
      { page: 33, text: 'The principal balance is repayable in quarterly installments; upon a change of control, the entire outstanding balance becomes due immediately.' },
    ],
  },
  {
    id: 'doc-shareholder',
    filename: 'Amended_Shareholder_Agreement.pdf',
    documentType: 'governance-document',
    metadata: { reportPeriod: { start: '2021-06-15', end: '2027-06-15' }, pagesTotal: 52, extractedAt: '2026-08-05T10:15:00Z' },
    pages: pageList(52),
    sections: [
      { id: 's-sh-2', heading: 'Change of Control', pageNumber: 8, clauseIds: ['cl-coc'] },
      { id: 's-sh-4', heading: 'Non-Compete', pageNumber: 21, clauseIds: ['cl-noncompete'] },
    ],
    excerpts: [
      { page: 8, text: 'A change of control triggers an immediate repurchase right for all preferred shareholders. The repurchase price is the greater of cost or fair value.' },
      { page: 21, text: 'The founder\u2019s non-compete runs for twelve (12) months from the closing date of any acquisition. The restriction applies to directly competitive rare-disease therapeutics development.' },
    ],
  },
  {
    id: 'doc-insurance',
    filename: 'Key_Person_Insurance_Policy_2026.pdf',
    documentType: 'contract',
    metadata: { reportPeriod: { start: '2026-01-01', end: '2027-01-01' }, pagesTotal: 18, extractedAt: '2026-08-05T10:20:00Z' },
    pages: pageList(18),
    sections: [
      { id: 's-ins-1', heading: 'Key Person Schedule', pageNumber: 6, clauseIds: ['cl-insurance'] },
      { id: 's-ins-3', heading: 'Policy Limits', pageNumber: 9, clauseIds: [] },
    ],
    excerpts: [
      { page: 6, text: 'The insured key person is the chief scientific officer, responsible for three of the four active development programs.' },
      { page: 9, text: 'Clinical trial liability is sub-limited to $2.0M per trial and $5.0M in the aggregate.' },
    ],
  },
  {
    id: 'doc-market',
    filename: 'Biotech_Sector_Market_Report_2026.pdf',
    documentType: 'market-report',
    metadata: { reportPeriod: { start: '2026-06-01', end: '2026-07-01' }, pagesTotal: 38, extractedAt: '2026-08-05T10:28:00Z' },
    pages: pageList(38),
    sections: [
      { id: 's-market-2', heading: 'Reimbursement Outlook', pageNumber: 14, clauseIds: [] },
      { id: 's-market-3', heading: 'Competitive Landscape', pageNumber: 19, clauseIds: [] },
      { id: 's-market-4', heading: 'Market Share', pageNumber: 22, clauseIds: [] },
      { id: 's-market-5', heading: 'Pricing', pageNumber: 26, clauseIds: [] },
    ],
    excerpts: [
      { page: 14, text: 'The proposed 2027 reimbursement framework removes coverage affecting an estimated 24% of the addressable market.' },
      { page: 19, text: 'Two late-stage competitors filed NDAs in the same quarter, both targeting the same indication.' },
      { page: 22, text: 'The Company\u2019s share of the segment declined from 11% to 9% over two consecutive years.' },
      { page: 26, text: 'Net pricing across pipeline indications eroded approximately 3% per annum during the forecast period.' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Clauses                                                             */
/* ------------------------------------------------------------------ */

const clauses = () => [
  {
    id: 'cl-guarantee',
    type: 'guarantee' as const,
    text: 'Parent guarantees 45% of the Company\u2019s outstanding bookings at any time.',
    documentId: 'doc-loan',
    page: 12,
    section: 's.12.4',
    confidence: 0.95,
    severity: 'critical' as const,
  },
  {
    id: 'cl-coc',
    type: 'change-of-control' as const,
    text: 'Change of control triggers immediate repayment of all preferred and debt obligations.',
    documentId: 'doc-shareholder',
    page: 8,
    section: 's.3.2',
    confidence: 0.9,
    severity: 'high' as const,
  },
  {
    id: 'cl-noncompete',
    type: 'non-compete' as const,
    text: 'Founder non-compete expires twelve months after closing.',
    documentId: 'doc-shareholder',
    page: 21,
    section: 's.6.1',
    confidence: 0.85,
    severity: 'medium' as const,
  },
  {
    id: 'cl-liability',
    type: 'liability-cap' as const,
    text: 'Lender liability capped at $5.0M; breach of warranty claims excluded from the cap.',
    documentId: 'doc-loan',
    page: 27,
    section: 's.8.3',
    confidence: 0.88,
    severity: 'medium' as const,
  },
  {
    id: 'cl-repayment',
    type: 'repayment' as const,
    text: 'Entire outstanding balance becomes due immediately upon change of control.',
    documentId: 'doc-loan',
    page: 33,
    section: 's.9.1',
    confidence: 0.97,
    severity: 'high' as const,
  },
  {
    id: 'cl-insurance',
    type: 'indemnification' as const,
    text: 'Clinical trial liability sub-limited to $2.0M per trial.',
    documentId: 'doc-insurance',
    page: 6,
    section: 's.2.1',
    confidence: 0.8,
    severity: 'low' as const,
  },
]

/* ------------------------------------------------------------------ */
/* Findings â€” score contributions chosen so the contract scoring        */
/* engine reproduces the declared category scores exactly.             */
/* ------------------------------------------------------------------ */

const findings = () => [
  /* ---- financial: target 83 (deduction 17) ---- */
  {
    id: 'F-001',
    category: 'financial' as const,
    severity: 'critical' as const,
    title: 'Related-party revenue represents 38% of FY25 top line',
    explanation:
      'Revenue of $4.7M originates from Astral Therapeutics, controlled by the CEO. Post-acquisition, this channel is not expected to persist at current levels, implying a structural top-line gap.',
    evidence: ['Audit note: transactions not arm\u2019s length', 'FY24 audited financials, note 14'],
    sources: [
      {
        documentId: 'doc-audit-fy24',
        page: 14,
        section: 'Related Party Transactions',
        excerpt: 'Revenue of $4.7M was attributable to Astral Therapeutics, an entity controlled by the chief executive officer.',
      },
    ],
    confidence: 0.94,
    scoreContribution: 7,
  },
  {
    id: 'F-002',
    category: 'financial' as const,
    severity: 'high' as const,
    title: 'Auditor changed for FY24 without predecessor explanation',
    explanation:
      'The prior auditor declined to comment on the change. Auditor transitions of this nature frequently precede restatement or dispute.',
    evidence: ['Grantwood opinion, change-of-auditor statement'],
    sources: [
      {
        documentId: 'doc-audit-opinion',
        page: 3,
        section: 'Change of Auditor',
        excerpt: 'The prior firm declined to comment on the change.',
      },
    ],
    confidence: 0.81,
    scoreContribution: 6,
  },
  {
    id: 'F-003',
    category: 'financial' as const,
    severity: 'high' as const,
    title: 'Milestone revenue recognized before contractual acceptance',
    explanation:
      '$1.1M of milestone revenue was booked at FDA filing, ahead of the acceptance event defined in the customer contract. Recognition policy is aggressive.',
    evidence: ['Revenue recognition note 4.2', 'Contract milestone schedule'],
    sources: [
      {
        documentId: 'doc-audit-fy24',
        page: 18,
        section: 'Revenue Recognition',
        excerpt: 'Milestone revenue of $1.1M was recognized upon FDA filing rather than upon customer acceptance of the milestone deliverable.',
      },
    ],
    confidence: 0.87,
    scoreContribution: 4,
  },
  {
    id: 'F-004',
    category: 'financial' as const,
    severity: 'medium' as const,
    title: 'Deferred revenue declined 61% year over year',
    explanation:
      'Deferred revenue fell from $8.2M to $3.2M. The decline indicates weaker forward bookings entering FY26.',
    evidence: ['FY25 balance sheet, deferred revenue line'],
    sources: [
      {
        documentId: 'doc-annual-fy25',
        page: 33,
        section: 'Balance Sheet',
        excerpt: 'Deferred revenue decreased from $8.2M to $3.2M year over year.',
      },
    ],
    confidence: 0.9,
    scoreContribution: 5,
  },

  /* ---- legal: target 74 (deduction 26) ---- */
  {
    id: 'F-005',
    category: 'legal' as const,
    severity: 'critical' as const,
    title: 'Parent guarantee exposes acquirer to 45% of bookings',
    explanation:
      'The loan agreement obligates the Parent to guarantee 45% of outstanding bookings at any time. On acquisition, that liability transfers to the buyer without incremental recourse.',
    evidence: ['Loan agreement s.12.4', 'Guarantee schedule'],
    sources: [
      {
        documentId: 'doc-loan',
        page: 12,
        section: 'Guarantees',
        clause: 'cl-guarantee',
        excerpt: 'The Parent shall guarantee forty-five percent (45%) of the Company\u2019s aggregate bookings outstanding at any time.',
      },
    ],
    confidence: 0.96,
    scoreContribution: 12,
  },
  {
    id: 'F-006',
    category: 'legal' as const,
    severity: 'high' as const,
    title: 'Change-of-control clause triggers immediate $30M repayment',
    explanation:
      'Closing the acquisition accelerates the entire outstanding balance of the senior facility. The repayment obligation is not conditioned on consent.',
    evidence: ['Shareholder agreement s.3.2', 'Loan agreement s.9.1 cross-reference'],
    sources: [
      {
        documentId: 'doc-shareholder',
        page: 8,
        section: 'Change of Control',
        clause: 'cl-coc',
        excerpt: 'A change of control triggers an immediate repurchase right for all preferred shareholders.',
      },
    ],
    confidence: 0.93,
    scoreContribution: 10,
  },
  {
    id: 'F-007',
    category: 'legal' as const,
    severity: 'high' as const,
    title: 'Founder non-compete expires within 12 months of close',
    explanation:
      'The founder\u2019s non-compete lapses twelve months after closing. Retention risk for the CEO-scientist is high absent a new arrangement.',
    evidence: ['Shareholder agreement s.6.1'],
    sources: [
      {
        documentId: 'doc-shareholder',
        page: 21,
        section: 'Non-Compete',
        clause: 'cl-noncompete',
        excerpt: 'The founder\u2019s non-compete runs for twelve (12) months from the closing date of any acquisition.',
      },
    ],
    confidence: 0.89,
    scoreContribution: 8,
  },
  {
    id: 'F-008',
    category: 'legal' as const,
    severity: 'medium' as const,
    title: 'Liability cap excludes breach of warranty claims',
    explanation:
      'The $5.0M liability cap explicitly excludes breach of warranty, removing the primary protection against hidden liabilities.',
    evidence: ['Loan agreement s.8.3'],
    sources: [
      {
        documentId: 'doc-loan',
        page: 27,
        section: 'Liability Cap',
        clause: 'cl-liability',
        excerpt: 'Claims arising from breach of warranty are expressly excluded from the cap.',
      },
    ],
    confidence: 0.88,
    scoreContribution: 1,
  },

  /* ---- operational: target 63 (deduction 37) ---- */
  {
    id: 'F-009',
    category: 'operational' as const,
    severity: 'high' as const,
    title: 'Single key person carries 3 of 4 drug programs',
    explanation:
      'One individual is the named scientist on three of four active programs. Key-person insurance covers only a fraction of program value.',
    evidence: ['Policy key person schedule', 'Org chart cross-check'],
    sources: [
      {
        documentId: 'doc-insurance',
        page: 6,
        section: 'Key Person Schedule',
        clause: 'cl-insurance',
        excerpt: 'The insured key person is the chief scientific officer, responsible for three of the four active development programs.',
      },
    ],
    confidence: 0.85,
    scoreContribution: 25,
  },
  {
    id: 'F-010',
    category: 'operational' as const,
    severity: 'high' as const,
    title: 'Customer concentration: top customer 61% of bookings',
    explanation:
      'Meridian Health Group generates 61% of bookings. Loss or renegotiation by that customer would remove the majority of FY26 revenue.',
    evidence: ['FY25 annual report, customer concentrations'],
    sources: [
      {
        documentId: 'doc-annual-fy25',
        page: 41,
        section: 'Customer Concentrations',
        excerpt: 'Meridian Health Group accounted for 61% of total bookings in fiscal 2025.',
      },
    ],
    confidence: 0.92,
    scoreContribution: 15,
  },
  {
    id: 'F-011',
    category: 'operational' as const,
    severity: 'medium' as const,
    title: 'Clinical trial liability sub-limited to $2M per trial',
    explanation:
      'The insurance program sub-limits trial liability, leaving material uninsured exposure in the highest-cost program phase.',
    evidence: ['Policy limits schedule'],
    sources: [
      {
        documentId: 'doc-insurance',
        page: 9,
        section: 'Policy Limits',
        excerpt: 'Clinical trial liability is sub-limited to $2.0M per trial and $5.0M in the aggregate.',
      },
    ],
    confidence: 0.79,
    scoreContribution: 14,
  },

  /* ---- market: target 47 (deduction 53) ---- */
  {
    id: 'F-012',
    category: 'market' as const,
    severity: 'high' as const,
    title: 'Reimbursement cut removes 24% of addressable market by 2027',
    explanation:
      'The proposed 2027 reimbursement framework excludes the therapy class the company competes in. A quarter of the addressable market disappears inside the hold period.',
    evidence: ['Market report, reimbursement outlook'],
    sources: [
      {
        documentId: 'doc-market',
        page: 14,
        section: 'Reimbursement Outlook',
        excerpt: 'The proposed 2027 reimbursement framework removes coverage affecting an estimated 24% of the addressable market.',
      },
    ],
    confidence: 0.83,
    scoreContribution: 40,
  },
  {
    id: 'F-013',
    category: 'market' as const,
    severity: 'medium' as const,
    title: 'Two late-stage competitors filed NDAs in the same quarter',
    explanation:
      'Both competitors report superior efficacy in the same indication. First-to-market advantage is at risk.',
    evidence: ['Market report, competitive landscape'],
    sources: [
      {
        documentId: 'doc-market',
        page: 19,
        section: 'Competitive Landscape',
        excerpt: 'Two late-stage competitors filed NDAs in the same quarter, both targeting the same indication.',
      },
    ],
    confidence: 0.8,
    scoreContribution: 20,
  },
  {
    id: 'F-014',
    category: 'market' as const,
    severity: 'medium' as const,
    title: 'Market share at 9% and declining two years running',
    explanation:
      'Share declined from 11% to 9% over two years. The trend line points below 8% within the forecast window.',
    evidence: ['Market report, market share'],
    sources: [
      {
        documentId: 'doc-market',
        page: 22,
        section: 'Market Share',
        excerpt: 'The Company\u2019s share of the segment declined from 11% to 9% over two consecutive years.',
      },
    ],
    confidence: 0.82,
    scoreContribution: 13,
  },
  {
    id: 'F-015',
    category: 'market' as const,
    severity: 'low' as const,
    title: 'Pricing erosion of 3% per annum across indications',
    explanation:
      'Net pricing declines are within the sector norm but compound materially over a five-year hold.',
    evidence: ['Market report, pricing section'],
    sources: [
      {
        documentId: 'doc-market',
        page: 26,
        section: 'Pricing',
        excerpt: 'Net pricing across pipeline indications eroded approximately 3% per annum during the forecast period.',
      },
    ],
    confidence: 0.76,
    scoreContribution: 26,
  },
]

/* ------------------------------------------------------------------ */
/* Report assembly â€” scores DERIVED, never authored                   */
/* ------------------------------------------------------------------ */

export function buildMockReport(): DealIntelligenceReport {
  const documents = docs()
  const clauseList = clauses()
  const findingList = findings()

  const categoryWeights = { financial: 0.35, legal: 0.3, operational: 0.25, market: 0.1 } as const
  const categoryScores = (Object.keys(categoryWeights) as (keyof typeof categoryWeights)[]).map((category) =>
    buildCategoryScore(category, findingList.filter((f) => f.category === category), categoryWeights[category]),
  )
  const composite = compositeScoreFromCategories(categoryScores)

  return {
    id: 'DR-2026-0088',
    dealName: 'Aurora Biosystems Acquisition',
    targetCompany: {
      name: 'Aurora Biosystems Inc.',
      sector: 'Biotechnology â€” Rare Disease Therapeutics',
      hq: 'Boston, MA, USA',
      dealStage: 'Pre-signing',
    },
    analysisDate: '2026-08-08',
    documents,
    clauses: clauseList,
    findings: findingList,
    financials: {
      period: { start: '2025-01-01', end: '2025-12-31' },
      currency: 'USD',
      revenue: money(12_400_000),
      ebitda: money(1_920_000),
      operatingCosts: money(10_480_000),
      netIncome: money(-340_000),
      debt: money(5_450_000),
      cash: money(4_810_000),
      valuation: money(48_000_000),
      ebitdaMargin: 0.155,
      debtToEbitda: 2.84,
      valuationMultiple: 25,
    },
    compositeRiskScore: {
      score: composite,
      level: riskLevelFromScore(composite),
      categoryScores,
      scoringVersion: '1.0.0',
      rationale:
        'Composite = weighted mean of category scores (weights sum to 1, validated by the contract). Category scores = 100 âˆ’ Î£(finding weight Ã— severity multiplier). AI proposes findings; the deterministic scoring engine computes every number.',
    },
    methodology: {
      sourcesAnalyzed: documents.length,
      pagesAnalyzed: documents.reduce((acc, d) => acc + d.metadata.pagesTotal, 0),
      findingsTotal: findingList.length,
      runId: 'RUN-2026-08-08-01',
      generatedAt: '2026-08-08T11:45:00Z',
    },
  }
}
