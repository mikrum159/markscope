# ADR-0015: Use Electron + React + TypeScript for MarkScope

Status: Accepted
Date: 2026-09-13
Decider: maintainer
Supersedes: [ADR-0001](0001-use-tauri-react-for-markscope.md)

## Context

ADR-0001 chose Tauri v2 + React + TypeScript, with a Rust backend. That choice was made under two assumptions that no longer hold:

- The build would be **agent-driven** against a tight specification (see [ADR-0014](0014-build-process-as-portfolio-artifact.md), now superseded by [ADR-0019](0019-retire-build-process-as-portfolio-artifact.md)). Under that assumption the maintainer's own fluency in the backend language was not a constraint — the agent would write the Rust.
- The app would ship for Windows and macOS (see [ADR-0010](0010-windows-development-macos-testing.md), now superseded by [ADR-0016](0016-windows-only-v0-1.md)), where Tauri's small footprint and system WebView are worth more.

Development is now **human-driven**: the maintainer works in C# and TypeScript, reads and reviews every change, and owns the result. A Rust backend the maintainer cannot comfortably review is a maintenance liability that outweighs the runtime savings for a single-user desktop reader.

## Decision

Build MarkScope on **Electron + React + TypeScript**, TypeScript strict mode throughout — main process, preload, and renderer.

Tauri v2 + Rust is not used. This reverses ADR-0001 rather than refining it.

The gateway pattern described in [architecture.md](../specs/architecture.md) §7 survives the change intact: it is a boundary between the renderer and platform services, and is not specific to the Tauri IPC model. Gateway examples move from Rust to TypeScript; the structure does not change.

## Alternatives

- **Tauri v2 + Rust** (ADR-0001). Rejected on maintainer language fit, not on technical merit. Tauri is the better runtime on footprint, memory and cold start; it loses because the person maintaining this codebase cannot own the Rust half of it. If maintenance moves to someone fluent in Rust, or the project becomes agent-maintained again, this decision should be revisited — the gateway pattern is what keeps that door open.
- **Tauri v2 with a deliberately thin Rust layer.** Rejected: the parts that would need Rust (directory walk, SQLite, FTS, file watching) are exactly the non-trivial parts. A thin layer is not achievable here.
- **A web app rather than a desktop app.** Rejected: local filesystem access across arbitrary user folders is the product.

## Consequences and verification

Accepted costs, from the planning session, not measured:

- Installer roughly 150 MB (Tauri: single-digit MB).
- Idle memory roughly 250 MB.
- Cold start roughly 1.2 s.

Bought: one language end-to-end, a codebase the maintainer can read, review and debug without a second toolchain.

Reversibility: low once built. The gateway boundary localizes platform calls, but the shell, build pipeline, packaging and native module story all change with the runtime.

Verification required:

- The three figures above are estimates carried from the planning conversation. Measure them on the real Windows build at packaging time, not before.
- [quality.md](../specs/quality.md) §6 states a 2 s cold-start target. That target was written for the Tauri-era specification and has not been reconfirmed by the maintainer as a real budget. Treat "1.2 s still meets the 2 s target" as two unverified numbers compared to each other, not as evidence. Confirm the budget, then measure against it.
- Dependency versions are chosen from the live registry at install time and pinned in a committed lockfile. Versions and API examples in the imported specification documents are unverified and must not be copied.
