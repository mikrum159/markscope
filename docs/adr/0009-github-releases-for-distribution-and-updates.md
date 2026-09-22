# ADR-0009: GitHub Releases for Distribution and Updates

> **Reconfirmed with a revision, 2026-09-13.** GitHub Releases remains the distribution channel. Two parts no longer apply: there are no Tauri updater artifacts after [ADR-0015](0015-use-electron-react-typescript-for-markscope.md), and self-update is out of v0.1 scope entirely — v0.1 ships an installer, with `electron-updater`, signing keys and update testing deferred. macOS notarization is moot under [ADR-0016](0016-windows-only-v0-1.md).
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-009, migrated 2026-09-09.

## Status

Accepted

## Context

The project will use GitHub as source repository and release host.

## Decision

Use GitHub Releases for installers and Tauri updater artifacts.

## Consequences

Positive:

- Simple distribution.
- Good fit for personal/open-source project.
- CI/CD can publish releases.

Negative:

- Public release polish later requires OS code signing/notarization.

## Addendum, 2026-09-22 — v0.1 ships no release artifact at all

_Source: maintainer, answering the distribution fork before the CI/publish unit._

This record has been narrowed twice. The 2026-09-13 reconfirmation kept GitHub Releases but dropped the Tauri updater artifacts and deferred self-update (the stack moved to Electron, see [ADR-0015](0015-use-electron-react-typescript-for-markscope.md)). This addendum narrows it once more: **v0.1 publishes no binary anywhere. The only supported way to obtain MarkScope is to build it from source**, per the instructions in the [README](../../README.md).

`npm run dist` still produces a working NSIS installer — packaging is built and validated, and nothing here removes it. The decision is about _distribution_, not about packaging: the installer is a thing the maintainer can build, not a thing the project hands out.

Why, given that an unsigned installer with an honest SmartScreen note was available and would have been a legitimate release: handing a stranger an unsigned Windows executable asks them to click through a publisher warning on the word of a repository they have just met. Build-from-source asks for more effort but nothing that requires trust, and it matches what the repository is actually for at this stage — something to read, not something to install. The audience for v0.1 is someone evaluating how it was built.

What this does not change: GitHub remains the source host, and this record's core decision — that GitHub Releases is the right mechanism when there is something to release — still stands for whenever that is true. Reversing this needs no new ADR, only a release; reintroducing _signing_ or _auto-update_ does, because both were rejected on their own grounds.

Consequences accepted:

- No download link, no install count, no telemetry of any kind about who uses it.
- Anyone wanting to run it needs Node and a working toolchain, and will hit the two `npm install` warnings documented in the README.
- The `dist` script and `electron-builder.yml` are unexercised by CI, so packaging can rot without anything failing. It was last verified manually on 2026-09-19 (installer built, installed, launched, uninstalled cleanly).
