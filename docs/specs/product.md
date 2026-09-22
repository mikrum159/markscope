> Working draft from the original specification; details require reconciliation with the confirmed Markdown-viewer MVP. Examples and build commands are proposals, not installed or verified tooling.
>
> Source: markscope-v2.1-fable/01-product-specification-v2.md, migrated 2026-09-09.

> **Reconciled 2026-09-13** against the decisions recorded in [ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md) through [ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md). Sections revised: 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13. Section 14 is removed. Section numbering is unchanged so existing cross-references still resolve; removed material says what replaced it and which ADR decided it, rather than disappearing.
>
> The four changes that move the most: the CLI/ephemeral-root triage workflow is **dropped** (§7.1), AI summarization is **out of v0.1** and replaced by a deterministic heading outline (§8), v0.1 is **Windows-only with no self-update** (§11), and the build-process-as-portfolio framing is **retired** (§2, §14).
>
> Current working state lives in [the MVP shape](../plans/mvp-shape/shape.md).

# MarkScope Product Specification (v2)

## Current scope clarification (2026-09-09)

The user has confirmed the standalone Markdown viewer described here as the main MVP direction. Multiple local folders/projects stay available in one application, with Markdown files shown in their original folder hierarchy and unrelated files/empty branches hidden. Plans, docs, roadmaps, and progress notes are reading material, not a requirement for a project-management engine.

Formatted reading, search, and navigation remain central. Heading/chapter outlines and summaries are desired reading context; their exact MVP behavior needs reconciliation. The original outline deferral and detailed summary behavior below are proposals, not final resolutions. See [the reconciliation checklist](../plans/specification-reconciliation.md).

> **Resolved 2026-09-13:** the heading outline is **in** v0.1 and is the answer to chapters and quick navigation; AI summaries move to v0.2, where they decorate the outline rather than replace it. See [ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md).

Later wiki/second-brain use may visualize files enriched by external tools. Preserve room for additional views without making a general plugin system an MVP prerequisite. The development setup is governed by [CONTRIBUTING.md](../../CONTRIBUTING.md) and adds no application integration or runtime dependency.

The original sections below remain the detailed baseline. Their platform timing, release phases, and build-process assumptions are provisional where the checklist or current contributor workflow identifies a conflict.

> Revision notes
>
> This is a directional rewrite of the original product specification.
> Key changes from v1:
>
> - Reframed positioning around triaging AI/LLM-generated documents,
>   not "documentation workspace in general."
> - Added CLI entry point and ephemeral (session-only) trusted roots.
> - Promoted keyboard-driven review velocity to a first-class concern.
> - Cut favorites, explorer-state persistence, and settings UI from MVP.
> - Added one small AI hook (per-document summarize) to v0.1 to set
>   product direction from day one.
> - Added an explicit "build artifact" stance: the project is also a
>   demonstration of engineered AI-assisted development.

> **Historical, 2026-09-13.** The block above records the v1 → v2 change and is kept for provenance. Four of its six bullets have since been reversed: the AI-triage positioning, the CLI entry point and ephemeral roots, the v0.1 AI hook, and the build-artifact stance. Keyboard review velocity and the v2 cuts still stand.

## 1. Product Overview

**MarkScope** is a local-first desktop app for Windows that gives you a
fast, preview-first surface for reading and searching Markdown across
several local folders and projects at once — plans, docs, roadmaps,
ADRs, progress notes, and whatever else accumulates as Markdown,
whether a person or an agent wrote it.

It is intentionally **not an editor**. It is a reader.

Windows is the only supported platform ([ADR-0016](../adr/0016-windows-only-v0-1.md)).

## 2. Positioning

> A fast, keyboard-driven, GitHub-quality reading surface for the
> Markdown scattered across your local projects. Add your folders once,
> and read across all of them without an editor, a commit, or a vault.

Where documents came from is not the product's concern: agent output is
one common source among several, and needs no special handling.

> **Removed 2026-09-13** ([ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md)): this section previously carried a second positioning statement framing the project as a demonstration of engineered AI-assisted development, built by orchestrating coding agents against a tight specification. Development is human-driven, so that claim no longer describes the project. See also §14.

## 3. Why This Exists

The author has a concrete recurring problem:

- Markdown accumulates across many local projects — design docs,
  plans, outlines, ADRs, exploratory notes, generated documentation.
  LLM agents add to the pile faster than anything else, but they are
  not the only source.
- VS Code's preview is editor-first; jumping between files in
  preview mode is awkward, tab management is noisy, and there is
  no way to "open these folders and just read them."
- Browser-based GitHub rendering requires committing/pushing.
- Obsidian wants a vault, not the folders where the documents
  already live.

The gap: a tool optimized for **keeping several folders of documents
open and reading across them quickly**, without moving, importing, or
reorganizing anything.

## 4. Goals

MarkScope should:

- Keep multiple local folders available at once as trusted roots.
- Show only Markdown files and folders containing Markdown.
- Preview Markdown by default, with GFM and Mermaid.
- Give every document a heading outline for jumping around inside it.
- Make keyboard-driven reading fast (next/previous, peek, pin).
- Search across one or more roots quickly.
- Refresh when files change underneath it.
- Restore workspace state on relaunch.

> **Removed 2026-09-13:** "Open a folder from the command line in one step" and the durable/ephemeral root distinction ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md), premise rejected — CLI triage is not how the maintainer works) and "Offer one optional AI action per document (summarize)" ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)). All roots are durable; there is one kind.

## 5. Non-Goals for MVP

The MVP deliberately excludes:

- Markdown editing of any kind.
- Split edit/preview.
- MDX, plugin system, Git client, cloud sync, PDF export.
- Favorites (deferred to v0.2 once usage shows whether they matter).
- Explorer-state persistence (tree always opens collapsed).
- Settings UI (config via JSON file in app data dir for v0.1).
- App Store / Microsoft Store distribution, file associations.
- `.gitignore` support.
- A built-in chat interface or local model hosting.

Added 2026-09-13:

- **Any AI feature, and any network call at all.** v0.1 is fully
  local ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).
- **A CLI entry point and session-only roots**
  ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)).
- **Self-update.** v0.1 ships an installer; `electron-updater`,
  signing keys and update testing are deferred
  ([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised).
- **macOS** ([ADR-0016](../adr/0016-windows-only-v0-1.md)).
- **Automated triage or classification of documents.** If that is ever
  built it is a separate project; MarkScope reads the folders it
  produces, which requires no feature.

## 6. Target User Profiles

### Primary: Developer or architect reading across projects

Has Markdown spread over several local repositories and note folders —
`README.md`, `/docs`, ADRs, runbooks, plans, design proposals — and
wants to browse and search all of it without opening an editor or
importing anything into a vault.

### Secondary: AI-orchestrating builder

Uses Claude Code, Cursor, or similar to generate substantial Markdown
output (specs, plans, ADRs, generated docs) and needs to read it. This
is a source of documents rather than a distinct mode; the product does
not detect or treat agent output specially.

> **Reordered 2026-09-13.** The AI-orchestrating builder was the primary profile and the folder-reading developer secondary. The confirmed MVP is multi-folder browsing, and the maintainer confirmed that one-shot triage of agent output is not their workflow.

## 7. Primary Use Cases

### 7.1 Triage AI-generated output — removed 2026-09-13

This was the headline workflow: an agent writes to `./out/spec/`, the
user runs `markscope ./out/spec/`, the folder opens as an ephemeral
root, the user skims and pins, and the root is forgotten on close.

Removed because the premise is false — the maintainer confirmed on
2026-09-13 that CLI triage is not how they work. See
[ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md).
§7.2 is now the way a folder is opened, whatever produced it.

The heading is retained, rather than renumbered, so cross-references
from other documents still resolve.

### 7.2 Open a workspace

1. User clicks `+` and selects a folder.
2. App stores it as a trusted root.
3. App scans in background.
4. Tree shows only Markdown files and Markdown-bearing folders.
5. Roots and pinned tabs persist across launches.

Repeating this for each project is how multiple folders end up
available at once; that is the normal state, not a special mode.

### 7.3 Browse and preview

1. User single-clicks a file → opens in reusable preview tab.
2. Single-clicking another file replaces the preview tab.
3. Double-click (or `Enter` with focus) pins a tab.
4. Pinned tabs appear in **Opened Files** and survive relaunch.

### 7.4 Search documentation

1. User opens search (`Ctrl+Shift+F`) or quick open (`Ctrl+P`).
2. User searches across all trusted roots or a chosen scope.
3. Results group by file with snippets.
4. Clicking or pressing `Enter` opens the preview.

### 7.5 Navigate a long document

1. User opens a long plan, spec, or roadmap.
2. An outline panel lists its headings.
3. Clicking a heading jumps to that section; the outline highlights
   the section currently in view.
4. A sticky breadcrumb shows where in the document the reader is.

This works offline, immediately, on any document, with no
configuration. It replaces the AI summarize action that previously
occupied this section; summaries return in v0.2 as decoration on this
outline ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).

### 7.6 External file change

1. File changes outside MarkScope.
2. Watcher debounces, classifies, and updates catalog + index.
3. Active preview refreshes; scroll position preserved when possible.

### 7.7 Deleted file

1. File deleted externally.
2. App removes from tree and search.
3. Pinned tab shows missing-file state with **Close** /
   **Locate file** actions.

## 8. MVP Functional Requirements

### Workspace

- Add and remove trusted roots.
- Multiple roots simultaneously.
- Persist roots and pinned tabs in SQLite
  ([ADR-0005](../adr/0005-use-sqlite-for-workspace-and-catalog.md)).
- Restore roots and pinned tabs on launch.

> **Removed 2026-09-13:** the ephemeral root kind and the **CLI entry point** subsection (`markscope`, `markscope .`, `markscope <path>`). One root kind, added through the UI. See [ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md).

### Explorer

- Markdown-aware tree (`.md`, `.markdown`).
- Hide hidden folders by default.
- Apply built-in ignore rules.
- Apply user ignore rules from `app-config.json`.
- No explorer-state persistence in v0.1 (always opens collapsed).
- Lazy / incremental tree build for large folders.

### Preview

- GitHub-flavored Markdown.
- Mermaid diagrams.
- Code fences with syntax highlighting.
- Tables and task lists.
- Relative images and relative Markdown links resolved within root.
- External HTTP/HTTPS links open in system browser.
- File links outside trusted roots are blocked.

### Tabs

- Single-click → temporary preview tab (one slot, reused).
- Double-click or `Enter` → pinned tab.
- Pinned tabs appear in Opened Files and persist.
- Scroll position preserved per pinned tab.

### Review velocity

- `j` / `↓` — next file in current folder.
- `k` / `↑` — previous file.
- `Space` — peek (temporary preview, do not pin).
- `Enter` — pin current preview.
- `Ctrl+W` — close active tab.
- `Ctrl+P` — quick open by name/title/heading.
- `Ctrl+Shift+F` — full-text search.
- `?` — show keybindings overlay.

The app should be fully usable without a mouse for the core
reading loop.

> **Removed 2026-09-13:** `Ctrl+K` — summarize active document. No AI action exists in v0.1. Whether the outline panel takes a shortcut of its own is an implementation decision for that unit, not a spec commitment.

### Search

- Quick open: file name / relative path / title / heading.
- Full-text search across Markdown body.
- Scopes: all roots, single root, folder, current file, open files.
- Group by file, show snippets, open in preview on activation.
- Best-effort scroll/highlight to first match.
- Respects trusted roots and ignore rules.

Backed by SQLite FTS5 ([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)).

### Heading outline

- Extract the heading hierarchy from the active document.
- Outline panel listing those headings, nested.
- Click a heading to jump to that section.
- Scroll-spy: the outline tracks the section currently in view.
- Sticky breadcrumb showing the reader's position.
- Works on any Markdown, with or without frontmatter, with no
  configuration and no network access.

> **Replaces the "AI hook" subsection, removed 2026-09-13** ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)). That subsection specified a single configurable LLM endpoint in `app-config.json`, one summarize action, a streamed transient side panel, and an `AiGateway` seam. None of it is in v0.1: there is no provider config, no API key handling, no network code. Summaries return in v0.2, lazy on first open and cached by content hash, decorating this outline.

### Updates

- GitHub Releases hosts the installer
  ([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised).
- No in-app updater in v0.1. Updating means running a new installer.
- OS code signing deferred.

## 9. MVP UX Model

### Left panel

1. Search / Quick Open input
2. Opened Files (pinned tabs)
3. Folders / Trusted Roots

(Favorites section deferred to v0.2.)

### Main area

- Tab bar (temporary tab visually distinct from pinned).
- Preview surface.
- Outline panel for the active document.
- Empty state, missing-file state, indexing-in-progress state.

> **Removed 2026-09-13:** the "Visual cue for ephemeral roots" subsection (session badge, close-time notice about unpinned tabs) — there are no ephemeral roots ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)) — and the optional right-side AI summary panel ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).

## 10. Configuration File

Location: app data dir, `app-config.json`.

```json
{
  "theme": "system",
  "explorer": {
    "includeExtensions": [".md", ".markdown"],
    "excludeHiddenFolders": true,
    "exclude": [
      "**/.git/**",
      "**/node_modules/**",
      "**/bin/**",
      "**/obj/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/.vs/**",
      "**/TestResults/**",
      "**/ignored/**"
    ]
  },
  "search": {
    "maxResults": 500,
    "maxIndexedFileSizeBytes": 5242880
  },
  "tabs": {
    "restorePinnedTabs": true
  }
}
```

The `ai` block (`enabled`, `provider`, `url`, `model`, `apiKey`) is
removed as of 2026-09-13 — v0.1 has no AI feature and stores no
credentials of any kind ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).

> **Added 2026-09-13:** `**/ignored/**` to the built-in `exclude`
> list. The `test-docs/` fixture (`quality.md` §2) ships an
> `ignored/should-not-show.md` file documented as "under a built-in
> ignore pattern", but no pattern above the addition actually matched
> a folder literally named `ignored` — a gap flagged but not resolved
> when the fixture was added. Resolved here, at the add-a-root-and-scan
> unit, in favor of extending the pattern list rather than renaming the
> already-validated fixture.

A settings UI is deferred. JSON is sufficient for v0.1 and reduces
scope. The values above are proposals from the original specification
and have not been validated against an implementation.

## 11. Definition of Done for v0.1

The MVP is done when:

- The app can be installed on Windows from a GitHub Release.
- Multiple trusted roots can be added and removed.
- The Markdown-aware tree renders correctly for at least one
  large real-world repo.
- Single-click preview, double-click pin, and `j/k/Space/Enter`
  navigation all work.
- Every document has a working heading outline: jump-to-section,
  scroll-spy, and breadcrumb.
- Quick open and full-text search work across all trusted roots
  and respect ignore rules.
- The watcher reflects external changes and deletions.
- Pinned tabs and roots restore on relaunch.
- The shipped build makes no network call at all, and this has been
  checked rather than assumed.

Every item above is verified by a stated command or a stated manual
check, with the platform recorded, per [CONTRIBUTING.md](../../CONTRIBUTING.md).
"Not run" is never reported as "passed".

> **Removed 2026-09-13:** "`markscope <path>` opens that folder as an ephemeral root" ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)); "Summarize-with-AI works against at least one provider" ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)); "The app self-updates from GitHub Releases" ([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised).

## 12. Phase 2 Candidates

Ranked by likely value once v0.1 is in daily use:

- **AI summaries**, lazy on first open and cached by content hash,
  decorating the heading outline
  ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).
  This is the point at which the app gains a network surface, an
  `AiGateway` seam, and a credential-handling story — all of which
  v0.1 deliberately does without.
- **Local semantic search** via `sqlite-vec` and a small embedding
  model. Slots in alongside the FTS5 index
  ([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md))
  rather than replacing it.
- **Mark-as-reviewed state**.
- **MCP server mode**: expose the catalog and search as a Model
  Context Protocol server so Claude Code, Cursor, and other
  MCP-aware clients can query the user's local documents
  directly.
- **Favorites** (re-evaluated based on real usage).
- **Settings UI** replacing the JSON config.
- **Back/forward navigation.**
- **Diagnostics** — broken links, missing images, Mermaid errors.
- **Explorer-state persistence**.
- **Self-update** — `electron-updater`, signing keys, and a
  two-version update test, if the app is given to anyone else.

**Heading outline** moved from this list into v0.1 on 2026-09-13.

## 13. Phase 3 and Beyond

- Edit mode with CodeMirror, dirty indicators, conflict handling.
- Knowledge-base / "brain" features built on the embeddings layer.
  Decide early between **passive** (you query) and **active** (it
  surfaces stale docs, generates daily summaries, suggests links)
  — these are different products.
- macOS, if there is ever a real need
  ([ADR-0016](../adr/0016-windows-only-v0-1.md)).
- Optional public packaging (Winget, Homebrew) once OS code
  signing is in place.

## 14. Build-Process Artifact — removed 2026-09-13

This section made `BUILD_LOG.md` and a `PROMPTS/` directory
first-class deliverables, on the premise that the project demonstrates
"what AI agents can build from engineered specifications" and that the
demonstration only works if the process is legible.

Development is human-driven, so the premise no longer holds. The
obligation is retired by
[ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md);
the build journal is the shape log at
[docs/plans/mvp-shape/log.md](../plans/mvp-shape/log.md), and process
requirements live in [CONTRIBUTING.md](../../CONTRIBUTING.md).

The heading is retained, rather than renumbered, so cross-references
from other documents still resolve.
