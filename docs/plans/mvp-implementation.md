> Working draft from the original specification; details require reconciliation with the confirmed Markdown-viewer MVP. Examples and build commands are proposals, not installed or verified tooling.
>
> Source: markscope-v2.1-fable/04-implementation-plan-v2.md, migrated 2026-09-09.

> **Superseded 2026-09-13 by [the MVP shape](mvp-shape/shape.md).** This plan is retained for provenance and is no longer the schedule of record. Its premise — AI-agent-driven implementation measured in agent sessions — no longer holds ([ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md)), and four of its milestone assumptions are reversed: the CLI entry point and ephemeral roots ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)), the v0.1 AI hook ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)), dual-platform v0.1 ([ADR-0016](../adr/0016-windows-only-v0-1.md)), and the `BUILD_LOG.md` / `PROMPTS/` artifacts ([ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md)). Work now proceeds one agreed unit at a time through the shape file; the milestone sequence below still reads as a reasonable ordering of the work and informed the shape's Candidate Slices.

# MarkScope Implementation Plan (v2)

> Revision notes
>
> Changes from v1:
>
> - Cadence assumes AI-agent-driven implementation (Claude Code,
>   Copilot, Codex), measured in days/sessions rather than weeks.
> - CLI entry point and ephemeral roots added to milestone 0.
> - Favorites and explorer-state persistence removed from MVP.
> - Settings UI removed from MVP (replaced by JSON config file).
> - New milestone for the v0.1 AI hook (summarize document).
> - v0.1 ships for both Windows and macOS Apple Silicon.
> - `BUILD_LOG.md` and `PROMPTS/` directory added as first-class
>   repository artifacts.

## 1. Build Cadence Assumption

This plan is structured for **AI-agent-driven implementation** with
the human acting as orchestrator, reviewer, and architect. Each
milestone is sized for one or a few focused agent sessions, not
weeks of hand-coding.

Two implications:

- Milestone "tasks" are written as agent-friendly briefs, not
  developer todo items.
- Acceptance criteria are unambiguous and machine-verifiable where
  possible — they double as the agent's done-condition.

Each milestone closes with a `BUILD_LOG.md` entry summarizing what
was prompted, what was produced, where the agent struggled, and
where the human intervened.

## 2. Development Setup

The contributor arrangement is defined in [CONTRIBUTING.md](../../CONTRIBUTING.md). The following toolchain list is provisional until the stack is confirmed. No native build setup is implied to be complete.

```text
Windows machine
  - Visual Studio (or VS Code)
  - Node.js LTS
  - Rust toolchain
  - Microsoft C++ Build Tools
  - WebView2 Runtime
  - Claude Code / Copilot / Codex configured

macOS development/validation host (Apple Silicon)
  - Xcode Command Line Tools
  - Node.js LTS
  - Rust toolchain
  - Claude Code / Copilot / Codex configured
  - Native macOS validation is separate from agent container checks
```

Build/release:

```text
GitHub Actions
  - windows-latest for Windows artifacts
  - macos-latest for Apple Silicon macOS artifacts
```

## 3. Repository

```text
Repo: markscope
Display name: MarkScope
App ID: com.yourname.markscope
```

Initial structure:

```text
markscope/
  .github/
    workflows/
      pr.yml
      release.yml

  BUILD_LOG.md
  PROMPTS/
    milestone-0/
    milestone-1/
    ...

  docs/
    README.md
    specs/
    plans/
    adr/
    reference/

  src/
    app/
    features/
    shared/

  src-tauri/
    capabilities/
    icons/
    src/
      commands/
      services/
      storage/
      search/
      ai/
      cli/
      model/
    tauri.conf.json
    Cargo.toml

  package.json
  vite.config.ts
  tsconfig.json
```

## 4. Suggested Dependencies

Frontend:

```bash
npm install react-markdown remark-gfm rehype-sanitize mermaid
npm install zustand
npm install @tauri-apps/api
npm install @tauri-apps/plugin-dialog
npm install @tauri-apps/plugin-fs
npm install @tauri-apps/plugin-opener
npm install @tauri-apps/plugin-updater
npm install @tauri-apps/plugin-process
npm install @tauri-apps/plugin-cli
```

Backend Rust crates, approximate:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-cli = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio-rustls", "migrate"] }
tantivy = "0.22"
walkdir = "2"
notify = "6"
globset = "0.4"
sha2 = "0.10"
uuid = { version = "1", features = ["v4", "serde"] }
reqwest = { version = "0.12", features = ["json", "stream"] }
anyhow = "1"
thiserror = "1"
tracing = "0.1"
```

Exact versions verified during setup.

## 5. Milestone 0 — Scaffold and CLI

Goal: runnable Tauri + React app on both platforms, with CLI entry
point wired up.

Tasks:

- Create Tauri React TypeScript project.
- Set display name to MarkScope, app ID `com.yourname.markscope`.
- Add base layout: left panel, tab bar, main preview area.
- Wire `tauri-plugin-cli` and `@tauri-apps/plugin-cli`.
- Define CLI argument: optional positional path.
- Pass parsed CLI args from Rust to frontend on startup.
- Stub the "ephemeral root" concept in workspace state (in-memory).
- Add lint, typecheck, and PR GitHub Action (Windows + macOS matrix).
- Create `BUILD_LOG.md` with the first session entry.
- Create `PROMPTS/milestone-0/` with the prompts used.

Acceptance criteria:

- `npm run tauri dev` launches the app on both Windows and macOS.
- `markscope <path>` (in dev: `npm run tauri dev -- -- <path>`)
  passes the path to the frontend on startup.
- An empty shell renders on both platforms.
- CI builds frontend and Tauri app on both runners.
- `BUILD_LOG.md` contains a milestone-0 entry.

## 6. Milestone 1 — SQLite Workspace Persistence

Goal: persist the minimal workspace state needed for v0.1.

Tasks:

- Add SQLite via `sqlx`.
- Create migration system.
- Create initial schema (cut down from v1):
  - `schema_info`
  - `trusted_roots` (durable only)
  - `tabs` (pinned only — temporary tabs are not persisted)
  - `documents`, `folders`, `headings` (catalog tables)
  - `index_state`
- Add backend repositories.
- Add Tauri commands:
  - `workspace_get_state`
  - `workspace_add_durable_root`
  - `workspace_remove_durable_root`
  - `workspace_open_ephemeral_root` (in-memory only, no DB write)
- Add frontend `WorkspaceGateway`.
- Load `app-config.json` from app data dir on startup; create with
  defaults if missing.

Acceptance criteria:

- User can add a durable folder via the UI.
- Durable root persists after restart.
- Ephemeral root opened via CLI does not persist.
- App restores durable roots on launch.
- `app-config.json` is created and parsed correctly.

Schema cuts vs. v1: no `favorites`, no `explorer_state`,
no `global_settings` table (config lives in JSON). `root_ignore_patterns`
also cut for v0.1 — global ignores live in `app-config.json`.

## 7. Milestone 2 — Scanner and Markdown Catalog

Goal: scan trusted roots (durable and ephemeral) and build a
Markdown-aware tree.

Tasks:

- Implement `IgnoreService` reading from `app-config.json`.
- Add built-in ignore patterns; exclude hidden folders by default.
- Support `.md` and `.markdown`.
- Implement root scanner (works for both durable and ephemeral roots).
- Extract title (first H1), all headings, file metadata, folder
  metadata.
- Persist catalog tables for durable roots only.
- Hold ephemeral-root catalog in memory.
- Add `catalog_get_tree` command.
- Emit scan progress events.

Acceptance criteria:

- Adding a durable root scans its Markdown files and persists them.
- Opening an ephemeral root via CLI scans without persisting.
- Tree shows only Markdown files and folders containing Markdown.
- Ignored folders do not appear.
- Large folders (10k+ files) do not freeze the UI.
- Re-scan command works on demand.

## 8. Milestone 3 — Explorer UI

Goal: usable left panel.

Tasks:

- Build root list with visual distinction between durable and
  ephemeral roots (e.g., session badge / clock icon for ephemeral).
- Build expandable tree (no expansion-state persistence).
- Add file/folder icons.
- Add context menus (file: Open Preview, Open Pinned, Copy Path,
  Reveal; folder: Expand/Collapse, Search in Folder, Copy Path,
  Reveal, Remove Root if root).
- Add Opened Files section placeholder (filled in milestone 5).
- Handle missing/deleted root gracefully.

Acceptance criteria:

- User can expand and collapse folders within a session.
- Tree visually distinguishes ephemeral from durable roots.
- Right-click menus work on both platforms.
- Missing roots show a clear state with a "remove" affordance.

Cuts vs. v1: no Favorites section, no expansion-state persistence.

## 9. Milestone 4 — Markdown Preview

Goal: render Markdown with GFM and Mermaid.

Tasks:

- Implement `read_file` Tauri command constrained to trusted roots
  (both durable and ephemeral).
- Add `MarkdownPreview` component using `react-markdown`,
  `remark-gfm`, `rehype-sanitize`.
- Add `MermaidBlock` component with isolated error fallback.
- Add GitHub-like Markdown CSS.
- Add relative image resolver (resolves against the active root).
- Add relative Markdown link handler (opens in app if inside a
  trusted root, blocks otherwise).
- Add external link opener via system browser.

Acceptance criteria:

- Clicking a file opens its preview.
- Tables, task lists, code fences, and Mermaid all render.
- Relative images display correctly.
- Relative `.md` links open in app.
- External links open in the system browser.
- Malformed Mermaid does not break the preview.
- Sanitization strips unsafe HTML.

## 10. Milestone 5 — Tabs and Review Velocity

Goal: full keyboard-driven review loop.

Tasks:

- Add tab store (Zustand).
- Implement temporary tab (single slot, reused on single-click).
- Implement pinned tab (created on double-click or `Enter`).
- Add Opened Files section bound to pinned tabs.
- Persist pinned tabs from durable roots.
- Persist scroll position per pinned tab.
- Restore pinned tabs on launch (durable only).
- Implement keyboard navigation:
  - `j` / `↓` → next file in current folder.
  - `k` / `↑` → previous file.
  - `Space` → peek (temporary preview without pinning).
  - `Enter` → pin current preview.
  - `Ctrl/Cmd+W` → close active tab.
  - `?` → keybindings overlay.
- Show missing-file state for pinned tabs whose file is gone.

Acceptance criteria:

- The temporary tab is reused when stepping through files.
- Double-click and `Enter` both pin tabs.
- `j/k/Space/Enter` flow works without touching the mouse.
- Pinned tabs from durable roots survive restart.
- Pinned tabs from ephemeral roots are cleared on app close.
- Missing-file state offers Close and Locate actions.

## 11. Milestone 6 — Search

Goal: first-class search across trusted roots.

Tasks:

- Create Tantivy index directory under app data.
- Define search schema (per `../specs/search-and-catalog.md`).
- Add `SearchService`.
- Index documents from durable roots after scan.
- Index ephemeral-root documents into the same index but tag them
  by `root_id` so they can be excluded after the session if needed.
- Add `search_quick_open` and `search_documents` commands.
- Group results by file; generate snippets by reading file at
  display time.
- Add search UI panel and quick-open palette.
- Add scope selector (all roots, root, folder, current file,
  open files).
- Add `search_rebuild_index` command exposed via menu.

Acceptance criteria:

- Quick open finds files, titles, and headings.
- Full-text search finds body content.
- Search respects trusted roots and ignore rules.
- Results open in preview on click or `Enter`.
- Index can be rebuilt on demand.
- Search works after app restart.

Fallback: if Tantivy integration stalls, swap to SQLite FTS5
behind the same `SearchGateway`. ADR-006 covers this.

## 12. Milestone 7 — File Watcher and Auto-Refresh

Goal: keep catalog, index, and active preview current.

Tasks:

- Add `notify`-based watcher per trusted root.
- Debounce file events (500–1500 ms).
- Classify create / update / delete / rename.
- Re-verify against trusted root and ignore rules.
- Update SQLite catalog (or in-memory catalog for ephemeral roots).
- Update Tantivy document.
- Refresh active preview when its file changes; preserve scroll.
- Remove deleted files from tree, search, and tabs.

Acceptance criteria:

- Editing a file externally updates the active preview.
- Adding a Markdown file externally updates tree and search.
- Deleting a file removes it from tree and search.
- Pinned tabs for deleted files show the missing state.
- App stays responsive during watcher activity on large folders.

## 13. Milestone 8 — AI Hook (Summarize)

Goal: ship the single v0.1 AI action behind a clean gateway.

Tasks:

- Define `AiGateway` interface with one method:
  `summarize(documentText, options) -> Stream<String>`.
- Implement provider adapters in Rust:
  - Anthropic (`/v1/messages`).
  - OpenAI / Azure OpenAI (`/v1/chat/completions`).
  - Ollama-compatible (`/api/chat`).
- Read provider, URL, model, and API key from `app-config.json`.
- Wire `Ctrl/Cmd+K` and a toolbar button on the preview surface.
- Stream response into a collapsible right-side panel.
- Show in-flight indicator while the request is open.
- Handle errors visibly (network, auth, rate limit) without
  crashing the preview.
- Show a one-line hint pointing at `app-config.json` if AI is
  disabled.

Acceptance criteria:

- With AI disabled, the keystroke and button show a hint, not
  an error.
- With each provider configured, summarize works end-to-end and
  streams.
- Network calls only happen on explicit user action.
- A visible indicator shows when a request is in flight.
- Errors are surfaced in the panel, not silently swallowed.
- The summary is not persisted across sessions.

## 14. Milestone 9 — Packaging and Updater

Goal: install and self-update on both platforms.

Tasks:

- Add Tauri updater plugin.
- Generate updater signing keys; embed public key in config.
- Configure update endpoint pointing at GitHub Releases.
- Set up GitHub release workflow (Windows + macOS aarch64 matrix).
- Build Windows NSIS installer and macOS DMG.
- Register CLI on install:
  - Windows: add install dir to PATH (NSIS option).
  - macOS: place a symlink in `/usr/local/bin/markscope`
    on first run (or via post-install script).
- Add in-app "Check for Updates" menu item.
- Test update from v0.1.0 to v0.1.1 on both platforms.

Acceptance criteria:

- GitHub release contains installers and updater artifacts for
  both platforms.
- App self-checks on startup (silent) and via menu.
- Update signature is verified before install.
- App installs update and relaunches with workspace restored.
- `markscope` is callable from terminal on both platforms after
  install.

## 15. Milestone 10 — Polish v0.1

Goal: stable enough for daily personal use on both machines.

Tasks:

- Empty states, error states, loading/progress states.
- Basic logging to app log file.
- Keybindings overlay (`?`).
- Smoke-test against a real generated-output folder and a real
  repository docs folder, on both platforms.
- README with screenshots and the build-process narrative.
- Initial release notes.
- Final `BUILD_LOG.md` summary entry for the v0.1 cycle.

Acceptance criteria:

- App is the author's daily driver on both machines.
- Known errors are handled without crashes.
- Installer can be sent to a friend who can run it without
  instructions.

## 16. Phase 2 Candidates (post-v0.1)

Ranked by likely value once v0.1 is in daily use:

- **Local semantic search** via `sqlite-vec` and an embedding
  model (Candle, ORT, or Ollama sidecar).
- **Mark-as-reviewed state** for triage workflows.
- **MCP server mode**: expose catalog and search via Model Context
  Protocol so external AI clients can query the user's docs.
- **Favorites**, re-evaluated based on real usage.
- **Settings UI** replacing the JSON config.
- **Heading outline** and back/forward navigation.
- **Diagnostics**: broken links, missing images, Mermaid errors.
- **Explorer-state persistence**.

## 17. Phase 3 Candidates

- Edit mode (CodeMirror, dirty state, conflict handling).
- "Brain" / knowledge-base layer on top of embeddings. Decide
  early between passive (you query) and active (it suggests) —
  these are different products.
- macOS Intel support if anyone asks.
- Public packaging (Homebrew, Winget) once OS code signing is
  in place.

## 18. Definition of Done for v0.1

The MVP is done when:

- Installable from a GitHub Release on both Windows and macOS
  Apple Silicon.
- `markscope <path>` opens the folder as an ephemeral root on
  both platforms.
- Multiple durable roots can be added and removed.
- The Markdown-aware tree renders correctly for at least one
  large real repo.
- `j/k/Space/Enter` navigation works end-to-end.
- Quick open and full-text search work across all trusted roots
  and respect ignore rules.
- The watcher reflects external changes and deletions.
- Pinned tabs and durable roots restore on relaunch.
- Summarize works against at least one configured provider and
  is invisible/inert when not configured.
- The app self-updates from GitHub Releases.
- `BUILD_LOG.md` documents each milestone session.
- `PROMPTS/` contains the prompts that drove the build.
