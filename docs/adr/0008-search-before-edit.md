# ADR-0008: Search Before Edit

> **Reconfirmed 2026-09-13** as current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-008, migrated 2026-09-09.

## Status

Accepted

## Context

The app's primary job is to browse and find documentation.

## Decision

Search is implemented before edit mode.

## Consequences

Positive:

- Aligns with preview-first identity.
- Makes app useful earlier.
- Avoids editor complexity.

Negative:

- Editing is delayed.
