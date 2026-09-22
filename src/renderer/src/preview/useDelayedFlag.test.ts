import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDelayedFlag } from './useDelayedFlag'

const DELAY = 200

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('useDelayedFlag', () => {
  it('is false while inactive, however much time passes', () => {
    const { result } = renderHook(() => useDelayedFlag(false, DELAY))
    expect(result.current).toBe(false)
    advance(DELAY * 10)
    expect(result.current).toBe(false)
  })

  it('is false immediately on becoming active', () => {
    const { result } = renderHook(() => useDelayedFlag(true, DELAY))
    expect(result.current).toBe(false)
  })

  it('is still false one tick before the delay elapses', () => {
    const { result } = renderHook(() => useDelayedFlag(true, DELAY))
    advance(DELAY - 1)
    expect(result.current).toBe(false)
  })

  it('becomes true once the delay elapses', () => {
    const { result } = renderHook(() => useDelayedFlag(true, DELAY))
    advance(DELAY)
    expect(result.current).toBe(true)
  })

  // The case the hook exists for: a fast local file read finishes well inside
  // the delay, so the placeholder it guards is never rendered at all.
  it('never becomes true when active ends before the delay', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, DELAY), {
      initialProps: { active: true }
    })

    // Asserted while still active, not only at the end: the defect this
    // guards is the flag being true *during* a short activation, which a
    // final-state-only check cannot see.
    advance(1)
    expect(result.current).toBe(false)

    rerender({ active: false })
    advance(DELAY * 10)

    expect(result.current).toBe(false)
  })

  it('goes back to false when active ends after the delay', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, DELAY), {
      initialProps: { active: true }
    })

    advance(DELAY)
    expect(result.current).toBe(true)

    rerender({ active: false })
    expect(result.current).toBe(false)
  })

  it('restarts the delay on a later activation rather than firing straight away', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, DELAY), {
      initialProps: { active: true }
    })

    advance(DELAY)
    expect(result.current).toBe(true)

    rerender({ active: false })
    rerender({ active: true })
    expect(result.current).toBe(false)

    advance(DELAY)
    expect(result.current).toBe(true)
  })
})
