# Phase 3.5-v2 controlled-refresh QA report

Date: 2026-09-23  
Scope: read-only QA of the active v2 evidence refresh.  
Owner: QA. The only changed repository file is this report.

## Result: PASS

The UTC-display blocker was fixed without changing the v2 snapshot payload. In Europe/Moscow,
both the global city snapshot card and Project Passport card now render exactly:

`Created Sep 22, 2026, 22:02 UTC · reviewed Sep 22, 2026, 22:02 UTC`

for active snapshot `phase-3.5-v2`. The full acceptance-critical desktop and mobile browser flow,
plus workflow and runtime checks, passed. No UI or data files were modified by QA.

## Static and workflow checks passed

- `node --check src/evidence.js`
- `node --check src/evidence-snapshots/phase-3.5-v2.generated.js`
- `node --check src/data.js`
- `node --check src/retrieval.js`
- Candidate validation against a freshly exported v1 workspace:
  - 24 retained evidence records: 22 `approved`, 2 `stale` (`E-KURU-MEM-001`,
    `E-PYTH-CAP-001`)
  - 8 retained relationships: 6 `approved`, 2 `stale` (`monad-kuru`, `monad-pyth`)
  - approved projection: 22 records and 6 relationships
- `npm run evidence:verify-promotion` for v2: pass; `phase-3.5-v2`, reviewed
  `2026-09-22T22:02:32Z`, 22 records, 6 relationships, approved-only/deep-frozen, SHA-256
  `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.
- `npm run build`: pass, including its v2 promotion gate.
- Direct runtime assertions: 22 approved evidence records; 6 sourced relationships; 15 Demo
  fallback relationships; 17 unique active hybrid relationships; every sourced evidence ID
  resolves; no runtime record has a non-approved review status; neither stale predecessor appears
  in runtime.
- Independent rollback-pair check: `node scripts/evidence-workflow.js verify-promotion --snapshot
  data/evidence-snapshots/phase-3.5-v1.json --module
  src/evidence-snapshots/phase-3.5-v1.generated.js` passes with 23 records, 6 relationships, and
  SHA-256 `a26c65fafbb030b85bd427ddb3e25c9727958b2142510205478da97971e6d5ea`.

The active sourced relationship IDs are `monad-apriori`, `monad-magma`,
`monad-switchboard`, `magma-switchboard`, `monad-kuru-002`, and `monad-pyth-002`. Their resolved
exact evidence references include `E-KURU-MEM-002` and `E-PYTH-MEM-001`, with no stale record
exposed.

## Browser regression

The `agent-browser` CLI was unavailable (`command not found`). The completed browser regression
therefore used the local CUA browser automation fallback. No unbounded network-idle wait was used.

### Desktop: 1280 x 720

- Page title/body were meaningful; no Vite error overlay, console warning/error, JavaScript dialog,
  or horizontal overflow (`scrollWidth/clientWidth = 1280/1280`).
- Both snapshot cards show `phase-3.5-v2` and the exact UTC display above. The global hybrid label
  and Project Passport explain that the snapshot is limited sourced data while profile copy and
  remaining edges are explicitly Demo/illustrative.
- The city exposes 10 project buildings, 5 districts, and 17 active relationship lines. The six
  sourced entities are selectable/searchable: Monad, Kuru, aPriori, Magma, Switchboard, and Pyth.
- Kuru Passport and Navigator `Show Kuru sources` show the five current approved exact records,
  including `E-KURU-MEM-002`, and never `E-KURU-MEM-001`. Source, publisher, timestamps,
  provenance, scope, and limitations render for the records.
- Pyth Passport and `Show Pyth sources` show `E-PYTH-CHAIN-001`, `E-PYTH-MEM-001`,
  `E-PYTH-PUSH-001`, and `E-PYTH-REGISTRY-001`; stale `E-PYTH-CAP-001` is absent. The remaining
  record limitations stay conservative and do not turn omission of a mutable contract page into a
  claim of removal or inactivity.
- Monad--Kuru relationship focus switches to Graph and cites `E-KURU-MEM-002`; Monad--Pyth focus
  cites `E-PYTH-MEM-001` only. Their runtime relationship IDs are `monad-kuru-002` and
  `monad-pyth-002`, respectively.
- Navigator outcomes: Kuru project query returns one result; DeFi returns aPriori, Kuru, and Magma;
  oracle capability returns Pyth and Switchboard; stale/incomplete evidence returns 7 approved
  warned records; safety/endorsement returns `UNSUPPORTED REQUEST`; `quantum teleportation` returns
  `NO RESULT`. Unsupported/no-result preserve selected Kuru, Graph view, and focused edge.
- City/Graph switching, typed search plus Enter, district filter, click selection, Enter/Space
  building selection, relationship toggle, zoom, and reset all pass. DeFi shows exactly
  `DeFi · 3 in view`; only Kuru/aPriori/Magma retain `tabindex=0`, while all other buildings are
  dimmed with `tabindex=-1`. Turning relationships off produces zero visible links; turning them on
  restores 17.

### Mobile: 390 x 844

- The viewport is 390 x 844 with no overlay, console warning/error, JavaScript dialog, or page
  horizontal overflow (`scrollWidth/clientWidth = 390/390`). Snapshot date display remains exact
  UTC.
- The layout is city first: city top 58, Navigator top 648, Passport top 1352. The readable page
  continues to expose 10 projects and 17 relationships.
- Graph toggle works; the DeFi filter reports exactly three focusable buildings (Kuru, aPriori,
  Magma). Enter selects Kuru and its Passport displays successor `E-KURU-MEM-002`, not its stale
  predecessor.
- Monad--Kuru Navigator relationship focus switches to Graph and exposes `E-KURU-MEM-002`.
  Unsupported and no-result responses preserve Kuru, Graph view, and the focused relationship.
  Long Navigator/Passport results do not introduce overflow.

## Rollback path (verified, not performed)

1. In `src/evidence.js`, restore the explicit v1 generated-module import and snapshot constants:
   `phase-3.5-v1` and `2026-09-09T07:43:40Z`.
2. In `package.json`, restore `evidence:verify-promotion` fixed paths to
   `data/evidence-snapshots/phase-3.5-v1.json` and
   `src/evidence-snapshots/phase-3.5-v1.generated.js`.
3. Run `npm run evidence:verify-promotion` and `npm run build`.

Retain both immutable v2 artifacts; rollback is an explicit import/constants and fixed-path change,
not a deletion or overwrite.

## Limitations and next action

- QA used the CUA fallback because the requested `agent-browser` executable was not installed.
- This pass did not re-test live source reachability and does not substitute a full automated
  accessibility audit.

Next: retain the v1 pair as the explicit rollback boundary and use the same full QA matrix for any
future evidence-snapshot promotion.
