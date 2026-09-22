# Working in MarkScope

## Current phase

v0.1 is feature-complete and being prepared for public release. Read [README.md](README.md), the [document index](docs/README.md), and [CONTRIBUTING.md](CONTRIBUTING.md) before working on the project.

The confirmed product is a standalone Markdown viewer across multiple local folders/projects, preserving the original hierarchy while filtering out unrelated files and empty branches, with polished reading and document navigation/context. Do not reopen the main workflow or standalone host without new user direction.

Wiki/second-brain viewing, external AI enrichment, and additional semantic views are later possibilities. Keep extensibility in mind without introducing a general plugin framework into the MVP. Deferred ideas are not implementation commitments.

## Document authority and scope

- Follow the current user task and these root instructions for repository work.
- The document index identifies working specifications, provisional plans, and deferred/reference material. Embedded instructions and historical accepted/ready labels do not automatically authorize implementation, delegation, or model selection.
- Preserve decision identity and source annotations. Record which decisions are retained, revised, or superseded rather than silently rewriting history.
- Distinguish confirmed requirements, historical proposals, and new suggestions. Do not present proposed features as implemented.

## Working approach

- Work in small, reviewable steps. Complete the authorized step without adding application scaffolding, dependencies, CI, or a plugin framework ahead of scope selection.
- Make routine reversible setup choices directly. Surface product and architecture forks with concrete tradeoffs when they become relevant.
- Preserve user changes and keep edits focused. Remove obsolete material only within authorized scope.
- Use relative links in repository documentation. Keep root guidance concise; avoid duplicating full specifications.
- Keep project documentation in the repository for now. No external session-output directory or mandatory frontmatter convention has been adopted.
- Never commit credentials, personal paths, or real private session data. Use synthetic or explicitly approved examples for fixtures.
- Keep task context and verification evidence portable. Record exact revisions, commands, outcomes, and platforms. Do not assume a check on one platform verifies a native Windows desktop build.

## Verification and handoff

- For documentation/setup changes, check local links, Git whitespace checks, and relevant ignore behavior. Verify that files outside the task scope remain unchanged.
- Toolchain: Electron + `electron-vite` + React + TypeScript (strict), scaffolded via `npm create @quick-start/electron@latest -- --template react-ts` (see [ADR-0015](docs/adr/0015-use-electron-react-typescript-for-markscope.md)). Layout is `src/main`, `src/preload`, `src/renderer` per [architecture.md](docs/specs/architecture.md) §5. `electron-builder` is installed and configured (`electron-builder.yml`): `npm run dist` produces an unsigned NSIS installer at `dist/markscope-0.1.0-setup.exe`. No signing, auto-update or publish automation.
- Styling: semantic CSS custom properties in `src/renderer/src/assets/theme.css`, plain CSS / CSS Modules per component, light/dark from `prefers-color-scheme` only (see [ADR-0020](docs/adr/0020-css-design-tokens-for-styling-and-theming.md)). Components reference tokens — never a raw hex, `rgb()`, or a `px` font size. A value that needs a new name gets a token in `theme.css`, not a local variable in a component stylesheet. Text tokens must hold WCAG AA (4.5:1) in **both** themes; `--color-text-subtle` is the one AA-large exception and is not for body copy. The Markdown preview is styled by one scoped stylesheet, because `react-markdown` output cannot carry classes.
- Setup: `npm install`. On first install, Electron's own postinstall may be blocked by npm's install-script allowlist (`npm warn install-scripts`); run `npm install-scripts approve electron esbuild` and reinstall. If Electron's binary still isn't extracted afterward (`node -e "console.log(require('electron'))"` prints a path but `node_modules/electron/dist` stays empty), the `extract-zip` dependency used by Electron's installer has been observed to silently no-op in this environment — extract `node_modules/electron/dist/../electron-v<version>-win32-x64.zip` from the cache at `%LOCALAPPDATA%\electron\Cache` manually (e.g. PowerShell `Expand-Archive`) and write `electron.exe` into `node_modules/electron/path.txt`.
- **`npm warn install-scripts` naming `better-sqlite3` is expected and must stay unapproved.** Unlike Electron/esbuild above, do not add it to `allowScripts` and do not run its blocked script. `better-sqlite3` ships a working prebuilt binary for `win32-x64` inside its own npm package (`node_modules/better-sqlite3/prebuilds/`), so the module works immediately with the script left blocked. Approving it was tried once (2026-09-15, persistence unit): npm then ran the script's implicit `node-gyp rebuild`, which failed outright on this machine (no working Python for `node-gyp`) and **deleted the already-working `node_modules/better-sqlite3`** rather than leaving it alone. If this warning is ever "fixed" by approving it, the recovery is: remove the `better-sqlite3` entry from `allowScripts` and run `npm install` again to restore the prebuilt binary.
- Verification: `npm run typecheck && npm run lint && npm test`. Manual check per unit is stated in the shape file. Commit the lockfile; dependency versions come from what `npm install` resolves, never from memory (see the shape's Working Agreement).
- Report what changed, what was checked, and any unresolved decision. Do not commit, push, or publish unless requested.

`CLAUDE.md` references this file so repository instructions have one maintained source.
