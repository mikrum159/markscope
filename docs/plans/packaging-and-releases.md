> Working draft from the original specification; details require reconciliation with the confirmed Markdown-viewer MVP. Examples and build commands are proposals, not installed or verified tooling.
>
> Source: markscope-v2.1-fable/05-packaging-updates-cicd.md, migrated 2026-09-09.

> **Superseded 2026-09-13 by [the MVP shape](mvp-shape/shape.md).** Retained for provenance; not a configured workflow and not the delivery plan of record. Three premises are reversed: dual-platform v0.1 ([ADR-0016](../adr/0016-windows-only-v0-1.md)), CLI registration in the installer ([ADR-0011](../adr/0011-ephemeral-trusted-roots-and-cli-entry-point.md)), and the AI hook in the release checklist ([ADR-0018](../adr/0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md)). The updater sections do not apply to v0.1 at all: there is no in-app updater, no signing key, and no update manifest — v0.1 ships an NSIS installer from GitHub Releases and updating means running a new one ([ADR-0009](../adr/0009-github-releases-for-distribution-and-updates.md), reconfirmed with a revision). Revisit this document when packaging is the active unit.

# Packaging, Updates, and CI/CD (v2)

> Revision notes
>
> Reconciled with the v2 specification, plan, and ADRs. Changes:
>
> - Both Windows and macOS Apple Silicon are first-class for v0.1
>   (ADR-010 v2).
> - CLI registration added to the install story (ADR-011).
> - Release checklist updated: favorites removed, keyboard review
>   loop, ephemeral roots, and AI hook added.

## 1. Distribution Strategy

GitHub is the source repository, CI/CD platform, release artifact
host, and updater manifest/artifact host.

```text
Windows:
  NSIS installer

macOS:
  DMG for first install (Apple Silicon)
  Tauri updater artifact for updates
```

Intel macOS: later, only if someone asks.

## 2. Machine Roles

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the development workflow. Development is human-driven on Windows.

Native Windows and macOS application validation requires appropriate target environments; Mac-hosted Linux container tests do not replace macOS app validation. No particular Mac machine is currently designated as a verified MarkScope native build environment.

GitHub Actions remains the proposed source of official release artifacts. The workflows below are design examples, not installed CI. Product release-platform timing still needs reconciliation and is independent of where agents contribute code.

## 3. Initial Install vs Self-Update

```text
Initial install:
  User downloads installer/DMG from GitHub Releases.

Self-update:
  Installed app checks GitHub-hosted update metadata.
  App downloads signed update artifact.
  App verifies signature, installs, relaunches.
```

## 4. CLI Registration (new in v2)

`markscope <path>` must work from a terminal after install:

```text
Windows:
  NSIS option adds the install directory to PATH
  (per-user PATH, no elevation required).

macOS:
  On first app run, offer to create a symlink:
    /usr/local/bin/markscope -> <bundle>/Contents/MacOS/markscope
  Requires the directory to exist and be writable; if not,
  show the manual one-liner instead of failing silently.
```

Uninstall must remove the PATH entry / symlink it created.

## 5. Signing

### Tauri updater signing (required for self-update)

- Generate the Tauri signing key pair.
- Embed the public key in `tauri.conf.json`.
- Store the private key + password in GitHub Actions secrets **and**
  in a password manager. Losing this key strands every existing
  install (see risk table in `../specs/quality.md`).

### OS code signing

Windows Authenticode and Apple Developer ID / notarization are both
deferred past v0.1. Accept SmartScreen/Gatekeeper friction for
personal use; revisit before any public push (Homebrew/Winget).

## 6. Tauri Updater Config

```json
{
  "productName": "MarkScope",
  "identifier": "com.yourname.markscope",
  "version": "0.1.0",
  "bundle": {
    "targets": ["nsis", "dmg"],
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "PASTE_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/yourname/markscope/releases/latest/download/latest.json"
      ],
      "windows": { "installMode": "passive" }
    }
  }
}
```

## 7. Updater UX

- Silent check shortly after startup; never blocks startup.
- Manual Help -> Check for Updates.
- Prompt: release notes, [Install and Restart] [Later].
- Before install: persist workspace state, pinned tabs, scroll
  positions; stop file watchers.
- Ephemeral roots are session-only by definition — an update
  restart discards them like any other close. The passive
  unpinned-tabs notice (spec §9) applies.

## 8. GitHub Actions PR Workflow

Validates on both platforms on every PR and push to main:

```yaml
name: pr

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
          - platform: macos-latest

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: npm run build
      - run: npm run tauri build
```

The clippy/cargo-test steps are not optional: they are the same
done-conditions agents run locally (see
`../../CONTRIBUTING.md`), so CI re-verifies exactly what
the agent claimed.

## 9. GitHub Actions Release Workflow

```yaml
name: release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            args: ""
          - platform: macos-latest
            args: "--target aarch64-apple-darwin"

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - name: Add macOS Rust target
        if: startsWith(matrix.platform, 'macos')
        run: rustup target add aarch64-apple-darwin
      - run: npm ci
      - name: Publish Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "MarkScope ${{ github.ref_name }}"
          releaseBody: "See the release notes for details."
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

## 10. Versioning

Semantic versioning:

```text
0.1.0  triage MVP: CLI + ephemeral roots, preview, search, AI hook
0.2.0  search/navigation polish, mark-as-reviewed, MCP server mode
0.3.0  edit mode
1.0.0  stable public release (OS signing in place)
```

Bump in `package.json` and `src-tauri/tauri.conf.json`; automate
later.

## 11. Release Checklist

Before tagging:

- Run local Windows build.
- `markscope <sample-path>` opens an ephemeral root.
- Add a durable root via UI; preview Markdown; Mermaid renders.
- `j/k/Space/Enter` review loop works without the mouse.
- Quick open and full-text search work; scoped search works.
- External file edit refreshes preview; external delete shows
  missing state.
- AI summarize: hint shown when disabled; streams when configured.
- PR workflow green on both platforms.
- Release notes updated; tag pushed.

After release draft:

- Install Windows installer on the Windows laptop.
- Install DMG on the selected macOS validation machine.
- Verify `markscope` is on PATH / symlinked on both.
- Test update from the previous version on both.
- Verify workspace (durable roots + pinned tabs) restored.
- Publish release.

## 12. Update Testing Plan

1. Install v0.1.0; verify version.
2. Publish v0.1.1.
3. Open v0.1.0; Check for Updates.
4. Install update; relaunch.
5. Verify version v0.1.1 and restored workspace.

Run on both platforms.

## 13. Future Distribution Enhancements

Windows code signing, Apple Developer ID + notarization, Intel
macOS builds, beta/stable channels, changelog-driven release notes,
Homebrew cask, Winget package.
