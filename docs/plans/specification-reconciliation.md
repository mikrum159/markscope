# Specification reconciliation before implementation

Status: **closed 2026-09-13** — see [Resolution](#resolution-2026-09-13) at the end. Opened 2026-09-09 to capture remaining specification work rather than reopening the confirmed product direction.

## Confirmed

- Standalone Markdown viewer across multiple local folders/projects.
- Preserve original folder hierarchy; display Markdown files and the folders needed to reach them.
- Comfortable reading and navigation for plans, docs, roadmaps, and progress notes, including ordinary and agent-generated Markdown.
- Later wiki/second-brain viewing over files that other tools may organize or enrich.
- Allow room for additional views/integrations without making a general plugin framework an MVP dependency.
- Development-workflow arrangements are a repository concern, not an application integration.

## Resolve against the existing specification

| Topic | Existing proposal | Reconciliation needed |
| --- | --- | --- |
| Reading context | GFM/Mermaid and search included; heading outline deferred | Bring heading/chapter navigation into the candidate MVP and define its behavior. Confirm the final minimum set. |
| Summary | One opt-in provider request with transient output | Confirm inclusion and whether viewing pre-generated summaries is also useful. Keep basic reading usable without AI. |
| Project navigation | Multiple durable/session roots and tabs | Check that switching between projects and retaining context is clear without inventing a separate project-management system. |
| Editing and automation | Reader-first, later editing phases | Keep editing, agent orchestration, and automated knowledge-base maintenance outside this MVP. Later release numbering is provisional. |
| Stack and extensibility | Tauri/React/Rust, SQLite/Tantivy, UI gateways | Review the proposed stack and narrow extension seams. No plugin marketplace or code-analysis engine is required now. |
| Platforms and delivery | Product says Windows first/macOS later; packaging plan targets both for v0.1 | Set the release-platform scope and updater/installer priority. A machine being available to build for macOS does not itself decide a macOS product launch. |
| Provenance formats | `doc`, `doc_type`, and `type` vary between bundles | Define supported input metadata only when needed. Ordinary Markdown must remain usable without metadata. |
| AI policy | App summary allows cloud or local providers | Separate product feature policy from development-agent inference. Do not inherit a development runtime into the product. |
| Process records | Fixed agent roles, external session folders, BUILD_LOG/PROMPTS obligations | CONTRIBUTING.md now governs development. Adopt useful task/evidence artifacts when work begins; do not copy old placeholder records or model escalation rules. |

After reconciling the product, update the affected ADR status and dependent architecture/quality/milestone documents together. Then select toolchain versions and scaffold a small buildable baseline. Research current dependency/API details at that time; imported versions and examples have not been verified.

## Resolution (2026-09-13)

This checklist is **closed**. Each row's outcome is recorded below with the decision that settled it. The reconciliation was carried out across `product.md`, `quality.md`, `architecture.md` and `search-and-catalog.md`, and the ADR set was brought current — see [the MVP shape log](mvp-shape/log.md) for what was done in which unit.

| Topic | Resolution | Recorded in |
| --- | --- | --- |
| Reading context | **Heading outline is in v0.1** — outline panel, jump-to-section, scroll-spy, sticky breadcrumb. It is the answer to chapters and quick navigation, and works offline on any document. | [ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md); `product.md` §7.5, §8 |
| Summary | **Excluded from v0.1.** No AI surface and no network code at all. Summaries return in v0.2, lazy on first open, cached by content hash, decorating the outline rather than replacing it. Basic reading never depends on AI. | [ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md) |
| Project navigation | **One kind of trusted root**, added through the UI, persisted, restored on launch. Several roots stay available at once, each as its own hierarchy. No project-management system, no second persistence model. | [ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md) (deferred, premise rejected); `product.md` §7.2 |
| Editing and automation | **Unchanged — still out.** Reader-first stands; no editing, no agent orchestration, no automated knowledge-base maintenance. Automated doc triage, if ever built, is a separate project whose output MarkScope simply reads. | [ADR-0008](../adr/0008-search-before-edit.md) (reconfirmed); `product.md` §5 |
| Stack and extensibility | **Electron + React + TypeScript**, SQLite with FTS5, gateway interfaces retained. Reversed from Tauri/Rust on maintainer language fit. No plugin framework. | [ADR-0015](../adr/0015-use-electron-react-typescript-for-markscope.md), [ADR-0017](../adr/0017-use-sqlite-fts5-for-full-text-search.md); `architecture.md` §2, §7 |
| Platforms and delivery | **Windows only for v0.1**, NSIS installer from GitHub Releases, **no self-update** in v0.1. No macOS artifact, no CI matrix. Being able to build for macOS does not make it a product platform. | [ADR-0016](../adr/0016-windows-only-v0-1.md), [ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md) (revised) |
| Provenance formats | **No metadata convention adopted.** Frontmatter is parsed and stored when present; absent or malformed is normal. Ordinary Markdown is fully usable without it, and nothing in v0.1 consumes the field. | `search-and-catalog.md` §5 (`frontmatter_json`); `quality.md` §2 |
| AI policy | **Moot for v0.1** — there is no AI feature and no provider configuration. When v0.2 specifies one, the product's policy is set then, independently of any development-agent runtime. The two were never the same question. | [ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md); `AGENTS.md` |
| Process records | **`BUILD_LOG.md` and `PROMPTS/` obligations retired.** The shape log is the build journal; [CONTRIBUTING.md](../../CONTRIBUTING.md) governs evidence. No fixed agent roles, no external session folders, no model escalation rules. | [ADR-0019](../adr/0019-retire-build-process-as-portfolio-artifact.md) |

The closing instruction above — update ADR status and dependent documents together, then select toolchain versions and scaffold — is what the shape's remaining slices do. Dependency versions are still to be taken from the live registry at install time, not from the imported documents.
