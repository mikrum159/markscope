# ADR-0010: Windows Development, macOS Testing

> **Superseded by [ADR-0016](0016-windows-only-v0-1.md) on 2026-09-13:** v0.1 ships for Windows only. Retained for decision history; not current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation. Current contributor workflow is defined in CONTRIBUTING.md; historical machine and model assumptions do not govern development.
>
> Source: original MarkScope v2 decision ADR-010, migrated 2026-09-09.

## Status

Accepted

## Context

The author works on both Windows and macOS daily and uses the app on both platforms.

## Decision

Develop primarily on the Windows machine. Use the MacBook Air for daily use and validation. Use GitHub Actions to build native release artifacts for both platforms. v0.1 ships for **both Windows and macOS Apple Silicon**.

## Consequences

Positive:

- Real-world dual-platform validation from day one.
- CI builds platform-native artifacts.
- No full Xcode required locally on the Mac.

Negative:

- Some macOS issues are found later in CI/testing.
- Path handling, watcher behavior, and bundle differences must be validated on both platforms.
