# Monad City — Metropolis submission package

Updated: 2026-10-12. Public copy below describes the implemented build, not the roadmap.

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

The current build contains 176 projects, with 217 approved evidence records covering 172 project
entries. It contains 194 sourced relationships and 205 total graph edges; the remaining 11 edges
are explicitly illustrative or AI-inferred. Evidence comes from manually reviewed, versioned
snapshots, and the build verifies that the reviewed snapshot matches its runtime module.

The reviewed snapshot is also published in an immutable registry on Monad Testnet. Each record
can be checked against its Merkle root and the publication's current lifecycle. The full snapshot,
manifest and proofs are publicly available through IPFS. These checks establish that the publisher
committed those exact bytes; they do not establish source truth, freshness or project safety.

Monad City is implemented in vanilla JavaScript and CSS with vendored Three.js. The optional AI
path has been tested using Qwen through OpenRouter; deterministic local retrieval works without a
provider key. It is a read-only prototype without a wallet flow, live indexer, or transaction
execution. Sources support bounded claims, not a declaration that a project is safe, active, or
endorsed.

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
the app reads a deployed evidence registry on Monad Testnet (chain 10143). The current v9
publication was owner-signed in transaction
`0x71a3ccee9f6d928a9ddb58caa89945dae445c42d33fbcb8e287e160b8296f8e7`.
Passport checks verify exact record inclusion at a checked block. No user wallet is required to
explore or check records.

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
snapshot pipeline and an active Monad Testnet evidence publication. The deterministic AI and
dataset checks pass; real source and relationship queries were exercised with the configured
Qwen model.

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
| Repository | https://github.com/ILYUTKICK/monad-city — public; RC2 application commit 4d22c8c pushed and verified 2026-10-12 |
| Public application | https://monad-city.vercel.app/ — current v9/RC2 production release verified 2026-10-12; 65/65 build files match |
| Demo video | Script ready in `docs/DEMO_SCRIPT.md`; no finished video or hosted link yet |
| Pitch video | Spoken script below; no finished video or hosted link yet |
| Screenshot | `docs/preview.png` — actual application capture |
| Qwen article | https://github.com/ILYUTKICK/monad-city/blob/main/docs/QWEN_BUILD_NOTES.md — published technical article; acceptance as the bounty's article format remains an organizer decision |
| Logo | `docs/assets/monad-city-logo.png` — 1024 × 1024 PNG, 32,230 bytes; exported from the existing diamond identity |
| Team / presenter | Owner to supply the actual name and team details in the form |

## Short spoken pitch (about 75–90 seconds)

Monad has a growing ecosystem, but understanding one project still means moving between
directories, documentation, registries, and explorers, then deciding which claims are supported.

Monad City brings that research into one interface. Each building is a project, each district is
a discovery category, and each sourced relationship leads back to an exact evidence record.

Start without an API key: the deterministic Navigator can find Kuru, focus the map, and open its
Project Passport. From there, a judge can inspect a source, its claim status, scope, timestamp,
limitations, and the read-only publication check. City and Graph views show the same projects and
typed connections from two perspectives.

The optional AI agent uses local graph tools to select relevant evidence IDs, but the interface
renders the canonical records rather than model-written factual prose. If the evidence cannot
establish a request such as current contract activity, the Navigator says so.

The current build contains 176 projects, 217 evidence records, 194 sourced relationships, and
205 total edges. Monad City gives people a city to explore and agents a graph they can inspect.

## Practical judge run

1. Open the public deployment or run `npm run dev` and use the app without an API key. Local retrieval is the default.
2. Search for **Kuru**, select the project, and open its Passport. In **Sources**, expand **Full record** to inspect the exact claim, source link, scope, timestamp, limitations, and review state.
3. Click **Check publication** in the full record and inspect the returned Monad Testnet block. This is a read-only inclusion check and does not require a wallet.
4. Open **Connections** to inspect typed edges and their evidence state, then switch between **City** and **Graph** to see the same relationship context spatially and explicitly.
5. Use a district filter or search for **Beefy** to test discovery across the larger graph. Try an activity request such as “show active contracts” to see the bounded insufficient-evidence response.
6. To exercise the optional agent, open **AI settings**, provide your own browser-compatible OpenAI-compatible endpoint, model, and key, then repeat a source query. Leave this step out when judging the deterministic path.

## Historical release and form notes

The checklist and portal details below preserve the saved 2026-10-08 state. They are historical
audit notes, not a claim that the current portal is complete. Refresh the current form, assets,
deployment URL, and video links before submitting.

- [x] Current counts checked against source and active snapshot.
- [x] English submission copy and truthful AI explanation prepared.
- [x] Public repository availability checked.
- [x] README and current project context reconciled with implementation.
- [x] Short demo and pitch scripts prepared.
- [x] Read form-specific fields, required assets and exact limits from the owner's screenshots and live form.
- [x] Deploy the current tested build and test the public URL without the owner's browser key.
- [x] Update the public build and repository with the verified Testnet registry configuration: application commit `a3417d06f60d50e6a60924f54c31f3dd248fb948`, READY production deployment `dpl_7fCezkRkTADKhJFBqud1WUrvHr8P` on 2026-10-10; public-origin Kuru publication check passed.
- [x] Historical v7 checkpoint: 217 records, 28 sourced relationships; the v7 application deployment and public Beefy publication check were recorded at block 69908916.
- [x] Current v9 Testnet publication was later verified: 217 records, 194 sourced relationships, owner transaction `0x71a3ccee9f6d928a9ddb58caa89945dae445c42d33fbcb8e287e160b8296f8e7`, block `70219795`.
- [ ] Record the real AI path; edit waiting time transparently if needed.
- [ ] Upload demo/pitch videos to the chosen service and test judge access.
- [ ] Fill actual team details, selected track, links and assets; review the final form.
- [ ] Submit on the portal and retain its confirmation.

Historical portal snapshot checked 2026-10-08: deadline **14 October 2026, 06:59 GMT+3**.
Historical form limits recorded at that time: project name 120 characters; one-line description
200; description, go-to-market and judge instructions 8,000 each. Logo: PNG/JPG/WEBP, max 2 MB,
at least 500 px, max 4 million pixels. Technical demo: working product, max 3 minutes. Pitch:
team, problem and motivation, max 2 minutes. Videos require hosted HTTPS links. Optional ad: max
30 seconds; X profile optional. Confirm all limits and deadline in the current form before use.

The historical live-product field explicitly required "Must run on Monad Mainnet or Testnet".
The app now uses an immutable evidence registry deployed on Monad Testnet and verifies exact
record publication/inclusion through read-only RPC calls. The source snapshot remains reviewed
and static; there is no live indexer. Final track or bounty eligibility remains the organizer's
decision.

## Sponsor bounty notes

The authenticated [Qwen bounty](https://hackathon.monad.xyz/tracks/best-builds-with-qwen-3-8-max)
requires real agentic Qwen 3.8 Max use, a working product deployed and demoable on Monad, and
a published article/blog post about Qwen's use and value. Its visible text does not explicitly
require a direct Qwen Cloud endpoint or a particular publishing host. We document OpenRouter
use and supply a public GitHub article; eligibility and acceptance of that article format are
not guaranteed. Other sponsor integrations are not implemented.

## Historical form progress (2026-10-08; pending current refresh)

At that saved checkpoint, the track was Trust, Identity & AI Infrastructure and the name was
Monad City. The tagline and description included the then-current optional agent, counts and
read-only boundaries. A go-to-market plan, public app URL, judge instructions and PNG logo were
saved. No team credentials, shared API key, existing partnerships or traction claims were invented.

Go-to-market plan: first users are Monad newcomers and builders researching infrastructure.
Planned acquisition uses practical project research posts and short demos on X and in Monad
builder communities, feedback from a small tester group, and invitations to project teams to
check source links. Planned measures are reaching a relevant Passport, opening a source and
returning for another research task. Structured agent access and source submissions are future
steps, not implemented functionality.

The saved judge instructions covered keyless Kuru source search, full-record inspection,
Magma–Switchboard relationship inspection, City/Graph, district filters and the active-contract
evidence gap. The saved optional agent setup specified the user's own OpenRouter key, endpoint
`https://openrouter.ai/api/v1` and tested model `qwen/qwen3.8-max-0902`. No key is supplied.

Owner confirmed no videos exist yet. Required technical-demo and pitch URLs stay empty.
Optional ad and X profile stay empty. No final submission confirmation exists.

Portal progress was saved at 2026-10-08 12:58 UTC (15:58 Moscow): **5/6 sections complete**,
including the Qwen article field. Only the required demo/pitch section remains incomplete in
the portal checklist. This is saved progress, not a final submission or eligibility approval.

## Historical Testnet integration checkpoint (2026-10-10; v7)

- Contract: `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`, Monad Testnet 10143.
- Publication: [transaction](https://testnet.monadscan.com/tx/0x3e0fa8cc915fc02ef9590ef22420e61c1e9b15cf20362f99b39c09785e039d14), block 69899471.
- Exact commitments, 217 evidence records, 28 relationships and manifest URI match the reviewed v7 bundle.
- Official RPC reports the matching block finalized; current representative evidence/relationship proofs pass, including each supporting evidence record. One trusted RPC is used.
- [Verified contract source](https://repo.sourcify.dev/10143/0x8d53153a8a25c81701954eed66154B3EbBa8b8c7): creation and runtime match.
- Public manifest: `ipfs://bafybeie73hfukkqxrap2mtfp5lw2o3pv4qztrgusm4fnvibwlibw7sbat4/manifest.json`.
- Add to judge instructions: open a source-backed Passport, expand **Inspect full record**, click **Check publication**, and inspect the returned block. No wallet or API key is needed for this check.
- Portal text saved on 2026-10-08 predates this integration and must be refreshed before final submission.

## Current verified Testnet integration (v9)

- Registry: `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`, Monad Testnet chain `10143`.
- Publication ID: `0xcaae763cd989d32777036d2d443bdae036d24ab5217ecf6324ecb10dd485bc7e`.
- Owner-signed transaction: `0x71a3ccee9f6d928a9ddb58caa89945dae445c42d33fbcb8e287e160b8296f8e7`.
- Publication block: `70219795`; official RPC finality and representative record/support proofs passed.
- Exact published bundle: 217 evidence records and 194 sourced relationships. The active hybrid graph contains 205 total edges, including 11 illustrative or AI-inferred edges.
- Public manifest: `ipfs://bafybeig6zgvvotap5w4nqeyp6kezqj3mx3paayju7ffag2arsvdtdibvzq/manifest.json`; Pinata retrieval matched the local bytes, with Filebase used as an independent gateway check.
- Publication establishes exact bundle inclusion and lifecycle at a checked block. It does not establish source truth, freshness, safety, legitimacy, activity, or endorsement.
- The current public deployment URL remains `https://monad-city.vercel.app/`; the current RC2 release was verified by the 2026-10-12 public release audit.

## Historical pre-release preparation — 2026-10-12

Before publication, the alias served v7 from commit
`0cd8cd36b80dfb157944132eb2835eca0230eedf`; the v9/UI candidate was then local.
The candidate built successfully and passed 42 AI/onchain/registry tests. Its keyless
Beefy/Kintsu source-record rehearsal matched the active Testnet publication at block
`70379100` and finished with the two-project Graph.

The public release and verification below supersede that release gate. For an AI sponsor
submission, record a real configured provider run and its tool trace; the no-key rehearsal
demonstrates local retrieval. Required video URLs and final portal submission remain
pending. The earlier state is retained in `research/2026-10-12-submission-deployment-audit.md`.

## Current public RC2 release — 2026-10-12

- Application commit: `4d22c8c790c9e129d5d660f3be60675291b4d1c9`, pushed to GitHub main.
- READY production deployment: `dpl_9fwUmXGEiatryoKaprJyaosLZ1KE`; public alias https://monad-city.vercel.app/.
- Clean committed-tree build matches all 65 RC2 files; 42 AI/onchain/registry tests pass. All 65 public asset byte sizes and hashes match RC2.
- Public-origin AI settings Off: Beefy search, exact Kintsu dependency, record E-BEEFY-KINTSU-ASSET-001, and active/unrevoked Testnet publication matched at block 70385689. Kintsu → two-project Graph, Passport date, project scroll reset, DeFi filter, and 390×844 layout checked.
- Release audit: `research/2026-10-12-public-release-audit.md`. The later documentation-only commit preserves these exact application bytes.
- Demo/pitch videos, a real configured AI take if required by the chosen track, and final portal submission are still pending.
