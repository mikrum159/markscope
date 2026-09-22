import { describe, expect, it } from 'vitest'
import { openRootsDatabase, addRootRecord, removeRootRecord } from '../workspace/rootsRepository'
import {
  ensureCatalogSchema,
  upsertDocument,
  pruneStaleDocuments,
  type DocumentInput
} from './catalogRepository'

function freshDb(): ReturnType<typeof openRootsDatabase> {
  const db = openRootsDatabase(':memory:')
  ensureCatalogSchema(db)
  return db
}

function baseDoc(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    rootPath: 'C:\\Users\\dev\\project-a',
    relativePath: 'README.md',
    fileName: 'README.md',
    title: 'Readme',
    headings: 'Readme\nSection',
    body: '# Readme\n\nHello world',
    contentHash: 'hash-1',
    modifiedAt: 1000,
    sizeBytes: 42,
    ...overrides
  }
}

function ftsMatchCount(db: ReturnType<typeof openRootsDatabase>, term: string): number {
  return (
    db.prepare('SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?').all(term) as unknown[]
  ).length
}

describe('catalogRepository', () => {
  it('starts empty', () => {
    const db = freshDb()
    expect(db.prepare('SELECT COUNT(*) AS c FROM documents').get()).toEqual({ c: 0 })
  })

  it('indexes a document and makes it findable via FTS', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    upsertDocument(db, baseDoc())

    expect(ftsMatchCount(db, 'world')).toBe(1)
  })

  it('replaces the FTS row when content changes', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    upsertDocument(db, baseDoc())
    upsertDocument(db, baseDoc({ contentHash: 'hash-2', body: '# Readme\n\nGoodbye now' }))

    expect(ftsMatchCount(db, 'world')).toBe(0)
    expect(ftsMatchCount(db, 'goodbye')).toBe(1)
  })

  it('skips the FTS rewrite when the content hash is unchanged', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    upsertDocument(db, baseDoc())

    // Same hash as baseDoc() - upsertDocument should treat this as untouched
    // and never index the new body text, even though it differs.
    upsertDocument(db, baseDoc({ body: 'should never be indexed' }))

    expect(ftsMatchCount(db, 'never')).toBe(0)
    expect(ftsMatchCount(db, 'world')).toBe(1)
  })

  it('prunes documents no longer present and cascades their FTS row', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    upsertDocument(db, baseDoc())
    upsertDocument(
      db,
      baseDoc({ relativePath: 'other.md', contentHash: 'hash-3', body: 'other content' })
    )

    pruneStaleDocuments(db, 'C:\\Users\\dev\\project-a', ['README.md'])

    expect(db.prepare('SELECT relative_path FROM documents').all()).toEqual([
      { relative_path: 'README.md' }
    ])
    expect(ftsMatchCount(db, 'other')).toBe(0)
  })

  it('cascades documents and their FTS rows when a root is removed', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    upsertDocument(db, baseDoc())

    removeRootRecord(db, 'C:\\Users\\dev\\project-a')

    expect(db.prepare('SELECT COUNT(*) AS c FROM documents').get()).toEqual({ c: 0 })
    expect(ftsMatchCount(db, 'world')).toBe(0)
  })

  it('keeps documents scoped to their own root when pruning', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    addRootRecord(db, 'C:\\Users\\dev\\project-b')
    upsertDocument(db, baseDoc())
    upsertDocument(db, baseDoc({ rootPath: 'C:\\Users\\dev\\project-b', contentHash: 'hash-b' }))

    pruneStaleDocuments(db, 'C:\\Users\\dev\\project-a', [])

    expect(db.prepare('SELECT root_path FROM documents').all()).toEqual([
      { root_path: 'C:\\Users\\dev\\project-b' }
    ])
  })
})
