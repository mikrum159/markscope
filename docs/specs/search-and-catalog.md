> Working draft from the original specification; details require reconciliation with the confirmed Markdown-viewer MVP. Examples and build commands are proposals, not installed or verified tooling.
>
> Source: markscope-v2.1-fable/03-search-catalog-sqlite-tantivy.md, migrated 2026-09-09.

> **Reconciled 2026-09-13** against [ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md) (FTS5 replaces Tantivy), [ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md) (one kind of root), [ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md) (TypeScript, not Rust) and [ADR-0016](../adr/0016-windows-only-v0-1.md) (Windows only).
>
> **§8's request/response contracts and §9's ranking rules are unchanged** — they were written to be engine-agnostic, and the engine swap proved it. §9's numbered ranking cases are referenced by [quality.md](quality.md) §4, so that numbering is preserved exactly.
>
> The old §17 "FTS5 fallback" is now the design, not the fallback; §6 (ephemeral catalog) is removed. Section numbering is otherwise unchanged so existing cross-references still resolve.
>
> Current working state lives in [the MVP shape](../plans/mvp-shape/shape.md).

# Search, Catalog, and SQLite Design (v2)

> Revision notes
>
> Reconciled with the v2 specification, architecture, plan, and ADRs.
> Changes from v1:
>
> - Removed `favorites`, `explorer_state`, `global_settings`, and
>   `root_ignore_patterns` tables (cut by ADR-013; config lives in
>   `app-config.json`).
> - Added ephemeral-root handling: in-memory catalog, shared Tantivy
>   index tagged by `root_id` (ADR-011).
> - Added `frontmatter_json` column to `documents` to capture YAML
>   frontmatter provenance from day one (see
>   `../reference/session-output-conventions.md`).
> - Added SQLite FTS5 fallback section (per ADR-006 fallback note).
> - Added snippet-generation constraints and search-result position
>   mapping guidance.

> **Historical, 2026-09-13.** Kept for provenance. The ADR-013 table cuts and the `frontmatter_json` column still stand. Ephemeral-root handling is removed ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)), and the FTS5 "fallback" is now simply the design ([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)).

## 1. Purpose

Search is a core feature of MarkScope. It should feel fast,
predictable, and documentation-aware.

One system, not two:

```text
SQLite  (one database file)
  ├─ Workspace and catalog metadata
  └─ FTS5 virtual table: the full-text index
```

The catalog answers: which roots exist, which Markdown files exist,
which folders contain Markdown, which pinned tabs were open, what
headings and frontmatter were found, when a file was last indexed.

The FTS5 tables answer: which documents match this text query, which
title/heading/body fields are relevant, ranked order of matches.

Keeping both in one database means a catalog update and its index
update can share a transaction, and there is one file to back up,
version, or delete
([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)).

## 2. Search Principles

1. Search only trusted roots.
2. Search only Markdown files in MVP.
3. Respect built-in ignore rules and user ignores from
   `app-config.json`.
4. No `.gitignore` support in MVP
   ([ADR-0007](../adr/0007-do-not-support-gitignore-in-mvp.md)).
5. The file system is the source of truth.
6. The index is disposable and rebuildable.
7. Use stable document references across tree, tabs, and search.

Principle 8 — purging ephemeral-root entries at session end — is
removed ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).
Removing a root still deletes its rows; that is ordinary cascade, not
a session lifetime.

## 3. Search Features

### MVP

- Quick open by file name, relative path, title, and heading.
- Full-text search across all trusted roots.
- Scopes: all roots / single root / folder / current file /
  open files.
- Group results by file, show snippets.
- Open result in preview; best-effort scroll/highlight.
- Rebuild index command (menu item, not a settings dialog).

### Later

Regex, whole-word, match-case, heading-only search, diagnostics
queries, semantic search (Phase 2, `sqlite-vec` + embeddings —
alongside the FTS5 index, not replacing it).

## 4. Document Identity

```ts
export type DocumentId = string;

export type DocumentRef = {
  id: DocumentId;
  rootId: string;
  absolutePath: string;
  relativePath: string;
};
```

Document ID: `hash(rootId + ":" + normalizedRelativePath)`.

Avoid absolute path alone — a root can be moved, renamed, or
re-added. `rootId` is assigned when the root is added and persists
with it.

## 5. SQLite Schema

Migration-based from the start. Tables cut by
[ADR-0013](../adr/0013-cut-favorites-explorer-state-persistence-and-settings-ui-from-mvp.md)
do **not** exist in v0.1: no `favorites`, no `explorer_state`, no
`global_settings`, no `root_ignore_patterns`.

### schema_info

```sql
CREATE TABLE schema_info (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Stores: `app_schema_version`, `fts_schema_version`, `created_at`,
`updated_at`.

### trusted_roots

```sql
CREATE TABLE trusted_roots (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_missing INTEGER NOT NULL DEFAULT 0
);
```

### documents

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  root_id TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  extension TEXT NOT NULL,
  title TEXT,
  frontmatter_json TEXT,
  modified_at INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash TEXT,
  is_missing INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT NOT NULL,
  FOREIGN KEY (root_id) REFERENCES trusted_roots(id) ON DELETE CASCADE,
  UNIQUE(root_id, relative_path)
);
```

`frontmatter_json`: if the document begins with a YAML frontmatter
block (`---` fenced), parse it and store it as a JSON object string.
If absent or unparseable, store NULL — both are normal, and no
document needs frontmatter to be usable. No UI consumes this in v0.1;
it exists so the catalog carries provenance metadata from the first
indexed document onward (see
[session output conventions](../reference/session-output-conventions.md),
which is reference material, not a required format).

### folders

```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  root_id TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  display_name TEXT NOT NULL,
  markdown_file_count INTEGER NOT NULL DEFAULT 0,
  markdown_descendant_count INTEGER NOT NULL DEFAULT 0,
  is_missing INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (root_id) REFERENCES trusted_roots(id) ON DELETE CASCADE,
  UNIQUE(root_id, relative_path)
);
```

### headings

```sql
CREATE TABLE headings (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  text TEXT NOT NULL,
  slug TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

This table now serves two consumers: heading search, and the v0.1
outline panel ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).
`level`, `sort_order` and `line_number` are what let the outline
reconstruct nesting and jump to a section, so they are load-bearing
rather than incidental.

### tabs

Pinned tabs only. Temporary tabs are never persisted.

```sql
CREATE TABLE tabs (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  root_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  title TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  scroll_position_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);
```

(No `is_pinned` column — every persisted tab is pinned by
definition in v0.1.)

### index_state

```sql
CREATE TABLE index_state (
  id TEXT PRIMARY KEY,
  root_id TEXT,
  index_name TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_indexed_at TEXT,
  last_error TEXT,
  FOREIGN KEY (root_id) REFERENCES trusted_roots(id) ON DELETE CASCADE
);
```

## 6. Ephemeral-Root Catalog — removed 2026-09-13

This section specified a parallel in-memory document/folder/heading
store for ephemeral roots, never written to SQLite, indexed into the
shared index tagged by `root_id`, purged on shutdown and swept at
startup for orphaned `root_id`s.

All of it is removed with the ephemeral root kind
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).
There is one catalog, in SQLite. Its closing instruction — that
downstream code must not branch on root kind — is now satisfied
trivially, because there is only one kind.

The heading is retained, rather than renumbered, so cross-references
from other documents still resolve.

## 7. FTS5 Schema

One FTS5 row per Markdown file, external-content against `documents`
so the text is not stored twice.

```sql
CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  headings,
  body,
  content = '',            -- contentless; see note below
  tokenize = 'unicode61 remove_diacritics 2'
);
```

Metadata (`id`, `root_id`, paths, `modified_at`, `size_bytes`) stays
in `documents` and is joined on `documents_fts.rowid`, rather than
being duplicated into the index as the Tantivy schema did. Scope
filtering (§8) is therefore a join against `documents`, not an index
field match.

- Index `body`; do not store it.
- Snippets come from `snippet()` where the contentless table can
  produce them, and otherwise from re-reading the file at display
  time.
- Ranking uses `bm25()` with per-column weights, plus the
  app-specific boosts in §9.

The contentless-vs-external-content choice, the exact tokenizer, and
the `bm25()` column weights are **implementation decisions for the
search unit**, to be made against the real library and measured — not
settled here. The imported Tantivy schema block that stood in this
section was Rust and is gone
([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md),
[ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md)).

### Snippet constraints

- Apply the same size cap as indexing (`maxIndexedFileSizeBytes`)
  to snippet reads.
- Handle the race where the file changed or vanished between
  indexing and display: on read failure or hash mismatch, show the
  result without a snippet rather than erroring.

## 8. Search Request/Response Contracts

**Unchanged by the engine swap.** These were written to be
engine-agnostic and they held — which is the same property that let
the `SearchGateway` boundary absorb the change
([architecture.md](architecture.md) §7).

```ts
export type SearchScope =
  | { type: "allRoots" }
  | { type: "root"; rootId: string }
  | { type: "folder"; rootId: string; relativePath: string }
  | { type: "currentFile"; filePath: string }
  | { type: "openFiles" };

export type SearchRequest = {
  query: string;
  scope: SearchScope;
  limit: number;
  offset?: number;
};

export type SearchResponse = {
  query: string;
  totalEstimated: number;
  results: SearchResult[];
};

export type SearchResult = {
  id: string;
  rootId: string;
  filePath: string;
  relativePath: string;
  title?: string;
  line?: number;
  score?: number;
  snippet: string;
  matchRanges: Array<{ start: number; end: number }>;
  resultKind: "file" | "heading" | "content";
};

export type QuickOpenRequest = {
  query: string;
  scope?: SearchScope;
  limit: number;
};

export type QuickOpenResult = {
  id: string;
  rootId: string;
  filePath: string;
  relativePath: string;
  title?: string;
  matchedText: string;
  resultKind: "file" | "heading";
  score: number;
};
```

(`matchCase` / `wholeWord` / `useRegex` flags are deferred past v0.1
and kept out of the v0.1 contract to keep the surface minimal.)

One caveat inherited from FTS5: user input must be treated as a query
*string* to be escaped or parsed, never concatenated into MATCH
syntax. A stray `"` or `*` in a search box should not become a syntax
error, and must not become an injection.

## 9. Ranking

1. Exact file name match.
2. File name starts with query.
3. Title starts with query.
4. Heading starts with query.
5. Relative path segment match.
6. Full-text title match.
7. Full-text heading match.
8. Full-text body match.

`bm25()` provides the base score; app-specific boosts layer on top.
Cases 1–5 are computed by the app against the catalog and do not
depend on the engine, so they are unaffected by the FTS5 swap.

These eight cases are asserted by integration tests
([quality.md](quality.md) §4) — keep the numbering stable.

## 10. Result-to-Preview Position Mapping

Search results carry a best-effort `line` number (from the heading
table or from locating the match in the raw file). To scroll the
rendered preview to that line:

- During Markdown rendering, propagate source position data from
  remark onto block-level elements as `data-line` attributes.
- On result activation, scroll to the element with the nearest
  `data-line <= target line` and apply a temporary highlight class.

This is "best effort" by design in v0.1. The same `data-line`
mechanism also serves the outline panel's scroll-spy
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md))
and Phase 2 match highlighting — build it once.

## 11. Scanner Lifecycle

```text
root added via UI
  -> persist root in SQLite
  -> start scan
  -> apply ignore rules (built-in + app-config.json)
  -> collect Markdown files (.md, .markdown)
  -> extract title / headings / frontmatter
  -> upsert documents/folders/headings
  -> upsert FTS5 rows
  -> commit
  -> notify UI
```

The catalog and index writes can share one transaction, since they
are in the same database.

## 12. File Watcher Lifecycle

Update:

```text
file changed
  -> debounce (500-1500 ms)
  -> verify still inside a trusted root
  -> apply ignore rules
  -> if Markdown:
       update catalog
       extract headings/frontmatter
       replace FTS5 row
       refresh active preview if open (preserve scroll)
       refresh outline if the document is active
```

Delete:

```text
file deleted
  -> remove from catalog
  -> delete FTS5 row
  -> update folder counts
  -> remove from tree/search
  -> notify tabs if affected (missing-file state)
```

Rename/move events arrive as `ReadDirectoryChangesW` pairs on
Windows; treat unmatched rename halves as delete + create. The macOS
FSEvents comparison is removed
([ADR-0016](../adr/0016-windows-only-v0-1.md)); one integration test
on Windows covers this
([quality.md](quality.md) §4).

## 13. Index Versioning

Store `fts_schema_version` separately from the app schema version, so
the index can be rebuilt without a full migration. On startup:

```text
if fts_schema_version != current:
  drop and recreate the FTS5 tables
  repopulate from the documents table
```

Repopulating from the catalog is a query, not a rescan — the
filesystem is only re-read if the catalog itself is missing or a
rescan is requested.

## 14. Ignore Rules

Precedence: built-in defaults, then user ignores from
`app-config.json`. No per-root ignores in v0.1; no `.gitignore`.

Built-in defaults:

```text
**/.git/**  **/.svn/**  **/.hg/**
**/node_modules/**  **/bower_components/**
**/bin/**  **/obj/**  **/dist/**  **/build/**  **/out/**
**/.next/**  **/.turbo/**  **/.cache/**  **/coverage/**
**/.idea/**  **/.vs/**  **/.vscode/**  **/TestResults/**
```

Hidden folders excluded by default.

## 15. Limits

```text
Max indexed file size: 5 MB (also caps snippet reads)
Max search results: 500
Watcher debounce: 500-1500 ms
Extensions: .md, .markdown
```

These are proposals carried from the original specification and have
not been validated against a running app or a real corpus
([quality.md](quality.md) §6 records the corpus-size question).

## 16. Rebuild Index Command

Exposed as a menu command (no settings dialog in v0.1):

1. Stop active indexing.
2. Drop and recreate the FTS5 tables.
3. Repopulate from the catalog.
4. Notify UI on completion.

A rebuild no longer deletes a separate index directory — there isn't
one ([architecture.md](architecture.md) §13).

## 17. SQLite FTS5 — now the design, not the fallback

This section was written as a contingency: *if agent-driven Tantivy
integration stalls, swap to FTS5 behind the same `SearchGateway`.*

FTS5 is now the chosen engine
([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)), and
the details have moved into §1, §7, §13 and §16 where they belong.
Two points from the original are worth keeping visible, because both
turned out to be true:

- **The §8 contracts are engine-agnostic on purpose.** They survived
  the swap unchanged.
- **Quick-open ranking boosts (§9 cases 1–5) are applied by the app,
  not the engine**, so they survived too.

What this section got wrong is its trigger condition: the swap did
*not* happen because an agent-driven build stalled. It happened
because the runtime is no longer Rust, so a Rust-native index would
mean a native addon or a sidecar
([ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md)).
ADR-0017 records that distinction, so "FTS5 was the fallback" does not
become the project's memory of why.

Tantivy remains a reasonable answer if the corpus turns out to be
far larger than assumed — that is the condition to revisit, not
implementation difficulty.

## 18. Future Diagnostics Enabled by the Catalog

Broken relative links, missing images, invalid anchors, Mermaid
errors, duplicate anchors, documents with no H1, orphaned docs —
all Phase 2+, all derivable from the catalog without restructuring.
