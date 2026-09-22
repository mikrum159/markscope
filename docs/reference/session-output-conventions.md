> Reference only, not an adopted product requirement or repository instruction.
>
> Source: markscope-v2.1-fable/09-session-output-conventions.md, migrated 2026-09-09.

# Session Output Conventions (v2, new)

> Purpose
>
> MarkScope's headline use case is triaging AI-generated Markdown,
> and its phase-2/3 direction is a provenance-aware personal
> knowledge layer over agent session outputs. The quality of that
> future layer is determined by what gets captured **from today
> onward** — before any of it is built.
>
> This document standardizes how coding-agent sessions (Claude
> Code, Copilot, Codex, local agents) write their Markdown output,
> so every document carries machine-readable provenance. It costs
> one paragraph of agent instructions now and avoids a retroactive
> classification problem later.
>
> v0.1 dependency: the scanner stores YAML frontmatter as
> `frontmatter_json` on the `documents` table (see
> `../specs/search-and-catalog.md` §5). Nothing else in v0.1
> consumes it.

## 1. Folder Layout

All agent session output lands under a single sessions root:

```text
<sessions-root>/                    e.g. ~/ai-sessions/
  <project>/                        e.g. markscope/, example-project/
    <yyyy-mm-dd>-<session-slug>/    e.g. 2026-06-11-tantivy-schema/
      PLAN.md
      JOURNAL.md
      adr/
        0001-<slug>.md
      docs/
        <generated docs>
      out/
        <generated artifacts referenced by docs>
```

Rules:

- One folder per session. Agents never write session docs outside
  their session folder (code goes to the repo as usual; *documents
  about the work* go here).
- `PLAN.md` is written at session start; `JOURNAL.md` is appended
  during/at end of session.
- The sessions root is a natural durable trusted root in MarkScope;
  an individual session folder is a natural ephemeral root
  (`markscope <sessions-root>/<project>/<session>/`).

## 2. Frontmatter Schema

Every generated Markdown document begins with:

```yaml
---
session_id: 2026-06-11-tantivy-schema     # folder slug; unique per session
date: 2026-06-11
project: markscope
doc_type: plan          # plan | journal | adr | spec | readme | notes | report
model: <model-name>     # e.g. claude-sonnet-4-6, qwen3.6-35b-a3b
status: draft           # draft | reviewed | kept | superseded
tags: [search, tantivy] # optional, freeform
---
```

Field rules:

- `session_id`, `date`, `project`, `doc_type` are required.
- `model` and `status` are strongly encouraged; `tags` optional.
- Values are lowercase kebab/slug style; dates are ISO 8601.
- `status` is the human's field: agents always write `draft`;
  the human flips it during triage (this is the manual precursor of
  the phase-2 "mark as reviewed" feature).
- Unknown extra fields are allowed and preserved — the catalog
  stores the whole block as JSON.

## 3. Paste-Ready Agent Instruction

Add this block to `CLAUDE.md` / agent system instructions for every
project:

```text
## Documentation output convention
When you produce Markdown documents about this work (plans,
journals, ADRs, specs, notes, reports), write them inside
<sessions-root>/<project>/<yyyy-mm-dd>-<session-slug>/ using the
layout: PLAN.md, JOURNAL.md, adr/NNNN-slug.md, docs/. Begin every
generated Markdown file with YAML frontmatter containing:
session_id (the session folder slug), date (ISO), project,
doc_type (plan|journal|adr|spec|readme|notes|report), model (your
model name), status: draft, and optional tags. Do not write
session documents anywhere else.
```

## 4. What This Buys Later (for context, not v0.1 scope)

- **Timeline / recently-changed views**: group by `session_id` and
  `date` directly from the catalog.
- **Triage state**: `status` transitions become first-class once
  "mark as reviewed" ships (phase 2) — with full backfill, because
  the data existed from day one.
- **MCP server filters** (phase 2): external AI clients can query
  "all ADRs for project X" or "everything from session Y" against
  `frontmatter_json` without any reprocessing.
- **Provenance queries** (phase 3 "brain"): which model produced
  this, in which session, alongside which sibling documents — the
  differentiator generic note tools cannot have.

## 5. Non-Goals

- No enforcement in v0.1: documents without frontmatter index and
  render normally (`frontmatter_json` is simply NULL).
- No frontmatter editing UI.
- No validation beyond "parses as YAML".
