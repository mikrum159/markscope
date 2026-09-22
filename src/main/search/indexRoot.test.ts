import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanRoot } from '../workspace/scan'
import { openRootsDatabase, addRootRecord, type RootsDatabase } from '../workspace/rootsRepository'
import { ensureCatalogSchema } from './catalogRepository'
import { indexRoot } from './indexRoot'

describe('indexRoot', () => {
  let dir: string

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function setup(): { db: RootsDatabase; root: string } {
    dir = mkdtempSync(join(tmpdir(), 'markscope-index-test-'))
    const db = openRootsDatabase(':memory:')
    ensureCatalogSchema(db)
    addRootRecord(db, dir)
    return { db, root: dir }
  }

  it('indexes markdown files found by scanRoot, deriving title from the first heading', async () => {
    const { db, root } = setup()
    writeFileSync(join(root, 'a.md'), '# Title Alpha\n\nBody alpha content.')

    await indexRoot(db, root, await scanRoot(root))

    expect(db.prepare('SELECT title, file_name FROM documents').get()).toEqual({
      title: 'Title Alpha',
      file_name: 'a.md'
    })
    expect(
      (
        db
          .prepare("SELECT rowid FROM documents_fts WHERE documents_fts MATCH 'alpha'")
          .all() as unknown[]
      ).length
    ).toBe(1)
  })

  it('falls back to the file name when a document has no headings', async () => {
    const { db, root } = setup()
    writeFileSync(join(root, 'no-heading.md'), 'Just a paragraph, no heading at all.')

    await indexRoot(db, root, await scanRoot(root))

    expect((db.prepare('SELECT title FROM documents').get() as { title: string }).title).toBe(
      'no-heading'
    )
  })

  it('skips a file larger than the indexed-size cap', async () => {
    const { db, root } = setup()
    writeFileSync(join(root, 'huge.md'), 'x'.repeat(5_242_881))

    await indexRoot(db, root, await scanRoot(root))

    expect(db.prepare('SELECT COUNT(*) AS c FROM documents').get()).toEqual({ c: 0 })
  })

  it('prunes a document deleted from disk between scans', async () => {
    const { db, root } = setup()
    writeFileSync(join(root, 'a.md'), '# A\n\nContent A')
    writeFileSync(join(root, 'b.md'), '# B\n\nContent B')
    await indexRoot(db, root, await scanRoot(root))

    rmSync(join(root, 'b.md'))
    await indexRoot(db, root, await scanRoot(root))

    expect(db.prepare('SELECT relative_path FROM documents').all()).toEqual([
      { relative_path: 'a.md' }
    ])
  })

  it('re-indexes a document whose content changed since the last scan', async () => {
    const { db, root } = setup()
    writeFileSync(join(root, 'a.md'), '# A\n\nOriginal content.')
    await indexRoot(db, root, await scanRoot(root))

    writeFileSync(join(root, 'a.md'), '# A\n\nUpdated content.')
    await indexRoot(db, root, await scanRoot(root))

    expect(
      (
        db
          .prepare("SELECT rowid FROM documents_fts WHERE documents_fts MATCH 'updated'")
          .all() as unknown[]
      ).length
    ).toBe(1)
    expect(
      (
        db
          .prepare("SELECT rowid FROM documents_fts WHERE documents_fts MATCH 'original'")
          .all() as unknown[]
      ).length
    ).toBe(0)
  })
})
