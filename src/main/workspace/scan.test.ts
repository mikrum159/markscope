import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanRoot, type ScannedFolderNode, type ScannedNode } from './scan'

const testDocsRoot = resolve(process.cwd(), 'test-docs')

function flattenFiles(node: ScannedNode, out: string[] = []): string[] {
  if (node.type === 'file') {
    out.push(node.relativePath)
  } else {
    for (const child of node.children) flattenFiles(child, out)
  }
  return out
}

describe('scanRoot', () => {
  it('matches the quality.md §2 fixture listing, minus ignored/ and non-Markdown files', async () => {
    const tree = await scanRoot(testDocsRoot)
    // big/large.md is gitignored and only present when regenerated locally
    // (see mvp-shape/log.md, Slice 4) - covered separately below.
    const files = flattenFiles(tree)
      .filter((path) => path !== 'big/large.md')
      .sort()

    const expected = [
      'README.md',
      'architecture.md',
      'with-frontmatter.md',
      'docs/deployment.md',
      'docs/mermaid.md',
      'docs/tables.md',
      'docs/task-list.md',
      'docs/links.md',
      'docs/long-document.md',
      'agent-session/PLAN.md',
      'agent-session/JOURNAL.md',
      'agent-session/adr/0001-example.md'
    ].sort()

    expect(files).toEqual(expected)
  })

  it('hides the ignored/ folder entirely', async () => {
    const tree = await scanRoot(testDocsRoot)
    expect(tree.children.some((child) => child.name === 'ignored')).toBe(false)
  })

  it('prunes images/ (no Markdown files) as an empty branch', async () => {
    const tree = await scanRoot(testDocsRoot)
    expect(tree.children.some((child) => child.name === 'images')).toBe(false)
  })

  it('includes big/large.md when the gitignored fixture is present on disk', async () => {
    const largeExists = existsSync(resolve(testDocsRoot, 'big', 'large.md'))
    const tree = await scanRoot(testDocsRoot)
    const bigFolder = tree.children.find(
      (child): child is ScannedFolderNode => child.type === 'folder' && child.name === 'big'
    )

    if (largeExists) {
      expect(bigFolder?.children.map((c) => c.name)).toContain('large.md')
    } else {
      // Not regenerated on this checkout — big/ has no other Markdown, so it prunes.
      expect(bigFolder).toBeUndefined()
    }
  })
})
