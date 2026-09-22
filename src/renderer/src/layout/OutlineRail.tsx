import { ChevronRight } from 'lucide-react'
import type { OutlineHeading } from '../preview/headings'

interface OutlineRailProps {
  headings: OutlineHeading[]
  // Id of the heading currently at/above the scroll container's top edge,
  // and the id of the depth-0 heading it falls under (same id when the
  // active heading is itself depth 0) - see useActiveHeading/
  // findActiveHeadingPath. Both null before any scroll-spy result exists.
  activeId: string | null
  topLevelActiveId: string | null
  onHide: () => void
}

// Scrolls the document preview to a heading - DocumentPreview's rehype-slug
// plugin gives rendered <h1>-<h6> elements the same ids headings.ts computes
// here, so a plain getElementById lookup finds the right one. Only one
// document is ever mounted at a time (MainPane), so id collisions across
// open tabs aren't a concern.
function jumpToHeading(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Right-hand collapsible outline rail (Slice 14 shell, Slice 16 content,
// Slice 18 scroll-spy): real headings extracted from the open document,
// clicking one scrolls the preview to it. The two-tier highlight
// (accent-colored top-level ancestor, subtly-shaded active leaf) mirrors
// design-v1.html's mockup exactly. Visibility is controlled entirely by the
// caller (MainPane only mounts this when open) so a hidden rail takes no
// layout space.
export function OutlineRail({
  headings,
  activeId,
  topLevelActiveId,
  onHide
}: OutlineRailProps): React.JSX.Element {
  return (
    <aside className="outline-rail" aria-label="Outline">
      <div className="outline-rail-header">
        <span className="outline-rail-title">Outline</span>
        <button type="button" className="icon-button" aria-label="Hide outline" onClick={onHide}>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="outline-rail-body">
        {headings.length === 0 ? (
          <p className="outline-rail-placeholder">No headings in this document.</p>
        ) : (
          <ul className="outline-list">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  type="button"
                  className="outline-item"
                  data-level={heading.depth === 0 ? 'top' : undefined}
                  data-active={
                    heading.id === topLevelActiveId
                      ? 'ancestor'
                      : heading.id === activeId
                        ? 'leaf'
                        : undefined
                  }
                  style={{
                    paddingLeft: `calc(var(--space-2) + ${heading.depth} * var(--space-3))`
                  }}
                  onClick={() => jumpToHeading(heading.id)}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
