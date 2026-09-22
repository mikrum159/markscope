import { readdir } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'

export interface ScannedFileNode {
  type: 'file'
  name: string
  relativePath: string
}

export interface ScannedFolderNode {
  type: 'folder'
  name: string
  relativePath: string
  children: ScannedNode[]
}

export type ScannedNode = ScannedFileNode | ScannedFolderNode

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])

// product.md §10's built-in explorer.exclude patterns, by directory name.
// `ignored` was added 2026-09-13 to match the test-docs fixture folder name
// (see mvp-shape/log.md, Slice 4 and the add-a-root-and-scan agreement).
const BUILT_IN_IGNORE_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'bin',
  'obj',
  'dist',
  'build',
  '.next',
  'coverage',
  '.vs',
  'TestResults',
  'ignored'
])

export function isMarkdownFile(name: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extname(name).toLowerCase())
}

function isIgnoredDirName(name: string): boolean {
  return name.startsWith('.') || BUILT_IN_IGNORE_DIR_NAMES.has(name)
}

function toRelativePath(rootDir: string, absPath: string): string {
  return relative(rootDir, absPath).split('\\').join('/')
}

async function scanChildren(absDir: string, rootDir: string): Promise<ScannedNode[]> {
  const entries = await readdir(absDir, { withFileTypes: true })
  const nodes: ScannedNode[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isIgnoredDirName(entry.name)) continue
      const absChild = join(absDir, entry.name)
      const children = await scanChildren(absChild, rootDir)
      if (children.length === 0) continue
      nodes.push({
        type: 'folder',
        name: entry.name,
        relativePath: toRelativePath(rootDir, absChild),
        children
      })
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      const absChild = join(absDir, entry.name)
      nodes.push({
        type: 'file',
        name: entry.name,
        relativePath: toRelativePath(rootDir, absChild)
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return nodes
}

/**
 * Scans a trusted root for Markdown files: hidden folders and the built-in
 * ignore list are excluded, non-Markdown files are dropped, and branches with
 * no Markdown descendants are pruned. The root itself is always returned,
 * even with no children.
 */
export async function scanRoot(rootDir: string): Promise<ScannedFolderNode> {
  return {
    type: 'folder',
    name: basename(rootDir),
    relativePath: '',
    children: await scanChildren(rootDir, rootDir)
  }
}
