# ADR-0007: Do Not Support .gitignore in MVP

> **Reconfirmed 2026-09-13** as current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-007, migrated 2026-09-09.

## Status

Accepted

## Context

Ignore behavior is necessary, but `.gitignore` semantics add complexity.

## Decision

MVP supports built-in ignore rules and user-configurable ignore patterns. `.gitignore` support is deferred.

## Consequences

Positive:

- Faster implementation.
- Predictable app-specific ignores.
- Avoids complex edge cases.

Negative:

- Some users may expect repo ignore rules to apply automatically.
