// A renderer-owned view of the IPC payload's tree shape (structurally
// compatible with main/workspace/scan.ts's ScannedNode). Kept local rather
// than shared across the main/renderer TypeScript project boundary.
export interface FileEntry {
  type: 'file'
  name: string
  relativePath: string
}

export interface FolderEntry {
  type: 'folder'
  name: string
  relativePath: string
  children: TreeEntry[]
}

export type TreeEntry = FileEntry | FolderEntry
