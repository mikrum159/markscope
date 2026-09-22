# ADR-0013: Cut Favorites, Explorer-State Persistence, and Settings UI from MVP

> **Reconfirmed 2026-09-13** as current direction. The cuts stand; they are listed as out of scope for v1 in [the MVP shape](../plans/mvp-shape/shape.md).
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-013, migrated 2026-09-09.

## Status

Accepted (new in v2)

## Context

The v1 plan included favorites (files and folders), persisted
explorer expansion state, and a full settings UI. Each of these is a
real piece of work:

- Favorites: a SQLite table, a CRUD command surface, a UI section,
  context menu actions, missing-state handling.
- Explorer state: per-folder expansion persistence, restoration on
  launch, edge cases for missing folders.
- Settings UI: a dialog, form bindings, validation, hot-reload of
  settings, "rebuild index" and "open app data folder" actions.

Cumulatively, these are several days of agent-driven build time and
a meaningful share of the bug surface. None of them serve the
headline triage use case, and none of them are required for daily
use of the durable-workspace use case.

## Decision

For v0.1:

- Favorites are **cut entirely**. Re-evaluate after dogfooding.
- Explorer expansion state is **not persisted**. The tree opens
  collapsed every launch.
- The settings UI is **replaced by a JSON config file**
  (`app-config.json` in the app data directory). Hot-reload is
  not required for v0.1.

The "rebuild index" action remains, exposed via a menu command, not
a settings dialog.

## Consequences

Positive:

- Materially smaller v0.1 surface; faster to a usable build.
- Removes three independent sources of restore-state bugs.
- Forces evidence-based prioritization for v0.2 (add favorites
  back if real usage demands them).

Negative:

- Power users editing JSON is a worse UX than a settings dialog.
  Acceptable for v0.1 given the audience.
- Re-collapsing the tree every launch is a small friction for
  durable-workspace users. Mitigated by the fact that the
  triage workflow doesn't care.
