import Database from 'better-sqlite3'

export type RootsDatabase = Database.Database

export interface PersistedRoot {
  rootPath: string
  collapsed: boolean
  expandedPaths: string[]
}

export interface PersistedTab {
  rootPath: string
  relativePath: string
  name: string
  scrollPosition: number | null
}

export interface PersistedWindowState {
  width: number
  height: number
  maximized: boolean
}

// 'system' defers to nativeTheme.shouldUseDarkColors (the OS setting);
// 'light'/'dark' is an explicit user override applied via
// nativeTheme.themeSource - see main/index.ts's createWindow.
export type ThemeSource = 'system' | 'light' | 'dark'

/**
 * Opens (creating if needed) the roots-persistence database and ensures its
 * tables exist. Scoped to UI session state - which roots are open, their
 * order, collapsed/expanded state, and which documents are open as tabs
 * (plus which tab is active) - not the full catalog schema in
 * search-and-catalog.md §5 (documents/folders/headings), which belongs to
 * the later search unit and models a different concern (indexed document
 * content). This unit's `tabs` table is purpose-built the same way `roots`
 * was: keyed by (root_path, relative_path), not search-and-catalog.md §5's
 * catalog-keyed version.
 */
export function openRootsDatabase(path: string): RootsDatabase {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_info (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS roots (
      root_path TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      collapsed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS expanded_folders (
      root_path TEXT NOT NULL REFERENCES roots(root_path) ON DELETE CASCADE,
      relative_path TEXT NOT NULL,
      PRIMARY KEY (root_path, relative_path)
    );
    CREATE TABLE IF NOT EXISTS tabs (
      root_path TEXT NOT NULL REFERENCES roots(root_path) ON DELETE CASCADE,
      relative_path TEXT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (root_path, relative_path)
    );
    CREATE TABLE IF NOT EXISTS active_tab (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      root_path TEXT,
      relative_path TEXT
    );
    CREATE TABLE IF NOT EXISTS window_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      maximized INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      theme_source TEXT NOT NULL DEFAULT 'system'
    );
  `)
  db.prepare('INSERT OR IGNORE INTO schema_info (key, value) VALUES (?, ?)').run(
    'app_schema_version',
    '1'
  )
  ensureScrollPositionColumn(db)
  return db
}

// Additive migration for a database created before Slice 17: CREATE TABLE IF
// NOT EXISTS above never alters an existing table, so a pre-existing `tabs`
// table needs the column added explicitly. Safe to run on every open - the
// PRAGMA check makes it a no-op once the column exists, including on a
// freshly created database (where the CREATE TABLE above already ran without
// it, same as any other existing install).
function ensureScrollPositionColumn(db: RootsDatabase): void {
  const columns = db.prepare('PRAGMA table_info(tabs)').all() as { name: string }[]
  if (!columns.some((column) => column.name === 'scroll_position')) {
    db.exec('ALTER TABLE tabs ADD COLUMN scroll_position INTEGER')
  }
}

export function loadRoots(db: RootsDatabase): PersistedRoot[] {
  const rows = db.prepare('SELECT root_path, collapsed FROM roots ORDER BY position ASC').all() as {
    root_path: string
    collapsed: number
  }[]
  const expandedStmt = db.prepare('SELECT relative_path FROM expanded_folders WHERE root_path = ?')
  return rows.map((row) => ({
    rootPath: row.root_path,
    collapsed: row.collapsed === 1,
    expandedPaths: (expandedStmt.all(row.root_path) as { relative_path: string }[]).map(
      (entry) => entry.relative_path
    )
  }))
}

/**
 * True when `rootPath` is a folder the user actually added, i.e. a row in
 * `roots`. This is what makes the trusted-root boundary real: every filesystem
 * read reaches the main process with a renderer-supplied root, and without this
 * check `readMarkdownFile`/`readWorkspaceAsset` would happily contain a read to
 * any directory on the machine the renderer cared to name.
 *
 * Exact string match, deliberately: every rootPath the renderer holds came from
 * `workspace:addRoot` or `workspace:loadState`, so it is always the same string
 * this table stores - the same assumption `expanded_folders` and `tabs` already
 * make in their own keys.
 */
export function isTrustedRoot(db: RootsDatabase, rootPath: string): boolean {
  const row = db.prepare('SELECT 1 AS present FROM roots WHERE root_path = ?').get(rootPath) as
    { present: number } | undefined
  return row !== undefined
}

export function addRootRecord(db: RootsDatabase, rootPath: string): void {
  const { maxPosition } = db.prepare('SELECT MAX(position) AS maxPosition FROM roots').get() as {
    maxPosition: number | null
  }
  const position = (maxPosition ?? -1) + 1
  db.prepare('INSERT OR IGNORE INTO roots (root_path, position, collapsed) VALUES (?, ?, 0)').run(
    rootPath,
    position
  )
}

export function removeRootRecord(db: RootsDatabase, rootPath: string): void {
  db.prepare('DELETE FROM roots WHERE root_path = ?').run(rootPath)
  // Tabs for this root cascade via the FK above; active_tab isn't
  // FK-linked (it can legitimately be all-NULL), so clear it explicitly
  // rather than leave it pointing at a tab that no longer exists.
  db.prepare(
    'UPDATE active_tab SET root_path = NULL, relative_path = NULL WHERE id = 1 AND root_path = ?'
  ).run(rootPath)
}

export function setRootCollapsed(db: RootsDatabase, rootPath: string, collapsed: boolean): void {
  db.prepare('UPDATE roots SET collapsed = ? WHERE root_path = ?').run(collapsed ? 1 : 0, rootPath)
}

// Reassigns every root's position from the given order in one transaction -
// simplest correct approach for a short list, no fractional-position scheme
// needed. `orderedRootPaths` must be a permutation of the existing roots;
// a root path that no longer exists is silently ignored by the WHERE clause.
export function setRootPositions(db: RootsDatabase, orderedRootPaths: string[]): void {
  const update = db.prepare('UPDATE roots SET position = ? WHERE root_path = ?')
  const updateAll = db.transaction((paths: string[]) => {
    paths.forEach((rootPath, index) => update.run(index, rootPath))
  })
  updateAll(orderedRootPaths)
}

export function setFolderExpanded(
  db: RootsDatabase,
  rootPath: string,
  relativePath: string,
  expanded: boolean
): void {
  if (expanded) {
    db.prepare(
      'INSERT OR IGNORE INTO expanded_folders (root_path, relative_path) VALUES (?, ?)'
    ).run(rootPath, relativePath)
  } else {
    db.prepare('DELETE FROM expanded_folders WHERE root_path = ? AND relative_path = ?').run(
      rootPath,
      relativePath
    )
  }
}

export function loadTabs(db: RootsDatabase): PersistedTab[] {
  const rows = db
    .prepare(
      'SELECT root_path, relative_path, name, scroll_position FROM tabs ORDER BY position ASC'
    )
    .all() as {
    root_path: string
    relative_path: string
    name: string
    scroll_position: number | null
  }[]
  return rows.map((row) => ({
    rootPath: row.root_path,
    relativePath: row.relative_path,
    name: row.name,
    scrollPosition: row.scroll_position
  }))
}

export function addTabRecord(
  db: RootsDatabase,
  rootPath: string,
  relativePath: string,
  name: string
): void {
  const { maxPosition } = db.prepare('SELECT MAX(position) AS maxPosition FROM tabs').get() as {
    maxPosition: number | null
  }
  const position = (maxPosition ?? -1) + 1
  db.prepare(
    'INSERT OR IGNORE INTO tabs (root_path, relative_path, name, position) VALUES (?, ?, ?, ?)'
  ).run(rootPath, relativePath, name, position)
}

export function removeTabRecord(db: RootsDatabase, rootPath: string, relativePath: string): void {
  db.prepare('DELETE FROM tabs WHERE root_path = ? AND relative_path = ?').run(
    rootPath,
    relativePath
  )
  db.prepare(
    `UPDATE active_tab SET root_path = NULL, relative_path = NULL
     WHERE id = 1 AND root_path = ? AND relative_path = ?`
  ).run(rootPath, relativePath)
}

export function setActiveTab(
  db: RootsDatabase,
  tab: { rootPath: string; relativePath: string } | null
): void {
  db.prepare(
    `INSERT INTO active_tab (id, root_path, relative_path) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET root_path = excluded.root_path, relative_path = excluded.relative_path`
  ).run(tab?.rootPath ?? null, tab?.relativePath ?? null)
}

export function loadActiveTab(db: RootsDatabase): PersistedTab | null {
  const row = db
    .prepare(
      `SELECT t.root_path, t.relative_path, t.name, t.scroll_position
       FROM active_tab a
       JOIN tabs t ON t.root_path = a.root_path AND t.relative_path = a.relative_path
       WHERE a.id = 1`
    )
    .get() as
    | { root_path: string; relative_path: string; name: string; scroll_position: number | null }
    | undefined
  if (!row) return null
  return {
    rootPath: row.root_path,
    relativePath: row.relative_path,
    name: row.name,
    scrollPosition: row.scroll_position
  }
}

export function setTabScrollPosition(
  db: RootsDatabase,
  rootPath: string,
  relativePath: string,
  scrollPosition: number
): void {
  db.prepare('UPDATE tabs SET scroll_position = ? WHERE root_path = ? AND relative_path = ?').run(
    scrollPosition,
    rootPath,
    relativePath
  )
}

export function loadWindowState(db: RootsDatabase): PersistedWindowState | null {
  const row = db.prepare('SELECT width, height, maximized FROM window_state WHERE id = 1').get() as
    { width: number; height: number; maximized: number } | undefined
  if (!row) return null
  return { width: row.width, height: row.height, maximized: row.maximized === 1 }
}

export function saveWindowState(db: RootsDatabase, state: PersistedWindowState): void {
  db.prepare(
    `INSERT INTO window_state (id, width, height, maximized) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET width = excluded.width, height = excluded.height, maximized = excluded.maximized`
  ).run(state.width, state.height, state.maximized ? 1 : 0)
}

const THEME_SOURCES: ReadonlySet<string> = new Set<ThemeSource>(['system', 'light', 'dark'])

export function isThemeSource(value: unknown): value is ThemeSource {
  return typeof value === 'string' && THEME_SOURCES.has(value)
}

// The stored value is checked rather than trusted: this string is assigned
// straight to nativeTheme.themeSource, which throws on anything outside the
// three valid values, and that assignment happens in createWindow() before the
// window exists - so a database edited by hand, or written by a future version
// with a wider set, would crash the app at launch with no window to report it.
export function loadThemeSource(db: RootsDatabase): ThemeSource {
  const row = db.prepare('SELECT theme_source FROM settings WHERE id = 1').get() as
    { theme_source: string } | undefined
  const stored = row?.theme_source
  return isThemeSource(stored) ? stored : 'system'
}

export function saveThemeSource(db: RootsDatabase, themeSource: ThemeSource): void {
  db.prepare(
    `INSERT INTO settings (id, theme_source) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET theme_source = excluded.theme_source`
  ).run(themeSource)
}
