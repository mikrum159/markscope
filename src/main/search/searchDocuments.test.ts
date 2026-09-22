import { describe, expect, it } from 'vitest'
import { openRootsDatabase, addRootRecord } from '../workspace/rootsRepository'
import { ensureCatalogSchema, upsertDocument, type DocumentInput } from './catalogRepository'
import { searchDocuments } from './searchDocuments'

function freshDb(): ReturnType<typeof openRootsDatabase> {
  const db = openRootsDatabase(':memory:')
  ensureCatalogSchema(db)
  addRootRecord(db, 'C:\\Users\\dev\\project-a')
  return db
}

function baseDoc(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    rootPath: 'C:\\Users\\dev\\project-a',
    relativePath: 'doc.md',
    fileName: 'doc.md',
    title: null,
    headings: '',
    body: '',
    contentHash: 'hash',
    modifiedAt: 0,
    sizeBytes: 0,
    ...overrides
  }
}

describe('searchDocuments', () => {
  it('returns no results for a blank query', () => {
    const db = freshDb()
    expect(searchDocuments(db, '   ')).toEqual([])
  })

  it('finds a document by a body word', () => {
    const db = freshDb()
    upsertDocument(db, baseDoc({ body: 'The quick brown fox jumps.' }))

    const results = searchDocuments(db, 'fox')

    expect(results.map((r) => r.relativePath)).toEqual(['doc.md'])
  })

  it('requires every term to match (AND), not any term', () => {
    const db = freshDb()
    upsertDocument(db, baseDoc({ relativePath: 'a.md', contentHash: 'a', body: 'alpha bravo' }))
    upsertDocument(db, baseDoc({ relativePath: 'b.md', contentHash: 'b', body: 'alpha only' }))

    const results = searchDocuments(db, 'alpha bravo')

    expect(results.map((r) => r.relativePath)).toEqual(['a.md'])
  })

  it('ranks a title match above a body-only match for the same term', () => {
    const db = freshDb()
    upsertDocument(
      db,
      baseDoc({
        relativePath: 'body-only.md',
        contentHash: 'a',
        title: 'Untitled',
        body: 'mentions zephyr exactly once in passing'
      })
    )
    upsertDocument(
      db,
      baseDoc({
        relativePath: 'title-match.md',
        contentHash: 'b',
        title: 'Zephyr Guide',
        body: 'no relevant word here at all'
      })
    )

    const results = searchDocuments(db, 'zephyr')

    expect(results[0]?.relativePath).toBe('title-match.md')
  })

  it('does not throw on FTS5 special characters in the query', () => {
    const db = freshDb()
    upsertDocument(db, baseDoc({ body: 'quotes and asterisks' }))

    expect(() => searchDocuments(db, '"quoted" * phrase - term')).not.toThrow()
  })

  it('caps results at 20', () => {
    const db = freshDb()
    for (let i = 0; i < 25; i++) {
      upsertDocument(
        db,
        baseDoc({
          relativePath: `doc-${i}.md`,
          contentHash: `hash-${i}`,
          body: 'common shared term'
        })
      )
    }

    expect(searchDocuments(db, 'common')).toHaveLength(20)
  })
})
