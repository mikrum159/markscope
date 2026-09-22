import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  describe('appearance section', () => {
    it('renders the three theme options with the current one checked', () => {
      render(<SettingsPanel section="appearance" themeSource="dark" onSelectTheme={vi.fn()} />)

      expect(screen.getByRole('radio', { name: 'Follow system' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
      expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    })

    it('calls onSelectTheme with the clicked option', () => {
      const onSelectTheme = vi.fn()
      render(
        <SettingsPanel section="appearance" themeSource="system" onSelectTheme={onSelectTheme} />
      )

      screen.getByRole('radio', { name: 'Light' }).click()

      expect(onSelectTheme).toHaveBeenCalledWith('light')
    })
  })

  describe('about section', () => {
    it('renders a description of the app instead of theme controls', () => {
      render(<SettingsPanel section="about" themeSource="system" onSelectTheme={vi.fn()} />)

      expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    })
  })
})
