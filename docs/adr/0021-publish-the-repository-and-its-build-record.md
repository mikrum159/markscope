# ADR-0021: Publish the Repository and Its Build Record

Status: Accepted
Date: 2026-09-22
Decider: maintainer
Supersedes: none — revises one premise of [ADR-0019](0019-retire-build-process-as-portfolio-artifact.md) while retaining its decision

## Context

MarkScope was developed in a private repository. v0.1 is complete: the application is feature-complete against its intent, packaged as an installer, and the 2026-09-21 review's findings are closed. The maintainer wants the repository public, both as a working application and as a demonstration of AI-agent-assisted software development.

That intent walks straight back into a decision this project already made twice.

[ADR-0014](0014-build-process-as-portfolio-artifact.md) made `BUILD_LOG.md` and a `PROMPTS/` directory first-class deliverables, on the premise that "the skill being demonstrated is engineered AI-assisted development." [ADR-0019](0019-retire-build-process-as-portfolio-artifact.md) retired that obligation, stating the premise no longer held: "Development is human-driven — the maintainer writes and reviews the code and owns the result. There is no agent-orchestration story to document."

**Half of that premise was wrong, and it is worth being exact about which half.** Development was human-_driven_ throughout: the maintainer set direction, resolved every fork, ran a manual check on every unit and owns the result. But the code was written by an agent, and there is an agent-assisted development story — just not ADR-0014's story of orchestrating agents against a specification. What actually happened was one agent and one maintainer working a unit at a time, each agreed before building and recorded after, under [shape-driven development](../plans/mvp-shape/shape.md).

ADR-0019's _decision_ was nonetheless correct and its artifacts were never missed: the shape log at [docs/plans/mvp-shape/log.md](../plans/mvp-shape/log.md) recorded 65 units without a separate `BUILD_LOG.md`, and no prompt archive was needed to make the work reviewable. So the question is not whether to reinstate ADR-0014. It is whether publishing what already exists reinstates anything at all.

## Decision

**Publish the repository, including its shape files, build logs and decision records, exactly as they already stand.** The README links to the build log as the part of the repository most worth reading.

**No new production obligation attaches.** This is the load-bearing half of the decision, and it is what keeps ADR-0019 intact. The log is published _because it exists_; it is not written _because it will be published_. Nothing about how a future unit is agreed, built, validated or captured changes as a result of this ADR. `BUILD_LOG.md` and `PROMPTS/` stay retired.

The distinction matters because it is the difference between a record and a performance. A journal kept to be read by an audience is written differently from one kept to make work resumable — it grows favourable, it loses the entries where the approach was wrong, and it stops being worth reading in the process. The 2026-09-17 entry where a manual check came back "tested and doesn't work" and root-caused to a defect in an earlier slice is the most useful entry in the log precisely because nobody was writing it for anyone.

Specifically:

- **Published as-is:** `docs/plans/` (shape files and logs, including the Skill Feedback sections), `docs/adr/` (including superseded records with their pointers), `docs/specs/`, and `test-docs/`.
- **No work is withheld, rewritten or tidied for publication.** Entries that read badly stay. See the 2026-09-22 addendum for what this does *not* cover.
- **AI authorship is disclosed plainly** in the README and [CONTRIBUTING.md](../../CONTRIBUTING.md), rather than left to be inferred from the commit history.

## Alternatives

- **Publish the application, keep `docs/plans/` private.** Rejected: it discards the only part of this repository that is unusual. A competent Electron Markdown reader is not interesting on its own; the record of how it was built is the contribution.
- **Reinstate ADR-0014's obligation now that the premise is back.** Rejected, and this is the alternative this ADR exists to refuse. It would make the log a deliverable produced to a standard, which changes what goes in it. ADR-0019's reasoning against that cost still holds even though its premise has shifted.
- **Curate the log before publishing** — remove the failed checks, the process-drift findings, the entry where a comment asserted a guarantee the code did not provide. Rejected: those are the entries with evidence in them. A log with only successes in it is indistinguishable from marketing and carries no information.
- **Wait for v0.2 and more features.** Rejected: the application is small, and its size is stated plainly. Nothing improves by waiting.

## Consequences and verification

**Accepted costs.**

- The repository permanently contains entries showing work that was wrong, reasoning that was internally consistent and mistaken, and a security boundary that three separate code comments claimed and the code did not provide. This is the intended content, not residue.
- The Skill Feedback sections critique the working method itself, in public.
- Published specifications describe things that were never built. [docs/README.md](../README.md) states this directly rather than leaving a reader to discover it.
- Publishing invites scrutiny of an unsigned, Windows-only, single-maintainer application with known dependency advisories. [SECURITY.md](../../SECURITY.md) states the position on each rather than waiting to be asked.

**Reversibility: low, and this is the one decision in this project that is close to irreversible.** A repository can be made private again, but anything already cloned, forked, indexed or archived stays out. Everything published under this ADR must therefore be acceptable to have published permanently.

**Verification.**

- Before the repository is made public, no tracked file contains credentials, personal paths, private session data or a third party's content. Check by search over the tracked set, not by recollection.
- The README's capability claims are each checkable against the running application; its deferred list is accurate. Verified during the Slice 3 documentation unit, and re-verified if the application changes before release.
- ADR-0019 remains listed as current in the [ADR index](README.md), with its premise revision noted. If a future unit is ever shaped, scoped or written differently _because_ the log is public, this ADR has failed and should be revisited — that is the specific failure mode to watch for, and it is a judgement the maintainer has to make, not something a check can catch.

## Addendum, 2026-09-22 — what "as-is" covers, and what it does not

Three revisions, all decided by the maintainer on the same day this record was accepted. The decision above stands; its scope was drawn too wide in two places and too narrow in a third.

**1. The commit history is not part of the published record.** The original wording listed "the full commit history" among the artifacts published as-is. That was asserted without checking what the history was. The 37 commits on the development branch are single-line, body-less working notes — `polish`, `layout`, `shape update` — written by the maintainer as scratch, with a squash always intended. They are neither record nor performance; they are working state. Publishing them would elevate them into a deliverable they were never authored as, which is the same category error this ADR refuses in the opposite direction.

The branch is therefore squashed into a single commit at merge and never pushed as a sequence. The authored record — the shape files, the logs and these ADRs — is unaffected, and remains what the README points a reader at. Consequence: the SHAs cited in [the MVP log](../plans/mvp-shape/log.md) do not resolve in the published repository, and a note at the head of that file says so.

**2. "Nothing is withheld" was about work, not about the maintainer's personal detail.** The original wording admitted no exception, and taken literally it would require publishing incidental environment detail that has no bearing on the project: personal email addresses, absolute paths on the maintainer's machine, the names of private sibling repositories, a cross-project scripting workflow, and the hardware in a home lab. None of that is a decision, a tradeoff, or a piece of evidence.

The exception is narrow and worth stating precisely, because it is the one that could be abused: **unflattering work stays; personal detail goes.** Every failed check, wrong assumption, reversed decision and process-drift finding remains exactly as written. If a removal ever makes the work look better rather than making the maintainer less exposed, it falls outside this exception and the original rule applies.

**3. The Lens exploration is withheld after all.** _Source: maintainer, 2026-09-22, reversing the decision recorded above the same day._ `docs/explorations/semantic-rendering/` — nine documents for a product that was never built, and the main source of home-lab hardware references — is removed rather than published. The alternative "Withhold the Lens exploration", listed above as considered and rejected, is now the decision. The reasoning that rejected it was not wrong, but it was outweighed: the published repository is the application, its decisions and the record of building it, and a speculative design set for a different product is the largest single block of material that is none of those three. Deferred work for v0.2 can be reintroduced with the version that does it.
