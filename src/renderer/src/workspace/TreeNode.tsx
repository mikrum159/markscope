import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import type { FolderEntry, TreeEntry } from './types'
import { countFiles } from './treeStats'

interface TreeNodeProps {
  node: TreeEntry
  selectedPath: string | null
  expandedPaths: ReadonlySet<string>
  onSelectFile: (relativePath: string, name: string) => void
  onOpenTab: (relativePath: string, name: string) => void
  onToggleFolder: (relativePath: string) => void
}

export function TreeNode({
  node,
  selectedPath,
  expandedPaths,
  onSelectFile,
  onOpenTab,
  onToggleFolder
}: TreeNodeProps): React.JSX.Element {
  if (node.type === 'file') {
    const isSelected = node.relativePath === selectedPath
    return (
      <li className="tree-node">
        <button
          type="button"
          className={isSelected ? 'tree-file tree-file-selected' : 'tree-file'}
          aria-current={isSelected ? 'true' : undefined}
          aria-label={node.name}
          onClick={() => onSelectFile(node.relativePath, node.name)}
          onDoubleClick={() => onOpenTab(node.relativePath, node.name)}
        >
          <File size={14} strokeWidth={1.8} className="tree-icon" aria-hidden="true" />
          {node.name}
        </button>
      </li>
    )
  }

  return (
    <TreeFolder
      node={node}
      selectedPath={selectedPath}
      expandedPaths={expandedPaths}
      onSelectFile={onSelectFile}
      onOpenTab={onOpenTab}
      onToggleFolder={onToggleFolder}
    />
  )
}

function TreeFolder({
  node,
  selectedPath,
  expandedPaths,
  onSelectFile,
  onOpenTab,
  onToggleFolder
}: {
  node: FolderEntry
  selectedPath: string | null
  expandedPaths: ReadonlySet<string>
  onSelectFile: (relativePath: string, name: string) => void
  onOpenTab: (relativePath: string, name: string) => void
  onToggleFolder: (relativePath: string) => void
}): React.JSX.Element {
  const expanded = expandedPaths.has(node.relativePath)

  return (
    <li className="tree-node">
      <button
        type="button"
        className="tree-folder-toggle"
        aria-expanded={expanded}
        aria-label={node.name}
        onClick={() => onToggleFolder(node.relativePath)}
      >
        {expanded ? (
          <ChevronDown size={14} className="tree-caret" aria-hidden="true" />
        ) : (
          <ChevronRight size={14} className="tree-caret" aria-hidden="true" />
        )}
        <Folder size={15} strokeWidth={1.8} className="tree-icon" aria-hidden="true" />
        {node.name}
        <span className="tree-count" aria-hidden="true">
          {countFiles(node)}
        </span>
      </button>
      {expanded && (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.relativePath}
              node={child}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelectFile={onSelectFile}
              onOpenTab={onOpenTab}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
