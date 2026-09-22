import { isAbsolute, relative, sep } from 'node:path'

/**
 * True when `absPath` sits strictly inside `rootDir`. Both arguments must
 * already be resolved (and, where symlinks matter, realpath'd) - this function
 * does no filesystem work and no normalisation of its own.
 *
 * Shared by readFile.ts and readAsset.ts so the two enforce the boundary
 * identically. The `..` checks are deliberately separator-aware: a plain
 * `rel.startsWith('..')` also matches a legitimately-contained file whose name
 * begins with two dots (`..config.md`), which would refuse to open it.
 * `rel === ''` means the path *is* the root, which is a directory, not a file
 * to read.
 */
export function isInsideRoot(rootDir: string, absPath: string): boolean {
  const rel = relative(rootDir, absPath)
  if (rel === '' || rel === '..') return false
  if (rel.startsWith(`..${sep}`)) return false
  return !isAbsolute(rel)
}
