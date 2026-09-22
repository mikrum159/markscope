import { rootLabel } from '../workspace/rootLabel'

interface BreadcrumbProps {
  rootPath: string
  documentPath: string
  // The scroll-spied heading path (Slice 18) - see MainPane's
  // findActiveHeadingPath call. topLevelHeading is the depth-0 section the
  // scroll position is currently under; activeHeading is a deeper heading
  // within it, or null when the active heading is itself top-level (in which
  // case topLevelHeading alone represents the current position).
  topLevelHeading: string | null
  activeHeading: string | null
}

// File-path breadcrumb above the document content, matching design-v1.html's
// mockup: root name / folder chain / filename, then (once scroll-spy has a
// result) the in-document section under a "›" divider - matching the
// mockup's own two-tone styling (bold section heading, muted specific one).
export function Breadcrumb({
  rootPath,
  documentPath,
  topLevelHeading,
  activeHeading
}: BreadcrumbProps): React.JSX.Element {
  const segments = documentPath.split(/[/\\]/).filter(Boolean)
  const fileName = segments[segments.length - 1] ?? documentPath
  const folderSegments = segments.slice(0, -1)

  return (
    <div className="breadcrumb" aria-label="Document location">
      <span className="breadcrumb-segment">{rootLabel(rootPath)}</span>
      {folderSegments.length > 0 && (
        <>
          <span className="breadcrumb-divider" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-segment">{folderSegments.join(' / ')}</span>
        </>
      )}
      <span className="breadcrumb-divider" aria-hidden="true">
        /
      </span>
      <span className="breadcrumb-current">{fileName}</span>
      {topLevelHeading && (
        <>
          <span className="breadcrumb-separator" aria-hidden="true" />
          <span className="breadcrumb-heading">{topLevelHeading}</span>
          {activeHeading && (
            <>
              <span className="breadcrumb-divider" aria-hidden="true">
                ›
              </span>
              <span className="breadcrumb-heading-leaf">{activeHeading}</span>
            </>
          )}
        </>
      )}
    </div>
  )
}
