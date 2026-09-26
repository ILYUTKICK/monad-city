# Monad City — Agent Instructions

## Read first

Before changing anything, read these files in order:

1. `docs/PROJECT_CONTEXT.md`
2. `docs/PRODUCT_SPEC.md`
3. The task-specific file:
   - visual work: `docs/VISUAL_DIRECTION.md`
   - trust/data work: `docs/TRUST_MODEL.md`
   - AI/search work: `docs/AI_NAVIGATOR.md`
   - planning/coordination: `docs/IMPLEMENTATION_PLAN.md`
4. For evidence workflow or runtime work:
   - `docs/EVIDENCE_DATA_CONTRACT.md`
   - `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`
   - `docs/WORKLOG.md`

## Product invariant

Monad City is not a metaverse and not a generic 3D directory. It is a source-grounded, AI-readable graph of the Monad ecosystem that humans explore as a restrained isometric city.

The city is the interface. Evidence, project identity, and relationships are the product.

## Non-negotiable rules

- Never present illustrative mock data as real verification, endorsement, integration, or onchain fact.
- Keep `Observed`, `Claimed`, `Attested`, and `AI-inferred` visibly distinct.
- Every relationship shown as verified must have an evidence source in the data model. If no source exists, label it illustrative or AI-inferred.
- Do not add visual decoration unless it improves discovery, trust, orientation, or feedback.
- Prefer a small number of real, understandable interactions over broad fake functionality.
- Do not build a generic chatbot. The AI Navigator must search the project graph, focus the map, and explain evidence.
- Do not implement a backend, wallet flow, external API, or real AI integration unless the task explicitly asks for it.
- Preserve the current dependency-free prototype unless a change in stack is explicitly approved.
- Product UI copy is English. Planning and implementation notes may be written in Russian or English.
- Avoid unrelated refactors and do not overwrite user changes.

## Current prototype truth

The current app is a dependency-free static vanilla JS/CSS prototype with an SVG City/Graph view,
filters, search, a Project Passport, and deterministic local Navigator retrieval. It has no wallet,
live blockchain connection, backend, external API, or real AI.

The dataset is hybrid:

- approved snapshot `phase-3.5-v2` contains 22 source-backed evidence records and 6 sourced
  relationships for 6 curated entities;
- the remaining project profile copy, placements, project-state patterns, and unsupported
  relationships are visibly labelled Demo/illustrative;
- source-backed claims apply only to their exact cited scope and never make a project globally
  verified, safe, legitimate, active, or endorsed.

Evidence is review- and promotion-gated. The approved JSON snapshot and versioned runtime module
must match canonical SHA-256
`8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`. `npm run build` verifies
that pair before creating `dist/`. There is no live indexer, source synchronization, automatic
discovery, or moving `latest` evidence file. The immutable `phase-3.5-v1` pair remains available as
the explicit rollback boundary.

## Agent roles

Agents may work in these roles:

- Product: clarify user job, scope, positioning, and acceptance criteria.
- UX/Visual: reduce noise, improve hierarchy, city readability, Navigator, Passport, and responsive layout.
- Trust/Data: define evidence, relationship types, project manifests, and source provenance.
- AI: design hybrid graph + RAG retrieval and grounded answer behavior.
- Frontend: implement approved UI behavior without changing product semantics.
- QA: test flows, accessibility, responsive behavior, and regressions.

Before editing, an agent must state which files it owns. Do not have two agents rewrite the same file concurrently. Prefer separate files or sequential handoffs.

## Model routing

Use `gpt-5.6-sol` with high reasoning as the default lead/orchestrator. Use `xhigh` for difficult architecture or final product decisions. Use `gpt-6-astra` as a specialist for demanding visual, 3D, or end-to-end review tasks. Use `gpt-5.6-sol` for trust/data and AI/RAG design, `gpt-5.6-terra` for focused frontend and QA implementation, and `gpt-5.6-luna` for bounded documentation or repetitive low-risk tasks. Follow `docs/MODEL_POLICY.md` for the full routing table and fallbacks.

## Handoff protocol

Every agent handoff should include:

- what changed;
- files changed;
- what was verified;
- known limitations;
- the next recommended task.

Record meaningful decisions in `docs/WORKLOG.md` so context survives compaction.

## Verification baseline

For frontend changes, run:

```sh
npm run build
```

If the dev server is available, verify the main flow at `http://localhost:5173/`:

1. load the city;
2. select a building;
3. inspect the Passport;
4. use a Navigator prompt;
5. switch City/Graph;
6. filter a district;
7. search for a project;
8. check the narrow responsive layout.
