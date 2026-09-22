import { readFile as readFileFs } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openRootsDatabase, addRootRecord, removeRootRecord } from './rootsRepository'
import { readTrustedMarkdownFile, readTrustedAsset } from './trustedRead'

const testDocsRoot = resolve(process.cwd(), 'test-docs')

function freshDb(): ReturnType<typeof openRootsDatabase> {
  return openRootsDatabase(':memory:')
}

describe('trustedRead', () => {
  it('reads a Markdown file from a root the user added', async () => {
    const db = freshDb()
    addRootRecord(db, testDocsRoot)

    const expected = await readFileFs(resolve(testDocsRoot, 'README.md'), 'utf-8')
    expect(await readTrustedMarkdownFile(db, testDocsRoot, 'README.md')).toBe(expected)
  })

  // The regression test for the finding this module exists to close: before it,
  // the IPC handler passed the renderer's rootPath straight to readMarkdownFile,
  // which contains a read to whatever root it is given and so read this file
  // happily. The path below is a real, readable Markdown file OUTSIDE every
  // trusted root, and containment alone has no objection to it.
  it('refuses a readable file under a root that was never added', async () => {
    const db = freshDb()
    const untrustedRoot = resolve(process.cwd(), 'docs')

    // The file genuinely exists and is readable - the refusal is about the
    // root, not about the file being missing.
    await expect(readFileFs(resolve(untrustedRoot, 'README.md'), 'utf-8')).resolves.toBeTypeOf(
      'string'
    )
    expect(await readTrustedMarkdownFile(db, untrustedRoot, 'README.md')).toBeNull()
  })

  it('refuses reads against a root that has been removed', async () => {
    const db = freshDb()
    addRootRecord(db, testDocsRoot)
    expect(await readTrustedMarkdownFile(db, testDocsRoot, 'README.md')).not.toBeNull()

    removeRootRecord(db, testDocsRoot)
    expect(await readTrustedMarkdownFile(db, testDocsRoot, 'README.md')).toBeNull()
  })

  it('still contains traversal within a trusted root', async () => {
    const db = freshDb()
    addRootRecord(db, testDocsRoot)
    expect(await readTrustedMarkdownFile(db, testDocsRoot, '../outside-root.md')).toBeNull()
  })

  it('reads an asset from a trusted root and refuses one from an untrusted root', async () => {
    const db = freshDb()
    addRootRecord(db, testDocsRoot)
    expect(await readTrustedAsset(db, testDocsRoot, 'README.md', 'images/diagram.png')).toMatch(
      /^data:image\/png;base64,/
    )

    const otherDb = freshDb()
    expect(
      await readTrustedAsset(otherDb, testDocsRoot, 'README.md', 'images/diagram.png')
    ).toBeNull()
  })
})
