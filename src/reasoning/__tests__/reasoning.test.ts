/**
 * Grounded risk reasoning — tests.
 *
 * A generated narrative must (a) come from the constrained context,
 * (b) verify faithful before surfacing, (c) never crash on provider
 * failures, and (d) fail loudly on malformed provider output.
 * All providers used here are fakes — the layer itself never calls an API.
 */

import { describe, expect, it } from 'vitest'
import { buildMockReport } from '../../data/mock'
import type { DealIntelligenceReport } from '../../contract'
import { buildReasoningContext, numbersIn } from '../context'
import { buildReasoningPrompt } from '../prompt'
import { generateRiskRationale, verifyNarrative } from '../narrative'
import { createStaticProvider, createHttpProvider, type NarrativeProvider } from '../provider'

const report = (): DealIntelligenceReport => buildMockReport()

describe('buildReasoningContext', () => {
  it('exposes only engine-derived data with a number whitelist', () => {
    const ctx = buildReasoningContext(report())
    expect(ctx.findings.length).toBeGreaterThan(0)
    expect(ctx.composite).toBe(report().compositeRiskScore.score)
    for (const f of ctx.findings) {
      expect(ctx.allowedNumbers).toContain(f.scoreContribution)
      expect(ctx.allowedNumbers).toContain(f.weightedContribution)
    }
  })

  it('the prompt enumerates every finding id and allowed number', () => {
    const ctx = buildReasoningContext(report())
    const { system, prompt } = buildReasoningPrompt(ctx)
    expect(system.length).toBeGreaterThan(0)
    for (const f of ctx.findings) expect(prompt).toContain(f.id)
    for (const n of ctx.allowedNumbers) expect(prompt).toContain(String(n))
  })
})

describe('faithfulness check', () => {
  it('accepts a narrative that only uses context data', () => {
    const ctx = buildReasoningContext(report())
    const f0 = ctx.findings[0]
    const f1 = ctx.findings[1]
    const text =
      `The composite score of ${ctx.composite} (level ${ctx.level}) is driven by findings ` +
      `${f0.id} and ${f1.id}, carrying ${f0.scoreContribution} and ${f1.scoreContribution} unweighted points.`
    const r = verifyNarrative(text, report())
    expect(r.status).toBe('grounded')
    expect(r.issues).toHaveLength(0)
  })

  it('flags references to unlisted findings', () => {
    const r = verifyNarrative('The score reflects F-999, which shapes everything.', report())
    expect(r.status).toBe('concerns')
    expect(r.issues.some((i) => i.includes('F-999'))).toBe(true)
  })

  it('flags invented numbers outside the whitelist', () => {
    const ctx = buildReasoningContext(report())
    const f0 = ctx.findings[0]
    const text = `${f0.id} implies a 382x runway multiple.`
    const r = verifyNarrative(text, report())
    expect(r.status).toBe('concerns')
    expect(r.issues.some((i) => i.includes('382'))).toBe(true)
  })

  it('flags narratives that cite no finding ids', () => {
    const ctx = buildReasoningContext(report())
    const r = verifyNarrative(`The composite of ${ctx.composite} looks fine.`, report())
    expect(r.status).toBe('concerns')
    expect(r.issues.some((i) => i.includes('no finding ids'))).toBe(true)
  })

  it('flags unknown document ids', () => {
    const ctx = buildReasoningContext(report())
    const f0 = ctx.findings[0]
    const text = `${f0.id} relies on doc-imaginary, which was never indexed.`
    const r = verifyNarrative(text, report())
    expect(r.status).toBe('concerns')
    expect(r.issues.some((i) => i.includes('doc-imaginary'))).toBe(true)
  })

  it('allows numbers inside verbatim quoted evidence, rejects them outside', () => {
    const ctx = buildReasoningContext(report())
    const f0 = ctx.findings[0]
    /* 999 is not in the whitelist */
    expect(ctx.allowedNumbers).not.toContain(999)
    const quoted = `${f0.id}: the agreement states “[we] guarantee 999 units”.`
    expect(verifyNarrative(quoted, report()).status).toBe('grounded')
    const unquoted = `${f0.id}: the agreement states 999 guaranteed units.`
    expect(verifyNarrative(unquoted, report()).status).toBe('concerns')
  })
})

describe('generateRiskRationale', () => {
  it('returns a grounded narrative when the provider is faithful', async () => {
    const ctx = buildReasoningContext(report())
    const f0 = ctx.findings[0]
    const f1 = ctx.findings[1]
    const text =
      `Level ${ctx.level} with a composite of ${ctx.composite} is set by findings ` +
      `${f0.id} (${f0.scoreContribution} points) and ${f1.id} (${f1.scoreContribution} points).`
    const result = await generateRiskRationale(createStaticProvider(text), report())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.narrative.grounded).toBe(true)
      expect(result.narrative.faithfulness.status).toBe('grounded')
    }
  })

  it('labels provider narratives that hallucinate as concerns (never silent)', async () => {
    const ctx = buildReasoningContext(report())
    const f0 = ctx.findings[0]
    const badText = `${f0.id} drags the score down to a 999 for no reason at all.`
    const result = await generateRiskRationale(createStaticProvider(badText), report())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.narrative.grounded).toBe(false)
      expect(result.narrative.faithfulness.issues.length).toBeGreaterThan(0)
    }
  })

  it('surfaces provider failures without crashing the caller', async () => {
    const throwing: NarrativeProvider = async () => {
      throw new Error('upstream outage')
    }
    const result = await generateRiskRationale(throwing, report())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('upstream outage')
  })

  it('rejects malformed provider output (empty string)', async () => {
    const result = await generateRiskRationale(createStaticProvider('   \n\t'), report())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/empty or malformed/i)
  })

  it('http provider surfaces non-200 as a failure (no fake narrative)', async () => {
    const http = createHttpProvider({ url: 'http://127.0.0.1:1/nope', model: 'x' })
    const result = await generateRiskRationale(http, report())
    expect(result.ok).toBe(false)
  })
})

describe('numbersIn', () => {
  it('extracts decimal and integer tokens', () => {
    expect(numbersIn('42 items at 3.5x and 100%')).toEqual([42, 3.5, 100])
  })
})