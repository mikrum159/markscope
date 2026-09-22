# ADR-0019: Retire the Build-Process-as-Portfolio-Artifact Obligation

Status: Accepted
Date: 2026-09-13
Decider: maintainer
Supersedes: [ADR-0014](0014-build-process-as-portfolio-artifact.md)

## Context

ADR-0014 made `BUILD_LOG.md` and a `PROMPTS/` directory first-class deliverables, linked prominently from the README. Its premise was explicit: the project is built by orchestrating coding agents against the specification, and "the skill being demonstrated is engineered AI-assisted development, not Rust or Tauri expertise per se." The build log existed to make that claim verifiable to a reviewer.

That premise no longer holds. Development is human-driven — the maintainer writes and reviews the code and owns the result. There is no agent-orchestration story to document, and no portfolio claim that a prompt archive would substantiate.

Keeping the obligation would mean maintaining two artifacts whose reason for existing has been removed, at a real per-session discipline cost.

## Decision

Retire the `BUILD_LOG.md` and `PROMPTS/` obligations. Neither is a deliverable. The README does not link to them.

The build journal is the **shape-dd log** at [docs/plans/mvp-shape/log.md](../plans/mvp-shape/log.md): an append-only record of completed units with their validation results, decisions and surprises. It serves the one purpose worth keeping from ADR-0014 — making the work resumable and reviewable — without the portfolio framing.

Development process, contribution and verification requirements are governed by [CONTRIBUTING.md](../../CONTRIBUTING.md) and [AGENTS.md](../../AGENTS.md).

This also retires the portfolio positioning in [product.md](../specs/product.md) §2 and §14, which rests on the same premise. Updating that document is a separate unit; this ADR is the authority for it.

## Alternatives

- **Keep `BUILD_LOG.md`, drop `PROMPTS/`.** Rejected as redundant: the shape log already records what each unit changed, how it was validated, and what was decided. A second journal alongside it would drift.
- **Keep the obligation in case the portfolio framing returns.** Rejected: nothing is lost that cannot be reconstructed. Reinstating it later means writing a new ADR, which is the correct cost.

## Consequences and verification

ADR-0014's stated benefit — "reviewing the build log is often more informative than reading the code" — is partly preserved by the shape log, and partly given up. Neither artifact will show agent-vs-human authorship, because that distinction no longer carries information here.

Accepted: no public record of prompts or agent sessions.

Reversibility: high, and cheap.

Verification:

- No reference to `BUILD_LOG.md` or `PROMPTS/` remains in the README, specification documents, or plans once the spec reconciliation unit has run. Check by search, not by memory.
- Per-unit verification evidence (exact revision, commands, outcomes, platform) is still required by [CONTRIBUTING.md](../../CONTRIBUTING.md). This ADR removes a journal, not the evidence requirement.

## Addendum, 2026-09-22 — one premise revised, the decision retained

[ADR-0021](0021-publish-the-repository-and-its-build-record.md) publishes this repository and links the shape log from the README as the part most worth reading. That does not supersede this record, and the text above stands unedited — but one sentence in its Context turned out to be wrong and should not be read as current.

"There is no agent-orchestration story to document" was half right. Development stayed human-driven in the sense this ADR meant — the maintainer set direction, resolved every fork, ran a manual check on every unit and owns the result — but the code was written by an agent, and there is an agent-assisted development story. It is not ADR-0014's story of orchestrating agents against a specification; it is one agent and one maintainer working a unit at a time under shape-driven development.

**The decision above is unaffected.** `BUILD_LOG.md` and `PROMPTS/` remain retired and were never missed: the shape log recorded 65 units without them. ADR-0021 publishes that log because it already exists, and explicitly attaches no obligation to produce it to any standard — which is the cost this ADR rejected, and still rejects.
