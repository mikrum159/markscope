import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TreeView } from './TreeView'
import type { FolderEntry } from './types'

const tree: FolderEntry = {
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

const rootLabel = 'C:/Users/dev/test-docs'

function renderTree(overrides: Partial<React.ComponentProps<typeof TreeView>> = {}): {
  onToggleFolder: ReturnType<typeof vi.fn>
  onOpenTab: ReturnType<typeof vi.fn>
} {
  const onToggleFolder = vi.fn()
  const onOpenTab = vi.fn()
  render(
    <TreeView
      root={tree}
      rootLabel={rootLabel}
      selectedPath={null}
      expandedPaths={new Set()}
      onSelectFile={vi.fn()}
      onOpenTab={onOpenTab}
      onToggleFolder={onToggleFolder}
      {...overrides}
    />
  )
  return { onToggleFolder, onOpenTab }
}

describe('TreeView', () => {
  it('renders root-level files and folder names, with folders collapsed by default', () => {
    renderTree()

    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /docs/ })).toBeInTheDocument()
    expect(screen.queryByText('tables.md')).not.toBeInTheDocument()
  })

  it('reveals nested files when a folder is in expandedPaths', () => {
    renderTree({ expandedPaths: new Set(['docs']) })

    expect(screen.getByText('tables.md')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /docs/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onToggleFolder with the folder relative path when its toggle is clicked', () => {
    const { onToggleFolder } = renderTree()

    fireEvent.click(screen.getByRole('button', { name: /docs/ }))
    expect(onToggleFolder).toHaveBeenCalledWith('docs')
  })

  it('labels the list with the given root label', () => {
    renderTree()

    expect(screen.getByRole('list')).toHaveAttribute('aria-label', rootLabel)
  })

  it('calls onSelectFile with the relative path and name when a file row is clicked', () => {
    const onSelectFile = vi.fn()
    renderTree({ onSelectFile })

    fireEvent.click(screen.getByText('README.md'))
    expect(onSelectFile).toHaveBeenCalledWith('README.md', 'README.md')
  })

  it('marks the selected file row with aria-current', () => {
    renderTree({ selectedPath: 'README.md' })

    expect(screen.getByText('README.md')).toHaveAttribute('aria-current', 'true')
  })

  it('calls onOpenTab with the relative path and name when a file row is double-clicked', () => {
    const { onOpenTab } = renderTree()

    fireEvent.doubleClick(screen.getByText('README.md'))
    expect(onOpenTab).toHaveBeenCalledWith('README.md', 'README.md')
  })
})
