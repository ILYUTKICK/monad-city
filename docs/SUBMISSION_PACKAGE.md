# Monad City — Metropolis submission package

Updated: 2026-10-10. Public copy below describes the implemented build, not the roadmap.

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
relationships, and read district coverage through four local graph tools, plus an optional read-only publication check. Its final response selects
eligible evidence IDs retrieved during that conversation. The application displays exact record
claims rather than model-written factual prose, retaining source status, scope, and limitations.
If evidence cannot establish an activity claim, the Navigator explains the gap.

The current build contains 176 projects, with 217 approved evidence records covering 172 of them.
Twenty-eight relationships have source-backed evidence; other displayed edges remain explicitly
illustrative or AI-inferred. Evidence comes from manually reviewed, versioned snapshots. The
build verifies that the reviewed snapshot matches its runtime module.

The reviewed snapshot is also published in an immutable registry on Monad Testnet. Each record
can be checked against its Merkle root and the publication's current lifecycle. The full snapshot,
manifest and proofs are publicly available through IPFS. These checks establish that the publisher
committed those exact bytes; they do not establish source truth, freshness or project safety.

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
the app reads a deployed evidence registry on Monad Testnet (chain 10143). The owner published
v7 in transaction `0x3e0fa8cc915fc02ef9590ef22420e61c1e9b15cf20362f99b39c09785e039d14`.
Passport checks verify the exact record's inclusion and current publication state. No user wallet
is required to explore or check records.

### How AI is used

A user-configured OpenAI-compatible model calls four local tools: search_projects,
get_project_evidence, get_project_relationships, and get_district_coverage. An optional fifth tool,
check_registry_publication, can check exact retrieved records against the pinned Testnet registry.
A bounded agent loop
validates the final selection against evidence retrieved in that run. The interface renders
exact claims and citations from those records. Deterministic retrieval remains responsible for
map actions, and missing evidence or provider errors preserve the local experience.

### Technical stack

Vanilla JavaScript, CSS, vendored Three.js r170, SVG Graph View, Node.js build tooling,
versioned JSON evidence snapshots, and an optional OpenAI-compatible tool-calling provider.
The tested provider path is OpenRouter with qwen/qwen3.8-max-0902. No model training,
embeddings, document RAG or backend API is implemented. The registry uses Solidity 0.8.30,
OpenZeppelin 5.7.0 and SHA-256 Merkle proofs; the app performs read-only chain queries.

### Current status

Working static prototype with an optional real AI agent, local discovery without credentials,
responsive City/Graph views, district navigation, Passport/source disclosure, a validated
snapshot pipeline and an active Monad Testnet evidence publication. Nineteen bounded AI/dataset tests pass; real source and relationship queries
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
| Public application | https://monad-city.vercel.app/ — production build, opened without a Vercel login on 2026-10-08; local discovery works without a provider key |
| Demo video | Script ready in `docs/DEMO_SCRIPT.md`; no finished video or hosted link yet |
| Pitch video | Spoken script below; no finished video or hosted link yet |
| Screenshot | `docs/preview.png` — actual application capture |
| Qwen article | https://github.com/ILYUTKICK/monad-city/blob/main/docs/QWEN_BUILD_NOTES.md — published technical article; acceptance as the bounty's article format remains an organizer decision |
| Logo | `docs/assets/monad-city-logo.png` — 1024 × 1024 PNG, 32,230 bytes; exported from the existing diamond identity |
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

The current prototype has 176 projects and 217 evidence records. It also shows when the data
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
- [x] Read form-specific fields, required assets and exact limits from the owner's screenshots and live form.
- [x] Deploy the current tested build and test the public URL without the owner's browser key.
- [x] Update the public build and repository with the verified Testnet registry configuration: application commit `a3417d06f60d50e6a60924f54c31f3dd248fb948`, READY production deployment `dpl_7fCezkRkTADKhJFBqud1WUrvHr8P` on 2026-10-10; public-origin Kuru publication check passed.
- [ ] Record the real AI path; edit waiting time transparently if needed.
- [ ] Upload demo/pitch videos to the chosen service and test judge access.
- [ ] Fill actual team details, selected track, links and assets; review the final form.
- [ ] Submit on the portal and retain its confirmation.

Authenticated portal checked 2026-10-08: deadline **14 October 2026, 06:59 GMT+3**.
Form limits: project name 120 characters; one-line description 200; description, go-to-market
and judge instructions 8,000 each. Logo: PNG/JPG/WEBP, max 2 MB, at least 500 px, max 4 million
pixels. Technical demo: working product, max 3 minutes. Pitch: team, problem and motivation,
max 2 minutes. Videos require hosted HTTPS links. Optional ad: max 30 seconds; X profile optional.

The live-product field explicitly requires "Must run on Monad Mainnet or Testnet". The app now uses an immutable evidence registry deployed on Monad Testnet and verifies exact
record publication/inclusion through read-only RPC calls. The source snapshot remains reviewed
and static; there is no live indexer. This is a concrete chain integration. Final track/bounty
eligibility remains the organizer's decision.

## Sponsor bounty notes

The authenticated [Qwen bounty](https://hackathon.monad.xyz/tracks/best-builds-with-qwen-3-8-max)
requires real agentic Qwen 3.8 Max use, a working product deployed and demoable on Monad, and
a published article/blog post about Qwen's use and value. Its visible text does not explicitly
require a direct Qwen Cloud endpoint or a particular publishing host. We document OpenRouter
use and supply a public GitHub article; eligibility and acceptance of that article format are
not guaranteed. Other sponsor integrations are not implemented.

## Form progress (2026-10-08)

Track retained: Trust, Identity & AI Infrastructure. Name retained: Monad City. Updated tagline
and description to include the current optional agent, actual counts and read-only boundaries.
Added go-to-market plan, public app URL, judge instructions and PNG logo. No team credentials,
shared API key, existing partnerships or traction claims were invented.

Go-to-market plan: first users are Monad newcomers and builders researching infrastructure.
Planned acquisition uses practical project research posts and short demos on X and in Monad
builder communities, feedback from a small tester group, and invitations to project teams to
check source links. Planned measures are reaching a relevant Passport, opening a source and
returning for another research task. Structured agent access and source submissions are future
steps, not implemented functionality.

Judge instructions cover keyless Kuru source search, full-record inspection, Magma–Switchboard
relationship inspection, City/Graph, district filters and the active-contract evidence gap.
Optional agent setup specifies the user's own OpenRouter key, endpoint
`https://openrouter.ai/api/v1` and tested model `qwen/qwen3.8-max-0902`. No key is supplied.

Owner confirmed no videos exist yet. Required technical-demo and pitch URLs stay empty.
Optional ad and X profile stay empty. No final submission confirmation exists.

Portal progress was saved at 2026-10-08 12:58 UTC (15:58 Moscow): **5/6 sections complete**,
including the Qwen article field. Only the required demo/pitch section remains incomplete in
the portal checklist. This is saved progress, not a final submission or eligibility approval.

## Verified Testnet integration (2026-10-10)

- Contract: `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`, Monad Testnet 10143.
- Publication: [transaction](https://testnet.monadscan.com/tx/0x3e0fa8cc915fc02ef9590ef22420e61c1e9b15cf20362f99b39c09785e039d14), block 69899471.
- Exact commitments, 217 evidence records, 28 relationships and manifest URI match the reviewed v7 bundle.
- Official RPC reports the matching block finalized; current representative evidence/relationship proofs pass, including each supporting evidence record. One trusted RPC is used.
- [Verified contract source](https://repo.sourcify.dev/10143/0x8d53153a8a25c81701954eed66154B3EbBa8b8c7): creation and runtime match.
- Public manifest: `ipfs://bafybeie73hfukkqxrap2mtfp5lw2o3pv4qztrgusm4fnvibwlibw7sbat4/manifest.json`.
- Add to judge instructions: open a source-backed Passport, expand **Inspect full record**, click **Check publication**, and inspect the returned block. No wallet or API key is needed for this check.
- Portal text saved on 2026-10-08 predates this integration and must be refreshed before final submission.
