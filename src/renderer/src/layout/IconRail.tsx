import { Folder, Search, SlidersHorizontal } from 'lucide-react'
import type { SidebarView } from './types'

interface IconRailProps {
  sidebarView: SidebarView
  onShowFolders: () => void
  onOpenSettings: () => void
  onOpenSearch: () => void
}

// Search opens a modal rather than switching the sidebar view (see the
// "Search" decision in the shape) - Folders and Settings switch
// `sidebarView`, which both the sidebar and the main pane key off.
export function IconRail({
  sidebarView,
  onShowFolders,
  onOpenSettings,
  onOpenSearch
}: IconRailProps): React.JSX.Element {
  return (
    <div className="icon-rail" role="toolbar" aria-label="Views">
      <button
        type="button"
        className={
          sidebarView === 'folders' ? 'icon-rail-button icon-rail-active' : 'icon-rail-button'
        }
        aria-label="Folders"
        aria-pressed={sidebarView === 'folders'}
        onClick={onShowFolders}
      >
        <Folder size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button type="button" className="icon-rail-button" aria-label="Search" onClick={onOpenSearch}>
        <Search size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={
          sidebarView === 'settings' ? 'icon-rail-button icon-rail-active' : 'icon-rail-button'
        }
        aria-label="Settings"
        aria-pressed={sidebarView === 'settings'}
        onClick={onOpenSettings}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
