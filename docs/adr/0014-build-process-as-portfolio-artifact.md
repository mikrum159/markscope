# ADR-0014: Build Process as Portfolio Artifact

> **Superseded by [ADR-0019](0019-retire-build-process-as-portfolio-artifact.md) on 2026-09-13:** the `BUILD_LOG.md` and `PROMPTS/` obligations are retired; the shape-dd log is the build journal. Retained for decision history; not current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation. Current contributor workflow is defined in CONTRIBUTING.md; historical machine and model assumptions do not govern development.
>
> Source: original MarkScope v2 decision ADR-014, migrated 2026-09-09.

## Status

Accepted (new in v2)

## Context

The project is built primarily by orchestrating coding agents
(Claude Code, Copilot, Codex) against the specification documents,
not by hand-coding. The skill being demonstrated is engineered
AI-assisted development, not Rust or Tauri expertise per se.

For that demonstration to be legible to anyone reviewing the
project, the build process itself must be visible. Code alone does
not show how it was produced.

## Decision

Maintain two build-process artifacts in the repository alongside the
code:

- **`BUILD_LOG.md`** — a running log of significant build sessions.
  Each entry records: which prompt or task was given, which agent
  handled it, what was produced, where the agent struggled, where
  human intervention was required, and any architectural decisions
  that originated from the agent rather than the spec.
- **`PROMPTS/`** — version-controlled prompt templates and task
  briefs fed to the coding agents, organized by milestone.

These are first-class deliverables, not optional addenda. The
project's README links to both prominently.

## Consequences

Positive:

- The "AI-engineered, not vibe-coded" claim becomes verifiable.
- The artifacts are themselves reusable patterns for future
  projects.
- Reviewing the build log is often more informative than reading
  the code.

Negative:

- Discipline cost: each significant session must be summarized.
  Mitigated by keeping entries short (5–10 lines) and writing them
  at session end while context is fresh.
- Public visibility of prompts may expose rough thinking. This is
  the intended trade-off — the rough thinking is the artifact.
