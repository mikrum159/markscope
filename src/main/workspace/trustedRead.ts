import { isTrustedRoot, type RootsDatabase } from './rootsRepository'
import { readMarkdownFile } from './readFile'
import { readWorkspaceAsset } from './readAsset'

/**
 * The trusted-root boundary, whole (architecture.md §8).
 *
 * Every filesystem read the renderer can trigger arrives naming its own
 * `rootPath`. Containing the read to that root - what readFile.ts and
 * readAsset.ts do - is only half the boundary: on its own it cannot tell a
 * folder the user added from any other directory on the machine, so a renderer
 * able to call the IPC channel directly could name `C:\Users\<user>` and read
 * inside it. This module joins the two halves, and the IPC handlers in
 * `main/index.ts` call nothing else.
 *
 * It lives here rather than inline in those handlers so the check is reachable
 * from a test: the handlers are registered inside `app.whenReady()` and cannot
 * be exercised without standing up Electron.
 */
export function readTrustedMarkdownFile(
  db: RootsDatabase,
  rootPath: string,
  relativePath: string
): Promise<string | null> {
  if (!isTrustedRoot(db, rootPath)) return Promise.resolve(null)
  return readMarkdownFile(rootPath, relativePath)
}

export function readTrustedAsset(
  db: RootsDatabase,
  rootPath: string,
  documentRelativePath: string,
  assetPath: string
): Promise<string | null> {
  if (!isTrustedRoot(db, rootPath)) return Promise.resolve(null)
  return readWorkspaceAsset(rootPath, documentRelativePath, assetPath)
}
