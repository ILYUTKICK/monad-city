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
- active snapshot `phase-3.5-v9`: 217 records and 194 sourced relationships, including 166
  Monad-membership edges derived from approved records (Monad App Portal, the pinned Monad
  protocol registry, DefiLlama) under the `approved-record-derivation` review method;
- hybrid graph: 205 edges, including 11 illustrative or AI-inferred patterns; 171 of 176
  projects hold at least one sourced Monad-membership edge (4 demo profiles stay honestly
  unconnected);
- project selection, City/Graph, district routes and four district views, Passport,
  evidence links, quality/scope/limitation disclosures and review governance;
- deterministic local Navigator retrieval, authoritative for map actions;
- hosted Qwen 3.8 Max through a Vercel Function and OpenRouter, plus retained optional browser-provider tool-calling AI;
- constrained AI evidence selection: only eligible IDs retrieved in the current tool
  conversation may supply exact record claims to the UI; arbitrary model prose is rejected;
- build-time manual evidence review and immutable SHA-256-gated snapshot promotion;
- responsive UI and self-hosted Instrument Sans.
- isolated Solidity evidence registry implementation with immutable history, permanent subject
  revocations, publisher/revoker roles, delayed admin transfer and explicit migration;
- deterministic SHA-256/Merkle bundles for all 217 records and 194 sourced relationships;
- explicit read-only Passport publication checks and an optional Navigator publication tool.
  The registry is deployed on Monad Testnet at `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`;
  receipt, runtime/constructor bindings and roles were checked through the official RPC.
  The owner published v9 in transaction
  `0x71a3ccee9f6d928a9ddb58caa89945dae445c42d33fbcb8e287e160b8296f8e7`, block `70219795`.
  Exact commitments and representative evidence/relationship proofs match; the official RPC
  reports that block finalized. Source correspondence is verified in Sourcify.
  The app pins this Testnet publication for explicit read-only checks.

The active evidence pair must match SHA-256
`8147e7dedb389f2d8da5af63747aed71114692a1c2052fde0f14cd9b8133f088`.
Prior immutable snapshot pairs remain in the repository as explicit historical boundaries.
The v9 registry proof bundle is published and the runtime pins its verified publication
`0xcaae763cd989d32777036d2d443bdae036d24ab5217ecf6324ecb10dd485bc7e`.
Its exact predecessor is v7, now superseded; v8 was never published. Receipt, finalized block,
current lifecycle and five representative record/support proofs were checked through the
official RPC. Audits are in `data/registry/deployments/monad-testnet-v9-*.json`.
v9 preserves v8 factual payloads and corrects future-dated review metadata after a bounded
re-review completed at `2026-10-11T21:09:41Z`. The immutable v8 pair remains historical.

Limitations:

- no runtime evidence synchronization, automatic discovery, document RAG, embeddings,
  wallet flow, live blockchain feed, transaction execution or persistent application database;
- onchain checks trust one configured RPC and prove publication/inclusion only;
- Testnet rehearsal does not satisfy production security, administration or monitoring gates;
- hosted AI requires a server-only Production Secret; personal provider mode requires a user-configured browser key and compatible endpoint;
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

## Hosted Navigator integration — 2026-10-12

The owner explicitly requested Qwen Max on Vercel and selected OpenRouter. The Vercel
Function accepts only a question and runs the constrained evidence-selection agent with
four graph tools over the same checked-in project/evidence data. The fixed hosted model
is `qwen/qwen3.8-max-0902`. The Production `OPENROUTER_API_KEY` is stored as a Secret;
visitors receive only availability metadata and validated selections, never the key.
Provider success and current deployment are verified separately in Worklog/release audit.
