# ADR-0011: Ephemeral Trusted Roots and CLI Entry Point

> **Deferred on 2026-09-13, and its premise rejected.** All trusted roots are durable in v0.1; ephemeral roots and the `markscope <path>` CLI entry point are out of scope. Two reasons. First, a second root lifetime threads through workspace, catalog, search, watcher and tabs. Second and decisive: the maintainer confirmed on 2026-09-13 that CLI triage is **not** how they work, so the "headline use case" in the Context below does not hold — this ADR is not waiting on evidence, it rests on a premise since found false. Automated doc triage may exist one day as a separate project; MarkScope would simply read the resulting folders, which needs no feature. The record is retained unchanged below, and would need a new ADR — not a revival of this one — if a CLI entry point is ever wanted for some other reason.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-011, migrated 2026-09-09.

## Status

Accepted (new in v2)

## Context

The headline use case is triaging folders of AI-generated Markdown
documents. These folders are typically:

- Created in a single agent run.
- Located in transient paths (`./out/`, `./tmp/spec-xyz/`).
- Reviewed once, then either kept or thrown away.

Adding every such folder as a durable trusted root would pollute the
workspace with dozens of one-shot entries. Requiring the user to
click `+` and navigate a file picker for each one defeats the speed
the workflow exists to provide.

## Decision

Introduce two kinds of trusted roots:

- **Durable trusted roots**: persisted in SQLite, restored on launch,
  added via the `+` button as before.
- **Ephemeral trusted roots**: in-memory only, never written to
  SQLite, opened via CLI argument (`markscope <path>`), discarded on
  app close.

Ephemeral roots have the same security properties as durable roots
(reads constrained to the root, ignore rules applied, link policy
enforced). They differ only in lifetime.

The CLI is part of the v0.1 scope, not a future enhancement.

## Consequences

Positive:

- Maps directly to the headline use case.
- Single command (`markscope .`) replaces a multi-step UI flow.
- No long-term workspace pollution from triage sessions.
- Encourages keyboard-driven, terminal-adjacent workflow.

Negative:

- Two root lifetimes increases UI complexity (visual cue needed for
  ephemeral roots).
- Tab persistence rules become slightly more nuanced (pinned tabs
  from ephemeral roots persist for the session only).
- Cross-platform CLI registration must be handled in the installer
  (Windows PATH, macOS symlink in `/usr/local/bin`).
