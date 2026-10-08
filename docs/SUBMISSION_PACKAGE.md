# Monad City — Metropolis submission package

Prepared: 2026-10-08. Public copy below describes the implemented build, not the roadmap.

## Submission fields

### Project name

Monad City

### One-line description

Source-grounded AI navigation for the Monad ecosystem.

### Short description

Monad City helps newcomers and builders discover Monad projects, inspect their sources, and
understand relationships. An interactive city presents the ecosystem graph; the AI Navigator
searches it with local tools and selects relevant evidence. Each displayed record keeps its
claim status, source, scope, and limitations visible.

### Full description

Monad City turns fragmented ecosystem research into a guided discovery experience. Newcomers
and builders can explore Monad projects, understand what connects them, and inspect the sources
behind a claim in one interface.

The ecosystem appears as an interactive city. Buildings represent projects; five districts
organize DeFi, Infrastructure, AI, Gaming, and Identity. Selecting a building opens its Project
Passport with exact evidence records, source links, and relationships. Graph View exposes the
same connections directly.

The AI Navigator combines deterministic retrieval with an optional tool-calling agent. Local
retrieval controls map selection. The agent can search projects, inspect evidence and
relationships, and read district coverage through four local tools. Its final response selects
eligible evidence IDs retrieved during that conversation. The application displays exact record
claims rather than model-written factual prose, retaining source status, scope, and limitations.
If evidence cannot establish an activity claim, the Navigator explains the gap.

The current build contains 176 projects, with 193 approved evidence records covering 172 of them.
Six relationships have source-backed evidence; other displayed edges remain explicitly
illustrative or AI-inferred. Evidence comes from manually reviewed, versioned snapshots. The
build verifies that the reviewed snapshot matches its runtime module.

Monad City is implemented in vanilla JavaScript and CSS with vendored Three.js. The optional AI
path has been tested using Qwen through OpenRouter. It is a read-only prototype without a wallet
flow, live indexer, or transaction execution. Sources support bounded claims, not a declaration
that a project is safe, active, or endorsed.

### Problem

Understanding Monad requires moving between ecosystem directories, project documentation,
contract registries, and explorers. A list can help someone find a name, but it rarely shows
which relationship is documented, whose claim it is, or what the available evidence can prove.

### What makes it different

Project discovery, relationship inspection, and source provenance share one graph and one
interface. The AI agent selects evidence through graph tools; exact source records supply the
factual text. The city makes that graph explorable, while Passport and Graph View make its
reasoning inspectable.

### Monad relevance

The dataset, districts, project identities, source records, and relationship inspection are
specific to the Monad ecosystem. Monad City helps users discover its applications and helps
builders inspect documented integrations. This version is an ecosystem research interface;
it does not execute transactions or deploy an application contract on Monad.

### How AI is used

A user-configured OpenAI-compatible model calls four local tools: search_projects,
get_project_evidence, get_project_relationships, and get_district_coverage. A bounded agent loop
validates the final selection against evidence retrieved in that run. The interface renders
exact claims and citations from those records. Deterministic retrieval remains responsible for
map actions, and missing evidence or provider errors preserve the local experience.

### Technical stack

Vanilla JavaScript, CSS, vendored Three.js r170, SVG Graph View, Node.js build tooling,
versioned JSON evidence snapshots, and an optional OpenAI-compatible tool-calling provider.
The tested provider path is OpenRouter with qwen/qwen3.8-max-0902. No model training,
embeddings, document RAG, backend API, or smart-contract execution is implemented.

### Current status

Working static prototype with an optional real AI agent, local discovery without credentials,
responsive City/Graph views, district navigation, Passport/source disclosure, and a validated
snapshot pipeline. Nineteen bounded AI/dataset tests pass; real source and relationship queries
were exercised with the configured Qwen model.

### Next steps

Improve relationship coverage through reviewed source additions, refresh evidence on a clear
cadence, and make the structured graph easier for other agents to consume. Any live indexing or
wallet feature would require a separate product and trust-model decision.

## Recommended track

**Trust, Identity & AI Infrastructure.** This is a product-fit recommendation: the core is
inspectable evidence and constrained agent access to ecosystem knowledge. Confirm the current
track label and eligibility in the submission form.

## Links and assets

| Item | Value / status |
| --- | --- |
| Repository | https://github.com/ILYUTKICK/monad-city — public, checked 2026-10-08 |
| Public application | Pending deployment; localhost is not a judge-facing link |
| Demo video | Script ready in `docs/DEMO_SCRIPT.md`; no finished video or hosted link yet |
| Pitch video | Spoken script below; no finished video or hosted link yet |
| Screenshot | `docs/preview.png` — actual application capture |
| Agent design note | `docs/QWEN_BUILD_NOTES.md` — draft article, not published |
| Team / presenter | Owner to supply the actual name and team details in the form |

## Short spoken pitch (about 60–75 seconds)

Monad has a growing ecosystem, but understanding a project still means opening directories,
documentation, registries, and explorers, then deciding which claims to trust.

Monad City brings that research into one interface. Each building is a project, each district
is a discovery category, and each sourced relationship leads back to its evidence.

You can ask the Navigator for Kuru's sources, inspect a Project Passport, or explore a documented
connection between projects. The AI agent uses local graph tools to find relevant evidence.
The app displays exact source records, with their status and limitations, rather than letting
the model invent factual explanations.

The current prototype has 176 projects and 193 evidence records. It also shows when the data
cannot establish a requested claim, such as current contract activity.

Our next step is to expand reviewed relationship coverage and make this structured knowledge
easier for other agents to use. Monad City gives people a city to explore and agents a graph
they can inspect.

## Owner-only release checklist

- [x] Current counts checked against source and active snapshot.
- [x] English submission copy and truthful AI explanation prepared.
- [x] Public repository availability checked.
- [x] README and current project context reconciled with implementation.
- [x] Short demo and pitch scripts prepared.
- [ ] Verify form-specific fields, required assets and exact limits from the owner's screenshot.
- [ ] Deploy the current tested build and test the public URL without the owner's browser key.
- [ ] Keep repository code and the deployed version in sync.
- [ ] Record the real AI path; edit waiting time transparently if needed.
- [ ] Upload demo/pitch videos to the chosen service and test judge access.
- [ ] Fill actual team details, selected track, links and assets; review the final form.
- [ ] Submit on the portal and retain its confirmation.

Official portal checked 2026-10-08: https://hackathon.monad.xyz/ displays “1 Sep to 13 Oct”.
The exact deadline time, video durations, upload limits, field limits and full eligibility rules
are not established by that public login page. Do not turn another entrant's README into rules.
The owner's form will be the source for final field mapping.

## Sponsor bounty notes

Qwen integration is implemented and has been exercised through OpenRouter. That alone does not
establish compliance with an Alibaba/Qwen bounty that may require a specific endpoint, model,
article, credits, or demonstration. `QWEN_BUILD_NOTES.md` documents actual use; check the official
bounty text before claiming eligibility. Other sponsor integrations are not implemented and
should not be selected just because their projects appear in the dataset.
