import { useState } from 'react'
import { HelpCircle, Plus } from 'lucide-react'
import { RootSection } from './RootSection'
import type { Root } from './useWorkspaceRoots'

interface SelectedFile {
  rootPath: string
  relativePath: string
}

interface DropTarget {
  rootPath: string
  position: 'before' | 'after'
}

interface FolderSidebarProps {
  roots: Root[]
  totalDocCount: number
  selectedFile: SelectedFile | null
  onAddFolder: () => void
  onToggleRoot: (rootPath: string) => void
  onRemoveRoot: (rootPath: string) => void
  onToggleFolder: (rootPath: string, relativePath: string) => void
  onSelectFile: (rootPath: string, relativePath: string, name: string) => void
  onOpenTab: (rootPath: string, relativePath: string, name: string) => void
  onMoveRoot: (
    draggedRootPath: string,
    targetRootPath: string,
    position: 'before' | 'after'
  ) => void
}

export function FolderSidebar({
  roots,
  totalDocCount,
  selectedFile,
  onAddFolder,
  onToggleRoot,
  onRemoveRoot,
  onToggleFolder,
  onSelectFile,
  onOpenTab,
  onMoveRoot
}: FolderSidebarProps): React.JSX.Element {
  const [draggedRootPath, setDraggedRootPath] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  function handleDragOver(event: React.DragEvent<HTMLElement>, targetRootPath: string): void {
    if (!draggedRootPath || draggedRootPath === targetRootPath) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    setDropTarget((current) =>
      current?.rootPath === targetRootPath && current.position === position
        ? current
        : { rootPath: targetRootPath, position }
    )
  }

  function handleDrop(event: React.DragEvent<HTMLElement>, targetRootPath: string): void {
    event.preventDefault()
    if (draggedRootPath && dropTarget && dropTarget.rootPath === targetRootPath) {
      onMoveRoot(draggedRootPath, targetRootPath, dropTarget.position)
    }
    setDraggedRootPath(null)
    setDropTarget(null)
  }
  return (
    <>
      <div className="sidebar-section-header">
        <span className="sidebar-section-title">Folders</span>
        <button
          type="button"
          className="icon-button"
          title="Add folder"
          aria-label="+ Add Folder"
          onClick={onAddFolder}
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-roots">
        {roots.length === 0 ? (
          <p className="placeholder">No folders added yet.</p>
        ) : (
          roots.map((entry) => (
            <RootSection
              key={entry.rootPath}
              entry={entry}
              selectedPath={
                selectedFile?.rootPath === entry.rootPath ? selectedFile.relativePath : null
              }
              onToggleRoot={() => onToggleRoot(entry.rootPath)}
              onRemoveRoot={() => onRemoveRoot(entry.rootPath)}
              onToggleFolder={(relativePath) => onToggleFolder(entry.rootPath, relativePath)}
              dragging={draggedRootPath === entry.rootPath}
              dropIndicator={dropTarget?.rootPath === entry.rootPath ? dropTarget.position : null}
              onDragStart={() => setDraggedRootPath(entry.rootPath)}
              onDragEnd={() => {
                setDraggedRootPath(null)
                setDropTarget(null)
              }}
              onDragOver={(event) => handleDragOver(event, entry.rootPath)}
              onDrop={(event) => handleDrop(event, entry.rootPath)}
              onSelectFile={(relativePath, name) =>
                onSelectFile(entry.rootPath, relativePath, name)
              }
              onOpenTab={(relativePath, name) => onOpenTab(entry.rootPath, relativePath, name)}
            />
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-footer-count">{totalDocCount} documents indexed</span>
        <HelpCircle size={14} className="sidebar-footer-help" aria-hidden="true" />
      </div>
    </>
  )
}
