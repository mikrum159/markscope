import { type RefObject, useMemo } from 'react'
import { DocumentPreview } from '../preview/DocumentPreview'
import { SettingsPanel } from '../settings/SettingsPanel'
import type { SettingsSection, ThemeSource } from '../settings/types'
import type { PreviewState } from '../tabs/useDocumentTabs'
import type { SidebarView } from './types'
import { OutlineRail } from './OutlineRail'
import { Breadcrumb } from './Breadcrumb'
import { extractHeadings, findActiveHeadingPath, type OutlineHeading } from '../preview/headings'
import { useActiveHeading } from '../preview/useActiveHeading'
import { useDelayedFlag } from '../preview/useDelayedFlag'

const NO_HEADINGS: OutlineHeading[] = []

// How long a document has to stay in `loading` before the placeholder is worth
// showing. Reads are local and normally resolve in about a millisecond, so
// rendering the placeholder the instant the status changes made it flash on
// every file switch - visible as a flicker rather than as information. Below
// roughly 100ms a person doesn't need feedback that anything is happening;
// past a second they need it. 200ms clears every ordinary read while still
// catching a genuinely slow one (test-docs/big/large.md, ~5.3MB).
const LOADING_PLACEHOLDER_DELAY_MS = 200

interface MainPaneProps {
  sidebarView: SidebarView
  preview: PreviewState | null
  // Attached to the scrollable `.preview-content` div - see
  // useDocumentTabs.ts's capture/restore effect (Slice 17).
  previewScrollRef: RefObject<HTMLDivElement | null>
  outlineCollapsed: boolean
  onToggleOutline: () => void
  settingsSection: SettingsSection
  themeSource: ThemeSource
  onSelectTheme: (themeSource: ThemeSource) => void
}

export function MainPane({
  sidebarView,
  preview,
  previewScrollRef,
  outlineCollapsed,
  onToggleOutline,
  settingsSection,
  themeSource,
  onSelectTheme
}: MainPaneProps): React.JSX.Element {
  const headings = useMemo(
    () => (preview?.status === 'ready' ? extractHeadings(preview.content) : NO_HEADINGS),
    [preview]
  )
  const activeId = useActiveHeading(headings, previewScrollRef)
  const { topLevel, active } = useMemo(
    () => findActiveHeadingPath(headings, activeId),
    [headings, activeId]
  )
  // Collapses to a single breadcrumb segment when the active heading is
  // already top-level - avoids repeating the same text twice.
  const activeHeadingText = active && active.id !== topLevel?.id ? active.text : null
  // Deliberately renders nothing during the delay rather than holding the
  // previous document: the breadcrumb and outline rail have already switched
  // to the incoming file, so keeping the old body would leave the chrome and
  // the content describing different documents. A blank frame or two at local
  // read speed is not perceptible; a mismatch would be.
  const showLoadingPlaceholder = useDelayedFlag(
    preview?.status === 'loading',
    LOADING_PLACEHOLDER_DELAY_MS
  )

  return (
    <main className="preview" data-testid="preview" aria-label="Document preview">
      {sidebarView === 'settings' ? (
        <SettingsPanel
          section={settingsSection}
          themeSource={themeSource}
          onSelectTheme={onSelectTheme}
        />
      ) : (
        preview && (
          <>
            <Breadcrumb
              rootPath={preview.rootPath}
              documentPath={preview.relativePath}
              topLevelHeading={topLevel?.text ?? null}
              activeHeading={activeHeadingText}
            />
            <div className="preview-body">
              <div className="preview-content" ref={previewScrollRef}>
                {showLoadingPlaceholder && <p className="placeholder">Loading {preview.name}…</p>}
                {preview.status === 'error' && (
                  <p className="placeholder">Couldn&apos;t open {preview.name}.</p>
                )}
                {preview.status === 'ready' && (
                  <DocumentPreview
                    content={preview.content}
                    rootPath={preview.rootPath}
                    documentPath={preview.relativePath}
                  />
                )}
              </div>
              {!outlineCollapsed && (
                <OutlineRail
                  headings={headings}
                  activeId={activeId}
                  topLevelActiveId={topLevel?.id ?? null}
                  onHide={onToggleOutline}
                />
              )}
            </div>
          </>
        )
      )}
    </main>
  )
}
