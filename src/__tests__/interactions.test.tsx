// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { runPipeline } from '../pipeline'

const result = runPipeline()
if (!result.ok) throw new Error(`pipeline must succeed for the interaction suite: ${result.error}`)
const report = result.report

const findingCount = report.findings.length
const criticalCount = report.findings.filter((f) => f.severity === 'critical').length
const lowCount = report.findings.filter((f) => f.severity === 'low').length
const composite = report.compositeRiskScore
const level = composite.level.toUpperCase()

function renderApp() {
  return render(<App />)
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:dealroom-test'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('dashboard interactions', () => {
  it('switches between report and documents tabs', () => {
    renderApp()
    expect(screen.getByRole('tab', { name: /deal report/i }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('tab', { name: /source documents/i }))

    const docsTab = screen.getByRole('tab', { name: /source documents/i })
    expect(docsTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Source Documents' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Extracted Clauses' })).toBeTruthy()
  })

  it('filters findings by severity', () => {
    const { container } = renderApp()
    expect(container.querySelectorAll('.finding-row').length).toBe(findingCount)

    fireEvent.click(screen.getByRole('button', { name: /critical/i }))
    expect(container.querySelectorAll('.finding-row.sev-critical').length).toBe(criticalCount)

    fireEvent.click(screen.getByRole('button', { name: /low/i }))
    expect(container.querySelectorAll('.finding-row.sev-low').length).toBe(lowCount)

    fireEvent.click(screen.getByRole('button', { name: /^all/i }))
    expect(container.querySelectorAll('.finding-row').length).toBe(findingCount)
  })

  it('shows the composite risk banner for a high-risk deal', () => {
    renderApp()
    expect(level).toBe('HIGH')
    expect(screen.getAllByText(/High Risk/).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText(new RegExp(`${composite.score}/100.*${criticalCount} critical finding`, 'i')).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('opens the source viewer from a finding citation and closes with Esc', () => {
    renderApp()
    const anchor = report.findings[0].sources[0]
    const findingCitation = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes(`[p.${anchor.page}`))
    expect(findingCitation).toBeTruthy()
    fireEvent.click(findingCitation!)

    const dialog = screen.getByRole('dialog', { name: /source document viewer/i })
    const doc = report.documents.find((d) => d.id === anchor.documentId)!
    expect(dialog.textContent).toContain(doc.filename)
    expect(dialog.textContent).toContain(`PAGE ${anchor.page}`)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /source document viewer/i })).toBeNull()
  })

  it('navigates documents and pages inside the viewer', () => {
    renderApp()
    const citation = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('[p.'))
    expect(citation).toBeTruthy()
    fireEvent.click(citation!)

    const dialog = screen.getByRole('dialog', { name: /source document viewer/i })
    const loanDoc = report.documents.find((d) => d.id === 'doc-loan')!
    fireEvent.click(
      within(dialog)
        .getAllByRole('button')
        .find((b) => b.textContent?.includes(loanDoc.filename))!,
    )
    expect(dialog.textContent).toContain('PAGE 1')
    expect(dialog.textContent).toContain(`1 / ${loanDoc.metadata.pagesTotal}`)
  })

  it('toggles the evidence list of a finding', () => {
    renderApp()
    const finding = report.findings.find((f) => f.evidence.length >= 1)!
    const toggle = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes(`EVIDENCE (${finding.evidence.length})`))
    expect(toggle).toBeTruthy()
    expect(toggle!.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle!)
    expect(toggle!.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByText(finding.evidence[0]).length).toBeGreaterThanOrEqual(1)

    fireEvent.click(toggle!)
    expect(screen.queryByText(finding.evidence[0])).toBeNull()
  })

  it('exports the report as JSON via blob download', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('jumps to the risk summary from the banner', () => {
    renderApp()
    const link = screen.getByRole('link', { name: /open risk summary/i })
    expect(link.getAttribute('href')).toBe('#risk-summary')
    expect(screen.getByRole('heading', { name: /How This Score Was Constructed/ })).toBeTruthy()
  })
})
