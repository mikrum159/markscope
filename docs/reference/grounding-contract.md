---
doc: reference
title: Grounding Contract
version: 0.1.0
status: reference
applies_to: any feature where an LLM emits text a human will act on
---

# Grounding Contract

> Reference only, not an adopted product requirement or repository instruction.
>
> Source: project-starter-kit-2026-06-17/project-starter-kit/docs/GROUNDING-CONTRACT.md, migrated 2026-09-09.

The contract that makes AI output auditable. It is **stack-neutral** — the .NET and
Rust implementations differ, but the rules below do not. Any narration feature
references this document.

## Rule 1 — Closed fact payload

The model narrates **only** against a closed, structured payload assembled by code.
It never reaches past the payload for facts. The payload is a versioned JSON object
whose fields are drawn from a **closed metric/fact vocabulary** (the metric catalog).
No field outside the vocabulary may appear.

## Rule 2 — Claim-to-fact audit map

Every factual claim in the generated prose maps back to a specific field in the
payload. The mapping is produced and retained, so any sentence can be traced to its
source fact. A claim that cannot be mapped is a defect, not a stylistic choice.

## Rule 3 — Honest absence

When asked about something outside the vocabulary or absent from the payload, the
correct output is an explicit "I don't have that," never a fabricated value. Absence
is a first-class answer.

## Rule 4 — Fixture-gated vocabulary

Every metric/fact in the vocabulary ships with a **fixture test** asserting its
computed value against known input. A metric without a passing fixture is not in the
vocabulary and may not be narrated. The catalog is **versioned**; changes go through
the eval gate.

## Rule 5 — Decision-facing, not directive

The brief explains *what changed and why*. It does **not** tell the reader *what to
do*. This boundary is baked into the product, not bolted on as a disclaimer —
especially for finance, health, or safety domains.

## What this buys

- A closed payload and audit map constrain unsupported claims; semantic correctness still requires evaluation against source evidence.
- Every shipped sentence is defensible to an auditor, regulator, or skeptical exec.
- The grounding is the moat — the same discipline that makes the output trustworthy
  is the thing horizontal tools don't enforce by default.

## Implementation notes (per stack — not part of the contract)

- **.NET line:** metric catalog as typed definitions; fixtures in the test project;
  payload serialized from the domain ontology.
- **Tauri/Rust line:** catalog as Rust types; fixtures as unit tests; payload
  assembled before the local inference call.
