import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('dashboard render smoke test', () => {
  it('renders the report shell without throwing', () => {
    expect(() => renderToString(<App />)).not.toThrow()
  })

  it('renders company identity, score, and sections', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Aurora Biosystems Inc.')
    expect(html).toContain('Composite Deal Risk Score')
    expect(html).toContain('Key Financial Metrics')
    expect(html).toContain('Findings')
    expect(html).toContain('Source Documents')
    expect(html).toContain('72')
    expect(html).toContain('How This Score Was Constructed')
    expect(html).toContain('Score Authority')
  })

  it('renders every finding with a citation', () => {
    const html = renderToString(<App />)
    const citations = html.match(/\[p\./g)
    expect(citations).not.toBeNull()
    expect(citations!.length).toBeGreaterThanOrEqual(15)
  })
})