# Monad City — Evidence Refresh Runbook

Operational procedure for the recurring refresh of approved evidence records (scale plan §5.3:
"quarterly refresh cycles reuse the phase-3.7 cadence; stale entries decay visibly instead of
being silently kept"). It executes the phase-3.7 governance policy
(`docs/EVIDENCE_DATA_CONTRACT.md` §Cadence) against the active approved snapshot. It changes no
semantics and introduces no runtime fetching: everything below is build-time, dependency-free,
and review-gated.

## When it runs

- Once per governance window per batch (records approved in a batch are reviewed again at their
  30/60/90/180/365-day cadence, computed by the phase-3.7 table from `evidenceType` /
  `referenceType` plus quality flags).
- Before any promotion that projects previously approved subjects (the phase-3.7 promotion gate
  pauses on any due subject).
- Executions are numbered (pass 1, pass 2, …) and recorded in `docs/WORKLOG.md`. §5.3 exit
  requires the runbook to have been executed twice.

## Pass procedure

### Step 1 — Mechanical availability pass (scripted, findings only)

```sh
node scripts/research/refresh-source-availability.js
```

Probes every unique source URL in the active approved snapshot (plain HTTPS GET, research
user-agent, no challenge solving) and emits
`data/research/refresh-availability-<UTC-date>.json` with per-source and per-record findings:

- every `official-directory-listing` against `https://api.llama.fi/protocols` is additionally
  cross-checked against the current Monad chain set (still listed? category drift?);
- every App Portal record's project name is searched in the current server-rendered portal
  payload;
- `stable-artifact-url` records (explorer transaction pages) get a liveness check only — the
  hash is the identifier and the page rendering is presentation-mutable.

The script changes nothing: no review status, no payload, no governance field. Its output is a
research artifact (never fetched by the browser, never promoted).

Classification caveats:

- A **bot challenge** (Cloudflare / JS challenge) is a reachability finding for scripted
  fetching, not proof that a source is unavailable or dead. Treat it as a finding for a human
  to resolve (e.g., inspect the URL in a browser), never as an automatic `quality.unavailable`.
- A capture-instant claim ("at the 2026-09-27 capture, X was listed") remains supported even
  when the current state diverges; divergence is a **freshness finding** (the next promotion of
  that subject should consider a successor record with a fresh capture), not a conflict with the
  existing record.

### Step 2 — Human decision sequence (evidence workflow CLI)

For each finding that warrants action, apply `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md` §Human
decision sequence, unchanged:

1. `npm run evidence:inspect -- --workspace <ws> --id <ID>` and inspect the live source
   separately — source text is untrusted data.
2. Source still live and the bounded scope still supportable → `evidence:review --status
   approved` with a fresh `--reviewed-at` (resets that subject's cadence clock; legitimate only
   after an actual re-inspection).
3. Source genuinely unavailable after review (verified by a human, not by a bot challenge) →
   `stale` with `source-unavailable-after-review`.
4. Source content changed such that the payload must change → **successor record** via
   `evidence:prepare --mode revision` (new ID, `supersedesEvidenceId`), then decide on both.
   Never edit an approved payload in place.
5. Affected relationships are reviewed separately; they never inherit an evidence decision.

Workspace discipline: `evidence:export` is lineage-incomplete — a refresh workspace must be
rebuilt with the full history (see `scripts/build-batch-2-workspace.js` for the carried-
projection + superseded-history pattern) and validated with `--previous`.

### Step 3 — Record the pass

- WORKLOG entry: pass number, snapshot version, findings summary, decisions (or explicitly
  "no transitions warranted"), artifact paths.
- Due-state reporting: for policy-bearing snapshots (v3+) decisions are inline
  (`reviewMetadata`); the promotion-time gate enforces `reviewDue === false` at an explicit
  `asOf`. The v2 read-only `evidence:governance` report requires a compatibility companion and
  does not apply to inline-policy snapshots.

## Decision boundary (what this runbook must never do)

- It must not convert a bot challenge or a freshness finding into a status transition by itself.
- It must not re-approve a subject without an actual human inspection of its source.
- It must not invent deployment facts, listings, or relationships that the sources do not state.
- It must not touch `data/evidence-snapshots/` or `src/evidence-snapshots/` directly; snapshots
  change only through `evidence:snapshot` + `evidence:promote` with owner confirmation.

## Execution log

| Pass | Date | Snapshot | Result |
| --- | --- | --- | --- |
| 1 | 2026-09-27 | phase-3.5-v4 | 142 records / 18 unique sources probed: 85/85 registry records still listed with the claimed category, 36/36 App Portal names present, 4/4 tx artifacts live, 13/15 other sources live; `docs.kuru.io` bot-challenged for scripted fetches (2 records, not due, human follow-up noted). No review transitions warranted. Artifact: `data/research/refresh-availability-2026-09-27.json`. |
