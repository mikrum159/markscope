import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentPreview } from './DocumentPreview'
import { extractHeadings } from './headings'

// mermaid needs real SVG layout APIs (getBBox etc.) that jsdom doesn't
// implement, so the module is mocked wholesale rather than exercising real
// rendering - these tests check DocumentPreview's wiring (mermaid fences
// route to <Mermaid>, loading/ready/error states render), not mermaid's own
// rendering correctness.
const { renderMock } = vi.hoisted(() => ({ renderMock: vi.fn() }))
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: renderMock
  }
}))

const ROOT_PATH = 'C:\\Users\\dev\\test-docs'
const DOCUMENT_PATH = 'README.md'

function renderPreview(content: string): ReturnType<typeof render> {
  return render(
    <DocumentPreview content={content} rootPath={ROOT_PATH} documentPath={DOCUMENT_PATH} />
  )
}

describe('DocumentPreview', () => {
  it('renders GitHub-flavored Markdown: headings, emphasis, lists, tables, task lists', () => {
    const content = [
      '# Title',
      '',
      'Some **bold** and *italic* text.',
      '',
      '- one',
      '- two',
      '',
      '- [ ] todo',
      '- [x] done',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |'
    ].join('\n')

    renderPreview(content)

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByText('italic').tagName).toBe('EM')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('makes an external link followable in a new window', () => {
    renderPreview('[docs](https://example.com/docs)')

    const link = screen.getByRole('link', { name: 'docs' })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders a relative link without an href, so it cannot navigate the window', () => {
    renderPreview('[other doc](../other.md)')

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('other doc')).toBeInTheDocument()
  })

  it('syntax-highlights a fenced code block', () => {
    renderPreview(['```js', 'const value = "hi";', '```'].join('\n'))

    const code = document.querySelector('.document-preview code')
    expect(code).toHaveClass('hljs')
    expect(code?.querySelector('.hljs-keyword')).toHaveTextContent('const')
  })

  it('gives rendered headings the same ids OutlineRail computes from the raw markdown', () => {
    const content = [
      '## `readFile.ts` and **bold** stuff',
      '',
      '### Duplicate',
      '',
      '#### Duplicate',
      '',
      '##### *Emphasis* [link text](http://example.com) here'
    ].join('\n')

    renderPreview(content)

    const renderedIds = Array.from(
      document.querySelectorAll('.document-preview :is(h1, h2, h3, h4, h5, h6)')
    ).map((el) => el.id)
    const expectedIds = extractHeadings(content).map((heading) => heading.id)

    expect(renderedIds).toEqual(expectedIds)
  })

  describe('Mermaid fences', () => {
    afterEach(() => {
      renderMock.mockReset()
    })

    it('renders a valid diagram as SVG instead of a code block', async () => {
      renderMock.mockResolvedValue({ svg: '<svg data-testid="fake-diagram"></svg>' })

      renderPreview(['```mermaid', 'flowchart TD', '  A --> B', '```'].join('\n'))

      expect(await screen.findByTestId('fake-diagram')).toBeInTheDocument()
      expect(document.querySelector('.document-preview pre')).not.toBeInTheDocument()
    })

    it('shows an inline error instead of crashing on an invalid diagram', async () => {
      renderMock.mockRejectedValue(new Error('Parse error on line 1'))

      renderPreview(['```mermaid', 'not valid mermaid', '```'].join('\n'))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't render this diagram: Parse error on line 1"
      )
    })
  })

  describe('images', () => {
    beforeEach(() => {
      window.api = {
        workspace: {
          addRoot: vi.fn(),
          readFile: vi.fn(),
          readAsset: vi.fn(),
          loadState: vi.fn().mockResolvedValue([]),
          removeRoot: vi.fn().mockResolvedValue(undefined),
          setRootCollapsed: vi.fn().mockResolvedValue(undefined),
          setRootPositions: vi.fn().mockResolvedValue(undefined),
          setFolderExpanded: vi.fn().mockResolvedValue(undefined),
          loadTabs: vi.fn().mockResolvedValue({ tabs: [], activeTab: null }),
          addTab: vi.fn().mockResolvedValue(undefined),
          removeTab: vi.fn().mockResolvedValue(undefined),
          setActiveTab: vi.fn().mockResolvedValue(undefined),
          setTabScrollPosition: vi.fn().mockResolvedValue(undefined),
          onRequestScrollFlush: vi.fn().mockReturnValue(() => {})
        },
        search: {
          query: vi.fn().mockResolvedValue([])
        },
        settings: {
          getTheme: vi.fn().mockResolvedValue('system'),
          setTheme: vi.fn().mockResolvedValue(undefined)
        }
      }
    })

    afterEach(() => {
      // @ts-expect-error - test-only cleanup of the preload bridge stub
      delete window.api
    })

    it('resolves a relative image path through the trusted-root IPC boundary', async () => {
      window.api.workspace.readAsset = vi.fn().mockResolvedValue('data:image/png;base64,AAAA')

      renderPreview('![a diagram](images/diagram.png)')

      const img = await screen.findByRole('img', { name: 'a diagram' })
      expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA')
      expect(window.api.workspace.readAsset).toHaveBeenCalledWith(
        ROOT_PATH,
        DOCUMENT_PATH,
        'images/diagram.png'
      )
    })

    it('does not fetch an external image, since that would be an implicit network call', () => {
      window.api.workspace.readAsset = vi.fn()

      renderPreview('![remote](https://example.com/pic.png)')

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.getByText('remote')).toBeInTheDocument()
      expect(window.api.workspace.readAsset).not.toHaveBeenCalled()
    })

    it('renders a data: URI image directly, without an IPC round-trip', () => {
      window.api.workspace.readAsset = vi.fn()
      const dataUri = 'data:image/png;base64,AAAA'

      renderPreview(`![inline](${dataUri})`)

      expect(screen.getByRole('img', { name: 'inline' })).toHaveAttribute('src', dataUri)
      expect(window.api.workspace.readAsset).not.toHaveBeenCalled()
    })
  })
})
