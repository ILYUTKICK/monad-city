# Phase 3.7 Evidence Governance QA — 2026-09-23

## Verdict

**PASS.** Phase 3.7 is ready for the constrained hackathon demo. The governance companion is bound
to the unchanged approved v2 projection, the release report is deterministic, and the UI makes
cadence/review metadata visible without promoting it into endorsement, authentication, source
truth, or a project-wide trust claim.

This QA pass changed only this report. It did not modify runtime code, evidence data, snapshots,
governance inputs, scripts, package configuration, Worklog, or other documentation.

## Contract and workflow verification

- `node --check` passed for `scripts/evidence-workflow.js`, `src/evidence-contract.js`,
  `src/evidence.js`, `src/evidence-governance/phase-3.5-v2.review.generated.js`, and
  `src/main.js`.
- The retained fixture suite passed:
  `node /tmp/monad-city-phase-3.7-workflow/generate-and-test.mjs <project-root>`.
  It covered approved/current and due results, equality-at-boundary behavior, `quality.stale`,
  rejected, unavailable, conflict, missing reviewer metadata, invalid policy/timestamp/reason/
  binding/coverage inputs, relationship evidence capping, future inline metadata, and refusal to
  silently overwrite an existing input/output.
- Checked-in governance validation at `2026-09-23T00:00:00Z` passed with policy
  `phase-3.7-review-policy-v1`, 28 governed subjects (22 evidence and 6 relationships),
  **28 current / 0 due**, and v2 SHA-256
  `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.
- At the exact boundary `2026-10-09T07:43:40Z`, validation reported **18 current / 10 due**.
  `monad-pyth-002` became due at that instant with
  `dueBasis: supporting-evidence:E-PYTH-MEM-001`, confirming the earlier supporting-evidence cap.
- A future `governance-check --strict` exited with status 2. SHA-256 values for the v2 snapshot,
  JSON governance companion, promoted evidence module, and promoted governance module were
  identical before and after all governance checks; no input was mutated.
- The checked-in governance JSON is byte-identical to the retained fixture artifact
  `/private/tmp/monad-city-phase-3.7-workflow/phase-3.5-v2.review.json`. Recursive canonical
  comparison also confirmed semantic equality with
  `src/evidence-governance/phase-3.5-v2.review.generated.js`.
- `npm run evidence:verify-promotion` passed for active v2: 22 approved records, 6 approved
  relationships, deep-frozen runtime output, and the canonical v2 SHA-256 above.
- Direct v1 rollback verification passed for the preserved pair: 23 approved records, 6 approved
  relationships, SHA-256
  `a26c65fafbb030b85bd427ddb3e25c9727958b2142510205478da97971e6d5ea`.
- Runtime assertions passed: active `phase-3.5-v2` exposes only approved evidence/relationships;
  each relationship evidence ID resolves to active approved evidence; the governance release report
  is 28 current / 0 due; and the built-in governance fixture assertions pass.
- `npm run build` passed, including the existing v2 promotion verifier.

## State-separation assessment

The active projection contains no workflow `rejected`, `stale`, or unavailable-review decision;
those states were therefore not invented in active data or rendered as though they existed. The
retained contract/workflow fixtures validate their distinct failure and reporting paths instead.

The active Passport does visibly retain evidence-payload quality warnings where applicable:

- Kuru records show `CONFLICT` and `INCOMPLETE` while remaining approved for their exact bounded
  historical/source scopes.
- Pyth records show `CONFLICT`, `INCOMPLETE`, and `STALE` as quality warnings while their snapshot
  review remains approved and governance is currently due/not-due only according to the fixed
  release as-of instant.

This confirms `reviewDue`, quality stale, explicit workflow `reviewStatus: stale`, rejection,
unavailability, and conflict remain separate concepts. Only recorded human review decisions alter
workflow status.

## Browser QA

The `agent-browser` executable was unavailable, so browser QA used the local CUA browser
automation fallback. A local `npm run dev` server was started at `http://localhost:5173/` for the
test and stopped afterwards.

### Desktop — 1280 x 720

- Loaded City and Graph modes; Graph focus used the selected state correctly.
- DeFi filtering produced `DeFi · 3 in view`; exactly three visible buildings were keyboard
  focusable. Enter on Kuru selected its Passport.
- The Passport rendered policy `phase-3.7-review-policy-v1`, fixed as-of
  `2026-09-23T00:00:00Z`, and `28 review current · 0 due across 28 governed subjects`.
  Per-evidence cadence, current state, next review, legacy review-action metadata, source,
  publisher, provenance, scope, and limitations remained visible.
- The reviewer disclaimer explicitly says the legacy metadata is not authentication, source truth,
  freshness proof, endorsement, safety, legitimacy, activity, or onchain verification.
- Kuru evidence exposed current `E-KURU-MEM-002` and withheld stale predecessor
  `E-KURU-MEM-001`. Both a limited sourced relationship and an illustrative Demo relationship
  rendered as distinct relationship modes.
- Navigator `Show Kuru sources` expanded to the five active approved Kuru citations, including
  `E-KURU-MEM-002` and excluding `E-KURU-MEM-001`. `Who’s connected to Monad?` focused the
  `monad-kuru-002` edge in Graph view with source-observed evidence state.
- Pyth Passport displayed active quality stale/conflict/incomplete warnings without relabeling the
  snapshot review decision.
- `safety endorsement` returned `UNSUPPORTED REQUEST`; `quantum teleportation` returned
  `NO RESULT`. Both retained the pre-existing Graph view and selected Monad relationship-focus
  context.
- No JavaScript dialog, console warning/error, or horizontal overflow
  (`scrollWidth/clientWidth = 1280/1280`) occurred.

### Mobile — 390 x 844

- Responsive City, Passport, and Navigator content rendered at the required viewport with no
  horizontal overflow (`390/390`), JavaScript dialog, console warning, or console error.
- DeFi filtering again exposed exactly three focusable buildings. Keyboard Enter selected Kuru;
  its Passport retained the policy/as-of and 28-current/0-due summary, current
  `E-KURU-MEM-002`, and no stale predecessor.
- Graph switching worked. Turning relationships off removed all 17 rendered links; turning it on
  restored all 17.
- Source/publisher/provenance/limitations, the legacy reviewer-action disclaimer, sourced edges,
  and Demo/illustrative edges all remained distinguishable in the narrow layout.

## Scope and known limitation

- No new project/entity/data claim, backend, wallet flow, crawler, indexer, external LLM, live
  source fetch, or automatic stale-status mutation was introduced. The runtime remains the
  dependency-free, static, manual, source-bounded prototype.
- Known limitation confirmed: `npm run build` invokes promotion verification but does not itself
  invoke `evidence:governance` or compare the governance JSON companion with the governance runtime
  module. Runtime validation fails closed on a malformed/mismatched companion, and this pass
  independently ran the governance check plus byte/semantic JSON-to-module comparisons. Keep those
  checks in the promotion/review checklist until a deliberately scoped build-gate decision is made.

## Readiness and next task

The demo is ready to present its reviewed v2 evidence slice: it shows exact source scope and
governance cadence while preserving the explicit Demo boundary and without implying endorsement or
global verification.

Recommended next task: run a deliberately human-reviewed cadence refresh rehearsal for the existing
six entities, recording explicit decisions in a new immutable artifact and repeating this QA matrix.
Do not start Phase 4 or expand into automatic ingestion.
