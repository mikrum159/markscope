import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  openRootsDatabase,
  loadRoots,
  addRootRecord,
  removeRootRecord,
  setRootCollapsed,
  setFolderExpanded,
  loadTabs,
  addTabRecord,
  removeTabRecord,
  setActiveTab,
  loadActiveTab,
  setTabScrollPosition,
  isTrustedRoot,
  loadWindowState,
  saveWindowState,
  loadThemeSource,
  saveThemeSource
} from './rootsRepository'

function freshDb(): ReturnType<typeof openRootsDatabase> {
  return openRootsDatabase(':memory:')
}

describe('rootsRepository', () => {
  it('starts empty', () => {
    expect(loadRoots(freshDb())).toEqual([])
  })

  it('persists added roots in insertion order', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    addRootRecord(db, 'C:\\Users\\dev\\project-b')

    expect(loadRoots(db)).toEqual([
      { rootPath: 'C:\\Users\\dev\\project-a', collapsed: false, expandedPaths: [] },
      { rootPath: 'C:\\Users\\dev\\project-b', collapsed: false, expandedPaths: [] }
    ])
  })

  it('does not duplicate or reorder a root that is added again', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    addRootRecord(db, 'C:\\Users\\dev\\project-b')
    addRootRecord(db, 'C:\\Users\\dev\\project-a')

    expect(loadRoots(db).map((root) => root.rootPath)).toEqual([
      'C:\\Users\\dev\\project-a',
      'C:\\Users\\dev\\project-b'
    ])
  })

  it('removes a root and cascades its expanded-folder rows', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs', true)

    removeRootRecord(db, 'C:\\Users\\dev\\project-a')

    expect(loadRoots(db)).toEqual([])
    // Re-adding the same path must not resurrect the old expanded folder.
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    expect(loadRoots(db)[0].expandedPaths).toEqual([])
  })

  it('tracks a root collapsed flag independently of other roots', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    addRootRecord(db, 'C:\\Users\\dev\\project-b')

    setRootCollapsed(db, 'C:\\Users\\dev\\project-a', true)

    const roots = loadRoots(db)
    expect(roots.find((r) => r.rootPath === 'C:\\Users\\dev\\project-a')?.collapsed).toBe(true)
    expect(roots.find((r) => r.rootPath === 'C:\\Users\\dev\\project-b')?.collapsed).toBe(false)
  })

  it('adds and removes expanded folder paths for a root', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')

    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs', true)
    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs/nested', true)
    expect(loadRoots(db)[0].expandedPaths.sort()).toEqual(['docs', 'docs/nested'])

    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs', false)
    expect(loadRoots(db)[0].expandedPaths).toEqual(['docs/nested'])
  })

  it('is idempotent when the same folder is expanded twice', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')

    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs', true)
    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs', true)

    expect(loadRoots(db)[0].expandedPaths).toEqual(['docs'])
  })

  it('keeps expanded folders scoped to their own root', () => {
    const db = freshDb()
    addRootRecord(db, 'C:\\Users\\dev\\project-a')
    addRootRecord(db, 'C:\\Users\\dev\\project-b')

    setFolderExpanded(db, 'C:\\Users\\dev\\project-a', 'docs', true)

    const roots = loadRoots(db)
    expect(roots.find((r) => r.rootPath === 'C:\\Users\\dev\\project-a')?.expandedPaths).toEqual([
      'docs'
    ])
    expect(roots.find((r) => r.rootPath === 'C:\\Users\\dev\\project-b')?.expandedPaths).toEqual([])
  })

  describe('tabs', () => {
    it('starts empty, with no active tab', () => {
      const db = freshDb()
      expect(loadTabs(db)).toEqual([])
      expect(loadActiveTab(db)).toBeNull()
    })

    it('persists opened tabs in insertion order', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'docs/tables.md', 'tables.md')

      expect(loadTabs(db)).toEqual([
        {
          rootPath: 'C:\\Users\\dev\\project-a',
          relativePath: 'README.md',
          name: 'README.md',
          scrollPosition: null
        },
        {
          rootPath: 'C:\\Users\\dev\\project-a',
          relativePath: 'docs/tables.md',
          name: 'tables.md',
          scrollPosition: null
        }
      ])
    })

    it('does not duplicate or reorder a tab that is opened again', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'docs/tables.md', 'tables.md')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')

      expect(loadTabs(db).map((tab) => tab.relativePath)).toEqual(['README.md', 'docs/tables.md'])
    })

    it('closes a tab', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')

      removeTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md')

      expect(loadTabs(db)).toEqual([])
    })

    it('tracks and clears the active tab', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')

      setActiveTab(db, { rootPath: 'C:\\Users\\dev\\project-a', relativePath: 'README.md' })
      expect(loadActiveTab(db)).toEqual({
        rootPath: 'C:\\Users\\dev\\project-a',
        relativePath: 'README.md',
        name: 'README.md',
        scrollPosition: null
      })

      setActiveTab(db, null)
      expect(loadActiveTab(db)).toBeNull()
    })

    it('clears the active tab when that tab is closed', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')
      setActiveTab(db, { rootPath: 'C:\\Users\\dev\\project-a', relativePath: 'README.md' })

      removeTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md')

      expect(loadActiveTab(db)).toBeNull()
    })

    it('removes a root, cascading its tabs and clearing the active tab', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')
      setActiveTab(db, { rootPath: 'C:\\Users\\dev\\project-a', relativePath: 'README.md' })

      removeRootRecord(db, 'C:\\Users\\dev\\project-a')

      expect(loadTabs(db)).toEqual([])
      expect(loadActiveTab(db)).toBeNull()
    })

    it('keeps tabs scoped to their own root', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addRootRecord(db, 'C:\\Users\\dev\\project-b')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'a.md', 'a.md')

      removeRootRecord(db, 'C:\\Users\\dev\\project-b')

      expect(loadTabs(db)).toEqual([
        {
          rootPath: 'C:\\Users\\dev\\project-a',
          relativePath: 'a.md',
          name: 'a.md',
          scrollPosition: null
        }
      ])
    })

    it('persists a scroll position for a tab and leaves other tabs unaffected', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'docs/tables.md', 'tables.md')

      setTabScrollPosition(db, 'C:\\Users\\dev\\project-a', 'README.md', 240)

      const tabs = loadTabs(db)
      expect(tabs.find((tab) => tab.relativePath === 'README.md')?.scrollPosition).toBe(240)
      expect(tabs.find((tab) => tab.relativePath === 'docs/tables.md')?.scrollPosition).toBeNull()
    })

    it('is a no-op setting a scroll position for a tab that does not exist', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')

      expect(() =>
        setTabScrollPosition(db, 'C:\\Users\\dev\\project-a', 'ghost.md', 100)
      ).not.toThrow()
      expect(loadTabs(db)).toEqual([])
    })
  })

  describe('window state', () => {
    it('has no saved state initially', () => {
      const db = freshDb()
      expect(loadWindowState(db)).toBeNull()
    })

    it('persists and reloads a window size and maximized flag', () => {
      const db = freshDb()
      saveWindowState(db, { width: 1200, height: 800, maximized: false })

      expect(loadWindowState(db)).toEqual({ width: 1200, height: 800, maximized: false })
    })

    it('overwrites the previous saved state rather than accumulating rows', () => {
      const db = freshDb()
      saveWindowState(db, { width: 1200, height: 800, maximized: false })
      saveWindowState(db, { width: 900, height: 670, maximized: true })

      expect(loadWindowState(db)).toEqual({ width: 900, height: 670, maximized: true })
    })
  })

  describe('theme source', () => {
    it('defaults to system when nothing is saved', () => {
      const db = freshDb()
      expect(loadThemeSource(db)).toBe('system')
    })

    it('persists and reloads an explicit override', () => {
      const db = freshDb()
      saveThemeSource(db, 'dark')

      expect(loadThemeSource(db)).toBe('dark')
    })

    it('overwrites the previous value rather than accumulating rows', () => {
      const db = freshDb()
      saveThemeSource(db, 'dark')
      saveThemeSource(db, 'light')

      expect(loadThemeSource(db)).toBe('light')
    })
  })

  describe('scroll_position migration', () => {
    let dir: string

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true })
    })

    it('adds scroll_position to a tabs table created before it existed', () => {
      dir = mkdtempSync(join(tmpdir(), 'markscope-test-'))
      const path = join(dir, 'markscope.db')

      // Simulates a pre-Slice-17 database file: build the table by hand
      // without the column, the way openRootsDatabase's CREATE TABLE IF NOT
      // EXISTS would have left an existing install, then close and reopen
      // through the real function - mirrors an actual app restart.
      const db = openRootsDatabase(path)
      db.exec('DROP TABLE tabs')
      db.exec(`
        CREATE TABLE tabs (
          root_path TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          name TEXT NOT NULL,
          position INTEGER NOT NULL,
          PRIMARY KEY (root_path, relative_path)
        );
      `)
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      addTabRecord(db, 'C:\\Users\\dev\\project-a', 'README.md', 'README.md')
      db.close()

      const reopened = openRootsDatabase(path)
      expect(reopened.prepare('PRAGMA table_info(tabs)').all()).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'scroll_position' })])
      )
      expect(loadTabs(reopened)).toEqual([
        {
          rootPath: 'C:\\Users\\dev\\project-a',
          relativePath: 'README.md',
          name: 'README.md',
          scrollPosition: null
        }
      ])
      reopened.close()
    })
  })

  describe('isTrustedRoot', () => {
    it('is false for a root that was never added', () => {
      expect(isTrustedRoot(freshDb(), 'C:\\Users\\dev\\project-a')).toBe(false)
    })

    it('is true for an added root and false again once it is removed', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      expect(isTrustedRoot(db, 'C:\\Users\\dev\\project-a')).toBe(true)

      removeRootRecord(db, 'C:\\Users\\dev\\project-a')
      expect(isTrustedRoot(db, 'C:\\Users\\dev\\project-a')).toBe(false)
    })

    it('does not treat a parent or child of an added root as trusted', () => {
      const db = freshDb()
      addRootRecord(db, 'C:\\Users\\dev\\project-a')
      expect(isTrustedRoot(db, 'C:\\Users\\dev')).toBe(false)
      expect(isTrustedRoot(db, 'C:\\Users\\dev\\project-a\\docs')).toBe(false)
    })
  })

  describe('loadThemeSource validation', () => {
    it('falls back to system when the stored value is not a theme source', () => {
      const db = freshDb()
      // Written past saveThemeSource's type, standing in for a database edited
      // by hand or written by a future version with a wider set of values.
      db.prepare("INSERT INTO settings (id, theme_source) VALUES (1, 'solarized')").run()
      expect(loadThemeSource(db)).toBe('system')
    })

    it('still returns a valid stored value', () => {
      const db = freshDb()
      saveThemeSource(db, 'dark')
      expect(loadThemeSource(db)).toBe('dark')
    })
  })
})
