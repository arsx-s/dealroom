// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'

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
    expect(container.querySelectorAll('.finding-row').length).toBe(15)

    fireEvent.click(screen.getByRole('button', { name: /critical/i }))
    expect(container.querySelectorAll('.finding-row').length).toBe(2)
    expect(container.querySelectorAll('.finding-row.sev-critical').length).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: /low/i }))
    expect(container.querySelectorAll('.finding-row').length).toBe(1)
    expect(container.querySelectorAll('.finding-row.sev-low').length).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: /^all/i }))
    expect(container.querySelectorAll('.finding-row').length).toBe(15)
  })

  it('shows the composite risk banner for a high-risk deal', () => {
    renderApp()
    expect(screen.getAllByText(/High Risk/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/2 critical findings/).length).toBeGreaterThanOrEqual(1)
  })

  it('opens the source viewer from a finding citation and closes with Esc', () => {
    renderApp()
    const findingCitation = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('[p.14'))
    expect(findingCitation).toBeTruthy()
    fireEvent.click(findingCitation!)

    const dialog = screen.getByRole('dialog', { name: /source document viewer/i })
    expect(dialog.textContent).toContain('Aurora_Biosystems_FY24_Audited_Financials.pdf')
    expect(dialog.textContent).toContain('PAGE 14')

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
    fireEvent.click(
      within(dialog)
        .getAllByRole('button')
        .find((b) => b.textContent?.includes('Senior_Secured_Loan_Agreement'))!,
    )
    expect(dialog.textContent).toContain('PAGE 1')
    expect(dialog.textContent).toContain('1 / 88')
  })

  it('toggles the evidence list of a finding', () => {
    renderApp()
    const toggle = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('EVIDENCE (2)'))
    expect(toggle).toBeTruthy()
    expect(toggle!.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle!)
    expect(toggle!.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByText(/Audit note: transactions not arm/).length).toBeGreaterThanOrEqual(1)

    fireEvent.click(toggle!)
    expect(screen.queryByText(/Audit note: transactions not arm/)).toBeNull()
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