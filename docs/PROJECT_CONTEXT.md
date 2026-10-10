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

## Current prototype status (2026-10-10)

The repository is a static vanilla JS/CSS application with vendored Three.js for the City
and SVG for Graph View. Current implementation and `docs/WORKLOG.md` supersede the earlier
10-project / v2 / no-AI prototype description.

Implemented:

- 176 projects across five districts; 172 have approved bounded evidence records;
- active snapshot `phase-3.5-v7`: 217 records and 28 sourced relationships;
- hybrid graph: 39 edges, including 11 illustrative or AI-inferred patterns;
- project selection, City/Graph, district routes and four district views, Passport,
  evidence links, quality/scope/limitation disclosures and review governance;
- deterministic local Navigator retrieval, authoritative for map actions;
- optional browser-based tool-calling AI, tested with Qwen via OpenRouter;
- constrained AI evidence selection: only eligible IDs retrieved in the current tool
  conversation may supply exact record claims to the UI; arbitrary model prose is rejected;
- build-time manual evidence review and immutable SHA-256-gated snapshot promotion;
- responsive UI and self-hosted Instrument Sans.
- isolated Solidity evidence registry implementation with immutable history, permanent subject
  revocations, publisher/revoker roles, delayed admin transfer and explicit migration;
- deterministic SHA-256/Merkle bundles for all 217 records and 28 sourced relationships;
- explicit read-only Passport publication checks and an optional Navigator publication tool.
  The registry is deployed on Monad Testnet at `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`;
  receipt, runtime/constructor bindings and roles were checked through the official RPC.
  The owner published v7 in transaction
  `0x3e0fa8cc915fc02ef9590ef22420e61c1e9b15cf20362f99b39c09785e039d14`, block `69899471`.
  Exact commitments and representative evidence/relationship proofs match; the official RPC
  reports that block finalized. Source correspondence is verified in Sourcify.
  The app pins this Testnet publication for explicit read-only checks.

The active evidence pair must match SHA-256
`6a6c7cf9830460fca3ce75bdbfd8510b72b6fba70ada136eb145e45a95155d28`.
Prior immutable snapshot pairs remain in the repository as explicit historical boundaries.

Limitations:

- no runtime evidence synchronization, automatic discovery, document RAG, embeddings,
  wallet flow, live blockchain feed, transaction execution or application backend;
- onchain checks trust one configured RPC and prove publication/inclusion only;
- Testnet rehearsal does not satisfy production security, administration or monitoring gates;
- optional AI requires a user-configured provider/key and browser-compatible endpoint;
- static evidence supports exact cited scope, often directory listing or publisher claims;
- source freshness, safety, legitimacy, endorsement and current activity are not established
  by review approval, ID validation or the snapshot digest;
- layout and heights are illustrative; unsupported profiles/edges remain labelled accordingly.

## Design north star

Make the interface feel like a calm, high-trust instrument for exploring a complicated ecosystem. The user should understand the product in five seconds and find one useful answer in thirty seconds.

## Success criteria for the MVP

- A newcomer can understand the five districts without a tutorial.
- A user can ask one ecosystem question and see the answer reflected on the map.
- A selected project has a clear Passport with facts, provenance, and relationships.
- The UI makes uncertainty visible instead of hiding it.
- 3D adds orientation and memory without slowing down discovery.
- The demo works with a small curated dataset and does not pretend to cover all Monad.
