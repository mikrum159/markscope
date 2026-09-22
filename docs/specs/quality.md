> Working draft from the original specification; details require reconciliation with the confirmed Markdown-viewer MVP. Examples and build commands are proposals, not installed or verified tooling.
>
> Source: markscope-v2.1-fable/06-risks-testing-quality.md, migrated 2026-09-09.

> **Reconciled 2026-09-13** against [ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md) through [ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md). All sections revised. The stack is Electron + TypeScript, not Tauri + Rust, so the Rust test suite and `cargo` done-conditions are gone; Windows is the only platform, so dual-OS test rows are gone; v0.1 has no AI surface and no self-update, so those risks, tests and checklist lines move to v0.2.
>
> **Two figures in §6 are unverified imports, not budgets anyone set.** They are marked as such there rather than being quietly deleted or quietly trusted.
>
> Current working state lives in [the MVP shape](../plans/mvp-shape/shape.md).

# Risks, Testing, and Quality Plan (v2)

> Revision notes
>
> Reconciled with the v2 specification, plan, and ADRs. Changes:
>
> - Favorites and explorer-state tests removed (ADR-013).
> - Ephemeral-root, keyboard review loop, and AI hook tests added
>   (ADR-011, ADR-012).
> - Agent-driven-implementation risks added (ADR-014 context).
> - Acceptance criteria framed as runnable commands wherever
>   possible, so they double as agent done-conditions.

> **Historical, 2026-09-13.** Kept for provenance. The ephemeral-root and AI-hook tests are removed (ADR-0011, ADR-0018) and the agent-driven risks with them (ADR-0019). The last bullet survives and is strengthened: acceptance criteria are commands, and that rule now applies to a human developer as much as it did to an agent.

## 1. Major Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Large folders slow down app | Poor UX | Background scanning, ignore rules, size limits, progress UI |
| Search index gets stale | Wrong results | File watcher, rebuild command, index versioning |
| FTS5 schema change breaks index | Startup errors | Versioned index, rebuild on mismatch |
| `better-sqlite3` native module fails against the Electron ABI | App will not start | Rebuild against Electron at install; verify in the **packaged installer**, not only in `npm run dev` |
| Corpus is far larger than assumed | Slow scan and search | Assumption is hundreds-to-low-thousands of files (§6). If wrong, revisit FTS5 and add incremental scan ([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)) |
| Watcher misses renames | Ghost entries | Treat unmatched rename halves as delete+create; integration test on Windows |
| Path handling | Broken links/tree | Normalize paths (Windows separators, trailing slashes, UNC) |
| Deleted files confuse tabs | Broken UI | Missing-file states with Close/Locate |
| Relative links escape trusted roots | Security issue | Resolve and validate before opening |
| Markdown unsafe HTML | Security issue | `rehype-sanitize`; no raw HTML execution |
| Mermaid errors break preview | Broken preview | Isolated `MermaidBlock` with error fallback |
| Electron renderer given more privilege than it needs | Security issue | Context isolation on, node integration off, filesystem access only through the main-process gateway ([ADR-0003](../adr/0003-trusted-roots-only.md)) |
| Imported specification treated as verified | Building the wrong thing, or to a stale limit | Every constraint carries its source; a documented figure is a claim until checked ([AGENTS.md](../../AGENTS.md)) |
| Dependency versions copied from imported docs | Build churn, wrong APIs | Pin exact versions from the live registry at install time; commit the lockfile |
| Done-conditions reported rather than run | Hidden defects | Done-conditions are commands, never a claim; "not run" is never "passed" ([CONTRIBUTING.md](../../CONTRIBUTING.md)) |

**Removed 2026-09-13:** Tantivy schema and Tantivy-stalls-agent-build rows ([ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)); cross-OS watcher and path rows ([ADR-0016](../adr/0016-windows-only-v0-1.md)); ephemeral-index-leak row ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)); agent-hallucinates-APIs row ([ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md) — the concern survives as the dependency-version row above).

**Deferred to v0.2 with their features:** plaintext API key exposure and AI-request privacy ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)); updater manifest errors and updater private key loss ([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised — no self-update in v0.1). Restore these rows when the features land.

## 2. Test Documentation Folder

Sample folder for smoke testing:

```text
test-docs/
  README.md                     # H1 title, GFM features
  architecture.md
  with-frontmatter.md           # YAML frontmatter block
  docs/
    deployment.md
    mermaid.md                  # valid + intentionally broken diagram
    tables.md
    task-list.md
    links.md                    # relative md link, external link, broken relative link, link escaping the root
    long-document.md            # many nested headings, for outline and scroll-spy
  images/
    diagram.png
  agent-session/                # a folder of agent-written docs, treated no differently from any other
    PLAN.md
    JOURNAL.md
    adr/0001-example.md
  ignored/
    should-not-show.md          # under a built-in ignore pattern
  big/
    large.md                    # > maxIndexedFileSizeBytes
```

Coverage targets: H1 title, headings, frontmatter parsing, tables,
task lists, Mermaid (valid + broken), relative image, relative md
link, external link, broken relative link, root-escaping link, large
file skip, ignored folder hidden, deep heading nesting for the
outline.

Frontmatter must be parsed when present and absent without error;
no metadata convention is required for a document to be usable
(see [session output conventions](../reference/session-output-conventions.md),
which is reference material, not a requirement). All fixture content
is synthetic — no real private session data
([AGENTS.md](../../AGENTS.md)).

## 3. Manual Smoke Tests

### Workspace

- Add `test-docs` via `+`.
- Only Markdown-bearing folders/files show; `ignored/` hidden.
- Add a second root; both stay available; the tree shows each in its
  own hierarchy.
- Remove a root; its files leave the tree and search.
- Restart: roots restored, tree opens collapsed (no expansion
  persistence in v0.1).

### Preview

- Open `README.md`: GFM renders; code fences highlighted.
- `mermaid.md`: valid diagram renders; broken diagram shows the
  fallback, page still renders.
- `links.md`: relative md link opens in app; external link opens
  the system browser; broken link shows a non-crashing state;
  root-escaping link is blocked.
- Relative image displays.

### Tabs and keyboard loop

- Single-click A, then B: temporary tab is reused.
- Double-click B: pinned tab appears.
- Full `j/k/Space/Enter/Ctrl+W` loop completes without the mouse.
- `?` shows the keybindings overlay.
- Restart: pinned tabs restored with scroll position; temporary tab
  not restored.

### Heading outline

- Open `docs/long-document.md`: the outline lists every heading,
  correctly nested.
- Click a heading: the preview jumps to that section.
- Scroll the preview: the outline highlight follows, and the
  breadcrumb updates.
- Open a document with no headings: the panel shows an empty state
  rather than breaking.

### Search

- Quick open by file name, title, heading.
- Full-text body search; scoped to folder; scoped to current file.
- Click result: preview opens, best-effort scroll/highlight.
- Rebuild index from menu; search still works.

### Watcher

- Edit a file externally: preview refreshes, scroll preserved.
- Add a Markdown file externally: appears in tree and search.
- Rename a file externally: old entry gone, new entry present.
- Delete a pinned file externally: missing state with
  Close/Locate.

### No network surface

- With the app running and exercised through the full loop above,
  confirm that **no outbound network request is made** — for example
  by a system-level connection monitor, or by a proxy configured to
  log and reject everything.
- State how this was checked. "No network code was written" is a
  design claim, not a check ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)).

**Removed 2026-09-13:** the ephemeral-root smoke test ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)), the AI hook tests ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)), and the two-version update flow ([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), revised). The dual-OS rename note is gone with [ADR-0016](../adr/0016-windows-only-v0-1.md).

## 4. Automated Tests

The stack is Electron + TypeScript throughout
([ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md)),
so there is one test runner, not two. The Rust unit-test list that
stood here is replaced by the main-process list below; its *coverage*
is preserved, only the language changed.

### Main-process unit tests

- Ignore pattern matching (built-in + config patterns).
- Path normalization (Windows separators, trailing slashes, UNC).
- Trusted-root boundary checks (including `..` traversal attempts).
- Markdown title/heading extraction; slug generation.
- Heading-hierarchy extraction for the outline, including skipped
  levels and documents with no headings.
- Frontmatter parsing: valid YAML, absent, malformed (→ NULL).
- SQLite repositories (in-memory DB).
- FTS5 index/search basics.

### Renderer unit tests

- Tab store: temporary reuse, pin transitions, close behavior.
- Keyboard map: `j/k/Space/Enter/Ctrl+W` dispatch.
- Search result grouping.
- Outline state: active-section tracking from scroll position.
- Link classification (relative-in-root / relative-escaping /
  external / `file://`).
- Config parsing with defaults and partial files.

### Integration tests

- Scan `test-docs`; assert catalog rows, folder counts,
  frontmatter capture.
- Build index; query; assert ranking order for the section-9 cases
  in [search-and-catalog.md](search-and-catalog.md).
- Delete a file; assert catalog, index, and tree all update.
- Add and remove a second root; assert the first is unaffected.

A unit is complete when `npm run typecheck && npm run lint &&
npm test` all pass and the stated manual check has been run — not
when someone says it is complete. Record the exact revision,
commands, outcomes and platform
([CONTRIBUTING.md](../../CONTRIBUTING.md)).

Before iterating on a *failing* check, confirm the check observes
what it should. A failing test, an empty query, or a missing log
line can mean broken code **or** a broken instrument.

## 5. Observability

- Main process logs to the app log file; renderer console in dev.
- Menu action: Open Logs Folder.
- Log: startup, migrations, root add/remove, scan start/complete,
  index rebuilds, watcher errors, search errors.
- Never log file contents or credentials. v0.1 handles no
  credentials at all.

**Removed 2026-09-13:** AI request and updater log events, with their
features.

## 6. Performance Targets

```text
Startup:        shell visible under 2 s        [unverified — see below]
Small root:     scan < 1 s for <100 files
Medium root:    responsive at 1,000+ files
Large root:     no UI freeze at 10k files      [unverified — see below]
Search:         quick open feels immediate; first page fast
Preview:        normal files render under 300 ms
Outline:        outline present when the preview is; no separate wait
```

Directional targets, not SLAs.

**Two of these are imported claims, not budgets anyone set.** Both come
from the Tauri-era specification and have not been reconfirmed:

- **The 2 s startup target.** [ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md)
  records an estimated ~1.2 s Electron cold start. Comparing an
  estimate to an unconfirmed target is not evidence. Confirm the
  budget with the maintainer, then measure the real Windows build.
- **The 10k-file figure.** The working assumption is **hundreds to low
  thousands** of Markdown files. Resolve the real number before search
  is built; if it is much larger, [ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md)
  needs revisiting.

**Removed 2026-09-13:** the ephemeral-open and AI first-token targets,
with their features.

## 7. Security Checklist

- Read only inside trusted roots
  ([ADR-0003](../adr/0003-trusted-roots-only.md)).
- Block links resolving outside trusted roots.
- Open web links externally; block `file://` outside roots.
- Sanitize Markdown HTML; Mermaid in strict mode; no script
  execution from documents.
- Renderer runs with context isolation on and node integration off;
  all filesystem access goes through the main-process gateway.
- **No network calls at all.** v0.1 has no network code
  ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)),
  and §3 requires this be checked, not assumed.
- No credentials are stored, read, or logged, because none exist.

**Deferred to v0.2 / packaging:** API-key handling and updater
signature verification, with their features.

## 8. Quality Bar for v0.1

Must have: no data loss; no writes to Markdown files; no crash on
malformed Markdown/Mermaid; no UI freeze during scan/index; clear
missing-file handling; rebuild index available; a working outline on
any document; no network call from the shipped build.

Acceptable limitations: approximate search highlighting; no editor;
no `.gitignore`; no file associations; no settings UI (JSON config);
tree opens collapsed; Windows only; no self-update — updating means
running a new installer; no AI features.
