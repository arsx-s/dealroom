// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'

function renderApp() {
  return render(<App />)
}

function upload(file: File) {
  const input = screen.getByLabelText(/choose an ipa index file/i)
  fireEvent.change(input, { target: { files: [file] } })
}

function openIngestTab() {
  fireEvent.click(screen.getByRole('tab', { name: /ingest/i }))
}

const minimalIndex = {
  format: 'dealroom/ipa-index/v1',
  generatedAt: '2026-08-09T00:00:00.000Z',
  documents: [{ id: 'doc-a', filename: 'a.pdf', type: 'loan-agreement', pagesTotal: 1 }],
  sections: [{ documentId: 'doc-a', name: 'Assignment', start: 1, end: 1 }],
  pages: [
    {
      documentId: 'doc-a',
      page: 1,
      section: 'Assignment',
      blocks: [
        { role: 'title', text: 'Assignment' },
        {
          role: 'body',
          text: 'The Borrower shall not assign or transfer this agreement without the prior written consent of the Lender.',
        },
      ],
    },
  ],
}

beforeEach(() => {
  renderApp()
  openIngestTab()
})

afterEach(() => {
  cleanup()
})

describe('document ingestion', () => {
  it('shows the idle empty state before any upload', () => {
    expect(screen.getByText(/NO SOURCE SET UPLOADED/)).toBeTruthy()
    expect(screen.getByText(/ANALYSIS RUNS ON THE SEED CORPUS/)).toBeTruthy()
  })

  it('rejects a malformed JSON file cleanly', async () => {
    upload(new File(['{not json'], 'broken.json', { type: 'application/json' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('not valid JSON'),
    )
  })

  it('rejects an unsupported file type cleanly', async () => {
    upload(new File(['nope'], 'notes.txt', { type: 'text/plain' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('unsupported file type'),
    )
  })

  it('rejects an index with no documents', async () => {
    const empty = { ...minimalIndex, documents: [], pages: [] }
    upload(new File([JSON.stringify(empty)], 'empty.json', { type: 'application/json' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('no documents or pages'),
    )
  })

  it('ingests a valid index and re-runs the pipeline against it', async () => {
    upload(new File([JSON.stringify(minimalIndex)], 'custom.json', { type: 'application/json' }))
    await waitFor(() => expect(screen.getByText(/INGESTED/)).toBeTruthy())
    expect(screen.getAllByText(/custom\.json/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/1 documents · 1 pages/).length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByRole('tab', { name: /deal report/i }))

    const header = await screen.findByRole('heading', { name: 'Target Company' })
    expect(header).toBeTruthy()
    expect(screen.getByText(/Composite Deal Risk Score/)).toBeTruthy()

    const findingRows = document.querySelectorAll('.finding-row')
    expect(findingRows.length).toBeGreaterThan(0)
    for (const row of Array.from(findingRows)) {
      const citation = row.querySelector('button.citation')
      expect(citation?.textContent).toContain('[p.')
    }
  })

  it('resets to the seed corpus after an upload', async () => {
    upload(new File([JSON.stringify(minimalIndex)], 'custom.json', { type: 'application/json' }))
    await waitFor(() => expect(screen.getByText(/INGESTED/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /reset to seed corpus/i }))
    await waitFor(() => expect(screen.getByText(/NO SOURCE SET UPLOADED/)).toBeTruthy())

    fireEvent.click(screen.getByRole('tab', { name: /deal report/i }))
    await screen.findByRole('heading', { name: 'Aurora Biosystems Inc.' })
  })
})
