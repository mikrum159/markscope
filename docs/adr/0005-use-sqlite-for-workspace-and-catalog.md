# ADR-0005: Use SQLite for Workspace and Catalog

> **Reconfirmed 2026-09-13** as current direction, and load-bearing for [ADR-0017](0017-use-sqlite-fts5-for-full-text-search.md), which puts the FTS5 index in this same database. Accessed from Electron via `better-sqlite3`.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-005, migrated 2026-09-09.

## Status

Accepted

## Context

The app must persist roots, favorites, tabs, settings, folder state, document metadata, and headings.

## Decision

Use SQLite from the beginning for durable workspace and catalog metadata.

## Consequences

Positive:

- Reliable local persistence.
- Queryable catalog.
- Easy workspace restore.
- Good foundation for search/navigation.

Negative:

- Requires migrations.
- More backend infrastructure in MVP.
