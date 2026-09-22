# ADR-0016: Windows-Only v0.1

Status: Accepted
Date: 2026-09-13
Decider: maintainer
Supersedes: [ADR-0010](0010-windows-development-macos-testing.md)

## Context

ADR-0010 committed v0.1 to **both Windows and macOS Apple Silicon**, with GitHub Actions building native artifacts for each and a MacBook Air used for daily validation. [packaging-and-releases.md](../plans/packaging-and-releases.md) was written against that commitment.

The target is now Windows only. A machine being available to build for macOS is not a reason to ship for macOS.

## Decision

v0.1 ships for **Windows only**.

Consequences for scope:

- No macOS release artifact, no DMG, no Apple notarization or signing.
- No CI build matrix. A single Windows build path.
- No `/usr/local/bin` symlink (also moot while the CLI entry point is deferred — see [ADR-0011](0011-ephemeral-trusted-roots-and-cli-entry-point.md)).
- Cross-platform path handling, watcher behavior and bundle differences stop being v0.1 correctness requirements. Do not add abstraction for platforms that are not shipping.

This narrows ADR-0010's _product_ scope. ADR-0010's separate observation — that development happens across more than one machine — is superseded here only as a release commitment; the current contributor workflow is defined in [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Alternatives

- **Keep dual-platform v0.1** (ADR-0010). Rejected: it doubles the packaging, signing and validation surface for a platform with no current user. Dual-platform validation from day one is genuinely valuable — it is simply not worth its cost before the app exists.
- **Write platform-agnostic code now, ship Windows only.** Rejected as a stated goal. Portable code that is never run on a second platform is untested portability, and the abstraction cost is paid immediately. Where the portable form is also the simpler form, prefer it; do not build for macOS speculatively.

## Consequences and verification

Reversibility: moderate. Adding macOS later means a build matrix, signing setup, and a real pass over path/watcher/bundle behavior — a known chunk of work, not a rewrite.

Revisit when there is an actual macOS need: the maintainer wanting daily use on a Mac, or a user asking for it.

Verification:

- Record the platform in every verification note, per [CONTRIBUTING.md](../../CONTRIBUTING.md). A check run in a container does not verify a native Windows desktop build.
- No macOS claim may appear in the README, packaging plan or release notes while this ADR stands.
