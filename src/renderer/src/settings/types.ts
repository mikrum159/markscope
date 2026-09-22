// 'system' mirrors the main process's ThemeSource (rootsRepository.ts) -
// duplicated rather than cross-imported, matching this codebase's existing
// renderer/main type-duplication precedent (see workspace/types.ts).
export type ThemeSource = 'system' | 'light' | 'dark'

export type SettingsSection = 'appearance' | 'about'

export interface SettingsNavItem {
  id: SettingsSection
  label: string
  enabled: true
}

export interface SettingsNavPlaceholder {
  id: string
  label: string
  enabled: false
}

// Full nav list from design-v1.html's Settings mockup. Only Appearance and
// About have real content in v1 (see the shape's Settings Decision); the
// rest stay visible-but-disabled rather than disappearing, so the section
// list's shape doesn't change twice as they land later.
export const SETTINGS_NAV_ITEMS: (SettingsNavItem | SettingsNavPlaceholder)[] = [
  { id: 'appearance', label: 'Appearance', enabled: true },
  { id: 'folders', label: 'Folders', enabled: false },
  { id: 'search', label: 'Search & index', enabled: false },
  { id: 'shortcuts', label: 'Keyboard shortcuts', enabled: false },
  { id: 'about', label: 'About', enabled: true }
]
