import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { runPipeline } from '../pipeline'

const result = runPipeline()
if (!result.ok) throw new Error(`pipeline must succeed for the dashboard smoke suite: ${result.error}`)
const { report, narrative } = result

describe('dashboard render smoke test', () => {
  it('renders the report shell without throwing', () => {
    expect(() => renderToString(<App />)).not.toThrow()
  })

  it('renders company identity, score, and sections from the pipeline report', () => {
    const html = renderToString(<App />)
    expect(html).toContain(report.targetCompany.name)
    expect(html).toContain('Composite Deal Risk Score')
    expect(html).toContain(String(report.compositeRiskScore.score))
    expect(html).toContain('Key Financial Metrics')
    expect(html).toContain('Findings')
    expect(html).toContain('Source Documents')
    expect(html).toContain('How This Score Was Constructed')
    expect(html).toContain('Score Authority')
    expect(html).toContain('Risk Rationale')
    expect(html).toContain(report.compositeRiskScore.level.toUpperCase())
  })

  it('renders every finding with a citation', () => {
    const html = renderToString(<App />)
    const citations = html.match(/\[p\./g)
    expect(citations).not.toBeNull()
    expect(citations!.length).toBeGreaterThanOrEqual(report.findings.length)
  })

  it('renders the grounded rationale badge', () => {
    expect(narrative.ok).toBe(true)
    const html = renderToString(<App />)
    expect(html).toContain('GROUNDED')
  })
})
