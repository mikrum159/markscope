import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface Tab {
  rootPath: string
  relativePath: string
  name: string
}

export type PreviewState =
  | { rootPath: string; relativePath: string; name: string; status: 'loading' }
  | { rootPath: string; relativePath: string; name: string; status: 'ready'; content: string }
  | { rootPath: string; relativePath: string; name: string; status: 'error' }

export interface UseDocumentTabsResult {
  tabs: Tab[]
  // The transient, VS Code-style "preview" tab: single-clicking a file shows
  // it here, reusing/replacing this one slot rather than accumulating tabs.
  // It is never persisted - double-clicking (handleOpenTab) promotes a file
  // out of this slot into the real, persisted `tabs` list.
  previewTab: Tab | null
  preview: PreviewState | null
  // Attach to the scrollable preview container (MainPane's `.preview-content`
  // div). Read at tab-switch time to capture the outgoing tab's scroll
  // offset, and written to directly (no animation) to restore the incoming
  // tab's - see the capture/restore effect below (Slice 17).
  previewScrollRef: RefObject<HTMLDivElement | null>
  // Single-click: shows the file in the one-slot transient preview tab.
  // Clicking a file that's already a persisted tab just re-selects it.
  handleClickFile: (rootPath: string, relativePath: string, name: string) => void
  // Double-click: promotes a file to a persistent tab, taking it out of the
  // transient preview slot if that's where it was.
  handleOpenTab: (rootPath: string, relativePath: string, name: string) => void
  handleClosePreviewTab: () => void
  handleSelectTab: (tab: Tab) => void
  handleCloseTab: (rootPath: string, relativePath: string) => void
  // Drops a removed root's tabs/preview-tab/preview - called by whoever owns
  // root removal (App composes this with useWorkspaceRoots's removeRoot).
  closeRootTabs: (rootPath: string) => void
}

// `|` is a reserved Windows path character (can't appear in rootPath or
// relativePath), so this can't collide across the boundary the way a plain
// concatenation or a common separator like `/` could.
function scrollKey(rootPath: string, relativePath: string): string {
  return `${rootPath}|${relativePath}`
}

export function useDocumentTabs(
  revealInTree: (rootPath: string, relativePath: string) => void
): UseDocumentTabsResult {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [previewTab, setPreviewTab] = useState<Tab | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  // In-memory for every tab ever viewed this session (including the
  // transient preview tab, which never leaves this map); seeded from
  // persisted `scroll_position` values on launch below. Persisted tabs also
  // get their outgoing offset written to SQLite on switch - see
  // captureOutgoingScroll.
  const scrollPositionsRef = useRef<Map<string, number>>(new Map())

  // Reads the CURRENT preview's live scrollTop (before any switch changes
  // what's on screen) and remembers it - called at the top of every path
  // that changes `preview`, so the outgoing tab's position is never lost.
  // Returns the persistence write's promise (resolved immediately when
  // there's nothing to persist) so the quit-time flush below can await it
  // before the app is allowed to close; other call sites fire it and move
  // on, same as before.
  function captureOutgoingScroll(): Promise<void> {
    if (!preview || !previewScrollRef.current) return Promise.resolve()
    const key = scrollKey(preview.rootPath, preview.relativePath)
    const scrollTop = previewScrollRef.current.scrollTop
    scrollPositionsRef.current.set(key, scrollTop)
    const isPersistedTab = tabs.some(
      (tab) => tab.rootPath === preview.rootPath && tab.relativePath === preview.relativePath
    )
    if (!isPersistedTab) return Promise.resolve()
    return window.api.workspace.setTabScrollPosition(
      preview.rootPath,
      preview.relativePath,
      scrollTop
    )
  }

  // Switching tabs captures the outgoing scroll position, but quitting
  // without ever switching away from the active tab would otherwise never
  // reach captureOutgoingScroll at all - the main process asks for one last
  // flush before it actually closes (main/index.ts's window 'close' handler)
  // and waits for the ack this sends back.
  useEffect(() => {
    return window.api.workspace.onRequestScrollFlush(() => captureOutgoingScroll())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, tabs])

  // Restores the incoming tab's remembered position once its content has
  // actually rendered - a direct scrollTop assignment (no smooth-scroll), so
  // switching tabs jumps straight there rather than animating (Slice 17
  // agreement). Runs after the DOM commit, before paint.
  useLayoutEffect(() => {
    if (!preview || preview.status !== 'ready' || !previewScrollRef.current) return
    const key = scrollKey(preview.rootPath, preview.relativePath)
    previewScrollRef.current.scrollTop = scrollPositionsRef.current.get(key) ?? 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.rootPath, preview?.relativePath, preview?.status])

  useEffect(() => {
    let cancelled = false
    window.api.workspace.loadTabs().then(({ tabs: restoredTabs, activeTab }) => {
      if (cancelled) return
      setTabs(restoredTabs)
      for (const tab of restoredTabs) {
        if (tab.scrollPosition != null) {
          scrollPositionsRef.current.set(
            scrollKey(tab.rootPath, tab.relativePath),
            tab.scrollPosition
          )
        }
      }
      if (activeTab) {
        void handleSelectFile(activeTab.rootPath, activeTab.relativePath, activeTab.name)
      }
    })
    return () => {
      cancelled = true
    }
    // handleSelectFile only ever reads component state through setState's
    // functional-updater form or stable globals (window.api, revealInTree) -
    // never a value closed over from this effect's own (fixed-at-mount)
    // render - so calling it here is safe despite the empty dependency
    // array. See revealInTree's comment (useWorkspaceRoots.ts) for why it's
    // written that way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSelectFile(
    rootPath: string,
    relativePath: string,
    name: string
  ): Promise<void> {
    void captureOutgoingScroll()
    revealInTree(rootPath, relativePath)
    setPreview({ rootPath, relativePath, name, status: 'loading' })
    const content = await window.api.workspace.readFile(rootPath, relativePath)
    setPreview((current) => {
      // A later click, or a root removal, may have already superseded this
      // one while the read was in flight - drop a stale response rather
      // than overwrite it.
      if (!current || current.rootPath !== rootPath || current.relativePath !== relativePath) {
        return current
      }
      return content === null
        ? { rootPath, relativePath, name, status: 'error' }
        : { rootPath, relativePath, name, status: 'ready', content }
    })
  }

  function handleClickFile(rootPath: string, relativePath: string, name: string): void {
    const isPersistedTab = tabs.some(
      (tab) => tab.rootPath === rootPath && tab.relativePath === relativePath
    )
    setPreviewTab(isPersistedTab ? null : { rootPath, relativePath, name })
    void handleSelectFile(rootPath, relativePath, name)
  }

  function handleOpenTab(rootPath: string, relativePath: string, name: string): void {
    const alreadyOpen = tabs.some(
      (tab) => tab.rootPath === rootPath && tab.relativePath === relativePath
    )
    if (!alreadyOpen) {
      setTabs((current) => [...current, { rootPath, relativePath, name }])
      void window.api.workspace.addTab(rootPath, relativePath, name)
    }
    setPreviewTab((current) =>
      current?.rootPath === rootPath && current?.relativePath === relativePath ? null : current
    )
    void window.api.workspace.setActiveTab({ rootPath, relativePath })
    void handleSelectFile(rootPath, relativePath, name)
  }

  function handleClosePreviewTab(): void {
    const isShowingPreviewTab = Boolean(
      previewTab &&
      preview?.rootPath === previewTab.rootPath &&
      preview?.relativePath === previewTab.relativePath
    )
    setPreviewTab(null)
    if (!isShowingPreviewTab) return

    // Falls back to the most recently opened persisted tab, mirroring
    // handleCloseTab's neighbor fallback below - the preview tab isn't part
    // of the ordered `tabs` list, so "most recently opened" (the list's
    // last entry) is the natural equivalent of "a neighboring tab" here.
    const fallback = tabs[tabs.length - 1]
    if (fallback) {
      void window.api.workspace.setActiveTab({
        rootPath: fallback.rootPath,
        relativePath: fallback.relativePath
      })
      void handleSelectFile(fallback.rootPath, fallback.relativePath, fallback.name)
    } else {
      void captureOutgoingScroll()
      setPreview(null)
      void window.api.workspace.setActiveTab(null)
    }
  }

  function handleSelectTab(tab: Tab): void {
    void window.api.workspace.setActiveTab({
      rootPath: tab.rootPath,
      relativePath: tab.relativePath
    })
    void handleSelectFile(tab.rootPath, tab.relativePath, tab.name)
  }

  function handleCloseTab(rootPath: string, relativePath: string): void {
    const index = tabs.findIndex(
      (tab) => tab.rootPath === rootPath && tab.relativePath === relativePath
    )
    if (index === -1) return

    const remaining = tabs.filter((_, i) => i !== index)
    setTabs(remaining)
    void window.api.workspace.removeTab(rootPath, relativePath)

    const wasActive = preview?.rootPath === rootPath && preview?.relativePath === relativePath
    if (!wasActive) return

    const next = remaining[index] ?? remaining[index - 1]
    if (next) {
      void window.api.workspace.setActiveTab({
        rootPath: next.rootPath,
        relativePath: next.relativePath
      })
      void handleSelectFile(next.rootPath, next.relativePath, next.name)
    } else {
      void captureOutgoingScroll()
      setPreview(null)
      void window.api.workspace.setActiveTab(null)
    }
  }

  function closeRootTabs(rootPath: string): void {
    setTabs((current) => current.filter((tab) => tab.rootPath !== rootPath))
    setPreviewTab((current) => (current?.rootPath === rootPath ? null : current))
    setPreview((current) => (current?.rootPath === rootPath ? null : current))
  }

  return {
    tabs,
    previewTab,
    preview,
    previewScrollRef,
    handleClickFile,
    handleOpenTab,
    handleClosePreviewTab,
    handleSelectTab,
    handleCloseTab,
    closeRootTabs
  }
}
