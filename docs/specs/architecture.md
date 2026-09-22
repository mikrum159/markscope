> Working draft from the original specification; details require reconciliation with the confirmed Markdown-viewer MVP. Examples and build commands are proposals, not installed or verified tooling.
>
> Source: markscope-v2.1-fable/02-architecture-v2.md, migrated 2026-09-09.

> **Reconciled 2026-09-13** against [ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md) through [ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md). Every section revised. The shell is Electron and the backend is TypeScript in the main process, not Rust behind Tauri commands; search is SQLite FTS5 in the workspace database, not a separate Tantivy index; there is one kind of trusted root; and v0.1 has no AI surface and no CLI.
>
> **§3 principle 8 is deliberately superseded, not edited away** — see that section. It is the one place where a v0.2 feature knowingly breaks a v0.1 principle, and the record of that belongs here rather than in a diff.
>
> Section numbering is unchanged so existing cross-references still resolve. The **gateway pattern (§7) survives the stack change intact** — it was never a Tauri construct.
>
> Current working state lives in [the MVP shape](../plans/mvp-shape/shape.md).

# MarkScope Architecture (v2)

> Revision notes
>
> Surgical additions to v1, no structural changes:
>
> - `AiService` added to the service layer (section 1, 5, 6).
> - `AiGateway` example added to the gateway pattern (section 7).
> - `WorkspaceService` updated to distinguish durable vs ephemeral
>   roots (section 6).
> - Trusted-root security model updated to confirm ephemeral roots
>   inherit the same security properties (section 8).

> **Historical, 2026-09-13.** Kept for provenance. All four additions above have since been reversed: `AiService` and `AiGateway` are gone with the v0.1 AI surface ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)), and the durable/ephemeral root distinction is gone with the CLI ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md), premise rejected).

## 1. Architecture Overview

MarkScope is an Electron application written in TypeScript end to end:
a React renderer, a thin preload bridge, and a main process that owns
everything touching the filesystem
([ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md)).

```text
Renderer — React + TypeScript
  ├─ Explorer
  ├─ Opened Files
  ├─ Tabs
  ├─ Markdown Preview
  ├─ Outline Panel
  ├─ Search UI
  └─ Keybindings Overlay

Preload bridge — contextBridge, no Node in the renderer
  ├─ Workspace channels
  ├─ Catalog channels
  ├─ Search channels
  └─ File channels

Main process — TypeScript
  ├─ WorkspaceService
  ├─ CatalogService
  ├─ SearchService
  ├─ WatcherService
  ├─ MarkdownService
  └─ IgnoreService

Storage
  └─ SQLite: workspace, catalog, and the FTS5 index, one database
```

Two things left the diagram on 2026-09-13: the AI summary panel, AI
channels and `AiService`
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)),
and `CliService` with the in-memory ephemeral catalog
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).
Update channels are gone with in-app updating
([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md),
revised).

## 2. Technology Choices

| Area | Choice |
|---|---|
| Desktop shell | Electron |
| Frontend | React + TypeScript + Vite |
| Backend | TypeScript in the Electron main process |
| Renderer ↔ main | `contextBridge` preload + `ipcRenderer.invoke` |
| Local metadata | SQLite via `better-sqlite3` |
| Full-text search | SQLite FTS5, in the same database |
| Markdown rendering | `react-markdown` |
| GitHub-flavored Markdown | `remark-gfm` |
| Sanitization | `rehype-sanitize` |
| Mermaid | `mermaid` |
| Styling | Plain CSS with semantic design tokens; CSS Modules per component |
| Theming | Light/dark from `prefers-color-scheme`, OS-driven only in v0.1 |
| Fonts | Windows system faces - no bundled web fonts in v0.1 |
| Icons | `lucide-react`, not yet installed |
| File watching | `chokidar` |
| Packaging | `electron-builder` (NSIS installer) |
| Editor, later | CodeMirror 6 |
| Distribution | GitHub Releases |
| Updates | None in v0.1 — run a new installer |
| Target platform | Windows only |

**No version numbers appear in this table on purpose.** Versions are
chosen from the live registry at install time and pinned in a committed
lockfile; figures in the imported specification are unverified
([AGENTS.md](../../AGENTS.md), [quality.md](quality.md) §1).

**Added 2026-09-13:** styling, theming, fonts and icons
([ADR-0020](../adr/0020-css-design-tokens-for-styling-and-theming.md)).
The table previously stopped at content rendering and said nothing about
how anything is styled.

**Removed 2026-09-13:** Tauri v2, Rust, Tantivy
([ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md),
[ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)),
`reqwest` and the AI HTTP client
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)),
`tauri-plugin-cli`
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)),
the Tauri updater, and macOS
([ADR-0016](../adr/0016-windows-only-v0-1.md)).

## 3. Architectural Principles

1. **Preview-first UX**
   - Markdown preview is the default.
   - Editing is explicit and deferred.

2. **Trusted-root security model**
   - The app only operates inside folders explicitly added by the user.
   - There is one kind of trusted root.

3. **Search and tree share a catalog**
   - The explorer tree, open tabs, and search reference the same document model.

4. **SQLite holds both metadata and the index**
   - One database file holds workspace state, catalog metadata, and the
     FTS5 index ([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)).
   - Catalog and index updates can therefore share a transaction.

5. **File system is the source of truth**
   - Markdown content remains in files.
   - The database is rebuildable.

6. **The renderer does not know storage internals**
   - UI talks to gateway interfaces (§7).
   - The main process owns scanning, indexing, watching, and all file
     access. The renderer runs with context isolation on and node
     integration off, and reaches the main process only through the
     preload allowlist.

7. **Index is disposable**
   - The FTS5 index can be dropped and rebuilt at any time.

8. **No network surface in v0.1**
   - The application makes no outbound network call of any kind. There
     is no provider configuration, no credential handling, and no HTTP
     client ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).
   - [quality.md](quality.md) §3 requires this be *checked* on the
     shipped build, by a stated method. A design intention is not a
     check.

   > **Supersession, recorded deliberately.** This principle previously
   > read "AI is opt-in and isolated — network calls happen only on
   > explicit user action." The v0.2 summary feature is specified as
   > **lazy on first open**, cached by content hash — and opening a
   > document is ordinary navigation, not an explicit user action in
   > the sense this principle meant. So v0.2 will knowingly break the
   > older rule rather than satisfy it.
   >
   > The replacement rule for v0.2: summarization is opt-in *at the
   > feature level* — inert until the user configures a provider — and
   > once enabled, a cache miss on open may issue one request. If that
   > proves surprising in use, the fallback is an explicit per-document
   > trigger, which is what ADR-0012 originally specified.
   >
   > This is recorded rather than edited away because a silently
   > rewritten principle is indistinguishable from an oversight. See
   > [ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md).

## 4. Frontend Module Structure

Suggested structure:

```text
src/renderer/
  app/
    App.tsx
    providers.tsx

  features/
    workspace/
      workspaceStore.ts
      workspaceGateway.ts

    explorer/
      ExplorerPanel.tsx
      TreeView.tsx
      TreeNode.tsx
      explorerTypes.ts

    opened-files/
      OpenedFilesSection.tsx

    tabs/
      TabBar.tsx
      tabStore.ts
      tabTypes.ts

    preview/
      MarkdownPreview.tsx
      MermaidBlock.tsx
      markdownLinkHandler.ts
      previewStore.ts

    outline/
      OutlinePanel.tsx
      Breadcrumb.tsx
      outlineStore.ts
      scrollSpy.ts
      outlineTypes.ts

    search/
      SearchPanel.tsx
      QuickOpen.tsx
      SearchResults.tsx
      searchGateway.ts
      searchTypes.ts

    keybindings/
      KeybindingsOverlay.tsx
      keymap.ts
```

No `favorites/` or `settings/` features in v0.1
([ADR-0013](../adr/0013-cut-favorites-explorer-state-persistence-and-settings-ui-from-mvp.md)).
`ai/` and `updater/` are removed
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md),
[ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md) revised);
`outline/` replaces `ai/` as the document-context feature.

## 5. Main Process Module Structure

The `src-tauri/src` Rust tree that stood here is replaced. Suggested
structure:

```text
src/main/
  main.ts
  windows.ts
  state.ts

  ipc/
    workspaceHandlers.ts
    catalogHandlers.ts
    fileHandlers.ts
    searchHandlers.ts
    channels.ts          # channel names, shared with preload

  services/
    workspaceService.ts
    catalogService.ts
    searchService.ts
    watcherService.ts
    markdownService.ts
    ignoreService.ts

  storage/
    db.ts
    migrations/
    repositories/
      rootsRepository.ts
      documentsRepository.ts
      tabsRepository.ts

  search/
    ftsSchema.ts
    query.ts
    snippets.ts

  model/
    workspace.ts
    document.ts
    explorer.ts
    outline.ts
    search.ts

src/preload/
  index.ts               # contextBridge surface, allowlisted channels only
```

**Removed 2026-09-13:** `ai/` with its provider adapters and
`ai_commands`
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)),
`cli_service`
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)),
`updater_commands`
([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised),
and the separate `tantivy_index`/`schema` module — the FTS5 schema
lives with the rest of the database
([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)).

## 6. Service Responsibilities

### WorkspaceService

Owns high-level workspace state:

- Trusted roots — one kind, persisted in SQLite, restored on launch,
  added via the UI.
- Opened tabs (pinned only persisted).
- Active tab.
- Scroll positions for pinned tabs.
- Window/layout state.
- Startup restore.

> **Simplified 2026-09-13** ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)). This previously described two root kinds — durable and ephemeral — sharing one in-memory model and differing only in persistence rules. That second lifetime is what threaded through catalog, search, watcher and tabs; removing it is the single largest simplification in this reconciliation.

### CatalogService

Owns the Markdown catalog:

- Scans roots.
- Applies ignore rules.
- Detects Markdown files.
- Extracts titles and heading structure.
- Stores metadata in SQLite.
- Builds tree model.
- Handles deleted/moved files.

### SearchService

Owns search behavior:

- Creates and migrates the FTS5 tables.
- Indexes catalog documents.
- Handles search and quick-open requests.
- Rebuilds the index on demand.
- Updates the index after watcher events, in the same transaction as
  the catalog update where practical.

The `root_id` tagging that existed to segregate ephemeral entries, and
the startup sweep for unknown `root_id`s, are no longer needed
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).
Rows still carry their root so a removed root's documents can be
deleted; that is ordinary bookkeeping, not a second lifetime.

### WatcherService

Owns file-system change detection, via `chokidar`:

- Watches each trusted root.
- Debounces changes.
- Classifies create/update/delete/rename. Treat an unmatched rename
  half as delete+create.
- Requests catalog/search updates.
- Notifies the renderer when the active preview should refresh.

### IgnoreService

Owns path exclusion logic:

- Built-in default ignores.
- User ignores from `app-config.json`.
- Hidden-folder exclusion.
- No `.gitignore` support in MVP
  ([ADR-0007](../adr/0007-do-not-support-gitignore-in-mvp.md)).

### MarkdownService

Owns Markdown metadata extraction in the main process:

- Extract H1 title.
- Extract the heading hierarchy that feeds the outline panel,
  including skipped levels and documents with no headings.
- Generate slug candidates for jump-to-section and heading search.
- Parse frontmatter when present; absence and malformed YAML are
  normal, not errors.

The renderer still renders Markdown. Extraction happens here so the
outline, quick-open and search all read the same heading model rather
than three parsers disagreeing.

> **Removed 2026-09-13: `AiService` and `CliService`.** `AiService` owned provider configuration, adapter dispatch, streaming and error reporting, and was the single place allowed to make outbound HTTP requests. v0.1 has no such place — nothing makes outbound requests ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)). `CliService` parsed a positional path argument and handed it to `WorkspaceService` as an ephemeral root ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).

## 7. UI-to-Backend Gateway Pattern

Renderer code should not call IPC channels directly from every
component. Use gateway interfaces.

**This pattern is unchanged by the stack reversal.** It was never a
Tauri construct — it is a boundary between React and whatever is
underneath, and it is what localized the Tantivy → FTS5 swap
([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)). Only
the implementation class changed; every interface below would read the
same under Tauri.

Search example:

```ts
export interface SearchGateway {
  quickOpen(request: QuickOpenRequest): Promise<QuickOpenResult[]>;
  search(request: SearchRequest): Promise<SearchResponse>;
  rebuildIndex(): Promise<void>;
}
```

Outline example (the v0.1 document-context surface):

```ts
export interface OutlineGateway {
  getOutline(request: OutlineRequest): Promise<OutlineResult>;
}

export type OutlineRequest = {
  documentId: string;
};

export type OutlineResult = {
  documentId: string;
  headings: OutlineHeading[];
};

export type OutlineHeading = {
  slug: string;
  text: string;
  level: number;      // 1-6, as written; skipped levels are not repaired
  children: OutlineHeading[];
};
```

The preload script exposes only allowlisted channels:

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
import { CHANNELS } from "../main/ipc/channels";

contextBridge.exposeInMainWorld("markscope", {
  outline: {
    get: (request: OutlineRequest) =>
      ipcRenderer.invoke(CHANNELS.outline.get, request),
  },
  search: {
    quickOpen: (request: QuickOpenRequest) =>
      ipcRenderer.invoke(CHANNELS.search.quickOpen, request),
    search: (request: SearchRequest) =>
      ipcRenderer.invoke(CHANNELS.search.search, request),
    rebuildIndex: () => ipcRenderer.invoke(CHANNELS.search.rebuildIndex),
  },
});
```

The renderer-side implementation is then trivial, and the gateway
interface is what tests substitute:

```ts
export class IpcOutlineGateway implements OutlineGateway {
  getOutline(request: OutlineRequest) {
    return window.markscope.outline.get(request);
  }
}
```

This keeps the React app testable and gives v0.2 a clean place to add
an `AiGateway` with `summarize()` — and later `embed()`, `chat()`, or
`mcp()` — without touching the rest of the app.

**Removed 2026-09-13:** the `AiGateway` interface and its
`TauriAiGateway` streaming implementation, which listened on an
`ai://summarize-chunk` event while awaiting an `ai_summarize` command
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).
The shape is a reasonable starting point for v0.2; the transport is
not, since the Tauri event API does not exist here.

## 8. Trusted Root Security Model

A trusted root is a folder explicitly added by the user through the UI
([ADR-0003](../adr/0003-trusted-roots-only.md)). There is one kind.

Rules:

- Read/search/index only inside the root.
- Relative Markdown links inside the root open in app.
- Relative links resolving outside the root are blocked.
- External HTTP/HTTPS links open in the system browser.
- `file://` links are blocked unless inside a trusted root.
- Writes are not allowed in MVP.

Enforcement lives in the main process. Path resolution and the
boundary check happen there, before any read — never in the renderer,
which cannot be trusted to enforce a rule it could be tricked into
skipping by document content.

Electron-specific requirements, new on 2026-09-13 with
[ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md):

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- The preload exposes a fixed allowlist of channels and no general
  invoke. No path reaches the filesystem without passing a
  main-process boundary check.
- Rendered document content is sanitized (`rehype-sanitize`) and
  Mermaid runs in strict mode; a document must never be able to
  execute script or navigate the shell.

> **Removed 2026-09-13** ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)): the durable/ephemeral distinction, and the paragraph specifying validation of a CLI-supplied path (must exist, be a directory, be readable, else fall back to the last durable workspace). There is no CLI path to validate.

## 9. Markdown-Aware Tree

The tree is not a raw file explorer
([ADR-0004](../adr/0004-markdown-aware-explorer.md)).

Default behavior:

- Show Markdown files.
- Show folders that contain Markdown files somewhere below.
- Hide ignored folders.
- Hide hidden folders by default.
- Exclude known noisy folders.

Example source tree:

```text
repo/
  src/
    app.ts
  docs/
    architecture.md
  node_modules/
  README.md
  package.json
```

Displayed tree:

```text
repo/
  README.md
  docs/
    architecture.md
```

Each trusted root renders as its own top-level hierarchy, so several
projects stay visible at once without being merged. The session badge
for ephemeral roots is removed
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).

## 10. Tab Model

### Temporary Preview Tab

- Created by single-clicking a file or by `Space` keypress.
- Reused when another file is single-clicked.
- Not restored on startup.
- Can be pinned via double-click, `Enter`, or explicit action.

### Pinned Tab

- Created by double-click or `Enter`.
- Appears in Opened Files.
- Restored on startup.
- Scroll position is persisted.
- If the file is missing, shows missing state with Close / Locate.

The ephemeral-root qualifications on restore and scroll persistence are
removed ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).

## 11. Events

The main process emits renderer events for important lifecycle
changes. The `scheme://name` spelling is retained from the original as
a channel naming convention; under Electron these are IPC channel
names, not a URL scheme.

```text
workspace://root-added
workspace://root-removed
catalog://scan-started
catalog://scan-progress
catalog://scan-completed
catalog://documents-changed
search://indexing-started
search://indexing-progress
search://indexing-completed
file://active-file-updated
file://active-file-deleted
```

**Removed 2026-09-13:** `workspace://ephemeral-root-opened`
([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)),
the four `ai://summarize-*` events
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)),
and `updater://update-available`
([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised).

Note that `file://` as a channel prefix is unrelated to the `file://`
URL scheme blocked by §8; do not let the two meet in code.

## 12. Configuration

Configuration lives in `app-config.json` in the app data directory. See
[the product specification](product.md) §10 for the full schema.

**The `ai` block is removed** — `enabled`, `provider`, `url`, `model`
and `apiKey`, together with the `AiService.is_enabled()` gate and the
config-file hint shown when unconfigured
([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).
v0.1 stores no credentials of any kind, so there is nothing to gate.

Configuration is read in the main process. The renderer receives
resolved values, never a file path to read for itself.

## 13. App Data Layout

Conceptual layout:

```text
AppData/
  markscope/
    app.db              # workspace, catalog, and FTS5 index
    app-config.json
    logs/
      markscope.log
```

The file system remains the source of truth: `app.db` can be deleted
and rebuilt from the trusted roots, losing only pinned tabs and scroll
positions. The separate `indexes/default/tantivy/` directory is gone —
the index lives in `app.db`
([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)).
