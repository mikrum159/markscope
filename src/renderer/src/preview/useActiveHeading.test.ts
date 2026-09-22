import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useActiveHeading } from './useActiveHeading'
import type { OutlineHeading } from './headings'

const headings: OutlineHeading[] = [
  { id: 'h-one', text: 'One', depth: 0 },
  { id: 'h-two', text: 'Two', depth: 1 },
  { id: 'h-three', text: 'Three', depth: 0 }
]

// jsdom doesn't run layout, so getBoundingClientRect() always returns zeros -
// these helpers fake the geometry useActiveHeading reads, standing in for
// "how far below the scroll container's top edge is this element right now."
function mockTop(element: Element, top: number): void {
  element.getBoundingClientRect = () => ({ top }) as DOMRect
}

function setUp(): { container: HTMLDivElement } {
  const container = document.createElement('div')
  mockTop(container, 0)
  document.body.appendChild(container)
  for (const heading of headings) {
    const el = document.createElement('div')
    el.id = heading.id
    container.appendChild(el)
  }
  return { container }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useActiveHeading', () => {
  it('returns null when there are no headings', () => {
    const { container } = setUp()
    const { result } = renderHook(() => useActiveHeading([], { current: container }))
    expect(result.current).toBeNull()
  })

  it('returns null when nothing has been scrolled to yet', () => {
    const { container } = setUp()
    for (const heading of headings) {
      mockTop(document.getElementById(heading.id)!, 300)
    }

    const { result } = renderHook(() => useActiveHeading(headings, { current: container }))
    expect(result.current).toBeNull()
  })

  it('picks the last heading at or above the top edge, on mount', () => {
    const { container } = setUp()
    mockTop(document.getElementById('h-one')!, -100)
    mockTop(document.getElementById('h-two')!, 2)
    mockTop(document.getElementById('h-three')!, 300)

    const { result } = renderHook(() => useActiveHeading(headings, { current: container }))
    expect(result.current).toBe('h-two')
  })

  it('recomputes on scroll', async () => {
    const { container } = setUp()
    mockTop(document.getElementById('h-one')!, -300)
    mockTop(document.getElementById('h-two')!, -100)
    mockTop(document.getElementById('h-three')!, 300)

    const { result } = renderHook(() => useActiveHeading(headings, { current: container }))
    expect(result.current).toBe('h-two')

    mockTop(document.getElementById('h-three')!, 1)
    await act(async () => {
      container.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
    expect(result.current).toBe('h-three')
  })
})
