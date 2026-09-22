import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { RestoredRoot } from '../../preload/index'

function createApiStub(overrides: Partial<Window['api']['workspace']> = {}): Window['api'] {
  return {
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
      onRequestScrollFlush: vi.fn().mockReturnValue(() => {}),
      ...overrides
    },
    search: {
      query: vi.fn().mockResolvedValue([])
    },
    settings: {
      getTheme: vi.fn().mockResolvedValue('system'),
      setTheme: vi.fn().mockResolvedValue(undefined)
    }
  }
}

describe('App', () => {
  beforeEach(() => {
    window.api = createApiStub()
  })

  afterEach(() => {
    // Unmount before deleting the stub, not after: Slice 19's flush effect
    // reads window.api.workspace on every preview/tabs change, so a state
    // update left pending when a test ends (e.g. a fire-and-forget
    // handleSelectFile promise settling late) could otherwise re-run it
    // against an already-deleted window.api once the global afterEach's
    // cleanup() finally unmounts. Vitest runs this describe-level afterEach
    // before that global one, so without an explicit call here the ordering
    // is backwards.
    cleanup()
    // @ts-expect-error - test-only cleanup of the preload bridge stub
    delete window.api
  })

  it('renders the three-pane shell: sidebar, tab bar, and preview', () => {
    render(<App />)

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument()
    expect(screen.getByTestId('preview')).toBeInTheDocument()
  })

  describe('search keyboard shortcut', () => {
    it('opens the Search modal on Ctrl+F', () => {
      render(<App />)

      expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'f', ctrlKey: true })

      expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument()
    })
  })

  describe('settings', () => {
    it('opens on Appearance by default and switches sections via the sidebar nav', async () => {
      render(<App />)

      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

      expect(await screen.findByRole('heading', { name: 'Appearance' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'About' }))

      expect(await screen.findByRole('heading', { name: 'About' })).toBeInTheDocument()
    })

    it('persists a theme choice made from the Appearance panel', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
      await waitFor(() => expect(window.api.settings.getTheme).toHaveBeenCalled())

      fireEvent.click(await screen.findByRole('radio', { name: 'Dark' }))

      expect(window.api.settings.setTheme).toHaveBeenCalledWith('dark')
      expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('adding a root', () => {
    it('lists the scanned Markdown files after a folder is picked', async () => {
      window.api.workspace.addRoot = vi.fn().mockResolvedValue({
        rootPath: 'C:\\Users\\dev\\test-docs',
        tree: {
          type: 'folder',
          name: 'test-docs',
          relativePath: '',
          children: [
            { type: 'file', name: 'README.md', relativePath: 'README.md' },
            {
              type: 'folder',
              name: 'docs',
              relativePath: 'docs',
              children: [{ type: 'file', name: 'tables.md', relativePath: 'docs/tables.md' }]
            }
          ]
        }
      })

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))

      expect(await screen.findByText('README.md')).toBeInTheDocument()
      expect(screen.queryByText('tables.md')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'docs' }))
      expect(screen.getByText('tables.md')).toBeInTheDocument()
      expect(window.api.workspace.setFolderExpanded).toHaveBeenCalledWith(
        'C:\\Users\\dev\\test-docs',
        'docs',
        true
      )
    })

    it('leaves the placeholder in place when the dialog is cancelled', async () => {
      window.api.workspace.addRoot = vi.fn().mockResolvedValue(null)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))

      expect(await screen.findByText('Folders')).toBeInTheDocument()
    })
  })

  describe('selecting a file to preview', () => {
    beforeEach(() => {
      window.api = createApiStub({
        addRoot: vi.fn().mockResolvedValue({
          rootPath: 'C:\\Users\\dev\\test-docs',
          tree: {
            type: 'folder',
            name: 'test-docs',
            relativePath: '',
            children: [{ type: 'file', name: 'README.md', relativePath: 'README.md' }]
          }
        })
      })
    })

    it('renders the file content after clicking a tree row', async () => {
      window.api.workspace.readFile = vi.fn().mockResolvedValue('# Hello\n\nBody text.')

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      fireEvent.click(await screen.findByText('README.md'))

      expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument()
      expect(window.api.workspace.readFile).toHaveBeenCalledWith(
        'C:\\Users\\dev\\test-docs',
        'README.md'
      )
    })

    // The flash itself (placeholder visible for a frame or two mid-read) is
    // covered by useDelayedFlag.test.ts, which can observe intermediate state
    // that this level cannot. What this pins is the wiring: the delayed flag
    // is fed the loading status and nothing else, so a rendered document never
    // sits next to a "Loading…" line.
    it('shows no loading placeholder once the document has rendered', async () => {
      window.api.workspace.readFile = vi.fn().mockResolvedValue('# Hello\n\nBody text.')

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      fireEvent.click(await screen.findByText('README.md'))

      expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument()
      expect(screen.queryByText(/^Loading /)).not.toBeInTheDocument()
    })

    it('shows an error state when the file cannot be read', async () => {
      window.api.workspace.readFile = vi.fn().mockResolvedValue(null)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      fireEvent.click(await screen.findByText('README.md'))

      expect(await screen.findByText("Couldn't open README.md.")).toBeInTheDocument()
    })
  })

  describe('multiple roots', () => {
    const rootA = {
      rootPath: 'C:\\Users\\dev\\project-a',
      tree: {
        type: 'folder' as const,
        name: 'project-a',
        relativePath: '',
        children: [{ type: 'file' as const, name: 'a.md', relativePath: 'a.md' }]
      }
    }
    const rootB = {
      rootPath: 'C:\\Users\\dev\\project-b',
      tree: {
        type: 'folder' as const,
        name: 'project-b',
        relativePath: '',
        children: [{ type: 'file' as const, name: 'b.md', relativePath: 'b.md' }]
      }
    }

    it('adds a second root alongside the first instead of replacing it', async () => {
      window.api.workspace.addRoot = vi
        .fn()
        .mockResolvedValueOnce(rootA)
        .mockResolvedValueOnce(rootB)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      expect(await screen.findByText('a.md')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      expect(await screen.findByText('b.md')).toBeInTheDocument()
      expect(screen.getByText('a.md')).toBeInTheDocument()
    })

    it('does not add a duplicate root when the same folder is picked again', async () => {
      window.api.workspace.addRoot = vi.fn().mockResolvedValue(rootA)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      expect(await screen.findByText('a.md')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await waitFor(() => expect(window.api.workspace.addRoot).toHaveBeenCalledTimes(2))
      expect(screen.getAllByText('a.md')).toHaveLength(1)
    })

    it('removing a root drops its tree, clears its preview, and persists the removal', async () => {
      window.api.workspace.addRoot = vi
        .fn()
        .mockResolvedValueOnce(rootA)
        .mockResolvedValueOnce(rootB)
      window.api.workspace.readFile = vi.fn().mockResolvedValue('# A')

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('b.md')

      fireEvent.click(screen.getByText('a.md'))
      expect(await screen.findByRole('heading', { name: 'A' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Remove project-a/ }))

      expect(screen.queryByText('a.md')).not.toBeInTheDocument()
      expect(screen.getByText('b.md')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'A' })).not.toBeInTheDocument()
      expect(screen.getByTestId('preview')).toBeEmptyDOMElement()
      expect(window.api.workspace.removeRoot).toHaveBeenCalledWith('C:\\Users\\dev\\project-a')
    })

    it('collapses and re-expands a root independently of other roots, persisting each toggle', async () => {
      window.api.workspace.addRoot = vi
        .fn()
        .mockResolvedValueOnce(rootA)
        .mockResolvedValueOnce(rootB)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('b.md')

      const toggleA = screen.getByRole('button', { name: 'project-a' })
      expect(toggleA).toHaveAttribute('aria-expanded', 'true')

      fireEvent.click(toggleA)
      expect(toggleA).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('a.md')).not.toBeInTheDocument()
      expect(screen.getByText('b.md')).toBeInTheDocument()
      expect(window.api.workspace.setRootCollapsed).toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        true
      )

      fireEvent.click(toggleA)
      expect(toggleA).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('a.md')).toBeInTheDocument()
      expect(window.api.workspace.setRootCollapsed).toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        false
      )
    })

    it("reorders roots by dragging one section's grip handle onto another", async () => {
      window.api.workspace.addRoot = vi
        .fn()
        .mockResolvedValueOnce(rootA)
        .mockResolvedValueOnce(rootB)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('b.md')

      expect(screen.getAllByText(/^project-[ab]$/).map((el) => el.textContent)).toEqual([
        'project-a',
        'project-b'
      ])

      const dragHandleB = screen.getByRole('button', { name: 'Reorder project-b' })
      const targetSection = screen
        .getByRole('button', { name: 'project-a' })
        .closest('.root-section') as HTMLElement
      // jsdom performs no real layout, so the drop-position geometry (clientY
      // vs. the target's vertical midpoint) has to be faked deliberately -
      // same limitation already noted for useActiveHeading's tests.
      vi.spyOn(targetSection, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        height: 40,
        bottom: 40,
        left: 0,
        right: 100,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => {}
      } as DOMRect)

      fireEvent.dragStart(dragHandleB)
      // jsdom's fireEvent.dragOver doesn't actually apply `clientY` from the
      // eventInit (a jsdom DragEvent gap, same class of limitation as the
      // getBoundingClientRect faking above) - define it directly instead.
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
      Object.defineProperty(dragOverEvent, 'clientY', { value: 5 })
      fireEvent(targetSection, dragOverEvent)
      fireEvent.drop(targetSection)

      expect(window.api.workspace.setRootPositions).toHaveBeenCalledWith([
        'C:\\Users\\dev\\project-b',
        'C:\\Users\\dev\\project-a'
      ])
      expect(screen.getAllByText(/^project-[ab]$/).map((el) => el.textContent)).toEqual([
        'project-b',
        'project-a'
      ])
    })
  })

  describe('tabs', () => {
    const rootA = {
      rootPath: 'C:\\Users\\dev\\project-a',
      tree: {
        type: 'folder' as const,
        name: 'project-a',
        relativePath: '',
        children: [
          { type: 'file' as const, name: 'a.md', relativePath: 'a.md' },
          { type: 'file' as const, name: 'c.md', relativePath: 'c.md' }
        ]
      }
    }

    beforeEach(() => {
      window.api = createApiStub({
        addRoot: vi.fn().mockResolvedValue(rootA),
        readFile: vi.fn().mockResolvedValue('# Doc')
      })
    })

    it('shows a single-click file as a transient preview tab, promoted to a persisted tab on double-click', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      const sidebar = within(screen.getByTestId('sidebar'))
      await screen.findByText('a.md')

      fireEvent.click(sidebar.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      const previewTab = within(screen.getByTestId('tab-bar')).getByText('a.md')
      expect(previewTab.closest('.tab')).toHaveClass('tab-preview')
      expect(window.api.workspace.addTab).not.toHaveBeenCalled()

      fireEvent.doubleClick(sidebar.getByText('a.md'))
      await waitFor(() => {
        const tab = within(screen.getByTestId('tab-bar')).getByText('a.md')
        expect(tab.closest('.tab')).not.toHaveClass('tab-preview')
      })
      expect(window.api.workspace.addTab).toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        'a.md',
        'a.md'
      )
      expect(window.api.workspace.setActiveTab).toHaveBeenCalledWith({
        rootPath: 'C:\\Users\\dev\\project-a',
        relativePath: 'a.md'
      })
    })

    it('replaces the transient preview tab instead of adding a new one when a different file is single-clicked', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      const sidebar = within(screen.getByTestId('sidebar'))
      await screen.findByText('a.md')

      fireEvent.click(sidebar.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      fireEvent.click(sidebar.getByText('c.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      const tabBar = within(screen.getByTestId('tab-bar'))
      expect(tabBar.queryByText('a.md')).not.toBeInTheDocument()
      expect(tabBar.getByText('c.md')).toBeInTheDocument()
    })

    it('closing the transient preview tab clears it without persisting anything', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      const sidebar = within(screen.getByTestId('sidebar'))
      await screen.findByText('a.md')

      fireEvent.click(sidebar.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      fireEvent.click(screen.getByRole('button', { name: 'Close a.md' }))

      expect(within(screen.getByTestId('tab-bar')).queryByText('a.md')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Doc' })).not.toBeInTheDocument()
      expect(screen.getByTestId('preview')).toBeEmptyDOMElement()
      expect(window.api.workspace.removeTab).not.toHaveBeenCalled()
      expect(window.api.workspace.addTab).not.toHaveBeenCalled()
    })

    it('closing the preview tab falls back to the most recently opened tab instead of clearing the preview', async () => {
      const rootWithThree = {
        rootPath: 'C:\\Users\\dev\\project-a',
        tree: {
          type: 'folder' as const,
          name: 'project-a',
          relativePath: '',
          children: [
            { type: 'file' as const, name: 'a.md', relativePath: 'a.md' },
            { type: 'file' as const, name: 'c.md', relativePath: 'c.md' },
            { type: 'file' as const, name: 'd.md', relativePath: 'd.md' }
          ]
        }
      }
      window.api.workspace.addRoot = vi.fn().mockResolvedValue(rootWithThree)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')

      fireEvent.doubleClick(screen.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      fireEvent.doubleClick(screen.getByText('c.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      fireEvent.click(screen.getByText('d.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      fireEvent.click(screen.getByRole('button', { name: 'Close d.md' }))

      await waitFor(() => {
        expect(within(screen.getByTestId('tab-bar')).getByText('c.md')).toHaveAttribute(
          'aria-current',
          'true'
        )
      })
      expect(window.api.workspace.setActiveTab).toHaveBeenCalledWith({
        rootPath: 'C:\\Users\\dev\\project-a',
        relativePath: 'c.md'
      })
    })

    it('switches the preview when a tab is clicked, and highlights the active tab', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')

      fireEvent.doubleClick(screen.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      fireEvent.doubleClick(screen.getByText('c.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      const tabBar = within(screen.getByTestId('tab-bar'))
      const tabA = tabBar.getByText('a.md')
      expect(tabA).not.toHaveAttribute('aria-current')

      fireEvent.click(tabA)
      expect(tabA).toHaveAttribute('aria-current', 'true')
      expect(window.api.workspace.setActiveTab).toHaveBeenCalledWith({
        rootPath: 'C:\\Users\\dev\\project-a',
        relativePath: 'a.md'
      })
    })

    it('closing the active tab falls back to a neighboring tab', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')

      fireEvent.doubleClick(screen.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      fireEvent.doubleClick(screen.getByText('c.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      fireEvent.click(screen.getByRole('button', { name: 'Close c.md' }))

      expect(within(screen.getByTestId('tab-bar')).queryByText('c.md')).not.toBeInTheDocument()
      expect(within(screen.getByTestId('tab-bar')).getByText('a.md')).toHaveAttribute(
        'aria-current',
        'true'
      )
      expect(window.api.workspace.removeTab).toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        'c.md'
      )
    })

    it('closing the last tab clears the preview', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')

      fireEvent.doubleClick(screen.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      fireEvent.click(screen.getByRole('button', { name: 'Close a.md' }))

      expect(screen.queryByRole('heading', { name: 'Doc' })).not.toBeInTheDocument()
      expect(screen.getByTestId('preview')).toBeEmptyDOMElement()
      expect(window.api.workspace.setActiveTab).toHaveBeenCalledWith(null)
    })

    it('removing a root drops its tabs from the tab bar', async () => {
      const rootB = {
        rootPath: 'C:\\Users\\dev\\project-b',
        tree: {
          type: 'folder' as const,
          name: 'project-b',
          relativePath: '',
          children: [{ type: 'file' as const, name: 'b.md', relativePath: 'b.md' }]
        }
      }
      window.api.workspace.addRoot = vi
        .fn()
        .mockResolvedValueOnce(rootA)
        .mockResolvedValueOnce(rootB)

      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('b.md')

      fireEvent.doubleClick(screen.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })

      fireEvent.click(screen.getByRole('button', { name: /Remove project-a/ }))

      expect(within(screen.getByTestId('tab-bar')).queryByText('a.md')).not.toBeInTheDocument()
    })

    it('remembers a persisted tab scroll position, persists it on switch, and restores it (no smooth scroll) on return', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      await screen.findByText('a.md')

      fireEvent.doubleClick(screen.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      const scrollContainer = document.querySelector('.preview-content') as HTMLDivElement
      scrollContainer.scrollTop = 150

      fireEvent.doubleClick(screen.getByText('c.md'))
      await waitFor(() => {
        expect(within(screen.getByTestId('tab-bar')).getByText('c.md')).toHaveAttribute(
          'aria-current',
          'true'
        )
      })
      // Captured at the moment of switching away, not continuously.
      expect(window.api.workspace.setTabScrollPosition).toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        'a.md',
        150
      )
      // A freshly opened tab starts at the top, not wherever a.md left off.
      expect(scrollContainer.scrollTop).toBe(0)

      fireEvent.click(within(screen.getByTestId('tab-bar')).getByText('a.md'))
      await waitFor(() => {
        expect(scrollContainer.scrollTop).toBe(150)
      })
    })

    it('remembers the transient preview tab scroll position for the session but never persists it', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Folder' }))
      const sidebar = within(screen.getByTestId('sidebar'))
      await screen.findByText('a.md')

      fireEvent.click(sidebar.getByText('a.md'))
      await screen.findByRole('heading', { name: 'Doc' })
      const scrollContainer = document.querySelector('.preview-content') as HTMLDivElement
      scrollContainer.scrollTop = 80

      // Promote c.md to a persisted tab so there's somewhere else to switch
      // to - a.md stays out of the tabs list (single-clicked, never opened).
      fireEvent.doubleClick(sidebar.getByText('c.md'))
      await waitFor(() => {
        expect(within(screen.getByTestId('tab-bar')).getByText('c.md')).toHaveAttribute(
          'aria-current',
          'true'
        )
      })
      expect(window.api.workspace.setTabScrollPosition).not.toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        'a.md',
        80
      )

      fireEvent.click(sidebar.getByText('a.md'))
      await waitFor(() => {
        expect(scrollContainer.scrollTop).toBe(80)
      })
    })
  })

  describe('restoring persisted session state', () => {
    it('renders restored roots with their persisted collapsed and expanded-folder state', async () => {
      window.api.workspace.loadState = vi.fn().mockResolvedValue([
        {
          rootPath: 'C:\\Users\\dev\\project-a',
          collapsed: false,
          expandedPaths: ['docs'],
          tree: {
            type: 'folder',
            name: 'project-a',
            relativePath: '',
            children: [
              {
                type: 'folder',
                name: 'docs',
                relativePath: 'docs',
                children: [{ type: 'file', name: 'tables.md', relativePath: 'docs/tables.md' }]
              }
            ]
          }
        },
        {
          rootPath: 'C:\\Users\\dev\\project-b',
          collapsed: true,
          expandedPaths: [],
          tree: {
            type: 'folder',
            name: 'project-b',
            relativePath: '',
            children: [{ type: 'file', name: 'b.md', relativePath: 'b.md' }]
          }
        }
      ])

      render(<App />)

      // project-a's "docs" folder was persisted expanded, so its child is
      // visible without any click.
      expect(await screen.findByText('tables.md')).toBeInTheDocument()
      // project-b was persisted collapsed, so its tree never renders.
      expect(screen.queryByText('b.md')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'project-b' })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    })

    it('renders persisted tabs and preloads the persisted active tab', async () => {
      window.api.workspace.loadState = vi.fn().mockResolvedValue([
        {
          rootPath: 'C:\\Users\\dev\\project-a',
          collapsed: false,
          expandedPaths: [],
          tree: {
            type: 'folder',
            name: 'project-a',
            relativePath: '',
            children: [{ type: 'file', name: 'a.md', relativePath: 'a.md' }]
          }
        }
      ])
      window.api.workspace.loadTabs = vi.fn().mockResolvedValue({
        tabs: [
          {
            rootPath: 'C:\\Users\\dev\\project-a',
            relativePath: 'a.md',
            name: 'a.md',
            scrollPosition: null
          }
        ],
        activeTab: {
          rootPath: 'C:\\Users\\dev\\project-a',
          relativePath: 'a.md',
          name: 'a.md',
          scrollPosition: null
        }
      })
      window.api.workspace.readFile = vi.fn().mockResolvedValue('# Doc')

      render(<App />)

      expect(await within(screen.getByTestId('tab-bar')).findByText('a.md')).toBeInTheDocument()
      expect(await screen.findByRole('heading', { name: 'Doc' })).toBeInTheDocument()
      expect(window.api.workspace.readFile).toHaveBeenCalledWith(
        'C:\\Users\\dev\\project-a',
        'a.md'
      )
    })

    it('restores the persisted active tab and its scroll position even before the roots list has loaded', async () => {
      // loadState (roots) and loadTabs (the active tab) are two independent
      // mount-time IPC round trips - regression test for a real Slice 19 bug
      // where the persisted tab's content, and therefore its scroll
      // restore, silently never applied because MainPane refused to render
      // it until the *separately loaded* roots list caught up.
      let resolveLoadState: (roots: RestoredRoot[]) => void = () => {}
      window.api.workspace.loadState = vi.fn(
        () =>
          new Promise<RestoredRoot[]>((resolve) => {
            resolveLoadState = resolve
          })
      )
      window.api.workspace.loadTabs = vi.fn().mockResolvedValue({
        tabs: [
          {
            rootPath: 'C:\\Users\\dev\\project-a',
            relativePath: 'a.md',
            name: 'a.md',
            scrollPosition: 150
          }
        ],
        activeTab: {
          rootPath: 'C:\\Users\\dev\\project-a',
          relativePath: 'a.md',
          name: 'a.md',
          scrollPosition: 150
        }
      })
      window.api.workspace.readFile = vi.fn().mockResolvedValue('# Doc')

      render(<App />)

      expect(await screen.findByRole('heading', { name: 'Doc' })).toBeInTheDocument()
      const scrollContainer = document.querySelector('.preview-content') as HTMLDivElement
      expect(scrollContainer.scrollTop).toBe(150)

      // Roots resolving afterward shouldn't disturb any of the above.
      resolveLoadState([])
      await waitFor(() => expect(window.api.workspace.loadState).toHaveBeenCalled())
      expect(screen.getByRole('heading', { name: 'Doc' })).toBeInTheDocument()
    })
  })
})
