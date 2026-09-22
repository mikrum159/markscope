import { useEffect, useState } from 'react'
import type { ThemeSource } from './types'

export interface UseSettingsResult {
  themeSource: ThemeSource
  setThemeSource: (themeSource: ThemeSource) => void
}

export function useSettings(): UseSettingsResult {
  const [themeSource, setThemeSourceState] = useState<ThemeSource>('system')

  useEffect(() => {
    let cancelled = false
    window.api.settings.getTheme().then((loaded) => {
      if (!cancelled) setThemeSourceState(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setThemeSource(next: ThemeSource): void {
    setThemeSourceState(next)
    void window.api.settings.setTheme(next)
  }

  return { themeSource, setThemeSource }
}
