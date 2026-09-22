import { useEffect, useState } from 'react'
import type { FolderEntry } from './types'

export interface Root {
  rootPath: string
  tree: FolderEntry
  collapsed: boolean
  expandedPaths: Set<string>
}

export interface UseWorkspaceRootsResult {
  roots: Root[]
  addFolder: () => Promise<void>
  removeRoot: (rootPath: string) => void
  toggleRoot: (rootPath: string) => void
  toggleFolder: (rootPath: string, relativePath: string) => void
  revealInTree: (rootPath: string, relativePath: string) => void
  moveRoot: (draggedRootPath: string, targetRootPath: string, position: 'before' | 'after') => void
}

// Folder relativePaths (always '/'-separated, see scan.ts's toRelativePath)
// between a root and a file, excluding the file itself - e.g.
// 'docs/plans/shape.md' -> ['docs', 'docs/plans'].
function ancestorFolderPaths(relativePath: string): string[] {
  const segments = relativePath.split('/').filter(Boolean)
  const ancestors: string[] = []
  for (let i = 1; i < segments.length; i++) {
    ancestors.push(segments.slice(0, i).join('/'))
  }
  return ancestors
}

export function useWorkspaceRoots(): UseWorkspaceRootsResult {
  const [roots, setRoots] = useState<Root[]>([])

  useEffect(() => {
    let cancelled = false
    window.api.workspace.loadState().then((restoredRoots) => {
      if (cancelled) return
      setRoots(
        restoredRoots.map((entry) => ({
          rootPath: entry.rootPath,
          tree: entry.tree,
          collapsed: entry.collapsed,
          expandedPaths: new Set(entry.expandedPaths)
        }))
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function addFolder(): Promise<void> {
    const result = await window.api.workspace.addRoot()
    if (!result) return
    setRoots((current) => {
      if (current.some((existing) => existing.rootPath === result.rootPath)) return current
      return [
        ...current,
        { rootPath: result.rootPath, tree: result.tree, collapsed: false, expandedPaths: new Set() }
      ]
    })
  }

  function removeRoot(rootPath: string): void {
    setRoots((current) => current.filter((existing) => existing.rootPath !== rootPath))
    void window.api.workspace.removeRoot(rootPath)
  }

  function toggleRoot(rootPath: string): void {
    const target = roots.find((existing) => existing.rootPath === rootPath)
    if (!target) return
    const nextCollapsed = !target.collapsed
    setRoots((current) =>
      current.map((existing) =>
        existing.rootPath === rootPath ? { ...existing, collapsed: nextCollapsed } : existing
      )
    )
    void window.api.workspace.setRootCollapsed(rootPath, nextCollapsed)
  }

  function toggleFolder(rootPath: string, relativePath: string): void {
    const target = roots.find((existing) => existing.rootPath === rootPath)
    if (!target) return
    const willExpand = !target.expandedPaths.has(relativePath)
    setRoots((current) =>
      current.map((existing) => {
        if (existing.rootPath !== rootPath) return existing
        const expandedPaths = new Set(existing.expandedPaths)
        if (willExpand) expandedPaths.add(relativePath)
        else expandedPaths.delete(relativePath)
        return { ...existing, expandedPaths }
      })
    )
    void window.api.workspace.setFolderExpanded(rootPath, relativePath, willExpand)
  }

  // Reveals a file's location in the tree - expands its ancestor folders
  // and un-collapses its root - so switching to it (tab click, restoring
  // the persisted active tab on launch, etc.) always shows it highlighted
  // rather than hidden under folders nobody opened.
  //
  // Sets ancestors/collapse unconditionally rather than only when actually
  // changing: the IPC calls are idempotent (setFolderExpanded's INSERT OR
  // IGNORE, setRootCollapsed's UPDATE), and gating them on "was this already
  // expanded" would need a closure-fresh read of `roots` - which useDocumentTabs's
  // restore-active-tab effect doesn't have, since it calls this function
  // (passed in as a prop) from a mount effect whose closure is fixed at the
  // very first render (roots = []), the same staleness class as the tabs
  // restore race documented in useDocumentTabs. `setRoots`'s functional
  // updater sidesteps that by always operating on current state; the IPC
  // calls are safe to fire even before `roots` state has loaded, because
  // expanded_folders/tabs both carry `root_path REFERENCES roots(root_path)`,
  // so any rootPath reaching this function already has a roots row in the
  // database (even if React hasn't caught up to it yet).
  function revealInTree(rootPath: string, relativePath: string): void {
    const ancestors = ancestorFolderPaths(relativePath)
    setRoots((current) =>
      current.map((existing) => {
        if (existing.rootPath !== rootPath) return existing
        const expandedPaths = new Set(existing.expandedPaths)
        ancestors.forEach((path) => expandedPaths.add(path))
        return { ...existing, expandedPaths, collapsed: false }
      })
    )
    ancestors.forEach((path) => void window.api.workspace.setFolderExpanded(rootPath, path, true))
    void window.api.workspace.setRootCollapsed(rootPath, false)
  }

  // Drag-and-drop reorder: drops `draggedRootPath` immediately before/after
  // `targetRootPath`, then renumbers every root's position 0..n-1 in that
  // new order and persists the whole list in one call - simplest correct
  // approach for a short list, no fractional-position scheme needed.
  // Reordered off `roots` rather than inside a setRoots updater: an updater has
  // to be a pure function of the state it is handed, because React may invoke
  // it more than once for a single update - StrictMode does so deliberately in
  // development, which made the persistence call fire twice per drop. The list
  // is short and `roots` is current at the point a drop handler runs, so
  // computing the new order here loses nothing.
  function moveRoot(
    draggedRootPath: string,
    targetRootPath: string,
    position: 'before' | 'after'
  ): void {
    if (draggedRootPath === targetRootPath) return
    const dragged = roots.find((existing) => existing.rootPath === draggedRootPath)
    if (!dragged) return
    const without = roots.filter((existing) => existing.rootPath !== draggedRootPath)
    const targetIndex = without.findIndex((existing) => existing.rootPath === targetRootPath)
    if (targetIndex === -1) return
    const insertAt = position === 'after' ? targetIndex + 1 : targetIndex
    const next = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)]

    setRoots(next)
    void window.api.workspace.setRootPositions(next.map((existing) => existing.rootPath))
  }

  return { roots, addFolder, removeRoot, toggleRoot, toggleFolder, revealInTree, moveRoot }
}
