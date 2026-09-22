import { readFile, realpath } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { isInsideRoot } from './rootBoundary'

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

/**
 * Reads a document-relative asset (currently: images) as a data URL, enforcing
 * the same containment rule as readMarkdownFile (architecture.md §8).
 * `assetPath` is resolved relative to the *document's* directory, not the root,
 * since that is what a Markdown image path is relative to.
 *
 * **Whether `rootDir` is trusted is the caller's decision**, not this
 * function's - see readFile.ts's note and `main/index.ts`'s handler.
 *
 * Returns null on traversal outside the root, a symlink pointing out of it, an
 * unrecognised extension, or a filesystem error - one "can't resolve this"
 * state, same reasoning as readMarkdownFile.
 */
export async function readWorkspaceAsset(
  rootDir: string,
  documentRelativePath: string,
  assetPath: string
): Promise<string | null> {
  const resolvedRoot = resolve(rootDir)
  const documentDir = dirname(join(resolvedRoot, documentRelativePath))
  const absPath = resolve(documentDir, assetPath)

  const mime = MIME_BY_EXTENSION[extname(absPath).toLowerCase()]
  if (!mime) return null

  try {
    // Realpath'd on both sides before comparison - see readFile.ts.
    const realRoot = await realpath(resolvedRoot)
    const realAsset = await realpath(absPath)
    if (!isInsideRoot(realRoot, realAsset)) return null

    const data = await readFile(realAsset)
    return `data:${mime};base64,${data.toString('base64')}`
  } catch {
    return null
  }
}
