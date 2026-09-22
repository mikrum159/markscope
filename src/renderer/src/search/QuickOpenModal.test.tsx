import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuickOpenModal } from './QuickOpenModal'

function stubResults(
  results: Array<{
    rootPath: string
    relativePath: string
    fileName: string
    title: string | null
    snippet: string
  }>
): void {
  window.api = {
    // Only `search` is exercised by this component; the rest of the
    // interface isn't called here, so it's left undefined rather than
    // faked out in full - matches this file's narrow scope.
    search: { query: vi.fn().mockResolvedValue(results) }
  } as unknown as Window['api']
}

afterEach(() => {
  cleanup()
  // @ts-expect-error - test-only cleanup of the preload bridge stub
  delete window.api
})

describe('QuickOpenModal', () => {
  it('queries as the user types and lists results', async () => {
    stubResults([
      {
        rootPath: 'C:/docs',
        relativePath: 'guide.md',
        fileName: 'guide.md',
        title: 'Zephyr Guide',
        snippet: 'the zephyr protocol explained'
      }
    ])
    render(<QuickOpenModal onClose={vi.fn()} onOpenDocument={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search all documents' }), {
      target: { value: 'zephyr' }
    })

    expect(await screen.findByText('Zephyr Guide')).toBeInTheDocument()
    expect(screen.getByText('guide.md')).toBeInTheDocument()
    expect(window.api.search.query).toHaveBeenCalledWith('zephyr')
  })

  it('shows an empty state when nothing matches', async () => {
    stubResults([])
    render(<QuickOpenModal onClose={vi.fn()} onOpenDocument={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search all documents' }), {
      target: { value: 'nothing' }
    })

    expect(await screen.findByText('No matches.')).toBeInTheDocument()
  })

  it('shows no results list before anything is typed', () => {
    stubResults([])
    render(<QuickOpenModal onClose={vi.fn()} onOpenDocument={vi.fn()} />)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens a clicked result and closes the modal', async () => {
    stubResults([
      {
        rootPath: 'C:/docs',
        relativePath: 'guide.md',
        fileName: 'guide.md',
        title: 'Zephyr Guide',
        snippet: ''
      }
    ])
    const onOpenDocument = vi.fn()
    const onClose = vi.fn()
    render(<QuickOpenModal onClose={onClose} onOpenDocument={onOpenDocument} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search all documents' }), {
      target: { value: 'zephyr' }
    })
    fireEvent.click(await screen.findByText('Zephyr Guide'))

    expect(onOpenDocument).toHaveBeenCalledWith('C:/docs', 'guide.md', 'guide.md')
    expect(onClose).toHaveBeenCalled()
  })

  it('opens the arrow-selected result on Enter', async () => {
    stubResults([
      { rootPath: 'C:/docs', relativePath: 'a.md', fileName: 'a.md', title: null, snippet: '' },
      { rootPath: 'C:/docs', relativePath: 'b.md', fileName: 'b.md', title: null, snippet: '' }
    ])
    const onOpenDocument = vi.fn()
    render(<QuickOpenModal onClose={vi.fn()} onOpenDocument={onOpenDocument} />)

    const input = screen.getByRole('textbox', { name: 'Search all documents' })
    fireEvent.change(input, { target: { value: 'doc' } })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'ArrowDown' })
    fireEvent.keyDown(dialog, { key: 'Enter' })

    expect(onOpenDocument).toHaveBeenCalledWith('C:/docs', 'b.md', 'b.md')
  })

  it('closes on Escape', () => {
    stubResults([])
    const onClose = vi.fn()
    render(<QuickOpenModal onClose={onClose} onOpenDocument={vi.fn()} />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click but not on a click inside the dialog', () => {
    stubResults([])
    const onClose = vi.fn()
    const { container } = render(<QuickOpenModal onClose={onClose} onOpenDocument={vi.fn()} />)

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(container.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalled()
  })
})
