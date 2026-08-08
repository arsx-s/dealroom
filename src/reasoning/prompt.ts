/**
 * Prompt construction for grounded risk reasoning.
 *
 * The prompt is built so the narrative CANNOT talk beyond the context:
 * finding ids are enumerated, every number allowed is stated explicitly,
 * and the instructions forbid anything else. Faithfulness is still checked
 * on the output — the prompt constrains, the check enforces.
 */

import type { ReasoningContext } from './context'

export const SYSTEM_PROMPT =
  'You are a risk analyst inside a deterministic deal-intelligence system. ' +
  'The composite score and every category score you see were computed by a rules engine from ' +
  'structured findings; they are the source of truth. Never restate, rank, or invent numbers ' +
  'that are not listed for you. Never reference findings, documents, or facts that are not ' +
  'listed below. Keep the narrative under 200 words and tie every assertion to a finding id ' +
  'in the form F-xxx.'

function findingLines(ctx: ReasoningContext): string {
  return ctx.findings
    .map(
      (f) =>
        `- ${f.id} | category ${f.category} | severity ${f.severity} | title: ${f.title} | ` +
        `points (critical): ${f.scoreContribution} | severity-weighted: ${f.weightedContribution}`,
    )
    .join('\n')
}

export function buildReasoningPrompt(ctx: ReasoningContext): { system: string; prompt: string } {
  const allowed = [...new Set(ctx.allowedNumbers.map((n) => (Number.isInteger(n) ? String(n) : n.toFixed(2))))].join(', ')
  const prompt = [
    `Deal: ${ctx.dealName}`,
    `Composite risk score: ${ctx.composite} (level ${ctx.level}).`,
    'Category scores: ' +
      ctx.categoryScores.map((c) => `${c.category} ${c.score} (weight ${c.weight})`).join('; ') +
      '.',
    `Findings:`,
    findingLines(ctx) || ' (none)',
    `You may ONLY cite these numbers: ${allowed}.`,
    'Write the risk rationale as a few short paragraphs. Reference findings by id. ' +
      'If the deal is clean, say so; otherwise explain what drives the level most.',
  ].join('\n')
  return { system: SYSTEM_PROMPT, prompt }
}