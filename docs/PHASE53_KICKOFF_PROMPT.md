# Phase 5.3 Kickoff Prompt — 3D district buttons + Batch 3 / full sweep

Copy everything below the line into a new agent session.

---

You are the lead agent for Monad City (repo: https://github.com/ILYUTKICK/monad-city, branch
main, origin configured). The owner communicates in Russian; UI copy stays English. The owner
has approved continuing Phase 5: first the floating 3D district buttons (visual task), then
Phase 5.3 per the scale plan.

MANDATORY READING (in this order, before any edit):
1. AGENTS.md — invariants, roles, handoff protocol
2. docs/PROJECT_CONTEXT.md, docs/PRODUCT_SPEC.md
3. docs/ECOSYSTEM_SCALE_PLAN.md — §5.3 is your phase; §6 label/LOD rules
4. docs/PROJECT_INTAKE_PIPELINE.md — runbook
5. docs/EVIDENCE_DATA_CONTRACT.md (esp. §Phase 5.1 entity expansion, §Phase 5.2 vocabulary
   interpretation) and docs/EVIDENCE_SNAPSHOT_WORKFLOW.md
6. docs/WORKLOG.md — last four entries (Batch 2, archipelago, district navigation, 5.2 exit)

CURRENT STATE (all pushed to main):
- Snapshot `phase-3.5-v4` active: 142 approved records / 6 relationships, 126 evidence-backed
  projects, `EXPECTED_SNAPSHOT_COUNTS['phase-3.5-v4'] = {142, 6}` in src/evidence.js.
- 130 buildings on a district archipelago (one island per district + Monad islet), terrain
  derived from building clusters; district navigation shipped: `city3d.focusIsland(district)`,
  clickable shore labels, panel buttons fly the camera; 60 fps measured.
- Known open items: 105 App-portal-only pending projects (no deployment record); relationship
  pack honestly EMPTY (DefiLlama's Monad oracle data names no Pyth/Switchboard — see WORKLOG
  "Phase 5.2 exit confirmed"); DeFi island 114 buildings at one label tier.

TASK 1 — Floating 3D district buttons (replace the ground labels)
Owner ask: «Надо сделать белые 3д кнопки над всеми 5 дистриктами. У нас сейчас они на полу
написаны». The flat shore labels must be REPLACED by floating billboard buttons above each
island. Design decisions already agreed with the owner direction — implement, don't re-litigate:
- In `src/city3d.js`, replace the whole "district ground labels" block (mesh + hit plane) with
  one THREE.Sprite per district (5, skip the `__monad` group), positioned above the island
  center: `position.set(cx, 9.2, cz)`.
- Button texture: one canvas per district, drawn once. Content mirrors the district panel
  (the owner showed it): `${glyph} ${NAME.toUpperCase()} · ${count}` — glyphs match the panel
  mapping (DeFi ◫, AI ✧, Infrastructure ▥, Gaming ⚄, Identity ◎); counts are data-driven from
  `projects` (per-district length). Plate: rounded rect `rgba(10,10,16,0.88)`, 3px border in
  the district color (DeFi #9ad7c6, AI #91baff, Infrastructure #aa8ae8, Gaming #dbac80,
  Identity #d89cc9), text WHITE #f3edff, glyph in the district color. Font: `700 44px
  ui-monospace, Menlo, monospace` (deterministic — DM Sans may not be loaded when the canvas
  draws). Canvas padding ~30px, height ~92px, radius ~22. Use `ctx.roundRect` (Chromium ≥99).
- `THREE.Sprite` + `SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite:
  false, fog: false })`, `renderOrder = 20`, `sprite.scale.set(worldW, worldH, 1)` with worldH
  ≈ 3.0 and worldW = 3.0 × canvasAspect. Uniform size for all five islands.
- Raycast: sprites raycast natively — put them in the existing `districtLabelMeshes` pick list
  (rename to `districtButtons` if clearer; update `raycastDistrictLabel` accordingly). Delete
  the old flat meshes and hit planes entirely — no duplication. Buildings keep pick priority;
  a click on a button calls the existing `focusIsland(district)`.
- Always-on wayfinding: depthTest false + renderOrder 20 keeps buttons visible over buildings.
- Verify in-browser (1440×900 and 390×844): buttons readable at the default camera (radius
  300), hover cursor pointer, click flies to the island, building clicks still select, zero
  console errors. `npm run build` green before the commit.
- Commit: `phase5.3: floating 3D district buttons replace ground labels`.

TASK 2 — Phase 5.3 per scale plan (batch discipline; stop for the owner where marked)
1. **Deployment resolution for the 105 pending queue** (App-portal-only). Research first: is
   there a reliable PUBLIC Monad explorer API usable at build time (e.g. a Blockscout/Explorer
   REST endpoint) to resolve a project's Monad deployment by name/site? Write
   `scripts/research/resolve-pending-deployments.js` (dependency-free, dated artifact in
   `data/research/`, exclusive creation, never fetched by the browser). If no trustworthy
   public API exists, STOP that sub-task and document findings in WORKLOG — do not invent
   deployment facts. Match results back to pending proposals by domain/name; produce
   `pending-deployments-<date>.json` with per-project verdict + source URL.
2. **Refresh runbook, first execution** (§5.3 exit requires it run twice eventually): a dated
   pass over batch-1/2 records (30-day cadence; due dates already computed by the inline
   governance in the UI). For each record: re-check the source is still live and supports the
   bounded scope; record decisions through the evidence workflow CLI (`evidence:review`,
   successors via `evidence:prepare` for payload changes — never edit an approved payload).
3. **Batch 3 snapshot** only after 1–2 produce reviewable material AND the owner confirms the
   batch in-session: assemble the workspace (reuse the `scripts/build-batch-2-workspace.js`
   pattern — carried projection as-is + superseded history + new `proposed` records), run the
   review loop, `evidence:snapshot --version phase-3.5-v5`, `evidence:promote` (previous =
   full-history workspace), add `EXPECTED_SNAPSHOT_COUNTS['phase-3.5-v5']`, update
   `KNOWN_PROJECT_IDS`, switch verify-promotion paths, wire the city via
   `scripts/research/compose-archipelago-city.js` (it inserts unwired selection entries
   automatically).
4. **Relationship candidates**: the oracle basis is empty; if any citable basis appears in new
   seeds (docs naming integrations, registry proofs), draft relationship candidates with their
   own evidence records per the runbook — never from similarity alone.

NON-NEGOTIABLE RULES (AGENTS.md holds): no runtime fetching/backend/wallet; Observed /
Claimed / Attested / AI-inferred stay distinct; exact claim sentences are never reworded;
drafts are never presented as approved; directory text is never auto-approved; dependency-free
stack; `npm run build` green before every commit; conventional commits (`phase5.3: …`); never
force-push; one agent owns a file at a time — state file ownership before editing.

GOTCHAS THAT COST TIME BEFORE (from WORKLOG/memory):
- The IAB tab suspends rAF when the pane isn't foreground — fps measures return -1; open a NEW
  tab (`tabs.new`) to measure; clicks land on the CURRENT camera view — re-aim after flights.
- `evidence:export` is lineage-incomplete: workspace drivers must rebuild full history from
  the runtime projection + candidate arrays (see the batch-2 driver). Promotion needs
  `--previous` = the full-history workspace, not the approved snapshot.
- Same-tab cache can serve stale `src/*.js` after edits — reload with cache-bust or open a
  fresh tab.
- The intake script refuses outputs outside `data/research/`; seed artifacts are immutable
  (same-day re-captures take a `-b` suffix).
- `EXPECTED_SNAPSHOT_COUNTS` pins approved-projection sizes per version — update BEFORE the
  runtime import switches.

HANDOFF: every task ends with a commit + push; record meaningful decisions in
docs/WORKLOG.md (handoff template at its bottom). If a task needs an owner call (batch
approval, explorer source choice), ask in-session and record the answer — do not self-approve
promotions.
