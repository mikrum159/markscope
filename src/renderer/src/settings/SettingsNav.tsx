// The sidebar's section list while the Settings view is active. Lives next
// to SettingsPanel.tsx (the content pane) rather than inside it, since the
// sidebar - not the main pane - owns this list now (see App.tsx's
// SidebarView switch).
import { SETTINGS_NAV_ITEMS, type SettingsSection } from './types'

interface SettingsNavProps {
  activeSection: SettingsSection
  onSelectSection: (section: SettingsSection) => void
}

export function SettingsNav({
  activeSection,
  onSelectSection
}: SettingsNavProps): React.JSX.Element {
  return (
    <nav className="sidebar-settings-nav" aria-label="Settings sections">
      <ul>
        {SETTINGS_NAV_ITEMS.map((item) => {
          if (!item.enabled) {
            return (
              <li key={item.id} className="settings-nav-item settings-nav-item-disabled">
                {item.label}
              </li>
            )
          }
          const isActive = item.id === activeSection
          return (
            <li key={item.id}>
              <button
                type="button"
                className={
                  isActive ? 'settings-nav-item settings-nav-item-active' : 'settings-nav-item'
                }
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelectSection(item.id)}
              >
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
