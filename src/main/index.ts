import { app, dialog, shell, BrowserWindow, ipcMain, nativeTheme, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// Multi-resolution .ico (16 through 256px bundled in one file) rather than a
// single flat PNG, so Windows picks the exact bitmap for each context - the
// title bar's small icon and Alt+Tab/taskbar's large one both render crisp
// instead of one image being scaled for both.
import iconLight from '../../resources/icons/markscope.ico?asset'
import iconDark from '../../resources/icons/markscope-dark.ico?asset'
import { scanRoot, type ScannedFolderNode } from './workspace/scan'
import { readTrustedMarkdownFile, readTrustedAsset } from './workspace/trustedRead'
import {
  openRootsDatabase,
  loadRoots,
  addRootRecord,
  removeRootRecord,
  setRootCollapsed,
  setRootPositions,
  setFolderExpanded,
  loadTabs,
  addTabRecord,
  removeTabRecord,
  setActiveTab,
  loadActiveTab,
  setTabScrollPosition,
  loadWindowState,
  saveWindowState,
  loadThemeSource,
  saveThemeSource,
  isThemeSource,
  type PersistedTab,
  type RootsDatabase,
  type ThemeSource
} from './workspace/rootsRepository'
import { ensureCatalogSchema } from './search/catalogRepository'
import { indexRoot } from './search/indexRoot'
import { searchDocuments, type SearchResult } from './search/searchDocuments'

export interface RestoredRoot {
  rootPath: string
  tree: ScannedFolderNode
  collapsed: boolean
  expandedPaths: string[]
}

// Matches --color-bg in src/renderer/src/assets/theme.css. The window paints
// this before the renderer's stylesheet loads and whenever it is resized, so a
// stale value shows as a flash of the wrong theme (ADR-0020).
function windowBackground(): string {
  return nativeTheme.shouldUseDarkColors ? '#16181c' : '#ffffff'
}

// Windows doesn't re-theme a static window/taskbar icon on its own - the dark
// .ico has to be swapped in explicitly, same as windowBackground() above.
function windowIcon(): string {
  return nativeTheme.shouldUseDarkColors ? iconDark : iconLight
}

// Schemes shell.openExternal is allowed to hand to the OS. Anything else -
// including file:, and the ms-* protocol handlers Windows registers - is
// dropped rather than launched. Parsed with the URL constructor rather than a
// string prefix test, so an encoded or whitespace-padded scheme can't slip a
// different protocol past a startsWith check.
const OPENABLE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:'])

function isExternallyOpenable(url: string): boolean {
  try {
    return OPENABLE_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}

const DEFAULT_WINDOW_WIDTH = 900
const DEFAULT_WINDOW_HEIGHT = 670

// Falls back to the hardcoded default whenever the saved size no longer fits
// the current screen (e.g. the app last quit on a bigger monitor) - a
// maximized window always maximizes again instead, since it adapts to
// whatever screen is available regardless of its saved normal-state size.
function resolveWindowSize(saved: { width: number; height: number; maximized: boolean } | null): {
  width: number
  height: number
} {
  if (!saved) return { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT }
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const fits = saved.width <= workArea.width && saved.height <= workArea.height
  if (saved.maximized || fits) return { width: saved.width, height: saved.height }
  return { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT }
}

function createWindow(db: RootsDatabase): void {
  // Applied before the window is constructed so windowBackground() (below)
  // and the first paint already reflect the user's override, not the OS
  // default. Electron re-derives shouldUseDarkColors/prefers-color-scheme
  // from this for the whole app - no renderer/CSS change needed (ADR-0020).
  nativeTheme.themeSource = loadThemeSource(db)

  const savedWindowState = loadWindowState(db)
  const { width, height } = resolveWindowSize(savedWindowState)

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: windowBackground(),
    // Windows is the only supported platform (ADR-0016), so the icon is
    // always applied rather than gated by process.platform.
    icon: windowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Both are already Electron's defaults. Stated explicitly because
      // SECURITY.md asserts them as properties of this app, and a reader
      // auditing that claim should find it in the code rather than have to
      // know which Electron version changed the default. Also pins them
      // against a future default changing underneath us.
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (savedWindowState?.maximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Scroll position is only written to SQLite when switching tabs
  // (useDocumentTabs.ts's captureOutgoingScroll) - quitting without ever
  // switching away from the active tab would otherwise lose its latest
  // position (a named gap from Slice 17). Delay the actual close just long
  // enough to ask the renderer for one last flush, with a short timeout in
  // case it never responds (e.g. closing before the page finished loading).
  let readyToClose = false
  mainWindow.on('close', (event) => {
    if (readyToClose) return
    event.preventDefault()

    // getNormalBounds() returns the un-maximized size even while maximized,
    // so a maximized window still saves a sane size to restore to later.
    const bounds = mainWindow.getNormalBounds()
    saveWindowState(db, {
      width: bounds.width,
      height: bounds.height,
      maximized: mainWindow.isMaximized()
    })

    const finishClose = (): void => {
      readyToClose = true
      mainWindow.close()
    }
    const timeout = setTimeout(finishClose, 300)
    ipcMain.once('workspace:scrollFlushed', () => {
      clearTimeout(timeout)
      finishClose()
    })
    mainWindow.webContents.send('workspace:requestScrollFlush')
  })

  nativeTheme.on('updated', () => {
    mainWindow.setBackgroundColor(windowBackground())
    mainWindow.setIcon(windowIcon())
  })

  // Only ever hands the OS a web or mail URL. DocumentPreview's PreviewLink
  // already filters hrefs to http(s)/mailto before rendering an anchor, but
  // this handler is global - it fires for any window.open from the renderer,
  // not just for links this app chose to render - and shell.openExternal will
  // launch whatever handler Windows has registered for a scheme, including
  // ones that take arguments. The allowlist is what makes that unreachable.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isExternallyOpenable(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // The app is a single local page and never navigates: every document is
  // rendered in place, and real links open in the browser via the handler
  // above. Without this, dropping a file anywhere outside the root-reorder
  // drop zones - the preview pane being the obvious place to try - makes
  // Chromium navigate the window to that file:// URL, unloading the app with
  // the preload still attached and no way back short of restarting. The
  // renderer refuses the drop too (App.tsx); this is the backstop that also
  // covers any other navigation attempt.
  // Unconditional: nothing in this app is supposed to navigate at all. The
  // initial load and any reload go through loadFile/loadURL, which are
  // programmatic and do not raise this event, so blocking every occurrence
  // costs nothing and needs no allowlist to keep in sync.
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// Affects the userData default path (unused here - see openRootsDatabase's
// explicit path below) and Windows surfaces read directly from Electron
// rather than the exe's own resources (e.g. notifications). It does not
// rename the unpackaged electron.exe itself, so the taskbar/right-click
// entry still reads "Electron" in dev - that's a packaging-time fix
// (embedding the exe's own name/icon resources), not something settable
// from here; electron-builder isn't installed yet (AGENTS.md).
app.setName('MarkScope')

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.markscope.app')

  // Session persistence: which roots are open, their order, collapsed state
  // and expanded folders. See rootsRepository.ts for what this does and does
  // not cover.
  const rootsDb = openRootsDatabase(join(app.getPath('userData'), 'markscope.db'))
  // Search catalog schema (documents/documents_fts) - same database file,
  // see catalogRepository.ts and the search-schema Decision Slice.
  ensureCatalogSchema(rootsDb)
  app.on('before-quit', () => rootsDb.close())

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Trusted-root selection is explicit user action via a native dialog
  // (ADR-0003). The scan itself is a pure fs walk; see workspace/scan.ts.
  ipcMain.handle(
    'workspace:addRoot',
    async (event): Promise<{ rootPath: string; tree: ScannedFolderNode } | null> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] }
      const result = await (window
        ? dialog.showOpenDialog(window, options)
        : dialog.showOpenDialog(options))
      if (result.canceled || result.filePaths.length === 0) return null

      const rootPath = result.filePaths[0]
      addRootRecord(rootsDb, rootPath)
      const tree = await scanRoot(rootPath)
      await indexRoot(rootsDb, rootPath, tree)
      return { rootPath, tree }
    }
  )

  // Restores last session's open roots, in persisted order. A root whose
  // folder no longer exists (moved/deleted since last launch) is dropped
  // from the database rather than surfaced as an error - there is no "missing
  // root" UI in v0.1.
  ipcMain.handle('workspace:loadState', async (): Promise<RestoredRoot[]> => {
    const persisted = loadRoots(rootsDb)
    const restored: RestoredRoot[] = []
    for (const root of persisted) {
      try {
        const tree = await scanRoot(root.rootPath)
        await indexRoot(rootsDb, root.rootPath, tree)
        restored.push({ ...root, tree })
      } catch {
        removeRootRecord(rootsDb, root.rootPath)
      }
    }
    return restored
  })

  ipcMain.handle('workspace:removeRoot', (_event, rootPath: string): void => {
    removeRootRecord(rootsDb, rootPath)
  })

  ipcMain.handle(
    'workspace:setRootCollapsed',
    (_event, rootPath: string, collapsed: boolean): void => {
      setRootCollapsed(rootsDb, rootPath, collapsed)
    }
  )

  ipcMain.handle('workspace:setRootPositions', (_event, orderedRootPaths: string[]): void => {
    setRootPositions(rootsDb, orderedRootPaths)
  })

  ipcMain.handle(
    'workspace:setFolderExpanded',
    (_event, rootPath: string, relativePath: string, expanded: boolean): void => {
      setFolderExpanded(rootsDb, rootPath, relativePath, expanded)
    }
  )

  // Tabs are loaded separately from workspace:loadState because they span
  // roots (one tab bar, not one per root) and carry their own active-tab
  // pointer - bundling them into loadState's per-root shape would not fit.
  ipcMain.handle(
    'workspace:loadTabs',
    (): { tabs: PersistedTab[]; activeTab: PersistedTab | null } => ({
      tabs: loadTabs(rootsDb),
      activeTab: loadActiveTab(rootsDb)
    })
  )

  ipcMain.handle(
    'workspace:addTab',
    (_event, rootPath: string, relativePath: string, name: string): void => {
      addTabRecord(rootsDb, rootPath, relativePath, name)
    }
  )

  ipcMain.handle('workspace:removeTab', (_event, rootPath: string, relativePath: string): void => {
    removeTabRecord(rootsDb, rootPath, relativePath)
  })

  ipcMain.handle(
    'workspace:setActiveTab',
    (_event, tab: { rootPath: string; relativePath: string } | null): void => {
      setActiveTab(rootsDb, tab)
    }
  )

  // A no-op if rootPath/relativePath isn't a row in `tabs` - the transient
  // preview tab's scroll position is deliberately renderer-only (Slice 17
  // agreement), so the caller only reaches here for persisted tabs.
  ipcMain.handle(
    'workspace:setTabScrollPosition',
    (_event, rootPath: string, relativePath: string, scrollPosition: number): void => {
      setTabScrollPosition(rootsDb, rootPath, relativePath, scrollPosition)
    }
  )

  // Both filesystem reads go through workspace/trustedRead.ts, which checks
  // the renderer-supplied rootPath against the `roots` table before containing
  // the read to it - see that module for why the containment check alone is
  // not the boundary (architecture.md §8).
  ipcMain.handle(
    'workspace:readFile',
    (_event, rootPath: string, relativePath: string): Promise<string | null> =>
      readTrustedMarkdownFile(rootsDb, rootPath, relativePath)
  )

  ipcMain.handle(
    'workspace:readAsset',
    (
      _event,
      rootPath: string,
      documentRelativePath: string,
      assetPath: string
    ): Promise<string | null> =>
      readTrustedAsset(rootsDb, rootPath, documentRelativePath, assetPath)
  )

  // No scope filtering, no matchRanges - a single ranked list over the
  // whole catalog. See searchDocuments.ts and the search-and-catalog.md §8
  // contract this deliberately doesn't implement yet.
  ipcMain.handle('search:query', (_event, query: string): SearchResult[] =>
    searchDocuments(rootsDb, query)
  )

  ipcMain.handle('settings:getTheme', (): ThemeSource => loadThemeSource(rootsDb))

  // Setting nativeTheme.themeSource fires its own 'updated' event, so the
  // per-window listener registered in createWindow already repaints the
  // background - no separate apply step needed here.
  // Validated before assignment for the same reason loadThemeSource validates
  // what it reads back: nativeTheme.themeSource throws on anything outside the
  // three values, and an uncaught throw inside an IPC handler surfaces as a
  // rejected promise the renderer ignores, leaving the setting silently wrong.
  ipcMain.handle('settings:setTheme', (_event, themeSource: unknown): void => {
    if (!isThemeSource(themeSource)) return
    nativeTheme.themeSource = themeSource
    saveThemeSource(rootsDb, themeSource)
  })

  createWindow(rootsDb)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow(rootsDb)
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
