# ADR-0006: Use Tantivy for Full-Text Search

> **Superseded by [ADR-0017](0017-use-sqlite-fts5-for-full-text-search.md) on 2026-09-13:** full-text search uses SQLite FTS5. Note that ADR-0017 adopts FTS5 on its own merits, not by triggering the fallback note below. Retained for decision history; not current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-006, migrated 2026-09-09.

## Status

Accepted

## Context

Search is a core feature and should support fast full-text search across Markdown documentation.

## Decision

Use Tantivy as the full-text search engine. Use SQLite for catalog metadata.

## Consequences

Positive:

- Strong full-text search foundation.
- Rust-native integration.
- Supports ranking and future advanced search.

Negative:

- Requires index schema versioning.
- Requires rebuild logic.
- Adds Rust-side complexity.

## Fallback note

If AI-agent-driven implementation of Tantivy proves slow or
error-prone during the build, SQLite FTS5 is an acceptable tactical
fallback for v0.1. The gateway pattern (`SearchGateway`) keeps the
swap localized. Tantivy remains the strategic target.
