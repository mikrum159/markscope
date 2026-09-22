import type { AddRootResult, RestoredRoot } from './index'
import type { PersistedTab, ThemeSource } from '../main/workspace/rootsRepository'
import type { SearchResult } from '../main/search/searchDocuments'

declare global {
  interface Window {
    api: {
      workspace: {
        addRoot: () => Promise<AddRootResult | null>
        readFile: (rootPath: string, relativePath: string) => Promise<string | null>
        readAsset: (
          rootPath: string,
          documentRelativePath: string,
          assetPath: string
        ) => Promise<string | null>
        loadState: () => Promise<RestoredRoot[]>
        removeRoot: (rootPath: string) => Promise<void>
        setRootCollapsed: (rootPath: string, collapsed: boolean) => Promise<void>
        setRootPositions: (orderedRootPaths: string[]) => Promise<void>
        setFolderExpanded: (
          rootPath: string,
          relativePath: string,
          expanded: boolean
        ) => Promise<void>
        loadTabs: () => Promise<{ tabs: PersistedTab[]; activeTab: PersistedTab | null }>
        addTab: (rootPath: string, relativePath: string, name: string) => Promise<void>
        removeTab: (rootPath: string, relativePath: string) => Promise<void>
        setActiveTab: (tab: { rootPath: string; relativePath: string } | null) => Promise<void>
        setTabScrollPosition: (
          rootPath: string,
          relativePath: string,
          scrollPosition: number
        ) => Promise<void>
        onRequestScrollFlush: (flush: () => Promise<void>) => () => void
      }
      search: {
        query: (query: string) => Promise<SearchResult[]>
      }
      settings: {
        getTheme: () => Promise<ThemeSource>
        setTheme: (themeSource: ThemeSource) => Promise<void>
      }
    }
  }
}
