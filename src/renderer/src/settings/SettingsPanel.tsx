// Main-pane content while the Settings view is active. The section list
// lives in the sidebar - see SettingsNav.tsx. Only Appearance and About are
// real; the rest of design-v1.html's Appearance mockup (tree density,
// outline/tab-restore toggles, monospace font) stays out of v1 - only the
// theme picker was asked for.
import { Monitor, Sun, Moon } from 'lucide-react'
import type { SettingsSection, ThemeSource } from './types'

interface ThemeOption {
  value: ThemeSource
  label: string
  Icon: typeof Monitor
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', label: 'Follow system', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon }
]

interface SettingsPanelProps {
  section: SettingsSection
  themeSource: ThemeSource
  onSelectTheme: (themeSource: ThemeSource) => void
}

export function SettingsPanel({
  section,
  themeSource,
  onSelectTheme
}: SettingsPanelProps): React.JSX.Element {
  if (section === 'about') {
    return (
      <div className="settings-content">
        <h1 className="settings-title">About</h1>
        <p className="settings-description">
          MarkScope is a standalone Markdown reader for Windows. Point it at one or more local
          folders and it shows only the Markdown they contain, with your existing folder structure
          preserved and everything else filtered out. Reading is the focus: a distraction-free
          preview, a heading outline for quick navigation, and search across every open folder — no
          editing, no account, no network access.
        </p>
      </div>
    )
  }

  return (
    <div className="settings-content">
      <h1 className="settings-title">Appearance</h1>
      <p className="settings-description">
        MarkScope follows the Windows theme by default. Override it here if you read in a different
        light than you work.
      </p>
      <div className="settings-section">
        <h2 className="settings-section-title">Theme</h2>
        <div className="theme-options" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = value === themeSource
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={isActive ? 'theme-card theme-card-active' : 'theme-card'}
                onClick={() => onSelectTheme(value)}
              >
                <Icon size={20} className="theme-card-icon" aria-hidden="true" />
                <span className="theme-card-label">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
