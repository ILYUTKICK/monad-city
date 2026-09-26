# Phase 5 kickoff prompt (paste into the next agent session)

The text below is the ready-to-paste kickoff prompt for the next working session. It is
self-contained: it tells the agent what to read, what to build, the rules, and the commit
discipline.

---

You are the lead agent for **Monad City** (repo: https://github.com/ILYUTKICK/monad-city,
branch `main`, remote `origin` already configured). The product is a source-grounded,
AI-readable graph of the Monad ecosystem rendered as a 3D voxel island (three.js City View,
SVG Graph View). The owner has approved Phase 5: scaling the map to the full Monad ecosystem.

## Mandatory reading (in this order, before any edit)

1. `AGENTS.md` — repo rules, invariants, agent roles, model routing, handoff protocol
2. `docs/PROJECT_CONTEXT.md` — what the product is and is not
3. `docs/PRODUCT_SPEC.md` — user journeys, MVP scope, acceptance criteria
4. `docs/ECOSYSTEM_SCALE_PLAN.md` — the Phase 5 master plan (your mission is Phase 5.0)
5. `docs/PROJECT_INTAKE_PIPELINE.md` — the runbook your tooling must implement
6. `docs/EVIDENCE_DATA_CONTRACT.md` and `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md` — the review and
   promotion gates you must not bypass
7. `docs/WORKLOG.md` — read the last three entries (voxel island v2.1.1 rework and Phase 5
   planning)

## Mission: Phase 5.0 — intake tooling (three stages, one commit per stage)

Every stage ends with a commit to `main` and a push to `origin`. A stage is not done until it
is committed. Use short conventional commit messages prefixed `phase5:`. Run
`npm run build` before every commit — it must stay green (it verifies the evidence snapshot
SHA-256 gate).

### Stage 1 — seed artifacts
- `data/research/defillama-monad-<today>.json`: fetch `https://api.llama.fi/protocols` with a
  Node script, filter entries where `chain` includes `"Monad"`, keep name / symbol / category /
  site / address fields. Fetching happens in build-time tooling only, never in the browser.
- `data/research/monad-app-portal-<today>.json` (or `.md`): capture the app list from
  `https://app.monad.xyz/` — name, tagline, category tags, links. The page is server-rendered,
  so the content is parseable without executing JS. This is the official directory signal.
- `data/research/README.md`: rules for dating artifacts and adding new sources.
- Commit: `phase5: seed artifacts (defillama + app portal export)`.

### Stage 2 — intake script
- New file `scripts/ecosystem-intake.js` (Node, dependency-free, consistent with the repo's
  no-bundler/no-runtime-fetch rules): reads the seed artifacts, dedupes by domain / alias /
  address, applies the inclusion bar from the scale plan §3 (verifiable Monad deployment +
  independent source; no bare tokens), drafts project manifests per
  `docs/EVIDENCE_DATA_CONTRACT.md`, and writes `data/research/proposals-draft-<date>.json`.
- It must NOT write to `data/evidence-snapshots/*` or `src/evidence-snapshots/*`, and must not
  fetch anything at runtime.
- `npm run evidence:validate` and `npm run build` must pass.
- Commit: `phase5: ecosystem-intake skeleton`.

### Stage 3 — dry run + handoff
- Run the script and produce at least 10 valid draft proposals for NEW projects (the current
  city already has 10 — Kuru, aPriori, Magma, Switchboard, Pyth, Talus, Nad Arcade, Pixel
  Forge, Moca, Monad). Save the draft plus an identity/dedupe report into `data/research/`.
- Do NOT promote anything into the active snapshot. Phase 5.0's exit criterion is a clean dry
  run, not a promotion.
- `docs/WORKLOG.md` handoff entry per the AGENTS.md template, then commit
  `phase5: dry-run 10 draft proposals + worklog` and push.

## Non-negotiable rules

- AGENTS.md invariants hold: no backend, no wallet flows, no runtime fetching; trust states
  Observed / Claimed / Attested / AI-inferred stay distinct; nothing drafted is ever presented
  as approved.
- Exact claim sentences from approved snapshots are never reworded.
- Drafted claims without a human-checkable exact source stay out of any future snapshot.
- One agent owns a file at a time; state which files you own before editing.
- If Stage 3 completes cleanly, STOP and hand off: Batch 1 (30 real projects) requires a human
  review window; do not self-approve proposals into the snapshot.

## Stretch (only after Stage 3, separate commits, separate tasks)

- v2.2 visual backlog: relationship hover tooltip on beams; fix the view-toggle clip at 390px;
  district ground-label occlusion.
- Mark each stretch item with its own commit (`v2.2: ...`).

## Environment notes

- Workspace may not be a fresh clone — if `origin` is missing, add
  `https://github.com/ILYUTKICK/monad-city.git`. Never force-push.
- `dist/` is gitignored build output; the QA server for a built copy is
  `npm run build && npm run preview`.
- GitHub account: ILYUTKICK. Public repo — anything committed is visible.
