import { contextBridge, ipcRenderer } from 'electron'
import type { ScannedFolderNode } from '../main/workspace/scan'
import type { PersistedTab, ThemeSource } from '../main/workspace/rootsRepository'
import type { SearchResult } from '../main/search/searchDocuments'

export interface AddRootResult {
  rootPath: string
  tree: ScannedFolderNode
}

export interface RestoredRoot {
  rootPath: string
  tree: ScannedFolderNode
  collapsed: boolean
  expandedPaths: string[]
}

// Custom APIs for renderer
const api = {
  workspace: {
    addRoot: (): Promise<AddRootResult | null> => ipcRenderer.invoke('workspace:addRoot'),
    readFile: (rootPath: string, relativePath: string): Promise<string | null> =>
      ipcRenderer.invoke('workspace:readFile', rootPath, relativePath),
    readAsset: (
      rootPath: string,
      documentRelativePath: string,
      assetPath: string
    ): Promise<string | null> =>
      ipcRenderer.invoke('workspace:readAsset', rootPath, documentRelativePath, assetPath),
    loadState: (): Promise<RestoredRoot[]> => ipcRenderer.invoke('workspace:loadState'),
    removeRoot: (rootPath: string): Promise<void> =>
      ipcRenderer.invoke('workspace:removeRoot', rootPath),
    setRootCollapsed: (rootPath: string, collapsed: boolean): Promise<void> =>
      ipcRenderer.invoke('workspace:setRootCollapsed', rootPath, collapsed),
    setRootPositions: (orderedRootPaths: string[]): Promise<void> =>
      ipcRenderer.invoke('workspace:setRootPositions', orderedRootPaths),
    setFolderExpanded: (rootPath: string, relativePath: string, expanded: boolean): Promise<void> =>
      ipcRenderer.invoke('workspace:setFolderExpanded', rootPath, relativePath, expanded),
    loadTabs: (): Promise<{ tabs: PersistedTab[]; activeTab: PersistedTab | null }> =>
      ipcRenderer.invoke('workspace:loadTabs'),
    addTab: (rootPath: string, relativePath: string, name: string): Promise<void> =>
      ipcRenderer.invoke('workspace:addTab', rootPath, relativePath, name),
    removeTab: (rootPath: string, relativePath: string): Promise<void> =>
      ipcRenderer.invoke('workspace:removeTab', rootPath, relativePath),
    setActiveTab: (tab: { rootPath: string; relativePath: string } | null): Promise<void> =>
      ipcRenderer.invoke('workspace:setActiveTab', tab),
    setTabScrollPosition: (
      rootPath: string,
      relativePath: string,
      scrollPosition: number
    ): Promise<void> =>
      ipcRenderer.invoke('workspace:setTabScrollPosition', rootPath, relativePath, scrollPosition),
    // Main pushes this right before the window actually closes (see
    // main/index.ts's 'close' handler), so the active tab's live scroll
    // position - never written unless the user happens to switch tabs first
    // (Slice 17) - gets one last chance to reach SQLite. `flush` does the
    // actual capture/persist and resolves when it's safe to ack; the ack
    // tells main it can stop waiting and let the window close.
    onRequestScrollFlush: (flush: () => Promise<void>): (() => void) => {
      const listener = (): void => {
        void flush().finally(() => ipcRenderer.send('workspace:scrollFlushed'))
      }
      ipcRenderer.on('workspace:requestScrollFlush', listener)
      return () => ipcRenderer.removeListener('workspace:requestScrollFlush', listener)
    }
  },
  search: {
    query: (query: string): Promise<SearchResult[]> => ipcRenderer.invoke('search:query', query)
  },
  settings: {
    getTheme: (): Promise<ThemeSource> => ipcRenderer.invoke('settings:getTheme'),
    setTheme: (themeSource: ThemeSource): Promise<void> =>
      ipcRenderer.invoke('settings:setTheme', themeSource)
  }
}

// `api` above is the renderer's ENTIRE view of the main process: every channel
// it can reach is named here, with a fixed argument shape. The scaffold also
// exposed `@electron-toolkit/preload`'s `electronAPI` as `window.electron`,
// which hands the renderer a generic `ipcRenderer.invoke(channel, ...args)` —
// any channel, any arguments, bypassing this surface entirely. Nothing in the
// renderer ever used it, so it is gone along with its dependency; do not add a
// general-purpose bridge back. A new capability gets a named method here.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
