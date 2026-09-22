# ADR-0003: Trusted Roots Only

> **Reconfirmed 2026-09-13** as current direction. Note: the "fits Tauri scoped-access philosophy" rationale below is stale after [ADR-0015](0015-use-electron-react-typescript-for-markscope.md); the trusted-roots model itself is unchanged and is now enforced in the Electron main process rather than by a Tauri scope allowlist.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-003, migrated 2026-09-09.

## Status

Accepted

## Context

The app operates on local files. It should not freely read arbitrary locations.

## Decision

The app only reads/searches/indexes folders explicitly added by the user as trusted roots.

## Consequences

Positive:

- Stronger security posture.
- Clear permission model.
- Fits Tauri scoped-access philosophy.

Negative:

- Links outside trusted roots require blocking or confirmation.
- Users may need to add multiple roots.
