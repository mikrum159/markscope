import { readFile, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { ScannedFolderNode, ScannedNode } from '../workspace/scan'
import { upsertDocument, pruneStaleDocuments } from './catalogRepository'
import { extractHeadingTexts } from './extractHeadingText'

// product.md §10's search.maxIndexedFileSizeBytes. No config-file loader
// exists yet anywhere in src/ (app-config.json is documented, not built), so
// this is hardcoded here the same way scan.ts hardcodes its own ignore list.
const MAX_INDEXED_FILE_SIZE_BYTES = 5_242_880

function collectFilePaths(node: ScannedNode, out: string[] = []): string[] {
  if (node.type === 'file') {
    out.push(node.relativePath)
  } else {
    for (const child of node.children) collectFilePaths(child, out)
  }
  return out
}

/**
 * Indexes every Markdown file scanRoot() found for a root into the search
 * catalog (catalogRepository.ts), then prunes rows for files no longer
 * present - so a deleted or now-oversized file stops showing up in search
 * results at the same scan that would have caught it in the tree. Called
 * alongside scanRoot()'s existing call sites (add-root, workspace:loadState)
 * per the search-schema Decision Slice: indexing runs at scan time, not on
 * its own trigger.
 */
export async function indexRoot(
  db: Database.Database,
  rootPath: string,
  tree: ScannedFolderNode
): Promise<void> {
  const relativePaths = collectFilePaths(tree)
  const indexed: string[] = []

  for (const relativePath of relativePaths) {
    const absPath = join(rootPath, relativePath)

    let fileStat
    try {
      fileStat = await stat(absPath)
    } catch {
      continue
    }
    if (fileStat.size > MAX_INDEXED_FILE_SIZE_BYTES) continue

    let content: string
    try {
      content = await readFile(absPath, 'utf-8')
    } catch {
      continue
    }

    indexed.push(relativePath)

    const headingTexts = extractHeadingTexts(content)
    const title = headingTexts[0] ?? basename(relativePath, extname(relativePath))

    upsertDocument(db, {
      rootPath,
      relativePath,
      fileName: basename(relativePath),
      title,
      headings: headingTexts.join('\n'),
      body: content,
      contentHash: createHash('sha256').update(content).digest('hex'),
      modifiedAt: Math.trunc(fileStat.mtimeMs),
      sizeBytes: fileStat.size
    })
  }

  pruneStaleDocuments(db, rootPath, indexed)
}
