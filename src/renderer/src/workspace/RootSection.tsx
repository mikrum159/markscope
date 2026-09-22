import { ChevronDown, ChevronRight, Folder, GripVertical, X } from 'lucide-react'
import { TreeView } from './TreeView'
import { rootLabel } from './rootLabel'
import type { Root } from './useWorkspaceRoots'

interface RootSectionProps {
  entry: Root
  selectedPath: string | null
  dragging: boolean
  dropIndicator: 'before' | 'after' | null
  onToggleRoot: () => void
  onRemoveRoot: () => void
  onToggleFolder: (relativePath: string) => void
  onSelectFile: (relativePath: string, name: string) => void
  onOpenTab: (relativePath: string, name: string) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (event: React.DragEvent<HTMLElement>) => void
  onDrop: (event: React.DragEvent<HTMLElement>) => void
}

export function RootSection({
  entry,
  selectedPath,
  dragging,
  dropIndicator,
  onToggleRoot,
  onRemoveRoot,
  onToggleFolder,
  onSelectFile,
  onOpenTab,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: RootSectionProps): React.JSX.Element {
  const dropIndicatorClass = dropIndicator ? ` root-section--drop-${dropIndicator}` : ''
  return (
    <section
      className={`root-section${dragging ? ' root-section--dragging' : ''}${dropIndicatorClass}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="root-header">
        <button
          type="button"
          className="root-toggle"
          title={entry.rootPath}
          aria-expanded={!entry.collapsed}
          aria-label={rootLabel(entry.rootPath)}
          onClick={onToggleRoot}
        >
          {entry.collapsed ? (
            <ChevronRight size={14} className="root-caret" aria-hidden="true" />
          ) : (
            <ChevronDown size={14} className="root-caret" aria-hidden="true" />
          )}
          <Folder size={15} strokeWidth={1.8} className="root-icon" aria-hidden="true" />
          <span className="root-name">{rootLabel(entry.rootPath)}</span>
        </button>
        <button
          type="button"
          className="root-drag-handle"
          aria-label={`Reorder ${rootLabel(entry.rootPath)}`}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVertical size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="root-remove"
          aria-label={`Remove ${rootLabel(entry.rootPath)}`}
          onClick={onRemoveRoot}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      {!entry.collapsed && (
        <TreeView
          root={entry.tree}
          rootLabel={entry.rootPath}
          selectedPath={selectedPath}
          expandedPaths={entry.expandedPaths}
          onSelectFile={onSelectFile}
          onOpenTab={onOpenTab}
          onToggleFolder={onToggleFolder}
        />
      )}
    </section>
  )
}
