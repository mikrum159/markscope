# ADR-0012: Minimal AI Hook in v0.1

> **Superseded by [ADR-0018](0018-deterministic-outline-in-v0-1-ai-summaries-in-v0-2.md) on 2026-09-13:** v0.1 has a deterministic heading outline and no AI surface; summaries move to v0.2, lazy and content-hash cached. Retained for decision history; not current direction.
>
> Migration status: historical decision, pending reconfirmation against the current MVP. The original status below is preserved; it is not evidence of implementation.
>
> Source: original MarkScope v2 decision ADR-012, migrated 2026-09-09.

## Status

Accepted (new in v2)

## Context

The original v1 spec had no AI surface. Given that the app's primary
use case is reviewing AI-generated documents, and that meaningful
phase-2 features (semantic search, knowledge-base mode, MCP server)
all assume an AI integration story, postponing all AI work to phase 2
has two costs:

- The architectural seam for AI integration is not exercised, and
  retrofitting is harder than carving the seam early.
- The product's direction is invisible to anyone who opens the
  v0.1 build. It looks like another Markdown viewer.

Adding a full AI feature set to v0.1 would, however, blow scope.

## Decision

Ship exactly one AI action in v0.1: **summarize the active
document**. The action:

- Is opt-in. Disabled by default. Requires the user to fill in
  `app-config.json` with a provider, URL, model, and API key.
- Targets a single configurable endpoint. Anthropic, OpenAI, Azure
  OpenAI, and Ollama-compatible endpoints are all supported via the
  same shape.
- Sends a single request per invocation. No tool use, no agent loop,
  no chat history.
- Streams the response into a transient side panel. Result is not
  persisted.
- Goes through an `AiGateway` interface so phase 2 can extend it
  without restructuring.

## Consequences

Positive:

- Establishes the AI architectural seam at v0.1 cost.
- Makes the product's direction legible from the first install.
- Forces early decisions on the privacy/config model
  (user-configured endpoint, opt-in, no telemetry).
- Phase 2 features (semantic search, MCP server, knowledge graph)
  inherit the same gateway and config model.

Negative:

- Adds a network surface to a previously fully-local app. Mitigated
  by the opt-in default and visible in-flight indicator.
- Requires the user to bring their own API key. Acceptable for the
  target audience.
- Adds a small dependency on the chosen HTTP client crate.

## Non-goals for the v0.1 hook

- No chat interface.
- No tool use or function calling.
- No multi-document context.
- No local model hosting (the user can point at Ollama themselves).
- No prompt editing UI (system prompt is hard-coded for v0.1).
