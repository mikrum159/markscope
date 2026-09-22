# ADR-0018: Deterministic Outline in v0.1; AI Summaries Deferred to v0.2

Status: Accepted
Date: 2026-09-13
Decider: maintainer
Supersedes: [ADR-0012](0012-minimal-ai-hook-in-v0-1.md)

## Context

ADR-0012 put exactly one AI action in v0.1 — summarize the active document — opt-in, single request, transient output, behind an `AiGateway`. Its argument was that the AI seam is cheaper to carve early than to retrofit, and that the product direction should be legible from the first install.

The reconciliation checklist ([specification-reconciliation.md](../plans/specification-reconciliation.md)) separately asked to bring heading/chapter navigation into the candidate MVP. That question and the AI question turn out to be the same question: both are answers to _"help me find my way around a long document."_

A deterministic heading outline answers it offline, instantly, at any corpus size, with no configuration, no API key, and no network surface. An AI summary answers it better in some cases, but only after the user has configured a provider — which means the v0.1 build's navigation story would be empty for any user who has not.

## Decision

**v0.1 ships a deterministic heading outline and no AI surface at all.** No `AiGateway`, no provider configuration, no network code. v0.1 is fully local — this is a property that can be stated plainly and verified, and it is lost the moment one network call exists.

The outline is the answer to "chapters and quick navigation": an outline panel, jump-to-section, scroll-spy, sticky breadcrumb.

**AI summaries move to v0.2**, and change shape when they arrive:

- **Lazy on first open**, not an eager background scan of a whole root. Cost is bounded to documents actually read.
- **Cached by content hash**, so a document is summarized once per version of its content.
- Summaries **decorate** the outline rather than replacing it. The outline remains the navigation primitive whether or not AI is configured.

### Consequence for architecture.md §3 principle 8

[architecture.md](../specs/architecture.md) §3 principle 8 states "network only on explicit user action." Caching a summary on first _open_ is not an explicit user action in that sense — opening a document is ordinary navigation. That principle is therefore **deliberately superseded** for the v0.2 summary feature, and this ADR is the record of it. It is not an oversight and must not be silently edited out of the architecture document; the document should point here.

The replacement rule for v0.2: summarization is opt-in at the feature level (off until the user configures a provider), and once enabled, a cache miss on open may issue one request. If that proves surprising in use, the fallback is an explicit per-document trigger — ADR-0012's original model.

## Alternatives

- **Keep the v0.1 summarize hook** (ADR-0012). Rejected: it buys legibility of product direction at the price of the "no network surface" property, and it leaves users without a configured provider with no navigation aid at all. The architectural-seam argument is weaker than ADR-0012 assumed — the outline panel is itself the surface a summary later decorates, so the seam gets carved either way.
- **Outline plus the v0.1 summarize hook, both.** Rejected on scope; v0.1 has no code yet.
- **Eager background summarization of a whole root.** Rejected: unbounded cost over documents the user never opens.

## Consequences and verification

Accepted: a v0.1 build looks like a well-made local Markdown reader and does not advertise its AI direction. That was ADR-0012's stated cost of waiting, and it is accepted.

Gained: no network surface, no API-key handling, no provider config schema, no streaming UI, no in-flight/error states in v0.1.

Reversibility: high. Adding the gateway in v0.2 is additive.

Verification:

- v0.1 acceptance includes a negative check: **no outbound network call exists in the shipped build.** State how this was checked, not that it is true by design.
- The outline must work on ordinary and agent-generated Markdown without frontmatter or metadata of any kind.
- When v0.2 is specified, the cache key, invalidation, and storage location get their own decision; this ADR fixes the shape (lazy, content-hashed), not the schema.
