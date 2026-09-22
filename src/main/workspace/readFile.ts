import { readFile, realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isMarkdownFile } from './scan'
import { isInsideRoot } from './rootBoundary'

/**
 * Reads a Markdown file's contents, enforcing that the resolved path stays
 * inside `rootDir` (architecture.md §8).
 *
 * **This function does not decide whether `rootDir` is trusted.** It contains
 * a read to the root it is given; establishing that the root is one the user
 * actually added is the caller's job, and `main/index.ts`'s `workspace:readFile`
 * handler does it by checking the `roots` table before calling here. Earlier
 * comments on this function claimed it re-enforced the trusted-root boundary
 * "independently of the renderer's roots list" — it never did, because the root
 * it validates against was supplied by the renderer.
 *
 * Returns null on any failure - traversal outside the root, a symlink pointing
 * out of it, a non-Markdown extension, or a filesystem error - so the caller
 * sees one "can't open this" state rather than distinguishing causes it can't
 * act on.
 */
export async function readMarkdownFile(
  rootDir: string,
  relativePath: string
): Promise<string | null> {
  const absPath = resolve(rootDir, relativePath)
  if (!isMarkdownFile(absPath)) return null

  try {
    // Both sides are realpath'd before comparison, so a symlink inside the
    // root that points outside it fails the containment check rather than
    // passing it on its pre-resolution path. Throws if either path does not
    // exist, which the catch turns into the same null as any other failure.
    const realRoot = await realpath(resolve(rootDir))
    const realFile = await realpath(absPath)
    if (!isInsideRoot(realRoot, realFile)) return null

    return await readFile(realFile, 'utf-8')
  } catch {
    return null
  }
}
