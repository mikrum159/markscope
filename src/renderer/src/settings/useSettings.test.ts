import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSettings } from './useSettings'

function stubApi(getTheme = vi.fn().mockResolvedValue('system')): void {
  window.api = {
    settings: {
      getTheme,
      setTheme: vi.fn().mockResolvedValue(undefined)
    }
  } as unknown as Window['api']
}

afterEach(() => {
  // @ts-expect-error - test-only cleanup of the preload bridge stub
  delete window.api
})

describe('useSettings', () => {
  it('loads the persisted theme on mount', async () => {
    stubApi(vi.fn().mockResolvedValue('dark'))
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.themeSource).toBe('dark'))
  })

  it('updates local state immediately and persists via IPC on change', async () => {
    stubApi()
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.themeSource).toBe('system'))

    act(() => result.current.setThemeSource('light'))

    expect(result.current.themeSource).toBe('light')
    expect(window.api.settings.setTheme).toHaveBeenCalledWith('light')
  })
})
