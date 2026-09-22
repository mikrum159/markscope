# Contributing to MarkScope

MarkScope is a personal project with one maintainer. Issues and pull requests are welcome, but there is no roadmap commitment and no response-time expectation. If you are thinking of building something substantial, open an issue first — [the current shape](docs/plans/public-release-shape/shape.md) says what is already planned and what has been deliberately left out.

## Before you start

Read [AGENTS.md](AGENTS.md) for the working rules, and the [document index](docs/README.md) for what the specifications do and do not govern. Two of those rules matter to any change:

- **Decisions are recorded, not rewritten.** If a change reverses something an ADR settled, it needs its own ADR naming what it supersedes. Do not renumber or edit an existing one.
- **Specifications are not evidence of implementation.** Several describe things that were never built, or were built differently. Check the code before treating a spec as a requirement.

## Setup and checks

```bash
npm install
npm run dev
npm run typecheck && npm run lint && npm test
```

`npm install` has two known warnings on a fresh clone, one of which must _not_ be "fixed" — see [the README](README.md#two-things-npm-install-may-tell-you) before working around either.

The gate is `npm run typecheck && npm run lint && npm test`. It must pass before a change is proposed. Automated checks alone are not sufficient for anything with a visible effect: every unit in this project's history also carries a manual check run against the real app on Windows, because a passing test suite has repeatedly failed to catch things a thirty-second click-through did.

## Proposing a change

1. Branch from `main`.
2. Keep the change focused. A pull request that fixes a bug and refactors the surrounding file is two pull requests.
3. Run the gate, and run the app.
4. In the description, say what problem it solves, what the resulting behaviour is, and what you actually ran to verify it — the exact commands and their outcomes, and the platform. Distinguish "not run" from "passed".

Match the surrounding code: TypeScript in strict mode, no `any`, comments that explain _why_ rather than restating the line beneath them. Styling goes through the design tokens in `src/renderer/src/assets/theme.css` — never a raw colour or a pixel font size in a component. A value that needs a new name gets a token, not a local variable.

## What this project will not take

- **Editing features.** MarkScope is a reader. This is settled, not an oversight.
- **A plugin framework.** Extensibility is kept in mind; a general plugin platform is explicitly out of scope.
- **New dependencies without a reason in the pull request.** The dependency surface is deliberately small and one of the existing ones already carries unfixable advisories (see [SECURITY.md](SECURITY.md)).
- **Anything that makes a network request.** v0.1 has no network surface at all, and that is a property worth keeping rather than an accident.

## A note on how this code was written

Most of this repository was written by an AI agent working with the maintainer, and the full record of that is in [docs/plans/](docs/plans/). That has no bearing on how contributions are reviewed — a pull request is read on its own merits — but it does explain the unusual density of the documentation and the comments, and it is why `AGENTS.md` exists at the root.
