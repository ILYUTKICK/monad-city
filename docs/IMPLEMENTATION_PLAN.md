# Monad City — Implementation and Agent Plan

## Work order

### Phase 0 — Visual clarity

Owner: UX/Visual agent

- reduce panel and map noise;
- make selected state dominant;
- simplify legend and metrics;
- improve mobile order;
- preserve current interactions.

Exit criteria: a first-time user understands the page in five seconds.

### Phase 1 — Truthful static MVP

Owner: Trust/Data + Frontend agents

- replace ambiguous trust copy;
- add explicit Demo mode;
- introduce typed relationship objects;
- add evidence placeholders with source, timestamp, and scope;
- make Passport sections reflect the trust model.

Exit criteria: no UI claim can be mistaken for real verification.

### Phase 2 — Grounded Navigator

Owner: AI agent + Frontend agent

- implement one real retrieval path over the curated dataset;
- return selected projects and evidence;
- focus the map after a query;
- show uncertainty and no-result behavior.

Exit criteria: “Find AI projects with active contracts” produces a grounded, visible result.

### Phase 3 — Real Monad data

Owner: Trust/Data agent

- choose a small set of reliable data sources;
- ingest project metadata and selected events;
- create source timestamps;
- validate entity identity and contract mapping.

Exit criteria: at least five projects have non-illustrative evidence.

### Phase 3.5 — Review-gated evidence snapshots

Owner: Trust/Data + Workflow/Architecture + Frontend agents

- maintain proposed, needs-review, approved, rejected, and stale review states;
- validate immutable evidence revisions and relationship references;
- generate approved-only local snapshots;
- expose snapshot and review metadata without changing claim semantics.

Exit criteria: only approved records can reach the source-backed view and the full workflow remains local and dependency-free.

### Phase 3.6 — Checked-in snapshot promotion

Owner: Trust/Data + Workflow/Architecture

- store the approved JSON snapshot as a versioned review artifact;
- require exact version, review timestamp, and canonical SHA-256 confirmation before promotion;
- generate a new immutable, version-named runtime module without overwriting prior versions;
- make the active runtime version an explicit reviewed import;
- fail the build when JSON and runtime artifacts differ.

Exit criteria: the reviewed snapshot is reproducibly promoted into runtime and drift is rejected before build output is produced.

### Phase 3.6 operational milestone — Controlled evidence refresh cycle

Owner: Source Research/Trust + Evidence Workflow + Runtime Integration + QA agents

- manually recheck only the existing six-entity source-backed subset;
- record a decision for every prior approved record;
- use immutable successor IDs and explicit stale/rejected history;
- promote a new versioned approved-only snapshot with deterministic SHA-256 verification;
- preserve the prior snapshot pair for explicit rollback;
- repeat the full desktop and narrow responsive regression suite.

Status: completed with active snapshot `phase-3.5-v2` (22 approved evidence records, 6 sourced
relationships) and preserved `phase-3.5-v1` rollback artifacts.

Exit criteria: the refresh diff is explainable, no evidence is silently overwritten, the active
runtime and rollback pair both verify, and browser QA passes without expanding the six-entity
boundary.

### Phase 3.7 — Evidence governance and review policy

Owner: Governance/Trust + Evidence Workflow + Runtime/UI + QA agents

- apply versioned policy `phase-3.7-review-policy-v1` to the immutable active snapshot through an
  exact version/hash/reviewedAt-bound companion;
- define deterministic review cadence for evidence and relationships, including warning-based
  accelerators and evidence-capped relationship deadlines;
- distinguish review due, stale quality, stale review status, rejected, unavailable, incomplete,
  and conflicting states without automatic status mutation;
- require controlled reviewer-action metadata while making its non-authentication and
  non-endorsement meaning explicit;
- validate complete subject coverage locally with an explicit canonical UTC `asOf` and strict
  release-check behavior;
- expose policy version, release time, current/due state, next review, provenance, and conservative
  semantics in Passport and Navigator without changing the city hierarchy.

Status: completed for active snapshot `phase-3.5-v2`. Its governance release covers 22 evidence
records and 6 relationships; all 28 subjects are current at `2026-09-23T00:00:00Z`, with the first
review due at `2026-10-09T07:43:40Z`.

Exit criteria: every active evidence record and sourced relationship has a validated review
decision and cadence; due dates are deterministic and never silently mutate evidence state; the
runtime fails closed on incompatible governance; desktop/mobile browser QA and build pass.

### Phase 4 — Claim flow

Owner: Frontend + Trust/Data agents

- wallet sign-in;
- project claim message;
- claim status in Passport;
- clear separation between wallet control and project legitimacy.

Exit criteria: a founder can claim a project without the UI overstating what the claim proves.

Status: deferred. Do not start without an explicit scope and trust-model decision after the
bounded governance workflow remains stable through a real human-reviewed cadence refresh.

## Parallel workstreams

### Product agent

Owns `docs/PROJECT_CONTEXT.md`, `docs/PRODUCT_SPEC.md`, and decisions about scope.

### Visual agent

Owns `docs/VISUAL_DIRECTION.md` and `src/style.css`.

### Trust agent

Owns `docs/TRUST_MODEL.md` and data/evidence structures in `src/main.js` when assigned.

### AI agent

Owns `docs/AI_NAVIGATOR.md` and Navigator retrieval behavior.

### Frontend agent

Owns UI behavior and integration after product/data contracts are approved.

### QA agent

Owns browser verification, accessibility checks, responsive checks, and regression notes.

## File ownership rule

Only one agent edits a file at a time. Documentation changes should land before implementation changes when they alter product semantics. If two workstreams need the same file, the Trust/Data contract lands first, then Frontend integration.

## Definition of done

- behavior matches the relevant spec;
- visual hierarchy is calmer than the current prototype;
- evidence semantics are explicit;
- no unsupported claims are introduced;
- `npm run build` passes;
- main browser flows are verified;
- `docs/WORKLOG.md` records the handoff.
