# Monad City — Project Context

## One-line definition

Monad City is a source-grounded, AI-readable graph of the Monad ecosystem presented as a human-explorable isometric city.

## Product thesis

Existing ecosystem tools mostly answer “what exists?” Monad City should answer:

- What is this project?
- What can it do?
- How is it connected to other projects?
- Which facts are observed, claimed, attested, or inferred?
- Which project should I explore next for my goal?

The 3D city is a visual interface for this graph, not the product by itself.

## User problem

Monad newcomers and ecosystem participants face fragmented information across project sites, docs, explorers, social posts, contract pages, and analytics dashboards. Existing directories help with discovery but are mostly lists. Existing explorers help with transactions but are not designed to explain the ecosystem as a connected system.

## Primary audience

1. Newcomers who want a guided, understandable introduction to Monad.
2. Builders who need to discover infrastructure, integrations, and adjacent projects.
3. Ecosystem projects that want an understandable, evidence-backed public profile.
4. AI agents that need structured project capabilities, relationships, and provenance.

## Product promise

“Find, understand, and verify a Monad project in under 30 seconds.”

## Positioning

Use:

> A proof-backed AI navigator for the Monad ecosystem.

Avoid:

- metaverse for Monad;
- 3D catalogue;
- AI-generated city;
- the complete official map of Monad;
- verified project, unless the exact verification claim and evidence are explicit.

## Core objects

- Project: a named ecosystem entity with a manifest and evidence.
- Building: the visual representation of a project.
- District: a navigational category, not a claim of ownership or geography.
- Relationship: a typed edge between projects with provenance.
- Project Passport: the evidence-backed detail view for a project.
- AI Navigator: a grounded assistant that searches the graph, explains results, and focuses the map.
- City View: the spatial presentation for people.
- Graph View: the explicit relationship presentation for analysis.

## Differentiation hypothesis

Directories and explorers already exist. Monad City needs to win through the combination of:

1. evidence provenance;
2. typed relationships;
3. AI answers grounded in structured graph data and source documents;
4. spatial navigation that makes relationships understandable;
5. machine-readable manifests for other agents.

If a feature does not strengthen one of these, it is probably scope creep.

## Current prototype status

The current repository contains a dependency-free, review-gated static prototype:

- `src/main.js` renders the SVG City/Graph interface, filters, search, grounded Navigator results, and Project Passport;
- `src/retrieval.js` provides deterministic local retrieval over projects, categories, capabilities, relationships, and evidence;
- `data/evidence-snapshots/phase-3.5-v2.json` is the active checked-in approved evidence snapshot;
- `src/evidence-snapshots/phase-3.5-v2.generated.js` is its deterministic promoted runtime module;
- the immutable `phase-3.5-v1` JSON/module pair remains available for explicit rollback;
- `src/evidence.js` selects and validates the active snapshot;
- `scripts/evidence-workflow.js` supports local proposal, review, snapshot, diff, promotion, and verification steps;
- `src/style.css` contains the visual system and responsive layouts;
- `index.html` is the shell and `README.md` documents local operation.

Current functionality includes:

- 10 illustrative projects across 5 districts;
- City and Graph views;
- district filters and project search;
- click-to-select buildings;
- deterministic local Navigator queries with grounded evidence references, uncertainty, and conservative no-result states;
- Project Passport with exact source-backed records for a bounded subset and explicit Demo fallbacks;
- 22 approved evidence records and 6 sourced relationships across 6 curated entities;
- review-gated evidence states and a versioned, SHA-256-confirmed runtime promotion workflow;
- drag, zoom, reset, and relationship visibility controls.

Current limitations:

- no real AI;
- no RAG;
- no wallet or ownership claim;
- no live blockchain connection, indexer, crawler, external API, or backend;
- no live source synchronization or automatic project discovery;
- source-backed records cover only six entities and support only their exact cited scopes;
- project descriptions, placements, project-state patterns, and unsupported relationships remain illustrative Demo data;
- review approval and canonical snapshot equality do not prove source accuracy, freshness, safety, legitimacy, or endorsement.

## Design north star

Make the interface feel like a calm, high-trust instrument for exploring a complicated ecosystem. The user should understand the product in five seconds and find one useful answer in thirty seconds.

## Success criteria for the MVP

- A newcomer can understand the five districts without a tutorial.
- A user can ask one ecosystem question and see the answer reflected on the map.
- A selected project has a clear Passport with facts, provenance, and relationships.
- The UI makes uncertainty visible instead of hiding it.
- 3D adds orientation and memory without slowing down discovery.
- The demo works with a small curated dataset and does not pretend to cover all Monad.
