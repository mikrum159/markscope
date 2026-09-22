import { File, SlidersHorizontal, X } from 'lucide-react'
import type { Tab as DocumentTab } from '../tabs/useDocumentTabs'

interface DocumentTabItemProps {
  tab: DocumentTab & { isPreview: boolean }
  isActive: boolean
  onClickPreviewTab: (rootPath: string, relativePath: string, name: string) => void
  onOpenDocumentTab: (rootPath: string, relativePath: string, name: string) => void
  onSelectPersistedTab: (tab: DocumentTab) => void
  onClosePreviewTab: () => void
  onCloseDocumentTab: (rootPath: string, relativePath: string) => void
}

export function DocumentTabItem({
  tab,
  isActive,
  onClickPreviewTab,
  onOpenDocumentTab,
  onSelectPersistedTab,
  onClosePreviewTab,
  onCloseDocumentTab
}: DocumentTabItemProps): React.JSX.Element {
  const className = tab.isPreview
    ? isActive
      ? 'tab tab-active tab-preview'
      : 'tab tab-preview'
    : isActive
      ? 'tab tab-active'
      : 'tab'

  return (
    <div className={className}>
      <File size={14} strokeWidth={1.8} className="tab-icon" aria-hidden="true" />
      <button
        type="button"
        className="tab-label"
        title={tab.relativePath}
        aria-current={isActive ? 'true' : undefined}
        onClick={() =>
          tab.isPreview
            ? onClickPreviewTab(tab.rootPath, tab.relativePath, tab.name)
            : onSelectPersistedTab(tab)
        }
        onDoubleClick={() =>
          tab.isPreview && onOpenDocumentTab(tab.rootPath, tab.relativePath, tab.name)
        }
      >
        {tab.name}
      </button>
      {tab.isPreview && (
        <span className="tab-preview-chip" aria-hidden="true">
          preview
        </span>
      )}
      <button
        type="button"
        className="tab-close"
        aria-label={`Close ${tab.name}`}
        onClick={() =>
          tab.isPreview ? onClosePreviewTab() : onCloseDocumentTab(tab.rootPath, tab.relativePath)
        }
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

interface SettingsTabProps {
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}

export function SettingsTab({ isActive, onSelect, onClose }: SettingsTabProps): React.JSX.Element {
  return (
    <div className={isActive ? 'tab tab-active' : 'tab'}>
      <SlidersHorizontal size={14} className="tab-icon" aria-hidden="true" />
      <button
        type="button"
        className="tab-label"
        aria-current={isActive ? 'true' : undefined}
        onClick={onSelect}
      >
        Settings
      </button>
      <button type="button" className="tab-close" aria-label="Close Settings" onClick={onClose}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
