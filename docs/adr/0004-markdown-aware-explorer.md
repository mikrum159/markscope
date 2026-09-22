# ADR-0004: Markdown-Aware Explorer

> **Reconfirmed 2026-09-13** as current direction; unaffected by the stack change in [ADR-0015](0015-use-electron-react-typescript-for-markscope.md).
>
> Current status: Markdown-filtered original folder hierarchy reconfirmed by the user on 2026-09-09. Detailed implementation remains to be reviewed.
>
> Source: original MarkScope v2 decision ADR-004, migrated 2026-09-09.

## Status

Accepted

## Context

Large folders and repositories contain many irrelevant files.

## Decision

Show only Markdown files and folders containing Markdown descendants. Apply built-in and user ignore rules.

## Consequences

Positive:

- Cleaner UX.
- Better for repositories.
- Tree and search can share catalog.

Negative:

- Requires scanning/catalog.
- Some users may eventually want all-files mode.
