# MarkScope Public Release Shape

Status: Draft

Current state only. History lives in [log.md](log.md).

Predecessor: [MVP shape](../mvp-shape/shape.md), closed 2026-09-21. Its Decisions remain in force and are not restated here.

## Resume next session

**First action:** the maintainer's, not the agent's — work the [Going public](#going-public--the-maintainers-steps) checklist, starting with screenshots. No agent unit is selected or in flight.

**State on disk:** branch `mvp-shape`, unmerged and unpushed, with every unit in this shape committed except the publication-cleanup unit in the working tree. The branch is working scratch and is squashed at merge rather than pushed as a sequence. `npm run typecheck && npm run lint && npm test` → **159/159** green as of 2026-09-21, `src/` unchanged since. CI exists but has never run. The remote still holds pre-cleanup history and is recreated rather than force-pushed — see the checklist.

**Canonical validation commands:**

- Code units: `npm run typecheck && npm run lint && npm test`, plus a stated manual check per unit.
- Doc units: relative links in changed Markdown resolve; `git diff --check` clean; files outside the stated scope unchanged.
- Packaging: `npm run dist` produces `dist/markscope-0.1.0-setup.exe`; the installed app launches.

**Read before building any UI:** `src/renderer/src/assets/theme.css` — the token vocabulary every component must use. ADR-0020 has the rationale, and Slice 2 may amend it.

**If `npm install` fails to produce a working `node_modules/electron/dist`:** known issue, not a regression — see `AGENTS.md`'s Setup line, including why `better-sqlite3`'s install-script warning must stay unapproved.

## Intent

Get the finished MVP out of a local branch and into a public repository that stands up to being read — both the app and the record of how it was built. Fix what a review found before anyone else finds it; make the front door honest.

The secondary intent matters as much as the primary one: the repository is meant to demonstrate AI-agent-assisted development. That makes `docs/plans/mvp-shape/log.md` a deliverable, not a byproduct.

## Working Agreement

Inherited from the [MVP shape](../mvp-shape/shape.md#working-agreement) in full — human-driven, validation is a command not a claim, never commit or push, dependency versions from the registry, `AGENTS.md` updated in the same unit that changes the build, shape files committed with the repo.

One addition for this shape:

- **Compact this file as it goes, not at close.** The predecessor reached 71.3KB because `Resume next session` and `Current unit` were appended to rather than replaced. Each capture rewrites those sections; it does not extend them. If this file passes ~15KB, that is the signal, not a style preference. _(Trigger fired once, at 19.7KB on 2026-09-22, and the file was compacted — the rule works only if acted on.)_

## Source Material

- **Code review, 2026-09-21** — full read of `src/` against security, correctness and consistency. Source of Slices 1–3. Findings live in the slice entries rather than a separate document, so they cannot drift from the work that closes them.
- [MVP shape](../mvp-shape/shape.md) and its [log](../mvp-shape/log.md).
- [ADR index](../../adr/README.md) — ADR-0009 (releases), ADR-0014/0019/0021 (the build record), ADR-0016 (Windows-only), ADR-0020 (styling).

## Current Shape

### Current understanding

All three gaps this shape opened with are closed, and every agent-buildable unit with them. The front door now describes the project that exists (Slice 3); the hardening gaps that per-slice manual checks could not catch are fixed (Slice 1); publishing the record no longer collides with ADR-0019 (Slice 4); and the tree now contains only the application, its decisions and the record of building it (publication cleanup).

What remains is the maintainer's: screenshots, then the checklist below. Nothing left in Candidate Slices blocks any of it.

### Decisions

Inherited decisions live in the [MVP shape](../mvp-shape/shape.md#decisions). New ones for this shape only.

- **Successor shape lives at `docs/plans/public-release-shape/`.** _Source: agent, closure Pass, 2026-09-21, routine choice_ — matches the `mvp-shape` sibling convention and the repo's existing plans home.
- **The repository and its build record are published as they stand, with no new obligation to produce them.** _Source: maintainer, 2026-09-22; recorded as [ADR-0021](../../adr/0021-publish-the-repository-and-its-build-record.md)._ Supersedes nothing: it revises one premise of ADR-0019 (there _is_ an agent-assisted development story) while retaining its decision (`BUILD_LOG.md` and `PROMPTS/` stay retired). The log is published because it exists, not written because it will be published — if a future unit is ever shaped or captured differently _because_ the log is public, that decision has failed.
- ~~**The Lens exploration is published as-is.**~~ **Superseded the same day: it is removed from the repository.** _Source: maintainer, 2026-09-22; recorded in the [ADR-0021 addendum](../../adr/0021-publish-the-repository-and-its-build-record.md#addendum-2026-09-22--what-as-is-covers-and-what-it-does-not)._ The original reasoning — a direction explored and parked is part of the record — was not wrong, but it was outweighed: the published repository is the application, its decisions and the record of building it, and a nine-document design set for a product that was never built is none of those three.

- **The commit history is not part of the published record; the branch is squashed at merge.** _Source: maintainer, 2026-09-22; recorded in the same addendum._ The commits are single-line working notes written as scratch with a squash always intended. The authored record is the shape files, the logs and the ADRs. Consequence: the SHAs cited in the [MVP log](../mvp-shape/log.md) no longer resolve, and a note at the head of that file says so.

- **"Nothing is withheld" covers work, not personal detail.** _Source: maintainer, 2026-09-22; recorded in the same addendum._ Every failed check, wrong assumption and reversed decision stays exactly as written. Personal email addresses, machine paths, private sibling repositories, cross-project workflow and home-lab hardware come out. The test that keeps the two apart: if a removal makes the work look better rather than making the maintainer less exposed, it is not covered.
- **v0.1 ships no binary: build from source only.** _Source: maintainer, 2026-09-22; recorded as a dated addendum on [ADR-0009](../../adr/0009-github-releases-for-distribution-and-updates.md), which it narrows for the third time._ `npm run dist` still works — the decision is about distribution, not packaging. Reversing it needs a release, not an ADR; reintroducing signing or auto-update needs an ADR, because both were rejected on their own grounds.

### Constraints

Inherited from the predecessor. Two bind hardest here:

- `AGENTS.md`: preserve decision identity — record retained / revised / superseded, never renumber or silently rewrite. _Source: repo instructions, current._
- Owner must be able to read, review and maintain all code. _Source: developer._

### Assumptions

- No user of the app exists yet besides the maintainer, so changes need no migration or deprecation path.
- GitHub Actions on a public repository is free at this scale; CI needs no budget decision.

### Risks

- **A public repository surfaces the dependency advisories automatically.** _Source: `npm audit`, re-confirmed 2026-09-21._ 7 high-severity findings (`mermaid` → `chevrotain` → `lodash-es`; `electron` → `extract-zip`), no non-breaking fix — `npm audit fix --force` downgrades `mermaid`. Dependabot will file them on day one. Mitigation is the written position in `SECURITY.md`, not a fix.
- **Anything already pushed to a remote stays reachable there.** A force-push moves a branch ref; it does not remove the objects, and a merged pull request keeps its head commits browsable permanently. Material that must not be published therefore has to be out of the tree *before* the first push of that tree, not corrected afterwards. _Source: agent, 2026-09-22._
- **A large single document freezes the app, and the cost is located.** _Source: measured 2026-09-21._ `test-docs/big/large.md` (5.06MB) reads in **4.2ms** and parses to mdast in **9,238ms** — the cost is the markdown parse, which runs **twice per open** (`preview/headings.ts`, then react-markdown) before React builds the tree. Not a release blocker: it bites on a synthetic fixture, not the hundreds-of-KB documents real corpora hold. See candidate 1c.
- **Anything written for a reader can quietly overclaim.** Discharged for the README by Slice 3, where every capability sentence was checked against the code rather than the specs — which is also what surfaced candidate 1d. The mitigation worked; keep applying it to anything public.

### Open questions

None. All four closed 2026-09-22 — the Lens exploration (published, then reversed to removed), build-from-source only, `CONTRIBUTING.md` infrastructure description trimmed, and the inherited "will this be given to other people?" resolved as _source yes, binary no_. See Decisions and [log.md](log.md).

### Pending validation

**Slice 3 (public-facing documentation)** — built and gate-validated; one manual item outstanding, and the only thing in this shape the agent could not do itself:

1. Capture the three screenshots described in [docs/images/README.md](../../images/README.md) and replace the `<!-- SCREENSHOT: ... -->` comment in `README.md`. **The last blocker to the repository being worth making public** — a GUI project whose README shows no picture of the GUI.
2. Read the README's "What it does not do" list against the running app. That is the section a visitor will hold the project to, so a wrong entry there costs more than a missing feature would.

**Slice 5 (CI)** — written, never executed. Verified as far as is possible locally; the first real run happens on push. See the checklist below, which puts it before the visibility flip.

## Candidate Slices

Rough direction, re-evaluated when each comes up. Not a plan of record. Delivered units are one line each; the full record is in [log.md](log.md).

- ~~**1. Security and correctness hardening**~~ — built and manual-check closed 2026-09-21.
- ~~**1b. Loading-placeholder flash**~~ — built and manual-check closed 2026-09-21.
- ~~**3. Public-facing documentation**~~ — built 2026-09-21; screenshots outstanding (see Pending validation).
- ~~**4. ADR-0021: publishing the build record**~~ — done 2026-09-22.
- ~~**5. CI and the distribution decision**~~ — narrowed 2026-09-22; the merge, push and flip moved to the checklist below.
- ~~**Publication cleanup**~~ — done 2026-09-22; personal and environment detail out, Lens exploration removed, commit history reclassified as scratch.

Still open, none of it blocking:

- **1c. Large-document preview gate** _(Build Slice, not scheduled)_ — cheapest fix is a preview size gate mirroring `search.maxIndexedFileSizeBytes`, refusing to render past a threshold and saying so, which also gives the `loading` placeholder a reachable job. More involved: parse once and share the tree between `headings.ts` and the preview, or move parsing off the render thread. Explicitly not sequenced before the public release.
- **1d. `ignored` is hardcoded into the scan ignore list** _(Pass, not scheduled)_ — `scan.ts`'s `BUILT_IN_IGNORE_DIR_NAMES` contains the literal name `ignored`, added during MVP Slice 4 to match a fixture. Far too generic: a user with a real folder of that name loses it from the tree silently, with no setting to turn it off. Either rename the fixture and drop the entry, or make the list configurable (`product.md` §10 describes it; nothing implements it). Documented in the README as a known wart meanwhile.
- **2. Styling reconciliation** _(Decision Slice)_ — ADR-0020 and `AGENTS.md` both say "plain CSS / CSS Modules per component"; there are zero `.module.css` files and one 905-line `main.css`. Decide which is true and make documents and code agree. Carries one Build-Slice-sized consequence either way, plus a `--color-scrim` token for `main.css:791`'s `rgba(0, 0, 0, 0.32)`, the single raw colour in the codebase.
- **`sandbox: true`** _(Pass, not agreed)_ — deleting the `window.electron` bridge left the preload importing only `electron`, which a sandboxed preload provides, so the renderer can now run sandboxed. Held out of Slice 1 because it changes the renderer process model and deserves its own manual check.

**Later, deliberately unrefined** (no commitment): background indexing with a scan cap — `workspace:loadState` re-reads and re-hashes every file in every root before the renderer gets anything, and `scanChildren` has no depth or count limit, so adding `C:\` as a root hangs the app → the rest of Settings (Folders, Search & index, Keyboard shortcuts) → file watcher → search scope filtering, match highlighting and `quality.md` §4's ranking tests → tab reordering/pinning and the keyboard loop → accessibility pass (the Quick Open listbox nests `role="option"` inside `<li>`, no focus trap, the tree has no `role="tree"`) → AI summaries, v0.2 per ADR-0018 and needing their own ADR first.

## Going public — the maintainer's steps

Everything below is either irreversible, a push, or something the agent cannot do. In this order.

**Already done:** the development branch is committed, and the author metadata on it is uniform. The branch itself is working scratch and is never pushed — see step 3.

1. **Screenshots.** Per [docs/images/README.md](../../images/README.md). Check what the sidebar and document show before saving — whatever is in frame becomes public. Commit them on the development branch like any other change.
2. **Recreate the remote repository empty.** The existing remote still holds the pre-cleanup root commit and a merged pull request whose head commits stay browsable regardless of what is force-pushed over them. Deleting and recreating the repository is the only way to be sure none of it is reachable once the repository is public; nothing on the remote is worth keeping.
3. **Squash the branch into one commit on a release branch, and push only that.**

   ```bash
   git checkout -b release/v0.1 main
   git merge --squash mvp-shape
   git commit        # write a real message; this is the one commit on main
   ```

   The development branch stays local. Nothing carrying the removed material is ever pushed.

4. **Push `main` and `release/v0.1`, open the pull request, and confirm CI goes green** before anything else. It has never run. The pull request description is the artifact that will actually be read — say what the app is, and point at `docs/plans/` for how it was built.
5. **Merge the pull request** (squash or merge commit are equivalent now — it is one commit either way).
6. **Flip the repository to public**, and turn on _Keep my email addresses private_ and _Block command line pushes that expose my email_ in GitHub settings.

Step 4 before step 6 matters: a public repository whose first visible CI run is red costs more than waiting one run.

## Current unit

None. Every agent-buildable unit in this shape is delivered, and the tree is publication-clean. The shape stays open until the checklist above is worked and Slice 3's screenshots land; close it after that, with candidates 1c, 1d, 2 and the `sandbox: true` Pass carried to a successor.
