import type Database from 'better-sqlite3'

export interface SearchResult {
  rootPath: string
  relativePath: string
  fileName: string
  title: string | null
  snippet: string
}

const MAX_RESULTS = 20

/**
 * Turns free-typed user input into an FTS5 MATCH string that can never be
 * parsed as FTS5 query syntax itself (search-and-catalog.md §8's escaping
 * caveat: a stray `"` or `*` must not become a syntax error or an
 * injection). Each whitespace-separated term is wrapped in double quotes
 * (embedded quotes doubled, FTS5's own escape for a literal `"` inside a
 * quoted string) and ANDed together, so every term must appear somewhere in
 * the document - a plain multi-word "contains all of these" search.
 */
function toMatchQuery(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"`)
  return terms.join(' AND ')
}

/**
 * Full-text search over the indexed catalog (Slice 20). Ranked by `bm25()`
 * with title weighted above headings, headings above body - the app-specific
 * boosts search-and-catalog.md §9 lists (exact/prefix filename match, scope
 * filtering, per-result highlighting) are deferred to a later unit; this is
 * a single ranked list, no scope, no matchRanges.
 */
export function searchDocuments(db: Database.Database, query: string): SearchResult[] {
  const matchQuery = toMatchQuery(query)
  if (!matchQuery) return []

  return db
    .prepare(
      `SELECT
         d.root_path AS rootPath,
         d.relative_path AS relativePath,
         d.file_name AS fileName,
         d.title AS title,
         snippet(documents_fts, -1, '', '', '…', 12) AS snippet
       FROM documents_fts
       JOIN documents d ON d.rowid = documents_fts.rowid
       WHERE documents_fts MATCH ?
       ORDER BY bm25(documents_fts, 10.0, 5.0, 1.0)
       LIMIT ?`
    )
    .all(matchQuery, MAX_RESULTS) as SearchResult[]
}
