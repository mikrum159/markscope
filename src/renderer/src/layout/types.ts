// The sidebar icon-rail selects which view the sidebar (and, for non-folder
// views, the main pane) shows. 'folders' is the default and only view with
// document content; a future rail item that needs its own sidebar content
// adds a case here rather than a new one-off boolean.
export type SidebarView = 'folders' | 'settings'
