# Monad City

A source-grounded, AI-readable trust graph of the Monad ecosystem — presented as an
interactive isometric city.

The city is the interface. Every building is a project, source-backed claims carry inspectable evidence, and illustrative profiles remain separate.
Every record says how the information is known and what its source can establish.

![Monad City — the district archipelago](docs/preview.png)

## What is inside

- **A voxel archipelago** — 176 project buildings across five district islands (DeFi,
  Infrastructure, AI, Gaming, Identity) around the central Monad islet. Layout and heights are
  illustrative and deterministic; they encode no TVL, ranking, or endorsement.
- **Dedicated district worlds** — every district has its own hash route
  (`#/district/defi/overview`) with four views: Overview, Projects, Relationships, and
  Evidence. The city stays dominant; the district is a lens, not a microsite.
- **District Lens** — data-derived coverage facts, deterministic featured projects, an
  evidence-mode control (All / With cited evidence / Illustrative profiles), and a
  relationship diagram with external endpoints labeled.
- **Project Passport** — status, exact evidence records with sources and cited scopes,
  relationships with provenance, and review governance metadata.
- **AI Navigator** — deterministic graph retrieval controls map selection. An optional
  tool-calling AI agent searches projects, reads evidence and relationships, and selects
  relevant retrieved records. The app renders exact claims and sources from those records,
  with scope and limitations. Arbitrary model prose is not presented as project fact.
  Unsupported safety conclusions and unmet activity requirements stay local.
- **Graph view** — typed relationship edges styled by provenance class (sourced / declared /
  AI-inferred), paused Three.js rendering while inspecting.
- **An evidence system, not a feed** — review-gated snapshots with immutable record IDs,
  revision lineage, review-cadence governance, and a SHA-256 promotion gate between the
  reviewed JSON snapshot and the runtime module.

## The trust model, in one paragraph

Every visible state says how the fact is known. `Observed` means an artifact was inspected,
`Claimed` means a publisher said so, `AI-inferred` and `Illustrative` mean exactly that — and
`Demo` profiles are fictional prototype entities, kept visibly separate from source-backed
projects. A project with one bounded record is described as having that record; it is never
"verified", "safe", "active", or endorsed. Sourced relationships require approved records and evidence IDs. The graph also contains
explicitly illustrative or AI-inferred edges; proximity and shared categories create no
factual relationship.
Sparse districts stay sparse: open space and an explicit coverage note are more truthful than
filler.

## Run it

Requires Node.js 18+. No installation step — there are no runtime dependencies.

```sh
npm run dev        # serves the app at http://localhost:5173
```

`npm run build` first verifies that the approved evidence snapshot byte-matches its promoted
runtime module (SHA-256 gate), then produces the static `dist/` bundle; `npm run preview`
serves that bundle.

## Optional AI setup

The full local discovery flow works without an API key. To exercise the agent, open **AI settings**
in the Navigator, enter an OpenAI-compatible endpoint, a tool-capable model, and your own key,
then choose **Save AI settings**. The provider must permit browser requests (CORS).

The current build was exercised with OpenRouter and `qwen/qwen3.8-max-0902`. This is an
implementation test, not confirmation of sponsor-bounty eligibility. The default fields point
to Qwen Cloud; availability and credentials depend on the provider.

The key is stored in this browser's localStorage and sent to the selected provider. Queries
and graph-tool results are sent there too. Do not put a shared key in the source, build,
repository or submission. A judge can inspect local retrieval immediately and use their own
provider key to reproduce the agent path.

The agent can call `search_projects`, `get_project_evidence`, `get_project_relationships`, and
`get_district_coverage`, within six completion rounds. Its final answer selects retrieved,
eligible records or reports an evidence gap. Provider failure preserves the local result.

## Verify and review

```sh
npm run test:ai    # 19 bounded provider-fixture and dataset tests; no external requests
npm run build     # evidence promotion gate, then static output
npm run preview   # serves the built version locally
```

- [Submission package](docs/SUBMISSION_PACKAGE.md): paste-ready project copy and release checklist.
- [Demo script](docs/DEMO_SCRIPT.md): screen actions and spoken narration.
- [AI implementation note](docs/QWEN_BUILD_NOTES.md): actual agent design and limitations.
- [QA report](docs/QA_REPORT_2026-10-08.md) and [visual polish](docs/UI_POLISH_2026-10-08.md).

## Routes

| Route | What it shows |
| --- | --- |
| `#/city` | the full archipelago |
| `#/district/defi/overview` | DeFi world — Overview |
| `#/district/<slug>/projects` | project index with type filters |
| `#/district/<slug>/relationships` | relationship subgraph + external endpoints |
| `#/district/<slug>/evidence` | exact evidence records (only for districts with source-backed records) |

Slugs: `defi`, `infrastructure`, `ai`, `gaming`, `identity`. Browser Back restores the previous
city camera.

## How evidence gets in

Ecosystem evidence is loaded from a checked-in snapshot. The optional AI provider receives
queries and local tool results at runtime; it does not refresh or discover ecosystem data.
External evidence enters through a build-time, review-gated pipeline:

```text
seed captures (DefiLlama, Monad App Portal)  →  intake + identity resolution  →  draft
evidence records  →  human review (npm run evidence:review)  →  versioned snapshot
(npm run evidence:snapshot)  →  SHA-256 promotion (npm run evidence:promote)  →  the city
```

Research artifacts live in `data/research/`, snapshots in `data/evidence-snapshots/`, and the
active runtime module in `src/evidence-snapshots/`. `npm run build` re-verifies the promotion
on every run. The current snapshot (`phase-3.5-v6`) carries 193 approved evidence records
covering 172 of the 176 displayed projects, plus 6 sourced relationships. The hybrid graph
contains 17 edges in total; the other 11 are illustrative, declared patterns, or AI-inferred.

## Project layout

```text
index.html                 shell
src/main.js                app shell, routing, district worlds, passport, navigator UI
src/city3d.js              Three.js voxel archipelago (single shared scene)
src/districts.js           district configuration + pure data selectors
src/retrieval.js           deterministic navigator retrieval
src/ai.js                  optional provider agent, local tools, evidence-selection validation
src/assets/fonts/          self-hosted Instrument Sans and license
src/data.js                hybrid dataset (sourced + labeled illustrative)
src/evidence.js            active snapshot import, contract validation, governance
src/evidence-snapshots/    promoted runtime modules (one per version)
data/evidence-snapshots/   reviewed JSON snapshots (the promotion authority)
data/research/             seed captures and intake artifacts (never fetched by the browser)
scripts/                   build, evidence workflow, intake, and research tooling
docs/                      specifications, trust model, runbooks, worklog
```

## Documentation

- [AGENTS.md](AGENTS.md) — invariants and agent workflow
- [Product Spec](docs/PRODUCT_SPEC.md) · [Project Context](docs/PROJECT_CONTEXT.md)
- [Trust Model](docs/TRUST_MODEL.md) · [Evidence Data Contract](docs/EVIDENCE_DATA_CONTRACT.md)
- [Evidence Snapshot Workflow](docs/EVIDENCE_SNAPSHOT_WORKFLOW.md)
- [District Experience Spec](docs/DISTRICT_EXPERIENCE_SPEC.md)
- [Visual Direction](docs/VISUAL_DIRECTION.md) · [Voxel Island Spec](docs/VOXEL_ISLAND_SPEC.md)
- [AI Navigator](docs/AI_NAVIGATOR.md) · [Ecosystem Scale Plan](docs/ECOSYSTEM_SCALE_PLAN.md)
- [Worklog](docs/WORKLOG.md) — the full build history

## Status and honest limitations

- This is a curated, review-gated prototype: it covers the portion of the ecosystem that
  passed the inclusion bar at capture time, not the whole ecosystem.
- Most evidence records are directory/registry listings — they prove listing and (where
  verified) deployment, not activity, safety, or legitimacy. Relationship coverage is
  intentionally thin: 6 sourced edges are distinguished from 11 illustrative or inferred edges.
- City placement, building heights, and sizes are illustrative layout, never a ranking.
- No application backend, wallet flow, live blockchain feed, indexer, crawler, document RAG,
  or model training is implemented. The Node server serves static files. Optional AI calls
  go directly from the browser to a user-configured provider. A source record does not
  establish present activity, safety, legitimacy or endorsement.
