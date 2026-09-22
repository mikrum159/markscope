# Security

## Reporting

Open a [security advisory](https://github.com/mikrum159/markscope/security/advisories/new) rather than a public issue. This is a personal project with one maintainer — expect a reply in days, not hours.

## What MarkScope's threat model actually is

MarkScope reads local Markdown from folders the user explicitly added through a native picker, and **makes no network requests of any kind**. There is no server, no account, no telemetry, no update check. External image URLs in a document are deliberately not fetched; only `data:` URIs and files inside the trusted folder are rendered.

The interesting boundary is therefore between a _document_ and the _machine_: a Markdown file is untrusted input, and it must not be able to reach outside the folder it lives in or execute anything.

How that is enforced:

- **Rendering is sanitised.** `rehype-sanitize` with an allowlist schema; Mermaid runs at `securityLevel: 'strict'`.
- **Context isolation is on and Node integration is off** in the renderer, with a Content Security Policy of `default-src 'self'`.
- **The preload exposes a fixed, named API** — no general-purpose IPC bridge. A previous version exposed a generic `ipcRenderer.invoke` accepting arbitrary channels; it was unused and has been removed.
- **Filesystem reads are checked twice**: the folder must be one the user added (matched against the persisted list), and the resolved, symlink-followed path must stay inside it.
- **The window never navigates.** `will-navigate` is blocked outright and dropped files are refused, so a document cannot replace the app with something else. Links open in the system browser, restricted to `http`, `https` and `mailto`.

## Known unfixed issues

**Dependency advisories.** `npm audit` reports 7 high-severity findings, all transitive and all without a non-breaking fix:

| Chain                                  | Advisory                                                           |
| -------------------------------------- | ------------------------------------------------------------------ |
| `mermaid` → `chevrotain` → `lodash-es` | Prototype pollution and code injection in `_.template` / `_.unset` |
| `electron` → `extract-zip`             | Inherited from Electron's own installer                            |

`npm audit fix --force` resolves them by downgrading Mermaid to a major version that drops diagram support the app uses, which is a worse outcome than the exposure. Neither chain is reachable from document content in the way the advisories describe: `lodash-es` is used by Chevrotain's parser generator, not by anything MarkScope hands user input to, and `extract-zip` runs at install time on a developer machine, never in the shipped app.

This is a stated position, not a fix. It will be revisited if Mermaid ships a release off Chevrotain, or if either advisory turns out to be reachable.

**The installer is unsigned.** Windows SmartScreen warns about an unknown publisher on first run. There is no code-signing certificate and no auto-update mechanism; releases are built from source and published manually.

## Scope

Reports about the items above are already known — say so and they will be closed as duplicates. Reports about the trusted-folder boundary, the sanitiser, the preload surface, or anything that gets a document to run code or read outside its folder are exactly what this file is for.
