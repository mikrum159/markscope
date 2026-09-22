import type { FolderEntry } from './types'
import { TreeNode } from './TreeNode'

interface TreeViewProps {
  root: FolderEntry
  rootLabel: string
  selectedPath: string | null
  expandedPaths: ReadonlySet<string>
  onSelectFile: (relativePath: string, name: string) => void
  onOpenTab: (relativePath: string, name: string) => void
  onToggleFolder: (relativePath: string) => void
}

export function TreeView({
  root,
  rootLabel,
  selectedPath,
  expandedPaths,
  onSelectFile,
  onOpenTab,
  onToggleFolder
}: TreeViewProps): React.JSX.Element {
  return (
    <ul className="tree-view" aria-label={rootLabel}>
      {root.children.map((child) => (
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
  )
}
