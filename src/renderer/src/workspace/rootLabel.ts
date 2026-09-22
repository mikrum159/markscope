// Shared by RootSection (sidebar) and Breadcrumb (main pane) - both need the
// same "last path segment" display name for a root.
export function rootLabel(rootPath: string): string {
  const segments = rootPath.split(/[/\\]/).filter(Boolean)
  return segments[segments.length - 1] ?? rootPath
}
