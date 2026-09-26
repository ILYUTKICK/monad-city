# Monad City — External Agent Handoff

## Status

Monad City is a dependency-free static vanilla JavaScript/CSS prototype. It is ready to run from
source or from the built `dist/` directory. The current implementation is Phase 3.7: a restrained
City/Graph interface over a hybrid evidence graph with deterministic local Navigator retrieval, a
review- and promotion-gated evidence snapshot, one completed controlled refresh cycle, and a
versioned evidence-governance policy with deterministic review cadence.

This repository is not a metaverse, generic 3D directory, production backend, live indexer, wallet
application, or generic chatbot.

## Start here

Read these files before changing anything:

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/TRUST_MODEL.md`
5. `docs/AI_NAVIGATOR.md`
6. `docs/EVIDENCE_DATA_CONTRACT.md`
7. `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`
8. `docs/IMPLEMENTATION_PLAN.md`
9. `docs/WORKLOG.md`

The product and trust constraints in those documents are part of the implementation contract.

For a portable external handoff, use `monad-city-zai-handoff-2026-09-23.zip`; it contains this
Phase 3.7 state and excludes Git history, local dependencies, logs, and nested archives.

## Run and verify

Requires Node.js 18 or later. There are no package dependencies to install.

```sh
npm run dev
```

Open `http://localhost:5173/`.

```sh
npm run build
```

`build` first verifies the approved JSON/runtime evidence pair and then recreates `dist/`.

The expected active snapshot is:

- version: `phase-3.5-v2`;
- created/reviewed: `2026-09-22T22:02:32Z`;
- evidence records: 22 approved records;
- sourced relationships: 6 approved relationships;
- curated entities: 6;
- canonical SHA-256: `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.

Its compatible governance release is:

- policy: `phase-3.7-review-policy-v1`;
- companion: `data/evidence-governance/phase-3.5-v2.review.json`;
- deterministic `asOf`: `2026-09-23T00:00:00Z`;
- governed subjects: 22 evidence records and 6 relationships;
- current/due at that release instant: 28 current, 0 due;
- earliest next review: `2026-10-09T07:43:40Z`.

## Current product truth

- Ten project buildings and five districts are visible.
- The graph contains 17 active relationships: six source-backed relationships replace or extend
  the original Demo graph, while the remaining edges stay explicitly illustrative.
- The six source-backed entities are Monad, Kuru, aPriori/Capricorn, Magma, Switchboard, and Pyth.
- Navigator search is deterministic and local. It supports projects, categories, capabilities,
  relationships, evidence filters, uncertainty, insufficient-evidence, unsupported, and no-result
  states.
- Project profile copy, city placement, and project-state patterns remain Demo unless an exact
  evidence record supports the displayed claim.
- Approval means only that an exact record may appear in the source-backed snapshot. It is not a
  claim that a project is verified, safe, legitimate, active, current, or endorsed by Monad.
- Review metadata describes a bounded maintainer action only. It does not authenticate the
  reviewer or prove source truth, freshness, identity, endorsement, safety, legitimacy, activity,
  or onchain validity.
- A due review is shown as `reviewDue`; elapsed cadence never silently changes evidence to `stale`.

## Key files

- `src/main.js` — UI state, SVG City/Graph rendering, Navigator and Passport integration.
- `src/style.css` — responsive visual system.
- `src/retrieval.js` — deterministic grounded retrieval.
- `src/data.js` — project records and Demo/sourced hybrid relationship assembly.
- `src/evidence-contract.js` — review and immutable-revision contract.
- `src/evidence.js` — active snapshot import plus evidence invariants and compatibility exports.
- `src/evidence-governance/phase-3.5-v2.review.generated.js` — runtime governance companion.
- `data/evidence-snapshots/phase-3.5-v2.json` — active approved checked-in review artifact.
- `data/evidence-governance/phase-3.5-v2.review.json` — checked-in review policy and decisions bound
  to the exact active snapshot version, review timestamp, and digest.
- `src/evidence-snapshots/phase-3.5-v2.generated.js` — active promoted runtime artifact.
- `data/evidence-snapshots/phase-3.5-v1.json` and
  `src/evidence-snapshots/phase-3.5-v1.generated.js` — preserved rollback pair.
- `scripts/evidence-workflow.js` — local review, snapshot, promotion, and verification CLI.
- `docs/research/PHASE_3_SOURCE_MATRIX.md` — bounded research/source matrix.
- `docs/research/PHASE_3_EVIDENCE_REFRESH_2026-09-22.md` — per-record refresh decisions that led
  to active v2.
- `docs/qa/phase-3.5-v2-refresh-regression-2026-09-23.md` — final v2 static/browser QA report.
- `docs/qa/phase-3.7-evidence-governance-2026-09-23.md` — governance validator, runtime, and browser
  QA report.

## Evidence workflow

Useful commands:

```sh
npm run evidence:export -- --out /tmp/evidence-workspace.json
npm run evidence:validate -- --workspace /tmp/evidence-workspace.json
npm run evidence:inspect -- --workspace /tmp/evidence-workspace.json --id E-KURU-CAP-001
npm run evidence:load -- --snapshot data/evidence-snapshots/phase-3.5-v2.json
npm run evidence:verify-promotion
npm run evidence:governance -- --snapshot data/evidence-snapshots/phase-3.5-v2.json --governance data/evidence-governance/phase-3.5-v2.review.json --as-of 2026-09-23T00:00:00Z
```

Add `--strict` when a due subject should stop a release check. A valid governance file with one or
more due subjects exits with status 2 in strict mode; invalid governance exits with status 1. The
command is read-only and never changes review state.

Before promoting a future approved snapshot:

1. retain the prior candidate workspace;
2. inspect every changed source, scope, provenance field, quality flag, and limitation;
3. approve/reject records explicitly;
4. generate an approved-only snapshot with a new version;
5. inspect `evidence:diff`;
6. copy the exact version, `reviewedAt`, and canonical SHA-256 from `evidence:load` into
   `evidence:promote`;
7. check in the versioned JSON and generated module;
8. update the explicit active import, metadata constants, and verifier paths in code review;
9. create or update the version-bound governance companion with complete evidence and relationship
   coverage, then run `evidence:governance` with an explicit canonical UTC `asOf`;
10. run `npm run build` and browser QA.

Promotion never fetches sources, approves records, overwrites an existing artifact, or switches the
runtime automatically.

## Non-negotiable guardrails

- Keep Observed, Claimed, Attested, AI-inferred, and Demo states distinct.
- Every source-backed relationship must reference approved evidence IDs.
- Never treat directory inclusion or project documentation as onchain verification or Monad
  endorsement.
- Never hide stale, incomplete, conflicting, or unavailable quality states.
- Keep `reviewDue`, `quality.stale`, review-status `stale`, rejected candidates, unavailable
  sources, and conflicting sources as separate conditions.
- Never infer reviewer identity, authority, or endorsement from review metadata.
- Do not add a backend, wallet, live blockchain/API connection, crawler, automatic discovery, or
  external LLM unless a later task explicitly changes scope.
- Preserve the dependency-free stack, current interactions, English UI copy, and city-first visual
  hierarchy.

## Verified baseline

- `npm run build` passes with the promotion verifier enabled.
- Governance validation passes for all 28 active subjects at the fixed release `asOf`; the exact
  due boundary and strict future-due exit behavior are covered by deterministic fixtures.
- Desktop 1280 × 720 and mobile 390 × 844 browser flows pass.
- City/Graph, district filter, search, keyboard selection, Passport, Navigator citations,
  relationship focus, Demo fallback, uncertainty, and no-result preservation pass.
- No browser console warnings/errors or page-level horizontal overflow were found.
- No credentials, API keys, private keys, or access tokens are required or stored in the project.

## Known limitations

- The evidence snapshot is static and was reviewed on September 22, 2026; individual source
  retrieval timestamps remain record-specific.
- Only six entities have source-backed records.
- Canonical SHA-256 proves local artifact equality, not reviewer identity or source truth/freshness.
- `npm run build` verifies the evidence snapshot/runtime pair but does not yet invoke the governance
  CLI or compare the governance JSON with its generated runtime module. The runtime validates the
  companion fail-closed, and both representations were checked independently in Phase 3.7 QA.
- Review workspaces must be retained separately because a fresh export starts from approved runtime
  and does not contain rejected or pending history.
- There is no Git history in the supplied folder unless the recipient initializes or imports it
  into a repository.

## Recommended next task

Run a human-reviewed cadence refresh rehearsal at the first due boundary: inspect the affected
sources, record explicit decisions and reasons, generate a successor governance/snapshot release,
and repeat diff, promotion, rollback, and browser-QA gates. Do not begin Phase 4, automatic
ingestion, or broader ecosystem discovery without an explicit scope decision.
