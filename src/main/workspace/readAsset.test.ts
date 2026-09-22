import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readWorkspaceAsset } from './readAsset'

const testDocsRoot = resolve(process.cwd(), 'test-docs')

describe('readWorkspaceAsset', () => {
  it('reads an image relative to a root-level document', async () => {
    const expected = await readFile(resolve(testDocsRoot, 'images', 'diagram.png'))
    const expectedDataUrl = `data:image/png;base64,${expected.toString('base64')}`

    const result = await readWorkspaceAsset(testDocsRoot, 'README.md', 'images/diagram.png')

    expect(result).toBe(expectedDataUrl)
  })

  it('resolves the asset relative to the document, not the root', async () => {
    const expected = await readFile(resolve(testDocsRoot, 'images', 'diagram.png'))
    const expectedDataUrl = `data:image/png;base64,${expected.toString('base64')}`

    const result = await readWorkspaceAsset(
      testDocsRoot,
      'docs/mermaid.md',
      '../images/diagram.png'
    )

    expect(result).toBe(expectedDataUrl)
  })

  it('returns null for a relative path that escapes the root', async () => {
    expect(await readWorkspaceAsset(testDocsRoot, 'README.md', '../../outside-root.png')).toBeNull()
  })

  it('returns null for an absolute path that resolves outside the root', async () => {
    const outsideAbsolutePath = resolve(testDocsRoot, '..', 'outside-root.png')
    expect(await readWorkspaceAsset(testDocsRoot, 'README.md', outsideAbsolutePath)).toBeNull()
  })

  it('returns null for an unrecognised extension', async () => {
    expect(await readWorkspaceAsset(testDocsRoot, 'README.md', 'README.md')).toBeNull()
  })

  it('returns null for a file that does not exist', async () => {
    expect(
      await readWorkspaceAsset(testDocsRoot, 'README.md', 'images/does-not-exist.png')
    ).toBeNull()
  })
})
