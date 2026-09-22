# ADR-0001: Use Tauri + React for MarkScope

> **Superseded by [ADR-0015](0015-use-electron-react-typescript-for-markscope.md) on 2026-09-13:** the stack is Electron + React + TypeScript. Retained for decision history; not current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-001, migrated 2026-09-09.

## Status

Accepted

## Context

The app must run on Windows and macOS, provide a rich Markdown preview UI, access local files, and support self-updates.

## Decision

Use Tauri v2 as the desktop shell and React + TypeScript as the frontend.

## Consequences

Positive:

- Small desktop app footprint.
- Strong TypeScript productivity.
- Good fit for Markdown/Mermaid preview.
- Native file access through Tauri.

Negative:

- Some Rust backend code is required.
- System WebView differences require testing.
- macOS packaging/signing needs care.
