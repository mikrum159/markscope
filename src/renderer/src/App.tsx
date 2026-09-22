import { useEffect, useState } from 'react'
import { useWorkspaceRoots } from './workspace/useWorkspaceRoots'
import { FolderSidebar } from './workspace/FolderSidebar'
import { useDocumentTabs } from './tabs/useDocumentTabs'
import type { Tab } from './tabs/useDocumentTabs'
import { countFiles } from './workspace/treeStats'
import { IconRail } from './layout/IconRail'
import { TabBar } from './layout/TabBar'
import type { DisplayTab } from './layout/TabBar'
import { MainPane } from './layout/MainPane'
import type { SidebarView } from './layout/types'
import { SettingsNav } from './settings/SettingsNav'
import { useSettings } from './settings/useSettings'
import type { SettingsSection } from './settings/types'
import { QuickOpenModal } from './search/QuickOpenModal'

function App(): React.JSX.Element {
  const {
    roots,
    addFolder,
    removeRoot: removeWorkspaceRoot,
    toggleRoot,
    toggleFolder,
    revealInTree,
    moveRoot
  } = useWorkspaceRoots()
  const {
    tabs,
    previewTab,
    preview,
    previewScrollRef,
    handleClickFile: selectPreviewFile,
    handleOpenTab: openDocumentTab,
    handleClosePreviewTab,
    handleSelectTab: selectPersistedTab,
    handleCloseTab,
    closeRootTabs
  } = useDocumentTabs(revealInTree)

  // Non-folder views reachable from the sidebar icon-rail. `settingsOpen`
  // tracks whether the Settings tab exists in the tab bar; `sidebarView`
  // tracks which view the sidebar (and, when not 'folders', the main pane)
  // is currently showing - kept separate from `preview`, so switching back
  // to Folders/a document doesn't lose the settings tab's own state.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState<SidebarView>('folders')
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('appearance')
  const { themeSource, setThemeSource } = useSettings()
  const [searchOpen, setSearchOpen] = useState(false)
  // Outline rail collapse - renderer-only, not persisted (matches
  // `sidebarView`), see Slice 14 agreement.
  const [outlineCollapsed, setOutlineCollapsed] = useState(false)

  // Ctrl+F opens Search from anywhere - unclaimed in this app (no in-document
  // find yet) and the most recognizable "search" binding available. Global
  // rather than input-scoped, matching how the icon-rail button is always
  // reachable regardless of what has focus. Doesn't toggle closed on a
  // second press - closing while typing a query would be surprising.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Refuses any file dropped outside a component that handles drops itself
  // (RootSection's reorder zones call preventDefault on their own). Chromium's
  // default for an unhandled drop is to navigate to the dropped file, which
  // would unload the app - dragging a Markdown file onto the reader being the
  // obvious thing to try. Main blocks the navigation too (will-navigate in
  // main/index.ts); refusing it here as well means the drag shows a "no drop"
  // cursor instead of appearing to work and then doing nothing.
  useEffect(() => {
    function refuseDrop(event: DragEvent): void {
      if (event.defaultPrevented) return
      event.preventDefault()
      if (event.type === 'dragover' && event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none'
      }
    }
    document.addEventListener('dragover', refuseDrop)
    document.addEventListener('drop', refuseDrop)
    return () => {
      document.removeEventListener('dragover', refuseDrop)
      document.removeEventListener('drop', refuseDrop)
    }
  }, [])

  function handleRemoveRoot(rootPath: string): void {
    removeWorkspaceRoot(rootPath)
    closeRootTabs(rootPath)
  }

  function handleClickFile(rootPath: string, relativePath: string, name: string): void {
    setSidebarView('folders')
    selectPreviewFile(rootPath, relativePath, name)
  }

  function handleOpenTab(rootPath: string, relativePath: string, name: string): void {
    setSidebarView('folders')
    openDocumentTab(rootPath, relativePath, name)
  }

  function handleSelectTab(tab: Tab): void {
    setSidebarView('folders')
    selectPersistedTab(tab)
  }

  function handleShowFolders(): void {
    setSidebarView('folders')
  }

  function handleOpenSettings(): void {
    setSettingsOpen(true)
    setSidebarView('settings')
  }

  function handleSelectSettingsTab(): void {
    setSidebarView('settings')
  }

  function handleCloseSettingsTab(): void {
    setSettingsOpen(false)
    setSidebarView((current) => (current === 'settings' ? 'folders' : current))
  }

  function handleToggleOutline(): void {
    setOutlineCollapsed((current) => !current)
  }

  const documentTabs: DisplayTab[] = [
    ...tabs.map((tab) => ({ kind: 'document' as const, ...tab, isPreview: false })),
    ...(previewTab ? [{ kind: 'document' as const, ...previewTab, isPreview: true }] : [])
  ]
  const displayTabs: DisplayTab[] = [
    ...documentTabs,
    ...(settingsOpen ? [{ kind: 'settings' as const }] : [])
  ]

  const totalDocCount = roots.reduce((total, entry) => total + countFiles(entry.tree), 0)

  return (
    <div className="app-shell">
      <aside
        className="sidebar"
        data-testid="sidebar"
        aria-label={sidebarView === 'settings' ? 'Settings' : 'Folders'}
      >
        <IconRail
          sidebarView={sidebarView}
          onShowFolders={handleShowFolders}
          onOpenSettings={handleOpenSettings}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {sidebarView === 'settings' ? (
          <>
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">Settings</span>
            </div>
            <SettingsNav activeSection={settingsSection} onSelectSection={setSettingsSection} />
          </>
        ) : (
          <FolderSidebar
            roots={roots}
            totalDocCount={totalDocCount}
            selectedFile={
              preview ? { rootPath: preview.rootPath, relativePath: preview.relativePath } : null
            }
            onAddFolder={addFolder}
            onToggleRoot={toggleRoot}
            onRemoveRoot={handleRemoveRoot}
            onToggleFolder={toggleFolder}
            onSelectFile={handleClickFile}
            onOpenTab={handleOpenTab}
            onMoveRoot={moveRoot}
          />
        )}
      </aside>
      <TabBar
        tabs={displayTabs}
        sidebarView={sidebarView}
        activeDocument={
          preview ? { rootPath: preview.rootPath, relativePath: preview.relativePath } : null
        }
        onClickPreviewTab={handleClickFile}
        onOpenDocumentTab={handleOpenTab}
        onSelectPersistedTab={handleSelectTab}
        onClosePreviewTab={handleClosePreviewTab}
        onCloseDocumentTab={handleCloseTab}
        onSelectSettingsTab={handleSelectSettingsTab}
        onCloseSettingsTab={handleCloseSettingsTab}
        outlineVisible={!outlineCollapsed}
        onToggleOutline={handleToggleOutline}
      />
      <MainPane
        sidebarView={sidebarView}
        preview={preview}
        previewScrollRef={previewScrollRef}
        outlineCollapsed={outlineCollapsed}
        onToggleOutline={handleToggleOutline}
        settingsSection={settingsSection}
        themeSource={themeSource}
        onSelectTheme={setThemeSource}
      />
      {searchOpen && (
        <QuickOpenModal onClose={() => setSearchOpen(false)} onOpenDocument={handleOpenTab} />
      )}
    </div>
  )
}

export default App
