import { type RefObject, useEffect, useState } from 'react'
import type { OutlineHeading } from './headings'

// A heading counts as "reached" once it's within this many pixels of the
// scroll container's visible top edge - a small tolerance rather than
// requiring exact pixel alignment.
const ACTIVE_THRESHOLD_PX = 4

function computeActiveId(headings: OutlineHeading[], container: HTMLDivElement): string | null {
  const containerTop = container.getBoundingClientRect().top
  let activeId: string | null = null
  for (const heading of headings) {
    const element = document.getElementById(heading.id)
    if (!element) continue
    const headingTop = element.getBoundingClientRect().top - containerTop
    // Headings render in document order, so the first one still below the
    // threshold means every later one is too - nothing further to check.
    if (headingTop > ACTIVE_THRESHOLD_PX) break
    activeId = heading.id
  }
  return activeId
}

// Tracks which heading is currently at/above the top of the scrollable
// preview container - OutlineRail's two-tier highlight and Breadcrumb's
// in-document segment both derive from this one id. Plain scroll listener
// plus manual geometry (rAF-throttled), matching this codebase's existing
// direct-DOM-read style (Slice 17's scroll capture/restore) rather than
// IntersectionObserver.
export function useActiveHeading(
  headings: OutlineHeading[],
  scrollRef: RefObject<HTMLDivElement | null>
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container || headings.length === 0) {
      setActiveId(null)
      return
    }

    let frame: number | null = null
    const recompute = (): void => {
      frame = null
      setActiveId(computeActiveId(headings, container))
    }
    const handleScroll = (): void => {
      if (frame !== null) return
      frame = requestAnimationFrame(recompute)
    }

    // Runs once immediately too, so a tab switch that lands mid-document
    // (Slice 17's scroll restore) shows the right highlight before any
    // scroll event fires.
    recompute()
    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [headings, scrollRef])

  return activeId
}
