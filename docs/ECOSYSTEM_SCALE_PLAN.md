# Monad City — Ecosystem Scale Plan (Phase 5)

Status: proposed 2026-09-27, owner-approved direction ("расширить карту до полной экосистемы
монад, со всеми связями"). This document defines what scaling to the full Monad ecosystem means,
what is and is not feasible, and the phased path. It extends `docs/IMPLEMENTATION_PLAN.md`
(Phases 0–4) with Phase 5 and stays inside the AGENTS.md invariants: no runtime backend, no
wallet flows, no live pipeline — unless a future owner decision explicitly changes that.

## 1. Feasibility verdict

**Yes — with three separate answers, because "full ecosystem with all relationships" is really
three different problems:**

| Problem | Verdict | Why |
| --- | --- | --- |
| Rendering 300+ buildings and their relationships | **Feasible, low risk** | Buildings are already instanced meshes; 300–600 boxes with one light is trivial for three.js. The real work is label density (LOD) and district layout. |
| Getting 300+ honest project profiles | **Feasible, medium effort** | A build-time intake pipeline (§4) turns public directories into draft manifests; the existing review/promotion workflow (`scripts/evidence-workflow.js`, phase-3.6/3.7 gates) scales to hundreds of records. Human review throughput is the bottleneck — mitigated by batching (§5). |
| "All relationships" verified onchain for every project | **NOT feasible statically — reframe** | Live verification of every integration requires an indexer/backend, which is out of scope by invariant. The honest scope: every relationship that has a citable source (docs, registry, attestation) becomes a typed edge; everything else is either an owner claim or an explicitly dashed AI-inferred suggestion. |

Scale reality (researched 2026-09-27): Monad mainnet launched 2025-11-24; ~150 ecosystem projects
at launch; 300+ projects reported by late 2025/2026 (DeFi, NFT, RWA, analytics, security,
infrastructure). Most are multichain expansions; only a small minority is Monad-native. The
300+ figure includes noise (farm tokens, dormant forks) — hence the inclusion bar in §3.

## 2. Architecture decision (unchanged invariants)

- The city keeps rendering from **checked-in, review-gated snapshots**. Expansion is a
  **build-time pipeline**: external data is fetched during research/tooling runs, drafted into
  evidence proposals, human-reviewed, and promoted as a new versioned snapshot. Nothing fetches
  at runtime.
- The runtime stays dependency-free vanilla JS + vendored three.js. DefiLlama/API access happens
  in Node scripts under `scripts/`, never in the browser.
- Identity, review states, governance cadence, and SHA-256 promotion are reused as-is
  (`EVIDENCE_DATA_CONTRACT.md`, `EVIDENCE_SNAPSHOT_WORKFLOW.md`, phase-3.7 policy).

## 3. Project identity and inclusion bar (the anti-noise rule)

At 300+ candidates, identity resolution is the first-class problem. Rules:

1. **Primary identity key**: the Monad mainnet deployment (contract address or verified
   deployment record) resolvable on an explorer. Projects without any Monad deployment are
   listed as *pending* and do not enter the city.
2. **Inclusion bar** (all three):
   - deployment resolvable (explorer or DefiLlama listing with the Monad chain tag);
   - at least one independent source (official Monad directory, DefiLlama, project docs, GitHub);
   - not a bare token with no application surface (farm/duplicate tokens are excluded).
3. **Dedup rule**: one project = one manifest, even when it has multiple deployments; aliases
   (legacy names, ticker symbols) recorded in the manifest, not as separate entities.
4. City placement coordinates remain **illustrative layout** unless a sourced fact justifies
   otherwise (placement never encodes endorsement or ranking).

## 4. Intake pipeline (build-time)

Detailed runbook: `docs/PROJECT_INTAKE_PIPELINE.md`. Summary:

```
seed lists (checked-in research artifacts)
  ├─ DefiLlama api.llama.fi/protocols filtered by chain "Monad"  (TVL, categories, URLs)
  ├─ official Monad ecosystem directory export
  └─ manual submissions / research notes
        ↓
scripts/ecosystem-intake.js  (new, Node, build-time only)
  ├─ dedupe + identity resolution (explorer check)
  ├─ draft project manifests (schema per EVIDENCE_DATA_CONTRACT.md)
  ├─ draft relationship candidates (docs/references between projects)
  └─ emit evidence-workflow proposals
        ↓
human review (existing states: proposed → approved/rejected/stale)
        ↓
evidence:promote → new versioned snapshot (SHA-256 gate) → city + Navigator
```

LLM assistance is allowed for **drafting** (summarizing docs into claim candidates) under the
AI-inferred/illustrative labels; an approved record always requires a human-checked exact source.
Drafted claims that cannot be source-checked stay out of the snapshot.

## 5. Phases and exit criteria

### Phase 5.0 — Intake tooling
- `scripts/ecosystem-intake.js` skeleton; seed-list exports checked into `data/research/`;
  identity/dedupe rules implemented; proposal emitter wired to the evidence workflow.
- **Exit**: one end-to-end dry run produces valid proposals for 10 new projects without
  touching the active snapshot.

### Phase 5.1 — Batch 1: 30 projects
- Top 30 by activity/TVL + official-directory presence; ≥1 approved evidence record each;
  relationship candidates reviewed under the same gate.
- City renders 30 buildings; district capacity rebalanced; Navigator counts become
  data-driven (no hardcoded "six-entity" wording; `src/retrieval.js` copy pass).
- **Exit**: 30 projects live, build + QA pass, governance cadence covers all new records.

### Phase 5.2 — Batch 2: 100+
- Label LOD lands (see §6); district layout becomes data-driven (zones from manifest district
  field, not hardcoded); search/filter tested at scale.
- **Exit**: 100+ projects, 60fps desktop rendering budget, review batch completed inside one
  governance window.

### Phase 5.3 — Full sweep toward the directory
- Everything passing the inclusion bar enters; quarterly refresh cycles reuse the phase-3.7
  cadence; stale entries decay visibly (existing stale states) instead of being silently kept.
- **Exit**: city population ≈ directory population that passes §3; a documented refresh runbook
  executed twice.

### Phase 5.4 — Optional runtime indexer (explicitly out of scope)
- Live onchain relationship verification would require a backend/indexer and an explicit
  AGENTS.md stack decision. Do not start without that decision. Everything until then is
  snapshot-based.

## 6. Rendering strategy at scale

- Buildings: already instanced → scale to 600+ instances trivially. Add per-district density
  grids (smaller footprints, taller cores) instead of one flat grid.
- **Label LOD**: at >40 buildings, show name pills only for selected / navigator matches /
  hovered / N largest per district; full labels return as the camera zooms in. District ground
  labels stay always-on.
- Filler fabric density scales down as real building density rises (VISUAL_SYSTEM rule: filler
  must never read as data).
- Relationship beams: >100 edges need opacity budgeting — class-colored but dimmer at rest,
  bright on selection/inspection; Graph View remains the analysis surface for dense edges.
- Performance budget: 60fps desktop at 300 buildings + 150 relationships; measure before and
  after each batch.

## 7. Navigator and content at scale

- `src/retrieval.js` answer templates must derive counts/coverage from the snapshot
  (no hardcoded subset wording).
- Suggested prompts and district list become data-driven from the snapshot.
- Uncertainty notes scale: "limited sourced subset" language switches to per-batch coverage
  stats (e.g., "38 of 214 shown projects carry source-backed records").

## 8. Trust model implications (unchanged invariants, new scale)

- Every new project enters as at best **Observed**; nothing enters as verified/endorsed.
- Relationships enter only as: source-observed, publisher-claimed, third-party-attested, or
  AI-inferred/illustrative — same three map classes, same review gates.
- The 300+ population makes per-project claims impossible to maintain continuously — the
  governance cadence (phase-3.7) is the mechanism that lets stale facts become visibly stale.
- "Full ecosystem" therefore means: *full coverage of entities that pass the inclusion bar, with
  relationships at the depth their sources support* — never an implication that everything on
  screen is verified.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Review throughput can't keep up with intake | Batch sizes (30 → 100 → full) sized to governance windows; intake tooling drafts, humans approve. |
| Duplicate/identity chaos (multichain projects, rebrands) | §3 identity key + alias recording; dedupe pass per batch. |
| Stale data at scale | Phase-3.7 cadence + visible stale states; refresh runbook executed per batch. |
| Rendering regressions at scale | Performance budget gate per batch (§6). |
| Scope creep into live indexing | Phase 5.4 stays closed without an explicit stack decision. |

## 10. Definition of done for Phase 5 (overall)

- City population matches the inclusion-bar filter over the best available directory snapshot.
- Every shown project has ≥1 approved-or-demo-labeled evidence record under the same gates as
  the current six.
- Relationship graph covers every sourced relationship found during intake.
- Navigator answers stay grounded and data-driven at any population.
- Build, governance release checks, desktop/narrow QA pass per batch; WORKLOG records each batch.
