import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsNav } from './SettingsNav'

describe('SettingsNav', () => {
  it('renders all five sections, enabled and disabled alike', () => {
    render(<SettingsNav activeSection="appearance" onSelectSection={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText('Folders')).toBeInTheDocument()
    expect(screen.getByText('Search & index')).toBeInTheDocument()
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument()
  })

  it('marks the active enabled section and not the others', () => {
    render(<SettingsNav activeSection="about" onSelectSection={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'About' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Appearance' })).not.toHaveAttribute('aria-current')
  })

  it('calls onSelectSection when an enabled item is clicked', () => {
    const onSelectSection = vi.fn()
    render(<SettingsNav activeSection="appearance" onSelectSection={onSelectSection} />)

    screen.getByRole('button', { name: 'About' }).click()

    expect(onSelectSection).toHaveBeenCalledWith('about')
  })

  it('renders disabled sections as non-interactive text, not buttons', () => {
    render(<SettingsNav activeSection="appearance" onSelectSection={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Folders' })).not.toBeInTheDocument()
  })
})
