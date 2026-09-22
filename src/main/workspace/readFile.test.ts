import { readFile as readFileFs } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readMarkdownFile } from './readFile'

const testDocsRoot = resolve(process.cwd(), 'test-docs')

describe('readMarkdownFile', () => {
  it('reads a Markdown file inside the root', async () => {
    const expected = await readFileFs(resolve(testDocsRoot, 'README.md'), 'utf-8')
    const content = await readMarkdownFile(testDocsRoot, 'README.md')
    expect(content).toBe(expected)
  })

  it('reads a nested Markdown file inside the root', async () => {
    const expected = await readFileFs(resolve(testDocsRoot, 'docs', 'tables.md'), 'utf-8')
    const content = await readMarkdownFile(testDocsRoot, 'docs/tables.md')
    expect(content).toBe(expected)
  })

  it('returns null for a relative path that escapes the root', async () => {
    expect(await readMarkdownFile(testDocsRoot, '../outside-root.md')).toBeNull()
    expect(await readMarkdownFile(testDocsRoot, 'docs/../../outside-root.md')).toBeNull()
  })

  it('returns null for an absolute path that resolves outside the root', async () => {
    const outsideAbsolutePath = resolve(testDocsRoot, '..', 'outside-root.md')
    expect(await readMarkdownFile(testDocsRoot, outsideAbsolutePath)).toBeNull()
  })

  it('returns null for a non-Markdown extension', async () => {
    expect(await readMarkdownFile(testDocsRoot, 'images/diagram.png')).toBeNull()
  })

  it('returns null for a file that does not exist', async () => {
    expect(await readMarkdownFile(testDocsRoot, 'does-not-exist.md')).toBeNull()
  })
})
