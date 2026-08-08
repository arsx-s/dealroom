/**
 * Finding construction — stage 4 of the DealRoom pipeline.
 *
 * Turns the deterministic pipeline's intermediate outputs into contract
 * findings:
 *  - detected clauses (legal findings with per-type severities);
 *  - financial anomalies (financial findings anchored to the metric's
 *    source page);
 *  - extracted narrative facts (verbatim-sourced findings);
 *  - expected-but-not-found clause signals (hedged low-severity legal
 *    findings).
 *
 * Every finding carries a score contribution derived from its severity by
 * the pipeline config, and at least one citation anchor. No AI anywhere in
 * this stage: findings are a pure function of the extracted signals.
 */

import type { Finding, Severity } from '../contract'
import type { FinancialAnomaly } from '../finance'
import type { DetectedClause, DetectedClauseType, MissingClauseResult } from '../intelligence'
import type { ExtractedFact } from './extract'
import {
  CLAUSE_DEFAULT_SEVERITY,
  CLAUSE_FINDING_TITLES,
  CLAUSE_SEVERITY_UPGRADES,
  CONTRIBUTION_BY_SEVERITY,
  PIPELINE,
  SEVERITY_NOTES,
} from './config'

export interface FindingsInput {
  detections: DetectedClause[]
  anomalies: FinancialAnomaly[]
  facts: ExtractedFact[]
  missing: MissingClauseResult
}

export function severityForClause(type: DetectedClauseType, text: string): Severity {
  const base = CLAUSE_DEFAULT_SEVERITY[type] ?? 'medium'
  for (const upgrade of CLAUSE_SEVERITY_UPGRADES) {
    if (upgrade.type === type && upgrade.pattern.test(text)) return upgrade.severity
  }
  return base
}

const TAXONOMY_LABELS: Partial<Record<DetectedClauseType, string>> = {
  'unusual-obligation': 'unusual-obligation',
  'change-of-control': 'change-of-control',
  liability: 'liability',
  'non-compete': 'non-compete',
  'assignment-restriction': 'assignment-restriction',
  termination: 'termination',
  indemnification: 'indemnification',
}

const ANOMALY_TITLES: Record<FinancialAnomaly['flag'], (a: FinancialAnomaly) => string> = {
  'revenue-decline': () => 'Revenue declined year over year',
  'margin-below-floor': (a) => `EBITDA margin below the ${a.threshold * 100}% expectation floor`,
  'elevated-leverage': (a) => `Debt / EBITDA above the ${a.threshold}x covenant headroom`,
  'short-cash-runway': (a) => `Cash runway below ${a.threshold} months`,
  'elevated-valuation': (a) => `Valuation multiple (${a.value}x) above the ${a.threshold}x reference band`,
}

const ANOMALY_EXPLANATIONS: Record<FinancialAnomaly['flag'], (a: FinancialAnomaly) => string> = {
  'revenue-decline': (a) =>
    `Revenue changed by ${(a.value * 100).toFixed(1)}% year over year, below the ${(a.threshold * 100).toFixed(0)}% floor.`,
  'margin-below-floor': (a) => `EBITDA margin is ${(a.value * 100).toFixed(1)}%, below the ${a.threshold * 100}% floor.`,
  'elevated-leverage': (a) => `Debt / EBITDA is ${a.value.toFixed(2)}x, above the ${a.threshold.toFixed(1)}x covenant headroom.`,
  'short-cash-runway': (a) =>
    `Cash covers ${a.value.toFixed(1)} months of net burn at the current run-rate, below the ${a.threshold} month expectation.`,
  'elevated-valuation': (a) =>
    `The implied valuation multiple is ${a.value.toFixed(1)}x trailing EBITDA, above the ${a.threshold}x reference band from comparable transactions.`,
}

let findingCounter = 0

function nextId(): string {
  findingCounter += 1
  return `F-${String(findingCounter).padStart(3, '0')}`
}

function fromClause(d: DetectedClause): Finding {
  const severity = severityForClause(d.type, d.text)
  const section = d.section ? ` (${d.section})` : ''
  return {
    id: nextId(),
    category: 'legal',
    severity,
    title: `${CLAUSE_FINDING_TITLES[d.type] ?? TAXONOMY_LABELS[d.type] ?? d.type} — ${d.documentId} p.${d.page}`,
    explanation: `Detected in ${d.documentId} p.${d.page}${section}: “${d.sourceAnchor.excerpt}”. ${SEVERITY_NOTES[severity]}.`,
    evidence: [d.sourceAnchor.excerpt ?? d.text],
    sources: [d.sourceAnchor],
    confidence: d.confidence,
    scoreContribution: CONTRIBUTION_BY_SEVERITY[severity],
  }
}

function fromAnomaly(a: FinancialAnomaly): Finding {
  if (a.sources.length === 0) {
    throw new Error(`financial anomaly ${a.flag} has no source anchor; cannot build an untraceable finding`)
  }
  const severity: Severity = a.severity === 'elevated' ? 'high' : 'medium'
  return {
    id: nextId(),
    category: 'financial',
    severity,
    title: ANOMALY_TITLES[a.flag](a),
    explanation: ANOMALY_EXPLANATIONS[a.flag](a),
    evidence: [`${a.metric}: ${a.value} ${a.direction} ${a.threshold}`],
    sources: a.sources,
    confidence: PIPELINE.confidence.extraction,
    scoreContribution: CONTRIBUTION_BY_SEVERITY[severity],
  }
}

function fromFact(f: ExtractedFact): Finding {
  return {
    id: nextId(),
    category: f.category,
    severity: f.severity,
    title: f.title,
    explanation: f.explanation,
    evidence: f.evidence,
    sources: [f.anchor],
    confidence: f.confidence,
    scoreContribution: f.contribution,
  }
}

function fromMissingSignal(s: MissingClauseResult['signals'][number]): Finding {
  return {
    id: nextId(),
    category: 'legal',
    severity: 'low',
    title: `Expected ${s.clauseType} clause not found — ${s.documentType} (${s.documentId})`,
    explanation: s.wording,
    evidence: [s.wording],
    sources: [{ documentId: s.documentId, page: 1, section: 'Cover' }],
    confidence: PIPELINE.confidence.missingSignal,
    scoreContribution: CONTRIBUTION_BY_SEVERITY.low,
  }
}

/**
 * Build the full finding set in a stable order: clauses (document/page
 * order), financial anomalies, extracted facts, missing-clause signals.
 */
export function buildFindings(input: FindingsInput): Finding[] {
  findingCounter = 0
  const findings: Finding[] = []
  for (const d of input.detections) {
    if (d.type === 'other') continue
    findings.push(fromClause(d))
  }
  for (const a of input.anomalies) findings.push(fromAnomaly(a))
  for (const f of input.facts) findings.push(fromFact(f))
  for (const s of input.missing.signals) findings.push(fromMissingSignal(s))
  return findings
}
