import { AlignLeft } from 'lucide-react'
import type { Tab as DocumentTab } from '../tabs/useDocumentTabs'
import type { SidebarView } from './types'
import { DocumentTabItem, SettingsTab } from './Tab'

export type DisplayTab =
  ({ kind: 'document' } & DocumentTab & { isPreview: boolean }) | { kind: 'settings' }

interface TabBarProps {
  tabs: DisplayTab[]
  sidebarView: SidebarView
  activeDocument: { rootPath: string; relativePath: string } | null
  onClickPreviewTab: (rootPath: string, relativePath: string, name: string) => void
  onOpenDocumentTab: (rootPath: string, relativePath: string, name: string) => void
  onSelectPersistedTab: (tab: DocumentTab) => void
  onClosePreviewTab: () => void
  onCloseDocumentTab: (rootPath: string, relativePath: string) => void
  onSelectSettingsTab: () => void
  onCloseSettingsTab: () => void
  outlineVisible: boolean
  onToggleOutline: () => void
}

export function TabBar({
  tabs,
  sidebarView,
  activeDocument,
  onClickPreviewTab,
  onOpenDocumentTab,
  onSelectPersistedTab,
  onClosePreviewTab,
  onCloseDocumentTab,
  onSelectSettingsTab,
  onCloseSettingsTab,
  outlineVisible,
  onToggleOutline
}: TabBarProps): React.JSX.Element {
  // The outline toggle only makes sense with a document in focus - hidden
  // for the empty state and for the Settings tab, matching the mockup's
  // trailing tab-bar button (design-v1.html), which sits only in the
  // document-reading chrome.
  const showOutlineToggle = sidebarView === 'folders' && activeDocument !== null

  return (
    <div className="tab-bar" data-testid="tab-bar" aria-label="Open documents">
      {tabs.map((tab) => {
        if (tab.kind === 'settings') {
          return (
            <SettingsTab
              key="settings"
              isActive={sidebarView === 'settings'}
              onSelect={onSelectSettingsTab}
              onClose={onCloseSettingsTab}
            />
          )
        }

        const isActive =
          sidebarView === 'folders' &&
          activeDocument?.rootPath === tab.rootPath &&
          activeDocument?.relativePath === tab.relativePath

        return (
          <DocumentTabItem
            key={`${tab.rootPath}::${tab.relativePath}`}
            tab={tab}
            isActive={isActive}
            onClickPreviewTab={onClickPreviewTab}
            onOpenDocumentTab={onOpenDocumentTab}
            onSelectPersistedTab={onSelectPersistedTab}
            onClosePreviewTab={onClosePreviewTab}
            onCloseDocumentTab={onCloseDocumentTab}
          />
        )
      })}
      <div className="tab-bar-spacer" />
      {showOutlineToggle && (
        <button
          type="button"
          className={
            outlineVisible
              ? 'tab-bar-outline-toggle tab-bar-outline-toggle-active'
              : 'tab-bar-outline-toggle'
          }
          aria-label={outlineVisible ? 'Hide outline' : 'Show outline'}
          aria-pressed={outlineVisible}
          onClick={onToggleOutline}
        >
          <AlignLeft size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
