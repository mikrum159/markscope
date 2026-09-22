# ADR-0020: CSS Design Tokens for Styling and Theming

Status: Accepted
Date: 2026-09-13
Decider: maintainer
Supersedes: none

## Context

The stack ADR ([ADR-0015](0015-use-electron-react-typescript-for-markscope.md)) fixed Electron + React + TypeScript but said nothing about how anything is _styled_. [architecture.md](../specs/architecture.md) §2 listed content-rendering libraries (`react-markdown`, `remark-gfm`, `rehype-sanitize`, `mermaid`) and stopped there. No ADR, spec, or shape decision covered CSS, theming, icons, or fonts.

That gap had already started filling itself. The scaffold ([log.md](../plans/mvp-shape/log.md), Slice 3) shipped the `electron-vite` template's `base.css` unchanged: 67 lines of `--ev-c-*` variables with **no light palette at all**, plus a reset containing `ul { list-style: none }` and a blanket `font-weight: normal`. `main.css` already consumed two of those variables. Every component built from there would have inherited a dark-only palette nobody chose, and the reset would have stripped list markers and heading weights out of every rendered Markdown document — the one surface that _is_ the product.

[product.md](../specs/product.md) §10 also promises `"theme": "system"` in `app-config.json`, a requirement with no mechanism behind it.

Two structural facts drove the choice:

- **There are two styling domains, not one.** App chrome (tree, tab bar, outline, search) is roughly ten custom primitives. The document surface is HTML emitted by `react-markdown`, which **cannot carry classes** — it needs a scoped stylesheet under every possible approach. A utility framework or component library does not remove that work.
- The [Working Agreement](../plans/mvp-shape/shape.md) requires the maintainer to read and own every line, and [AGENTS.md](../../AGENTS.md) forbids dependencies ahead of scope selection.

## Decision

**Semantic CSS custom properties as the token layer, plain CSS for components, and the OS as the only theme source in v0.1.**

- `src/renderer/src/assets/theme.css` is the single source of truth for colour, type, spacing, radius and elevation. It is the authoritative token reference; this ADR does not restate it.
- Components reference tokens and never hard-code a colour or a pixel font size. Per-component styles use **CSS Modules**, which Vite supports natively — no build plugin.
- **Light is the default on `:root`; dark re-declares the same token names inside `@media (prefers-color-scheme: dark)`.** Chromium resolves that from Electron's `nativeTheme`, whose `themeSource` defaults to `'system'`, so following the OS needs **no IPC, no preload surface and no renderer state**. The only main-process change is a `BrowserWindow.backgroundColor` picked from `nativeTheme.shouldUseDarkColors`, so the window does not paint the wrong theme before the stylesheet loads or during a resize.
- **No in-app theme picker and no config override in v0.1.** `product.md` §10's `"theme"` key is forward-looking; v0.1 behaves as though it is always `"system"`. This is consistent with [ADR-0013](0013-cut-favorites-explorer-state-persistence-and-settings-ui-from-mvp.md) cutting the settings UI.
  - **Update, 2026-09-19 (Settings/Appearance slice) — reversed.** _Source: maintainer._ A real theme picker (Follow system / Light / Dark) was added to the Settings → Appearance panel, matching `docs/specs/design-v1.html`'s mockup. `product.md` §10's `"theme"` config key is not implemented as a file — the choice is persisted in the existing `markscope.db` (a new `settings` table, `rootsRepository.ts`), consistent with how `roots`/`tabs`/`window_state` already persist there. **The mechanism turned out simpler than this ADR's own Reversibility note predicted**: rather than a `:root[data-theme="dark"]` attribute plus a way to set it, the override is applied via Electron's `nativeTheme.themeSource`, which makes Chromium's `prefers-color-scheme` (and therefore every existing `@media (prefers-color-scheme: dark)` block in `theme.css`) reflect the override for the whole app — **zero CSS changes**, no `data-theme` attribute introduced. `windowBackground()`'s existing `nativeTheme.shouldUseDarkColors` read and its `'updated'` listener (`main/index.ts`) needed no changes either, since both already react to whatever `themeSource` resolves to. This does not touch [ADR-0013](0013-cut-favorites-explorer-state-persistence-and-settings-ui-from-mvp.md)'s broader "no settings UI" cut — only Appearance (this) and About (a static description) are real; Folders/Search & index/Keyboard shortcuts remain unimplemented placeholders in the settings nav.
- **Contrast is a constraint on the tokens, not a polish step.** Every text token must reach WCAG AA (4.5:1) against the surfaces it is used on, in both themes; `--color-border-strong` must reach 3:1 per WCAG 1.4.11, being the control-boundary token. `--color-text-subtle` is the single documented exception — AA-large (3:1), for disabled states, icons and rules, never body copy.
- **No fonts are bundled.** `--font-sans` / `--font-reading` / `--font-mono` resolve to Windows 11 system faces (Segoe UI Variable, Cascadia Mono). `--font-reading` is a separate token from `--font-sans` specifically so the document surface can move to another face without touching the chrome.
- **No icon dependency yet.** `lucide-react` is the intended choice, deferred to the first slice that actually renders an icon rather than installed speculatively.
  - **Update, 2026-09-16 (Slice 12, chrome visual pass):** `lucide-react@1.46.0` added, as anticipated above. Zero dependencies of its own; `npm ls lucide-react` confirms no transitive additions, so it does not touch the `mermaid`/`chevrotain`/`lodash-es` supply-chain risk already tracked in `shape.md`'s Risks. Icon sizes/stroke-widths follow `docs/specs/design-v1.html`'s own values (14/15/16px; 1.8 stroke-width for folder/file icons, default 2 for everything else) rather than a fixed rule — see the shape log entry.

## Alternatives

**Tailwind CSS (with shadcn/ui).** Fastest route to a polished look, accessible Radix primitives, and `@tailwindcss/typography` for the document surface. Rejected for three reasons: utility classes in JSX work against the readability mandate for a maintainer coming from C#; it adds a build plugin to the `electron-vite` pipeline; and `prose` is opinionated enough that the Mermaid blocks and heading anchors in [quality.md](../specs/quality.md) §2 would mean fighting it. Notably **not foreclosed** — Tailwind consumes CSS custom properties directly, so adopting it later reuses this palette rather than replacing it.

**A component library (Fluent UI v9, Mantine, MUI).** Fluent would look native on a Windows-only target. Rejected because a reader app is overwhelmingly custom surfaces — tree, tabs, preview, outline — so this means adopting a whole styling engine to use a fraction of it, then overriding it everywhere else. Heaviest dependency of the options for the least applicable coverage.

**Runtime CSS-in-JS (styled-components).** Runtime cost and an extra abstraction for no benefit at this size.

**Keeping the template's `--ev-c-*` variables and adding a light mode to them.** Rejected: the names describe raw colours rather than roles, there is no semantic layer to build components against, and the reset is actively wrong for a Markdown surface.

## Consequences and verification

**Benefits.** Zero new dependencies. A C#/TypeScript maintainer can read every line. The palette survives a later framework change because custom properties are the common currency. Contrast is enforceable rather than aspirational. Light/dark costs one media query instead of a state machine.

**Costs.** The roughly ten chrome primitives are hand-written — there is no component library to lean on, so visual polish is the maintainer's work. Dark values are duplicated once, by name, in the media query; plain CSS has no way to avoid that without a preprocessor.

**Reversibility.** High for the application layer, low-cost either way for the tokens. Adding a manual theme toggle later means adding one `:root[data-theme="dark"]` block beside the media query and a way to set the attribute — no component changes. Adopting Tailwind later keeps `theme.css` as its `@theme` source.

**Verification.** Contrast was computed, not asserted: a script parsed the hex values out of `theme.css` and checked 17 foreground/background pairs per theme against their targets. 34/34 pass. The first run **failed** on `--color-border-strong` in both themes (1.60:1 light, 2.05:1 dark), and both values were changed to clear 3:1 — the check earned its place by catching a real miss. The script lives outside the repo; promoting it to a committed test is open follow-up work, and until then the ratios in `theme.css`'s comments are a point-in-time result rather than an enforced invariant.

`npm run typecheck && npm run lint && npm test` pass. Manual check: `npm run dev` with Windows set to light, then to dark, confirming the shell re-themes and no white flash appears on launch or resize.
