import type Database from 'better-sqlite3'

export interface DocumentInput {
  rootPath: string
  relativePath: string
  fileName: string
  title: string | null
  headings: string
  body: string
  contentHash: string
  modifiedAt: number
  sizeBytes: number
}

/**
 * The search catalog schema (search-and-catalog.md §5/§7), added to the same
 * database rootsRepository.ts already opens for session state - see the
 * search-schema Decision Slice in mvp-shape/shape.md for why this adopts the
 * spec's `documents`/`documents_fts` shape (unlike `roots`/`tabs`, which are
 * purpose-built) and why `documents.root_path` keys against the existing
 * `roots` table rather than a new generated `trusted_roots.id`.
 *
 * `documents_fts` is a default (non-contentless) FTS5 table, not the
 * `content=''` form the spec's own DDL showed - tried first, but contentless
 * tables reject plain INSERT/DELETE and only support the special `('delete',
 * ...)` command, which needs the *original* indexed values to remove them
 * from the inverted index. `documents` never stores `body`/`headings` text
 * (the reason contentless looked appealing - avoid a second copy), so there
 * is nowhere to source that command's arguments from. Letting FTS5 store the
 * text itself resolves that: it's still stored exactly once overall, plain
 * DML works, and `snippet()`/`highlight()` need no fallback. The spec's own
 * §7 note left this choice open for the search unit to make against the real
 * library - this is that measurement.
 * The AFTER DELETE trigger keeps it in sync whenever a `documents` row goes
 * away, whether from an explicit prune or a cascaded root removal.
 */
export function ensureCatalogSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      root_path TEXT NOT NULL REFERENCES roots(root_path) ON DELETE CASCADE,
      relative_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      title TEXT,
      modified_at INTEGER NOT NULL,
      size_bytes INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      last_scanned_at TEXT NOT NULL,
      PRIMARY KEY (root_path, relative_path)
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title,
      headings,
      body,
      tokenize = 'unicode61 remove_diacritics 2'
    );
    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      DELETE FROM documents_fts WHERE rowid = old.rowid;
    END;
  `)
}

/**
 * Inserts or updates one document's catalog row and its FTS index entry.
 * Skips the FTS rewrite (a full re-tokenize) when `contentHash` matches what
 * was last indexed - only `last_scanned_at` moves, so a re-scan of unchanged
 * files stays cheap.
 */
export function upsertDocument(db: Database.Database, doc: DocumentInput): void {
  // Wrapped as one transaction because the catalog row and its FTS entry are
  // written by separate statements: a failure between them would leave a
  // `documents` row whose content is absent from `documents_fts`, which is
  // invisible (the row still lists, it just never matches a search) and is not
  // repaired by a later re-scan, since the content hash would then match and
  // take the fast path below without rewriting the index.
  db.transaction(() => upsertDocumentStatements(db, doc))()
}

function upsertDocumentStatements(db: Database.Database, doc: DocumentInput): void {
  const now = new Date().toISOString()
  const existing = db
    .prepare('SELECT content_hash FROM documents WHERE root_path = ? AND relative_path = ?')
    .get(doc.rootPath, doc.relativePath) as { content_hash: string } | undefined

  if (existing && existing.content_hash === doc.contentHash) {
    db.prepare(
      'UPDATE documents SET last_scanned_at = ? WHERE root_path = ? AND relative_path = ?'
    ).run(now, doc.rootPath, doc.relativePath)
    return
  }

  db.prepare(
    `INSERT INTO documents
       (root_path, relative_path, file_name, title, modified_at, size_bytes, content_hash, last_scanned_at)
     VALUES (@rootPath, @relativePath, @fileName, @title, @modifiedAt, @sizeBytes, @contentHash, @now)
     ON CONFLICT(root_path, relative_path) DO UPDATE SET
       file_name = excluded.file_name,
       title = excluded.title,
       modified_at = excluded.modified_at,
       size_bytes = excluded.size_bytes,
       content_hash = excluded.content_hash,
       last_scanned_at = excluded.last_scanned_at`
  ).run({ ...doc, now })

  const row = db
    .prepare('SELECT rowid AS rowid FROM documents WHERE root_path = ? AND relative_path = ?')
    .get(doc.rootPath, doc.relativePath) as { rowid: number }

  db.prepare('DELETE FROM documents_fts WHERE rowid = ?').run(row.rowid)
  db.prepare('INSERT INTO documents_fts (rowid, title, headings, body) VALUES (?, ?, ?, ?)').run(
    row.rowid,
    doc.title ?? '',
    doc.headings,
    doc.body
  )
}

/**
 * Removes catalog rows for a root that a fresh scan no longer found -
 * deleted files, or files that grew past the indexed-size cap. The AFTER
 * DELETE trigger cleans up the matching FTS rows.
 */
export function pruneStaleDocuments(
  db: Database.Database,
  rootPath: string,
  keepRelativePaths: string[]
): void {
  const rows = db
    .prepare('SELECT relative_path FROM documents WHERE root_path = ?')
    .all(rootPath) as { relative_path: string }[]
  const keep = new Set(keepRelativePaths)
  const stale = rows
    .map((row) => row.relative_path)
    .filter((relativePath) => !keep.has(relativePath))
  if (stale.length === 0) return

  const stmt = db.prepare('DELETE FROM documents WHERE root_path = ? AND relative_path = ?')
  const runAll = db.transaction((paths: string[]) => {
    for (const relativePath of paths) stmt.run(rootPath, relativePath)
  })
  runAll(stale)
}
