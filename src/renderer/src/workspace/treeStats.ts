import type { TreeEntry } from './types'

// Recursive Markdown file count for a subtree, used for the count badge next
// to root and folder rows. No memoization - MVP corpora are hundreds to low
// thousands of files (see shape.md's Assumptions), cheap enough to recompute
// on each render.
export function countFiles(node: TreeEntry): number {
  if (node.type === 'file') return 1
  return node.children.reduce((total, child) => total + countFiles(child), 0)
}
