# MarkScope documentation

The confirmed product is a standalone viewer for Markdown across local folders and projects. Show Markdown in its original hierarchy, keep multiple projects available, and make plans, docs, roadmaps, and progress notes comfortable to read.

The specifications were reconciled on 2026-09-13 against [ADR-0015](adr/0015-use-electron-react-typescript-for-markscope.md)–[ADR-0019](adr/0019-retire-build-process-as-portfolio-artifact.md). Superseded material is marked in place with what replaced it, rather than deleted, and section numbering was preserved so cross-references still resolve.

**These specifications predate the implementation and were never revised to match it.** The application was built from the shape files in [plans/](plans/), not from these documents, and it diverges from them in places the shape records deliberately — the search contract in §8 of [search and catalog](specs/search-and-catalog.md) and the ranking tests in §4 of [quality](specs/quality.md) are the largest examples, neither of which was built. Treat a specification as the reasoning behind a decision, not as a description of what the code does. The code is the description of what the code does.

## Working specifications

| Document                                                          | Purpose and status                                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Product](specs/product.md)                                       | Requirements, reconciled 2026-09-13. §7.1 (CLI triage) and §14 (build-process artifact) are marked removed.                                                                                      |
| [Architecture](specs/architecture.md)                             | Electron + React + TypeScript design, reconciled 2026-09-13. §3 principle 8 records a deliberate supersession for v0.2.                                                                          |
| [Search and catalog](specs/search-and-catalog.md)                 | SQLite + FTS5 storage and search contracts, reconciled 2026-09-13. §6 (ephemeral catalog) is marked removed.                                                                                     |
| [Quality](specs/quality.md)                                       | Acceptance, security, and test coverage, reconciled 2026-09-13. Two §6 performance figures are flagged `[unverified]`.                                                                           |
| [Architecture decisions](adr/README.md)                           | All 21 app ADRs and their current applicability. None remain pending reconfirmation.                                                                                                             |
| [MVP shape](plans/mvp-shape/shape.md)                             | **Closed 2026-09-21.** The MVP's surviving decisions, constraints and open questions. Its [log](plans/mvp-shape/log.md) holds the full build history — 65 dated units — and the closure summary. |
| [Public release shape](plans/public-release-shape/shape.md)       | **Closed 2026-09-22.** Hardening, documentation, and making the repository public. Its [log](plans/public-release-shape/log.md) holds the history and the closure summary.                       |
| [Reconciliation checklist](plans/specification-reconciliation.md) | **Closed 2026-09-13.** Each row's resolution is recorded at the end.                                                                                                                             |
| [MVP implementation](plans/mvp-implementation.md)                 | **Superseded** by the shape file. Retained for provenance; not a schedule.                                                                                                                       |
| [Packaging and releases](plans/packaging-and-releases.md)         | **Superseded** by the shape file. Retained for provenance; not a configured workflow. Its updater sections do not apply to v0.1.                                                                 |

## Working on the repository

[AGENTS.md](../AGENTS.md) contains the working rules. [CONTRIBUTING.md](../CONTRIBUTING.md) describes the branch and review workflow.

Current user direction and root instructions govern repository work. Working specs guide their subject area. Numeric ADR references with three or four digits identify the same record.

Specification content is not evidence of implementation. Dependency versions and API examples in the imported documents are unverified — take them from the live registry and the committed lockfile, never from a document.

## Deferred material

- [Session output conventions](reference/session-output-conventions.md): possible input-format guidance, not a required session directory or metadata policy. No metadata convention has been adopted; ordinary Markdown is usable without frontmatter.
- [Grounding contract](reference/grounding-contract.md): reusable guidance to evaluate when specifying AI output. Relevant from v0.2, when an AI feature first exists.

Deferred material does not establish feature commitments.
