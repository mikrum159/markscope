# ADR-0017: Use SQLite FTS5 for Full-Text Search

Status: Accepted
Date: 2026-09-13
Decider: maintainer
Supersedes: [ADR-0006](0006-use-tantivy-for-full-text-search.md)

## Context

ADR-0006 chose Tantivy as the full-text search engine with SQLite for catalog metadata, and named SQLite FTS5 as an acceptable tactical fallback "if AI-agent-driven implementation of Tantivy proves slow or error-prone."

Two things changed. Tantivy is a Rust library, and the runtime is no longer Rust ([ADR-0015](0015-use-electron-react-typescript-for-markscope.md)) — using it from Electron would mean a native addon or a sidecar process, which is a larger commitment than ADR-0006 ever priced. And the fallback's trigger condition was written about _agent_ implementation difficulty, which is no longer the build model.

So FTS5 is adopted on its own merits, not by triggering ADR-0006's escape hatch.

## Decision

Use **SQLite FTS5** via `better-sqlite3` for full-text search, in the same database that holds workspace and catalog metadata ([ADR-0005](0005-use-sqlite-for-workspace-and-catalog.md), reconfirmed).

The `SearchGateway` boundary from [architecture.md](../specs/architecture.md) §7 is retained. It was introduced in ADR-0006 specifically to localize an engine swap; that is exactly what is happening, and it should keep doing that job.

## Alternatives

- **Tantivy** (ADR-0006). Rejected: a Rust-native index behind a native addon or sidecar, for ranking quality that is imperceptible at this corpus size. It remains the right answer if the corpus turns out to be far larger than assumed.
- **A JavaScript index (MiniSearch, Lunr, FlexSearch).** Rejected: an in-memory index has to be rebuilt or serialized separately, while FTS5 lives in the database that already has to exist and is already transactional with the catalog.

## Consequences and verification

Accepted: weaker ranking than Tantivy, and FTS5's query syntax and tokenizer rather than Tantivy's. Gained: one storage engine, one migration story, no native search process, no separate index lifecycle.

Reversibility: good, by design — `SearchGateway` is the seam.

Verification required:

- This decision assumes real corpora are **hundreds to low thousands** of Markdown files. That number is an assumption from the planning session, not measured. [quality.md](../specs/quality.md) §6 states 10,000 documents; that figure is an imported claim from the earlier specification and has not been reconfirmed. Resolve the real number before search is built; if it is much larger than assumed, revisit this ADR and add incremental scan.
- Index schema versioning and rebuild logic are still required (ADR-0006's negative consequences carry over to FTS5 unchanged).
- `better-sqlite3` is a native module and needs a rebuild against the Electron ABI on Windows. Verify that the packaged installer — not just the dev build — loads it, at packaging time.
