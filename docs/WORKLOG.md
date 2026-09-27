# Monad City — Worklog

## Current snapshot

- Date: 2026-09-23
- Stage: review- and promotion-gated evidence snapshot MVP
- Stack: vanilla JS, CSS, SVG, Node static server
- Backend: none
- AI: deterministic local retrieval with exact evidence joins and grounded templates; no live model
- Blockchain: none
- Data: approved static snapshot `phase-3.5-v2` with 22 source-backed records and 6 sourced relationships for 6 entities, promoted under canonical SHA-256 `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`, plus clearly labelled illustrative Demo fallbacks

## Decisions

### 2026-09-08 — Product direction

The city is the interface; the product is the evidence-backed ecosystem graph. A generic 3D directory or generic Monad chatbot is not sufficient.

### 2026-09-08 — Visual direction

The current Astra prototype is strong but visually noisy. The next design pass should reduce decorative competition, keep the city dominant, and make evidence easier to inspect.

### 2026-09-08 — AI direction

Use hybrid structured retrieval + graph traversal + RAG. Do not train a custom foundation model for the hackathon. Use a high-end model for offline enrichment and a cheaper model for routine runtime queries.

### 2026-09-08 — Agent model routing

The default lead/orchestrator is GPT-5.6 Sol with high reasoning. Use xhigh for difficult architecture and final audits. Reserve GPT-6 Astra for demanding visual/3D or end-to-end review tasks. Use Terra for focused frontend/QA implementation and Luna for bounded documentation.

### 2026-09-08 — Trust direction

Keep `Observed`, `Claimed`, `Attested`, and `AI-inferred` distinct. A wallet claim must not be presented as proof of project legitimacy.

### 2026-09-08 — Phase 0 visual clarity

Changed:
- Made the city the dominant desktop and mobile surface by narrowing and quieting the side rails, enlarging the SVG viewport, reducing filler geometry, and removing constant relationship-particle motion.
- Replaced the small selected-building beacon with a clear lavender ground outline, stronger selected label, highlighted adjacent relationships, and synchronized “selected” context.
- Simplified AI Navigator into one search field, three restrained scripted prompts, and a compact result state; removed redundant decorative labels and glow.
- Reworked Project Passport into a calmer identity hierarchy, one current trust-state explanation, quieter connection rows, and explicit demo/illustrative language.
- Replaced verification-like relationship marks and the ambiguous “City is live” label with truthful Demo-mode language while preserving the illustrative data model.
- Kept City and Graph views, building and Passport navigation, district filters, search, scripted prompts, relationship visibility, drag, zoom, reset, focus, About, and keyboard selection.
- Improved the no-result search state so it explains the miss without blanking the city or desynchronizing the selected Passport.

Files changed:
- `src/main.js`
- `src/style.css`
- generated `dist/src/main.js` and `dist/src/style.css` via the existing build

Verified:
- `npm run build` completes successfully.
- Browser QA at the default desktop viewport and 390 × 844 narrow viewport; no error overlay or console warnings/errors.
- Building selection, Passport identity/status updates, Passport focus, and Passport connection navigation.
- All three Navigator prompts, successful search, and no-result search behavior.
- City/Graph toggle, district filter, relationship visibility toggle, zoom, reset, drag-to-pan, About dialog, and keyboard building selection.
- Narrow layout remains city-first; Navigator follows the map, Passport follows Navigator, and the page has no horizontal overflow.

Limitations:
- All project descriptions, placements, trust states, and relationships remain illustrative mock data.
- Navigator remains scripted; there is no retrieval, RAG, live AI, wallet, blockchain, backend, or external API.
- Trust states still have no evidence objects, source timestamps, relationship types, or provenance links; this remains Phase 1 work.

Next:
- Implement Phase 1 — Truthful static MVP: explicit evidence placeholders, typed relationship objects, source/timestamp/scope fields, and Passport sections aligned to the trust model.

### 2026-09-09 — Phase 1 truthful static MVP

Changed:
- Added a dependency-free typed relationship module with JSDoc record types, controlled relationship/evidence-state vocabularies, and runtime contract validation.
- Replaced implicit project link arrays with 15 explicit relationship records. Every record contains `type`, `source`, `timestamp`, `scope`, `provenance`, `confidence`, and `dataMode`.
- Represented onchain-observed, owner-claimed, third-party-attested, AI-inferred, and illustrative states as visibly different Demo patterns. None is promoted to factual verification.
- Added unavailable project-evidence placeholders to every Project Passport and expandable evidence disclosures to every typed relationship.
- Updated the city edges and legend to use the relationship evidence state, while keeping the quieter Phase 0 hierarchy and existing City/Graph behavior.
- Strengthened the persistent Demo indicator and supporting copy: no live source, timestamp, AI, wallet, backend, or blockchain is implied.
- Documented the static Demo relationship contract in the trust model.

Files changed:
- `src/data.js`
- `src/main.js`
- `src/style.css`
- `docs/TRUST_MODEL.md`
- `docs/WORKLOG.md`
- generated `dist/src/data.js`, `dist/src/main.js`, and `dist/src/style.css` via the existing build

Verified:
- `npm run build` completes successfully.
- A static contract check confirms 15 relationships, all five evidence states, zero available sources, zero timestamps, and only `not-assessed` confidence values.
- Browser QA covers building selection, Passport updates, expandable project/relationship evidence, and relationship-to-project navigation.
- All three scripted Navigator prompts, successful project/type search, City/Graph switching, district filtering, and the Demo-edge visibility toggle work.
- At 390 × 844 the layout remains city-first, evidence rows remain readable, the page has no horizontal overflow, and the relationship legend scrolls within its own strip.
- Browser console has no warnings or errors.

Limitations:
- Relationship types and evidence states are illustrative presentation examples; they are not claims about real integrations, events, ownership, attestations, or model outputs.
- All evidence sources are intentionally unavailable, all timestamps are `null`, and confidence is not assessed.
- Project descriptions and state patterns remain illustrative; there is no live verification layer.
- Navigator remains scripted; there is no retrieval, RAG, live AI, wallet, blockchain, backend, or external API.

Next:
- Implement Phase 2 as structured retrieval over the typed static graph: query projects and relationship records, focus the map, and cite the visible placeholder evidence without generating unsupported claims. Keep real evidence ingestion and live verification out of scope until authoritative sources are selected.

### 2026-09-09 — Phase 2 grounded AI Navigator

Changed:
- Added a dependency-free deterministic retrieval layer over the curated local project and relationship records. It supports project, category, capability, relationship, and evidence queries without an external model or API.
- Replaced prompt-only scripted answers with the same retrieval path used by typed Navigator searches.
- Added explicit retrieval outcomes for grounded results, unavailable evidence, no result, invalid input, and unsupported requests.
- Added grounded answer templates that return relevant project IDs, typed relationship context, evidence placeholder references, source availability, uncertainty, and a bounded map action.
- Made project, relationship, and evidence result controls focus the corresponding city buildings or graph edge. Selecting one relationship now isolates that exact edge and its endpoints.
- Kept preserve-view outcomes non-destructive: ambiguous, unsupported, and no-result questions do not clear the user's current view, selection, filter, zoom, or graph focus.
- Kept safety, endorsement, legitimacy, investment, and generic verification requests outside the Navigator's supported scope. These receive an explicit refusal without project or evidence controls.
- Documented source-grounding rules, query behavior, trust-state separation, and prohibited conclusions in the AI Navigator and trust model documents.
- Preserved the Phase 0 visual hierarchy, Phase 1 evidence language, City/Graph views, filters, Passport, responsive layout, and dependency-free vanilla stack.

Files changed:
- `src/retrieval.js`
- `src/main.js`
- `src/style.css`
- `docs/AI_NAVIGATOR.md`
- `docs/TRUST_MODEL.md`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build

Verified:
- `npm run build` completes successfully after final integration.
- Deterministic retrieval contract checks cover 62 assertions, including all supported query classes and all outcome states.
- Browser QA covers project search, DeFi category search, oracle capability search, Monad relationship traversal, evidence queries, unavailable active-onchain evidence, no-result queries, invalid input, unsupported safety language, generic verification requests, declared-integration wording, and an unconnected-pair query.
- Navigator project and evidence controls focus the correct Passport; relationship controls isolate the selected graph edge and its two endpoint buildings.
- Building selection, Passport evidence disclosures and connection navigation, City/Graph switching, district filters, search, Demo-edge visibility, reset, zoom, keyboard submission, and existing navigation remain intact.
- Desktop and 390 × 844 responsive layouts pass with no page-level horizontal overflow. The mobile layout remains city-first, followed by Navigator and Passport.
- Browser console has no warnings or errors, and no runtime error overlay is present.
- All returned project profiles, edges, and evidence placeholders remain visibly described as illustrative Demo data rather than verified Monad facts.

Limitations:
- Retrieval is intentionally conservative and lexical. It does not provide semantic embeddings, typo correction, RAG, natural-language generation, or a generic chat experience.
- The curated dataset remains wholly illustrative. Evidence sources are unavailable, timestamps are absent, and confidence is not assessed, so factual ecosystem verification is not possible.
- Active contract and other live onchain questions always return insufficient evidence until a future claim-specific validator and real source records exist.
- The UI currently supplies the selected Passport as context; multi-selection conversational comparison is not yet a first-class interaction.

Next:
- Implement Phase 3 — Real Monad Data: choose a small set of authoritative public sources, ingest a bounded non-illustrative evidence slice with timestamps and provenance, and replace only the corresponding Demo claims. Keep wallet and live AI work out of scope until the evidence pipeline is trustworthy.

### 2026-09-09 — Phase 3 limited real Monad evidence layer

Changed:
- Added a reviewed source matrix and 23 static evidence records for six bounded entities: Monad, Kuru, aPriori/Capricorn, Magma, Switchboard, and Pyth Network. Records preserve the exact publisher, source URL, retrieval time, published time when available, network, scope, provenance, limitations, source availability, reference type, and quality flags.
- Kept source-backed claims narrow. The real subset uses only `Observed` for directly inspectable artifacts and `Claimed` for publisher statements; it does not introduce a generic verified state, real `Attested` claims, endorsements, or AI-generated facts.
- Pinned the ecosystem-registry observations to commit `36fddcc0021fffe81c7b73a8672347538ec2c9eb`. Direct transaction observations keep exact transaction URLs and bounded timestamps, while mutable documentation pages are explicitly marked as mutable presentation surfaces.
- Split the graph into 15 original Demo relationships and 6 limited sourced relationships. The deterministic active hybrid contains 17 unique edges: sourced edges replace four matching Demo edges and add two new supported edges. Every sourced edge resolves to one or more exact evidence IDs.
- Added a documented evidence/data contract for unavailable, partial, stale, conflicting, and incomplete sources; safe Demo fallback; support modes; and compatibility with the existing retrieval layer.
- Extended retrieval to join exact evidence records, filter quality and missing-publication states, aggregate partial availability truthfully, and preserve conservative behavior for active/current, safety, verification, and no-result questions.
- Updated Project Passport to show complete source-backed record details and explicit Demo-only placeholders. Updated Navigator results to cite exact records, expose source availability and quality, and focus cited projects or relationships.
- Preserved the restrained Phase 0 hierarchy, Phase 2 retrieval behavior, City/Graph views, district filters, search, keyboard controls, map controls, Passport navigation, responsive layout, and dependency-free vanilla JS/CSS stack.

Files changed:
- `src/evidence.js`
- `src/data.js`
- `src/retrieval.js`
- `src/main.js`
- `src/style.css`
- `docs/research/PHASE_3_SOURCE_MATRIX.md`
- `docs/EVIDENCE_DATA_CONTRACT.md`
- `docs/TRUST_MODEL.md`
- `docs/AI_NAVIGATOR.md`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build

Verified:
- The Research/Trust/Data, Architecture/Data, Frontend, and QA tasks ran as separate sequential delegated tasks. The lead reviewed each handoff before starting or accepting the next stage.
- `npm run build` completes successfully after final integration.
- Runtime contract checks pass for all 23 evidence records, 6 sourced entities, 15 Demo relationships, 6 sourced relationships, and the 17-edge active hybrid. Every sourced relationship evidence ID resolves to an existing record.
- Deterministic retrieval checks pass for project/category/capability/relationship/evidence queries and all controlled outcomes. Exact quality filters return 8 stale-or-incomplete records, 12 records without a published timestamp, 5 conflicting records, and 1 unavailable record in the failure fixture.
- Partial and unavailable source fixtures return truthful aggregate availability, never expose a missing source as usable, retain an available preview source when one exists, and add explicit uncertainty.
- Browser QA passes at 1280 × 720 and 390 × 844. It covers sourced and Demo-only Passports, source-backed and Demo relationships, Navigator citations and evidence focus, relationship-to-Graph focus, stale/incomplete queries, missing-publication queries, active-contract insufficiency, unsupported safety requests, and no-result preservation.
- City/Graph switching, district filtering, typed search and Enter submission, building Enter/Space selection, relationship visibility, zoom, reset, and existing navigation remain functional.
- Both viewports have no page-level horizontal overflow, console warnings/errors, blocking dialogs, or runtime error overlay. The mobile layout remains city-first.
- No source-backed record is presented as official Monad endorsement or project-wide verification. Demo profile states and Demo edges remain explicitly labelled.

Limitations:
- This is a manually curated static snapshot retrieved on 2026-09-09, not a live indexer or synchronization pipeline. Mutable source pages and explorer presentation URLs can change after retrieval.
- Only six entities have source-backed records. Other profiles, descriptions, placements, state patterns, and remaining relationships stay illustrative Demo data.
- The aPriori ID is a legacy prototype identity bridged only to narrowly scoped current Capricorn/aprMON documentation; it is not a broad continuity or verification claim.
- Kuru and Pyth records deliberately expose historical/current address conflicts or migrations instead of resolving them into a preferred truth. No current record satisfies the stricter active/current-state criteria.
- There are no real `Attested` records yet. There is also no backend, crawler, wallet, blockchain connection, external API, embeddings, RAG service, or live LLM.

Next:
- Stabilize the limited subset before evaluating a broader phase. The recommended next task is a small manual evidence-refresh and review workflow that detects source drift, rechecks pinned artifacts, and records reviewer decisions without introducing a full live indexer or automatic ecosystem discovery.

### 2026-09-13 — Phase 3.5 review-gated evidence snapshot workflow

Changed:
- Added an explicit evidence review contract with the only allowed statuses `proposed`, `needs-review`, `approved`, `rejected`, and `stale`; review timestamps and immutable revision lineage are validated.
- Added versioned snapshot metadata. The checked-in runtime uses approved snapshot `phase-3.5-v1`, created and reviewed at `2026-09-09T07:43:40Z`.
- Split candidate records from the approved runtime projection. Only approved evidence and approved relationships whose evidence IDs resolve to approved records can enter the source-backed view.
- Prevented silent evidence replacement: evidentiary payload changes require a new ID, a monotonic revision sequence, and an explicit predecessor. Local writing commands also refuse to overwrite input or existing output files.
- Retained audit-visible non-approved candidates in review workspaces while withholding them from approved snapshots. Demo relationship placeholders remain a distinct fallback and every active relationship now has an explicit evidence reference.
- Added a dependency-free local CLI covering export, proposal preparation, required-field validation, inspection, review decisions, approved snapshot generation/loading, and diffs against a previous workspace or snapshot.
- Added maintainer documentation for the manual review flow and its trust boundary. The tool never fetches sources, judges publisher accuracy, edits the checked-in runtime dataset, or performs automatic discovery.
- Exposed snapshot version, created/reviewed dates, approved review state, source, publisher, scope, provenance, quality flags, limitations, and conservative withheld states in Project Passport and Navigator citations.
- Fixed the Navigator integration so retrieval records are joined by exact evidence ID to the canonical approved snapshot before review metadata is displayed; unknown or non-approved records remain withheld.
- Preserved the calmer city-first hierarchy, City/Graph views, filters, search, Passport, Navigator, keyboard behavior, Demo fallback, and dependency-free vanilla JS/CSS stack.

Files changed:
- `src/evidence-contract.js`
- `src/evidence.js`
- `src/data.js`
- `scripts/evidence-workflow.js`
- `package.json`
- `docs/TRUST_MODEL.md`
- `docs/EVIDENCE_DATA_CONTRACT.md`
- `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`
- `src/main.js`
- `src/style.css`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build

Verified:
- The Trust/Data, Workflow/Architecture, Frontend, and QA work ran as four separate sequential delegated tasks. The lead reviewed each handoff and did not allow concurrent edits to shared files.
- `npm run build` completes successfully after final integration, and all changed JavaScript modules pass `node --check`.
- The checked-in workspace validates as 23 approved evidence records and 6 approved sourced relationships; the runtime approved projection contains no proposed, needs-review, rejected, or stale review-state record.
- Contract fixtures cover all five review statuses; missing source URL, missing retrieval timestamp, missing provenance, silent overwrite, and an approved relationship pointing to unapproved evidence are rejected. A conflict flag with explicit conflict details remains valid and visible.
- A clean temporary CLI cycle covers export, validate, inspect, proposed, needs-review, rejected, stale, approved, snapshot, load, and diff. Non-approved decisions retain a 23-record projection; an approved temporary fixture produces 24 records, and the diff reports only its new evidence ID. Existing-output overwrite is refused.
- Desktop browser QA completed before the browser permission interruption: global and Passport snapshot metadata, approved-only Kuru Navigator citations, sourced Kuru Passport details, stale/incomplete/conflicting Pyth flags, an approved sourced relationship, a separate Demo relationship placeholder, and a Demo-only Talus Passport all rendered without horizontal overflow.
- The Kuru Navigator result resolves exactly five canonical approved evidence IDs, exposes five source links, and shows no withheld citation. Synthetic unknown or non-approved IDs cannot inherit approval.
- Phase 3.5-specific browser QA passes at 390 × 844. The responsive order remains city first, followed by Navigator and Passport; snapshot metadata and withheld-candidate disclosure remain visible, and the page has no horizontal overflow.
- Mobile interaction checks cover City/Graph switching, the DeFi filter with exactly three focusable buildings, typed evidence search, building selection with Enter and Space, relationship visibility toggle, sourced and Demo-only Passports, sourced and Demo relationship disclosures, and exact relationship-to-Graph focus.
- Mobile Navigator checks return 8 approved stale-or-incomplete citations across 4 projects, preserve Graph/Pyth for unsupported and no-result requests, and return explicit insufficient evidence for Talus active-contract language. The Magma–Switchboard answer focuses exactly those two buildings and the single cited edge.
- The 390 × 844 browser console contains no warnings or errors, no JavaScript dialog is active, and the longest tested Navigator/Passport states remain within the viewport width.
- The local server responds at `http://localhost:5173/` and no backend, crawler, wallet, live blockchain connection, automatic discovery, external API, or live LLM was added.

Limitations:
- This remains a manually curated checked-in snapshot. The CLI creates review artifacts but intentionally does not rewrite `src/evidence.js` or verify that a remote publisher still serves the stored claim.
- `prepare` clones an existing record as a structural aid; a human reviewer must replace every template-specific fact before approval.
- The source-backed slice remains limited to the existing six curated entity IDs. Review timestamps describe the static September 9 snapshot, not ongoing freshness.

Next:
- Phase 3.5 is stable against the current acceptance matrix. Evaluate a narrow Phase 3.6 checked-in snapshot promotion/import step with explicit human approval and reproducible artifacts; do not proceed to automatic indexing or discovery.

### 2026-09-13 — Phase 3.6 checked-in snapshot promotion gate

Changed:
- Added the approved `phase-3.5-v1` JSON snapshot as a versioned checked-in review artifact and generated a separate version-named runtime module from the exact same payload.
- Added canonical, key-order-independent SHA-256 calculation. The active snapshot digest is `a26c65fafbb030b85bd427ddb3e25c9727958b2142510205478da97971e6d5ea`; this identifies the payload and is explicitly not a trust score, signature, endorsement, or freshness claim.
- Added `evidence:promote`. Promotion requires exact maintainer confirmation of snapshot version, `reviewedAt`, and canonical SHA-256; validates the approved-only snapshot again; enforces `<version>.generated.js`; deeply freezes the runtime object; and uses exclusive creation so an earlier artifact cannot be overwritten.
- Added `evidence:verify-promotion`. It validates the approved JSON, regenerates the expected module text in memory, and requires exact equality with the checked-in module before the application can execute it.
- Made `npm run build` run the promotion verifier before producing `dist/`.
- Switched the runtime evidence and sourced relationships to one explicit versioned generated-module import. Evidence and relationship projections therefore cannot drift onto different snapshot versions, and there is no automatic or moving `latest` lookup.
- Changed a fresh workflow export to start from the currently promoted approved runtime. Non-approved review history remains in explicit review workspaces rather than being silently mixed into runtime.
- Documented the promotion sequence, human review boundary, reproducibility contract, active artifacts, digest semantics, and remaining manual steps. Updated the project README and implementation plan to match the current hybrid static prototype.

Files changed:
- `data/evidence-snapshots/phase-3.5-v1.json`
- `src/evidence-snapshots/phase-3.5-v1.generated.js`
- `scripts/evidence-workflow.js`
- `src/evidence.js`
- `package.json`
- `README.md`
- `docs/TRUST_MODEL.md`
- `docs/EVIDENCE_DATA_CONTRACT.md`
- `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build

Verified:
- `npm run evidence:verify-promotion` passes for the checked-in pair: 23 approved evidence records, 6 approved relationships, deep-frozen runtime output, and the expected canonical SHA-256.
- `npm run build` passes and now runs the promotion verifier before copying assets.
- A clean export → validate → snapshot → load → promote cycle reproduces the same canonical JSON payload. The regenerated JavaScript module is byte-for-byte identical to the checked-in module.
- Promotion rejects a mismatched version, mismatched review timestamp, wrong hash, wrong output filename, existing output target, and a module that does not exactly match deterministic generation.
- Existing Phase 3.5 contract checks still reject non-approved relationship references, silent evidence overwrite, missing source URL/timestamp/provenance, and unresolved evidence IDs.
- Desktop browser regression at 1280 × 720 loads 10 projects and 17 relationships with no horizontal overflow. Kuru search returns the same five approved evidence IDs and five source links with no withheld citation; Talus remains a Demo-only Passport; no-result behavior preserves Graph/Talus state.
- Mobile browser regression at 390 × 844 remains city-first with snapshot `phase-3.5-v1`, no horizontal overflow, and 8 approved stale-or-incomplete citations with no withheld record.
- Browser console contains no warnings or errors and no JavaScript dialog is active.
- No source fetch, crawler, background job, automatic discovery, database, backend, wallet, blockchain connection, external API, or live LLM was added.

Limitations:
- The canonical digest proves local payload equality only. It does not authenticate a reviewer or establish source accuracy, availability, freshness, project legitimacy, safety, or Monad endorsement.
- Promotion deliberately does not approve records or switch the active import. A maintainer must review the diff, check in the versioned JSON/module pair, and update the active import, metadata constants, and fixed verifier paths in code review.
- `evidence:export` starts from the approved runtime and excludes proposed, needs-review, rejected, and stale candidates. Review workspaces must be retained separately when their audit history is required.
- The source-backed scope remains the same six entities and static September 9 retrieval snapshot.

Next:
- Run one controlled manual refresh cycle over the existing six-entity subset to exercise successor IDs, stale/rejected decisions, snapshot diff, promotion, and rollback-by-import without expanding coverage. Evaluate broader ingestion only after that operational rehearsal remains conservative and reproducible.

### 2026-09-23 — External Z.ai handoff package

Changed:
- Added `HANDOFF.md` as the single starting point for an external coding agent, including the
  product boundary, reading order, local commands, active snapshot identity, evidence workflow,
  guardrails, verified baseline, limitations, and recommended next task.
- Updated the current-state sections in `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, and
  `docs/TRUST_MODEL.md` to describe the Phase 3.6 hybrid runtime instead of the earlier all-Demo or
  pre-integration state. Historical Worklog entries remain unchanged as a phase record.
- Updated `docs/DEMO_SCRIPT.md` to demonstrate exact approved evidence, conservative insufficiency,
  and sourced relationship focus without implying project-wide verification or Monad endorsement.
- Updated `README.md` with the handoff entry point and Node.js 18 requirement; added the same engine
  requirement to `package.json`.
- Added `.gitignore` for local dependencies, logs, macOS metadata, and generated handoff archives.
- Created `monad-city-zai-handoff-2026-09-23.zip` with source, documentation, approved evidence
  artifacts, local workflow tooling, and the verified static build. It intentionally excludes Git
  history, `node_modules`, credentials, editor state, and nested archives.

Files changed:
- `AGENTS.md`
- `HANDOFF.md`
- `.gitignore`
- `README.md`
- `package.json`
- `docs/PROJECT_CONTEXT.md`
- `docs/TRUST_MODEL.md`
- `docs/DEMO_SCRIPT.md`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build
- generated `monad-city-zai-handoff-2026-09-23.zip`

Verified:
- All JavaScript entry points, source modules, workflow tooling, and the versioned evidence module
  pass `node --check`; `package.json` parses and declares Node.js 18 or later.
- The workspace `npm run build` passes. Its promotion gate confirms 23 approved evidence records,
  6 approved relationships, deep-frozen runtime output, and canonical SHA-256
  `a26c65fafbb030b85bd427ddb3e25c9727958b2142510205478da97971e6d5ea`.
- The archive was extracted to a clean temporary directory and `npm run build` passed there with
  the same snapshot counts and digest, without installing dependencies.
- A repository-wide credential-pattern scan found no apparent API key, bearer/access token,
  private key, or stored secret. The package contains no `.git`, `node_modules`, `.DS_Store`, or
  nested ZIP content.
- No frontend runtime code or evidence payload changed during packaging, so the successful Phase
  3.6 desktop/mobile browser QA baseline remains applicable.

Limitations:
- The package is a portable source/build snapshot, not a deployment and not a Git repository. A
  recipient that requires Git history must initialize a repository or import the folder into one.
- The source-backed subset remains a manually reviewed static September 9, 2026 snapshot for six
  entities. Packaging does not refresh sources or increase evidence coverage.
- A public URL, hosting target, and platform-specific Z.ai project configuration were not invented;
  those require the recipient's chosen import/deployment path.

Next:
- Give Z.ai the ZIP or unpacked folder and instruct it to read `HANDOFF.md` and `AGENTS.md` before
  changing files. The next product task remains a controlled manual refresh rehearsal over the
  existing six-entity subset, not automatic discovery or a live indexer.

### 2026-09-23 — Controlled evidence refresh-cycle rehearsal

Changed:
- Ran a temporary review workspace export from the active `phase-3.5-v1` snapshot.
- Created successor `E-KURU-CONTRACTS-002` from `E-KURU-CONTRACTS-001` without changing the active runtime.
- Exercised explicit `stale` for `E-KURU-CONTRACTS-001` and `rejected` for `E-KURU-CHAIN-001`.
- Generated and promoted a temporary `phase-3.5-v2` snapshot with 22 approved records and 6 approved relationships.
- Kept the temporary snapshot and generated module outside the project; no source-backed claim was refreshed or activated.

Verified:
- Candidate validation passed with 24 retained candidate records, 22 approved, 1 rejected, and 1 stale.
- Snapshot diff reported one successor added, two prior approved records removed from the approved projection, and 21 unchanged records.
- Temporary promotion and deterministic module verification passed with SHA-256 `044ef1f25a926913a0195347a6d740929a88d43213cd5d5089b5d0b6677e1031`.
- Rollback-by-import was confirmed by verifying the unchanged active `phase-3.5-v1` pair and running `npm run build` successfully.

Limitations:
- This was an operational rehearsal using the existing evidence payload; it was not a new inspection of external sources.
- The active runtime remains `phase-3.5-v1` with 23 approved records and the original canonical SHA-256.

Next:
- For a real refresh, inspect the six entities' sources manually, record only bounded changes, then repeat the same successor/diff/promotion process with a new reviewed snapshot.

### 2026-09-23 — Controlled Real Evidence Refresh: phase-3.5-v2 runtime integration

Changed:
- Integrated the separately reviewed approved snapshot `phase-3.5-v2`, created and reviewed at `2026-09-22T22:02:32Z`, as the explicit runtime selection. The v1 JSON/module pair remains present and unmodified for rollback.
- Added the versioned approved artifacts `data/evidence-snapshots/phase-3.5-v2.json` and `src/evidence-snapshots/phase-3.5-v2.generated.js`; updated `src/evidence.js` metadata/import and the fixed promotion verifier paths in `package.json`.
- Updated runtime validation to inspect the active approved projection, require exactly 22 records across the unchanged six-entity boundary, retain predecessor lineage checks using the v1 candidate history, reject stale `E-PYTH-CAP-001` from runtime, and require `monad-pyth-002` to cite only `E-PYTH-MEM-001`.
- Updated the sourced runtime adapter and deterministic retrieval contract after runtime execution exposed the successor-ID boundary: an approved sourced relationship now retains its revision metadata and replaces its Demo predecessor in the original graph position when `revision.supersedesRelationshipId` names that Demo edge. This keeps `monad-kuru-002` sourced without adding a duplicate active edge; successors of non-Demo predecessors, including `monad-pyth-002`, remain appended.
- Corrected snapshot metadata rendering to an unambiguous English UTC date and time, so the global and Passport snapshot cards display the approved v2 instant without local-timezone date rollover.

Source and relationship decisions:
- 21 approved records are unchanged. `E-KURU-MEM-002` is the approved sequence-2 successor to `E-KURU-MEM-001`; its point-in-time App Portal scope, Monad Foundation publisher, retrieval timestamp, manual-curation provenance, mutable-source limitation, and bounded directory-observation semantics were independently checked.
- `E-KURU-MEM-001` and `E-PYTH-CAP-001` remain retained as stale candidate history and are absent from the approved projection. No current positive Pyth contract-address replacement was invented.
- `monad-kuru-002` supersedes stale `monad-kuru` and references only `E-KURU-MEM-002`. `monad-pyth-002` supersedes stale `monad-pyth` and references only approved `E-PYTH-MEM-001`. The other four approved relationships are unchanged.

Files changed:
- `data/evidence-snapshots/phase-3.5-v2.json`
- `src/evidence-snapshots/phase-3.5-v2.generated.js`
- `src/evidence.js`
- `src/data.js`
- `src/retrieval.js`
- `src/main.js`
- `package.json`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build

Verified:
- The retained final candidate workspace validates as 24 records (22 approved, 2 stale) and 8 relationships (6 approved, 2 stale), with valid revision lineage and approved relationship references.
- The v1→v2 diff reports 21 unchanged approved records; added `E-KURU-MEM-002`; removed `E-KURU-MEM-001` and `E-PYTH-CAP-001`; four unchanged relationships; added `monad-kuru-002` and `monad-pyth-002`; and removed their stale predecessors.
- `node --check src/evidence.js` and `node --check src/evidence-snapshots/phase-3.5-v2.generated.js` pass.
- `npm run evidence:verify-promotion` and `npm run build` pass for 22 approved records, six approved relationships, a deeply frozen runtime module, and canonical SHA-256 `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.
- Runtime contract execution confirms 17 unique active relationships: 15 retained Demo fallback records, six sourced records in the hybrid graph, `monad-kuru-002` in the former Demo `monad-kuru` position, and appended `monad-pyth-002`.
- `formatSnapshotDate('2026-09-22T22:02:32Z')` deterministically renders `Sep 22, 2026, 22:02 UTC`; full browser QA remains a separate QA responsibility.

Limitations:
- This remains a manual, point-in-time source review; it adds no crawler, live synchronization, backend, wallet, external API, or generic project verification. Approval and the digest do not establish source freshness, safety, legitimacy, activity, or endorsement.
- Browser/UI QA is not claimed in this entry and remains the QA agent's next task.

Rollback:
- Restore the explicit import and metadata constants in `src/evidence.js` to `phase-3.5-v1` and `2026-09-09T07:43:40Z`.
- Restore `package.json` `evidence:verify-promotion` paths to `data/evidence-snapshots/phase-3.5-v1.json` and `src/evidence-snapshots/phase-3.5-v1.generated.js`, then run `npm run evidence:verify-promotion` and `npm run build`.
- The immutable rollback artifacts are `data/evidence-snapshots/phase-3.5-v1.json` and `src/evidence-snapshots/phase-3.5-v1.generated.js`; retain v2 files rather than overwriting or deleting them.

Next:
- QA should run the prescribed desktop and narrow responsive browser flow against the active v2 runtime, confirming Passport/Navigator citations and successor relationship behavior without changing UI semantics.

### 2026-09-23 — Controlled Real Evidence Refresh: final QA and handoff sync

Changed:
- Completed the mandatory sequential four-agent refresh cycle: Source Research/Trust, Evidence
  Workflow, Runtime Integration, and QA. No two agents edited shared files concurrently.
- Recorded all 23 prior-record decisions in
  `docs/research/PHASE_3_EVIDENCE_REFRESH_2026-09-22.md`: 21 unchanged,
  `E-KURU-MEM-001` requiring successor `E-KURU-MEM-002`, and `E-PYTH-CAP-001` becoming stale
  without an invented positive replacement.
- Finalized the active approved-only `phase-3.5-v2` projection with 22 records and 6 sourced
  relationships. Retained refresh history contains 24 evidence candidates and 8 relationship
  candidates, including the two stale evidence predecessors and two stale relationship
  predecessors.
- Added the final PASS report at
  `docs/qa/phase-3.5-v2-refresh-regression-2026-09-23.md` and synchronized the current-state
  handoff, trust, workflow, implementation, and project documentation to v2. Historical entries
  and the immutable v1 rollback pair were preserved.
- Regenerated `monad-city-zai-handoff-2026-09-23.zip` from the final v2 workspace so the portable
  handoff no longer contains the superseded v1-only runtime.

Files changed across the completed refresh:
- `data/evidence-snapshots/phase-3.5-v2.json`
- `src/evidence-snapshots/phase-3.5-v2.generated.js`
- `src/evidence.js`
- `src/data.js`
- `src/retrieval.js`
- `src/main.js`
- `package.json`
- `docs/research/PHASE_3_EVIDENCE_REFRESH_2026-09-22.md`
- `docs/qa/phase-3.5-v2-refresh-regression-2026-09-23.md`
- `AGENTS.md`, `HANDOFF.md`, `README.md`, `docs/PROJECT_CONTEXT.md`, `docs/TRUST_MODEL.md`,
  `docs/EVIDENCE_DATA_CONTRACT.md`, `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`,
  `docs/IMPLEMENTATION_PLAN.md`, and this Worklog
- generated `dist/` assets via the existing build
- generated `monad-city-zai-handoff-2026-09-23.zip`

Verified:
- Active promotion verification and `npm run build` pass for `phase-3.5-v2`, reviewed
  `2026-09-22T22:02:32Z`, 22 approved records, 6 approved relationships, deep-frozen runtime
  output, and canonical SHA-256
  `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.
- The preserved v1 JSON/module pair independently verifies with 23 records, 6 relationships, and
  SHA-256 `a26c65fafbb030b85bd427ddb3e25c9727958b2142510205478da97971e6d5ea`.
- Runtime checks confirm 17 unique active hybrid relationships: 6 sourced relationships plus the
  retained 15-record Demo fallback before four deterministic replacements. Every sourced edge
  resolves only to approved evidence.
- Browser QA passes at 1280 x 720 and 390 x 844: all six sourced entities load; Kuru/Pyth stale
  predecessors are absent from Passport and Navigator citations; relationship focus uses
  `E-KURU-MEM-002` and `E-PYTH-MEM-001`; City/Graph, search, filters, keyboard selection,
  Passport, Navigator, zoom/reset, Demo labels, unsupported/no-result preservation, and responsive
  city-first layout pass. No console warnings/errors, JavaScript dialogs, or horizontal overflow
  were found.
- Snapshot cards render the review instant unambiguously as
  `Sep 22, 2026, 22:02 UTC` independent of local timezone.
- A clean extraction of the refreshed Z.ai archive contains both versioned snapshot pairs, the
  refresh matrix, and the QA report, excludes Git, dependencies, logs, macOS metadata, and nested
  archives, and passes `npm run build` without installing dependencies.

Limitations:
- This remains a manual point-in-time snapshot for six entities. It does not add a live indexer,
  crawler, automatic discovery, backend, wallet, external API, external LLM, project-wide
  verification, safety judgment, or Monad endorsement.
- QA used the local CUA browser fallback because the optional `agent-browser` executable was not
  installed. Live source reachability was handled by the research pass, not re-fetched by QA; no
  full automated accessibility audit was added.
- Canonical SHA-256 proves equality of local reviewed artifacts only. It does not authenticate a
  reviewer or prove source truth, current availability, or freshness.

Rollback:
- Restore the explicit generated-module import and v1 metadata constants in `src/evidence.js`.
- Restore `package.json` verifier paths to `data/evidence-snapshots/phase-3.5-v1.json` and
  `src/evidence-snapshots/phase-3.5-v1.generated.js`, then run promotion verification and build.
- Do not delete or overwrite either versioned pair.

Next:
- Keep the bounded refresh process stable for another review interval. Define a review
  cadence/expiry policy and optional reviewer-release metadata, then repeat the same diff,
  promotion, rollback, and browser-QA gates before considering broader ecosystem ingestion.

### 2026-09-23 — Phase 3.7 evidence review governance policy

Decisions:
- Adopted versioned policy `phase-3.7-review-policy-v1` without changing active snapshot
  `phase-3.5-v2`, its 22 approved evidence records, six approved relationships, canonical SHA-256
  `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`, or the retained v1
  rollback pair.
- Defined deterministic evidence intervals from 7 to 365 elapsed UTC days by explicit warning,
  evidence type, and source-reference class. Defined relationship intervals of 30 days for
  `ecosystem_membership` and 60 days for `declared_integration`, capped by the earliest supporting
  evidence due date.
- Defined `reviewDue` as `asOf >= nextReviewAt` using a required canonical UTC `asOf` value. Expiry
  creates only `reviewDue`; it never automatically changes `reviewStatus` to `stale`.
- Kept review due, stale quality, stale review status, rejected candidates, unavailable sources,
  and conflicting sources as separate conditions. Approved evidence may retain visible historical,
  conflict, incomplete, or unavailable warnings for its exact bounded scope.
- Defined controlled reviewer-action metadata: `reviewerRef`, `reviewerRole`, `reviewedAt`,
  `reviewMethod`, `decisionReason`, and `reviewPolicyVersion`. The metadata describes only the
  review action and proves no source truth, endorsement, safety, legitimacy, activity, identity,
  signature, authority, or onchain validity.
- Chose a versioned governance companion bound to the exact v2 version, review timestamp, and hash
  as the minimal compatibility architecture. The future implementation must use reserved
  `legacy-unattributed:phase-3.5-v2` metadata rather than invent a reviewer. The first successor
  snapshot under this policy moves metadata inline and preserves immutable revision rules.
- Defined exact evidence and relationship decision/reason matrices, reviewer reference pattern,
  role/method vocabularies, complete subject coverage, and fail-closed cadence rules so workflow
  validation does not require semantic guessing.

Files changed:
- `docs/TRUST_MODEL.md`
- `docs/EVIDENCE_DATA_CONTRACT.md`
- `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`
- `docs/WORKLOG.md`

Verified:
- Documentation was checked for the active v2 boundary, all six required metadata fields, exact
  cadence tables and precedence, evidence/relationship decisions, deterministic due calculation,
  immutable-payload handling, and explicit non-endorsement semantics.
- No runtime, snapshot, data, script, package, UI, source-research, or QA artifact was changed.

Limitations:
- This entry records governance decisions only. The governance companion, validator, CLI report,
  promotion due gate, future inline schema, runtime display, and QA coverage are not implemented or
  claimed here.
- The reserved legacy tuple deliberately has no actor attribution. It preserves compatibility but
  cannot authenticate who performed the v2 review.

Next:
- Evidence Workflow should implement the exact companion and validation contract, add deterministic
  as-of governance checks without mutating v2, and stop before runtime/UI integration for a
  separate review and QA handoff.

### 2026-09-23 — Phase 3.7 evidence governance: implementation, runtime, and final QA

Changed:
- Completed the mandatory four-agent sequence without concurrent shared-file edits: Governance /
  Trust, Workflow / Architecture, Runtime / UI, then QA. The lead reviewed and verified each
  handoff before starting the next.
- Added the version-bound governance companion
  `data/evidence-governance/phase-3.5-v2.review.json` and matching runtime module. The companion is
  bound to the exact active snapshot version, `reviewedAt`, and canonical SHA-256; neither the v2
  evidence payload nor the preserved v1 rollback pair was changed.
- Extended `scripts/evidence-workflow.js` with the dependency-free, read-only
  `evidence:governance` command. It validates policy metadata, complete subject coverage, reviewer
  decision fields, exact cadence, deterministic due boundaries, relationship evidence caps, and
  future inline governance records. `--strict` exits 2 for a valid release with due subjects and 1
  for invalid governance.
- Integrated fail-closed governance validation into `src/evidence.js` and exposed policy version,
  fixed `asOf`, summary rows, per-subject current/due state, next review, and deterministic
  validation fixtures.
- Updated Project Passport and Navigator evidence presentation with snapshot policy/date,
  current/due cadence, legacy review metadata, quality-state distinctions, source/provenance
  context, and an explicit disclaimer that a review action is not authentication, source truth,
  freshness, endorsement, safety, legitimacy, activity, or onchain verification.
- Added the final PASS report at
  `docs/qa/phase-3.7-evidence-governance-2026-09-23.md` and synchronized `HANDOFF.md` and
  `docs/IMPLEMENTATION_PLAN.md` with the completed Phase 3.7 boundary. Phase 4 remains deferred.
- Regenerated `monad-city-zai-handoff-2026-09-23.zip` so the portable Z.ai handoff contains the
  complete Phase 3.7 governance implementation, documentation, QA report, and verified build.

Files changed across Phase 3.7:
- `docs/TRUST_MODEL.md`
- `docs/EVIDENCE_DATA_CONTRACT.md`
- `docs/EVIDENCE_SNAPSHOT_WORKFLOW.md`
- `scripts/evidence-workflow.js`
- `package.json`
- `data/evidence-governance/phase-3.5-v2.review.json`
- `src/evidence-governance/phase-3.5-v2.review.generated.js`
- `src/evidence-contract.js`
- `src/evidence.js`
- `src/main.js`
- `src/style.css`
- `docs/qa/phase-3.7-evidence-governance-2026-09-23.md`
- `HANDOFF.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build
- regenerated `monad-city-zai-handoff-2026-09-23.zip`

Verified:
- `node --check` passes for the workflow, evidence contract, evidence runtime, UI entry point, and
  generated governance module.
- Governance validation passes for the checked-in release with 28 governed subjects: 22 evidence
  records, 6 relationships, 28 current, and 0 due at canonical `asOf`
  `2026-09-23T00:00:00Z`. The earliest review is due `2026-10-09T07:43:40Z`.
- Deterministic fixtures pass for current, exact-boundary due, stale, rejected, unavailable,
  incomplete, conflicting, missing metadata, invalid-input, future-inline, and no-overwrite cases.
  At the first exact boundary, 10 subjects are due; relationship `monad-pyth-002` is correctly
  capped by supporting evidence `E-PYTH-MEM-001`. A far-future strict check exits 2 without
  mutating artifacts.
- The checked-in governance JSON is byte-identical to the reviewed companion and semantically
  equal to the generated runtime export. Runtime assertions report policy
  `phase-3.7-review-policy-v1`, 28 rows, and passing governance fixtures.
- Both the active v2 promotion pair and preserved v1 rollback pair verify. `npm run build` passes.
- Browser QA passes at 1280 x 720 and 390 x 844 for City/Graph, district filter, search, keyboard
  selection, Passport governance/source display, Navigator citations and relationship focus,
  conservative Pyth warnings, Demo fallback, unsupported/no-result preservation, and responsive
  layout. No console errors, dialogs, or page-level horizontal overflow were found.
- A clean extraction of the refreshed Z.ai archive independently passes `npm run build` and the
  checked-in governance command with 28 current / 0 due subjects. Its 60 entries contain no Git
  directory, `node_modules`, logs, macOS metadata, or nested ZIP file.

Limitations:
- Governance remains a manual, static, release-bound process. There is no crawler, live indexer,
  automatic discovery, background refresh, backend, wallet, external API, or external LLM.
- The legacy v2 governance metadata intentionally uses the reserved unattributed reviewer
  reference; it records the action shape but cannot authenticate the human reviewer.
- `npm run build` verifies the evidence JSON/runtime pair but does not yet invoke the governance CLI
  or compare governance JSON with its generated runtime module. Runtime validation is fail-closed,
  and Phase 3.7 QA independently verified both representations. This is a maintenance hardening
  opportunity, not a blocker for the constrained static demo.
- QA used the local CUA browser fallback because the optional `agent-browser` executable was not
  installed.

Readiness:
- PASS for the final constrained hackathon demo. The UI is explicit about Demo versus source-backed
  scope and review status, and the active snapshot/governance release is deterministic and locally
  reproducible. It is not a claim of project verification or Monad endorsement.

Next:
- At the first due boundary, run one human-reviewed cadence refresh over only the affected records,
  record explicit decisions and reasons, generate a successor release, and repeat diff, promotion,
  rollback, and browser QA. Do not start Phase 4 or automatic ingestion without a new explicit
  scope decision.

### 2026-09-26 — Visual system architecture and "calm instrument" pass

Decisions:
- Added `docs/VISUAL_SYSTEM.md` v1: the map encodes only the relationship provenance class
  (limited sourced / demo pattern / demo inferred · illustrative); the Passport encodes exact
  evidence states; `Observed`, `Claimed`, `Attested`, and `AI-inferred` remain visibly distinct in
  Passport badges, edge tooltips/`data-evidence-state`, and the About dialog. This layered
  disclosure replaces the six-color map legend, which encoded states that are all non-verifying
  at a glance.
- Applied reviewed external references (GitCity, GoCity, CodeCity lineage, Cloudcraft,
  GitHub Skyline, The Internet Map) within the dependency-free SVG stack: one snapshot chip in
  the header, three-class legend, compact evidence cards with one-click full records, collapsed
  snapshot governance audit, horizontal district labels, solid district plates, reduced filler
  and grid contrast.

Changed:
- `src/main.js`: header data-mode chip now carries the active snapshot version; removed the
  city-top snapshot summary block; legend reduced to three provenance classes; relationship line
  stroke now derives from the provenance class while `data-evidence-state` and the tooltip keep
  the exact state; district zones use solid plates with per-zone horizontal label anchors;
  filler reduced to 22 blocks at opacity 0.13; grid opacity 0.38; Passport snapshot/governance
  metadata moved into a collapsed "Snapshot & governance audit" details before the closing note;
  full evidence records keep every field in the DOM but collapse the 16-row list behind
  "Inspect full record" with a compact quick row (source link, retrieved, quality flags) and a
  governance state badge in the record heading; left-rail Demo and review-withholding notes
  merged into one paragraph; the governance sentence was removed from the evidence section note
  (it remains in the audit block).
- `src/style.css`: three-class legend styles; `.snapshot-audit` and `.record-audit`/`.record-quick`
  styles; removed `.snapshot-summary` and `.review-note` rules; `.evidence-record-heading` wraps;
  `.snapshot-audit` grid-column on the 940px layout and version hidden at 680px.
- `docs/VISUAL_SYSTEM.md`: new architecture document fixing the encoding contract, layer model,
  focus state machine, and per-region information architecture before implementation.
- generated `dist/` assets via the existing build.

Verified:
- `node --check src/main.js` passes; `npm run build` passes with the promotion gate confirming
  `phase-3.5-v2`, 22 approved records, 6 approved relationships, and canonical SHA-256
  `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.
- Browser QA at 1440×900: load, building selection (aPriori, Monad), compact evidence cards,
  expanded full record with all fields including legacy reviewer metadata, expanded snapshot
  audit, Navigator "Show me the DeFi landscape" (filter + focused result), Graph view toggle
  with matching line classes, About dialog with all state definitions.
- Browser QA at 390×844: city-first order, no horizontal overflow (scrollWidth 390), legend
  scrolls, compact records and audit render below the map.
- Fixed during QA: `.snapshot-audit` collapsed to 2px inside the flex Passport column because
  `overflow: hidden` removes the automatic minimum size; resolved with `flex-shrink: 0`.
- DOM metrics after render: 3 legend classes, 10 buildings, 17 relationship lines, 1 audit
  block, 5 record-audit disclosures (2 project records + sourced relationship records).

Limitations:
- Presentation-only change: no data, snapshot, evidence, retrieval, or governance semantics were
  altered, and no previously disclosed field was removed from the DOM; collapsed blocks are one
  click away.
- On the map itself, the four Demo relationship patterns now share one "Demo pattern" class;
  their exact states remain distinct in Passport badges, edge tooltips, and the About dialog per
  `docs/VISUAL_SYSTEM.md`.
- District label anchors are hand-tuned to the current 10-project layout and may need retuning
  if placements change.

Next:
- Optional follow-up polish: unify the Graph-view empty state with the city filter, and consider
  a second visual pass on the Navigator result card density once real demo feedback arrives.

### 2026-09-26 — Side-panel refinement pass

Changed:
- Left rail: intro paragraph shortened to one sentence; Navigator result heading drops the
  duplicated "LOCAL · DETERMINISTIC" label (the ai-note below the card still states deterministic
  local retrieval); result rows (projects, relationships, evidence) are borderless hover rows
  with one step larger text instead of stacked bordered boxes; control-list padding tightened.
- Right rail: trust-copy deduplicated to one statement per level. Removed the separate
  "Illustrative profile…" disclaimer paragraph and the second state-row span; the state chip now
  reads "Attested · Demo" style and the status card keeps the full Demo-pattern meaning. Evidence
  section note shortened to one sentence; relationships section note shortened; closing
  passport note shortened to one sentence with the "no claim is globally verified" boundary kept.
- Evidence records: heading shows record ID + claim state only; the review-status and governance
  badges moved into the quick row next to the source link, retrieval date, and quality flags.
  Quality flags render in the quick row only when a flag exists; the "no recorded warning" text
  stays in the full record. This removes the two-line heading wrap.
- Sourced connection badges shortened from "Limited sourced · <claim>" to "Sourced · <claim>"
  so connection names are not truncated; the full "Limited sourced" vocabulary remains in the
  legend, record Data-mode row, and disclosures.
- Spacing normalization in the Passport (identity 18px, actions 16px, divider 20/16, connection
  rows 46px) and the removed `.profile-disclaimer` styles.

Files changed:
- `src/main.js`
- `src/style.css`
- `docs/WORKLOG.md`
- generated `dist/` assets via the existing build

Verified:
- `node --check src/main.js` passes; `npm run build` passes with the promotion gate confirming
  canonical SHA-256 `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.
- Desktop 1440×900: Navigator "Show me the DeFi landscape" renders the restyled result card with
  borderless rows; aPriori Passport shows single state chip, compact records with badges in the
  quick row, one-line record headings, shortened badges ("Sourced · Observed", "Demo ·
  Illustrative", "Demo · Claimed"), collapsed snapshot audit; Talus Demo-only Passport renders
  the shortened section-note and Demo placeholder panel.
- Mobile 390×844: no horizontal overflow (scrollWidth 390), passport sections readable,
  `.profile-disclaimer` and `.navigator-engine` confirmed absent from the DOM.
- No data, snapshot, retrieval, or governance semantics changed; every removed sentence has a
  surviving truthful statement at the same or deeper disclosure level (chip/status card/section
  note/audit/About).

Limitations:
- The Navigator answer paragraph length comes from retrieval templates in `src/retrieval.js` and
  was intentionally left unchanged; restyling it further would need an AI-agent copy decision.
- Sourced badges no longer spell out "Limited" on connection rows; the bounded-claim meaning is
  carried by the legend, the record cards, and the relationship disclosure text.

Next:
- Optional: Graph-view empty state with an active district filter, and a demo-day screen-by-screen
  copy review at demo resolution.

### 2026-09-27 — Lead / product — Voxel Island rework approved and specified

Context:
- After two SVG polish passes the owner judged the flat city insufficient and supplied a voxel
  island reference. Through mockup iterations (v1 sunny island → v2 dark purple per owner
  request to return to the previous palette → v3/v4 typography passes) the owner approved the
  final look `docs/research/2026-09-27-voxel-island-mockup-v4-guidebook-text.png` and said
  "давай пишем".
- Owner-approved scoped stack change: three.js for the City View rendering layer only. Graph
  View, data, evidence, retrieval, governance, and the snapshot SHA-256 gate are untouched.
- Owner decision (product): remove hackathon marks from product surfaces for a production
  release — no Demo/LOCAL/HYBRID/snapshot-version chips or disclaimer paragraphs. Trust states
  stay visible, reworded as product-language statuses; full disclosure remains in the About
  dialog and collapsed record tiers.

Decisions:
- Added `docs/VOXEL_ISLAND_SPEC.md` as the binding v2 visual architecture (scene, deterministic
  encodings, interactions, guidebook text contract, files, phasing, invariants).
- `docs/VISUAL_DIRECTION.md` now points to the spec as the active direction.

Next:
- Implement v2.1 per the spec: vendor three.js r170, `src/city3d.js`, integrate into
  `src/main.js` (SVG kept for Graph mode only), floating panel layout + guidebook styles in
  `src/style.css`, de-hackathonize HUD copy, hidden keyboard list for a11y, then `npm run build`
  and desktop/narrow QA.

### 2026-09-27 — Lead / frontend — Voxel Island v2.1 implemented and QA-passed

Changed:
- Vendored `src/vendor/three.module.min.js` (three.js r170, pinned, unmodified; no CDN at runtime).
- Added `src/city3d.js`: deterministic voxel island (instanced terrain, sand ring, plaza, avenues
  x=0/z=0, cross streets x=±14, z=+20, outer ring), project buildings from `data.js` coordinates
  (dark body, per-project roof color, monogram, provenance beacon), Monad spire, seeded filler
  houses/towers/trees, boats, stars, relationship beams colored by provenance class (dashed
  segments for AI-inferred/illustrative), selection ring + roof outline, navigator match rings +
  beacons, dim/opacity semantics mirroring the SVG version, damped orbit/zoom/pan controls,
  raycast picking, DOM label overlay, reduced-motion-aware intro scan.
- `src/main.js`: City/Graph dispatcher (SVG only for Graph mode), city3d sync wiring,
  `focusProjectOnMap` and zoom/reset routed to city3d in City mode, keyboard project list
  (visually-hidden buttons + arrow-key stepping on the canvas), collapsible Navigator/Passport,
  HUD copy pass: removed snapshot/data-mode chips, LOCAL tag, ai-note, demo-note, metrics row;
  legend reworded to Sourced/Declared/AI-inferred; footer simplified; passport rebuilt in the
  guidebook structure (Status/Evidence/Relationships, product-language statuses via STATUS_COPY,
  all disclosure fields kept in DOM); `evidenceList` placeholder wording neutralized.
- `src/style.css`: appended v2 override layer — floating panels over full-bleed canvas (≥941px),
  stacked city-first layout (≤940px), guidebook typography, canvas/label styles, collapse control.

Verified:
- `npm run build` passes (evidence verify-promotion gate, SHA-256 `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`).
- Desktop 1728×1000: island renders, selection ring + Passport sync, Graph toggle renders SVG
  constellation and pauses the canvas, Navigator prompt "Show me the DeFi landscape" focuses
  DeFi with rings/beacons and dims non-matches, district filter "Gaming" → "2 in view",
  keyboard arrow selection + reset all verified in-browser.
- Narrow 390×844: city-first stacking, floating overlays, panels stack below.

Limitations:
- Relationship hover tooltips and demo-day intro polish deferred to v2.2.
- At 390px the view toggle can clip slightly at the right edge; district ground labels can be
  occluded by tall buildings.
- Evidence record badges (Approved for snapshot / Review current) and the collapsed
  Snapshot & governance audit deliberately remain — they are disclosure, not hackathon marks.
- `src/retrieval.js` answer templates unchanged (honest scope wording kept).
- Headless QA gotcha: `--disable-gpu` kills WebGL; screenshot without it.

Next:
- v2.2: relationship hover tooltip, intro/demo polish, 390px toggle clip, optional district
  label occlusion fix; demo-script rehearsal on the new build.

### 2026-09-27 — Lead / frontend — v2.1.1: flat evidence records + slide-in panels

Owner feedback: passport text was noisy and unbalanced (record IDs, review badges, retrieved
timestamps, hash links competing with the claims); sidebars need collapse plus "passport slides
in when a project is selected".

Changed:
- Evidence record cards rebuilt flat: one claim sentence + meta line "Status · Source ↗" +
  collapsed "Inspect full record" holding the complete disclosure (record ID, review badges,
  governance, retrieved/published, quality, limitations). No badges/IDs/timestamps on the
  surface; source titles ellipsize at 230px.
- Project Status section: curated projects now read "Source-backed — exact records below; each
  carries its own status and cited scope" instead of the confusing demo `Attested` state that
  mismatched their actual records; record-level states stay visible per record and in About.
- Relationship state chips became quiet text.
- Edge slide handles: fixed `‹`/`›` tabs at screen edges toggle Navigator/Passport slide
  animations (desktop ≥941px); in-panel `—` buttons remain for stacked mobile layouts.
  Passport starts collapsed and slides in on any project selection.

Verified:
- `npm run build` green; in-browser: passport collapsed at load, expands on selection with
  flat records (Switchboard: 3 claims + statuses, zero surface badges), handles flip chevrons,
  computed position settles at right:16px.

Limitations:
- Exact claim sentences are snapshot content and were not reworded (they are the cited scope).
- Panel content remains tabbable while a panel is slid off-screen (cosmetic a11y nit).

Next:
- v2.2 backlog unchanged; add focus trap/visibility toggle for off-screen panels if it bothers
  keyboard testing.

### 2026-09-27 — Lead — Git repository initialized and published

Changed:
- `git init` (branch `main`), local identity `ILYUTKICK` (noreply email), `.gitignore` extended
  with `dist/` (build output; the handoff zip was already excluded via `*.zip`).
- Initial commit `62dff6f` (48 files: src, docs, data, scripts) pushed to the public repo
  https://github.com/ILYUTKICK/monad-city (created via gh, account ILYUTKICK).

Verified:
- `origin/main` tracks and matches local `main`; nothing generated is tracked (dist/ ignored).

Next:
- Continue v2.2 (relationship hover tooltip, intro/demo polish, 390px toggle clip, label
  occlusion) with a commit per completed task.

### 2026-09-27 — Lead / product — Phase 5 planned: full ecosystem scale

Owner direction: expand the map to the full Monad ecosystem with all relationships. Feasibility
researched and documented; the honest answer is phased scale, not a runtime indexer.

Changed:
- Added `docs/ECOSYSTEM_SCALE_PLAN.md` — Phase 5 master plan: feasibility split (rendering =
  easy; profiles = pipeline + review throughput; "all relationships verified" = reframed to
  sourced-or-inferred edges), identity/inclusion bar (Monad deployment + independent source),
  build-time intake architecture (DefiLlama/official directory seeds → scripts/ecosystem-intake.js
  → evidence proposals → phase-3.7 review → SHA-256 promotion), batches 30 → 100 → full sweep,
  rendering LOD strategy, data-driven Navigator copy, risks.
- Added `docs/PROJECT_INTAKE_PIPELINE.md` — per-project and per-batch runbook (seed artifacts in
  data/research/, identity/dedup rules, manifest drafting, proposal commands, batch discipline,
  non-goals).
- `docs/IMPLEMENTATION_PLAN.md` — Phase 5 section added; Phase 5.4 (runtime indexer) explicitly
  closed pending an owner stack decision.

Research grounding (2026-09-27): Monad mainnet launched 2025-11-24; ~150 projects at launch,
300+ reported since (Bitget); DefiLlama free API provides a machine-readable Monad protocol list.

Verified:
- Docs only; no runtime code changed; build untouched.

Next:
- Phase 5.0: scripts/ecosystem-intake.js skeleton + first seed-list export into data/research/;
  then Batch 1 (30 projects) through the intake runbook.

### 2026-09-27 — Lead — App Portal seed source + Phase 5 kickoff prompt

Changed:
- Owner supplied https://app.monad.xyz/ (official Monad App Portal): server-rendered app
  directory with taglines, category tags, links, and a gas-usage "Most Active Apps" ranking.
  Added as a canonical seed source in `docs/ECOSYSTEM_SCALE_PLAN.md` and
  `docs/PROJECT_INTAKE_PIPELINE.md` (artifact: data/research/monad-app-portal-<date>.json).
- Added `docs/PHASE5_KICKOFF_PROMPT.md` — ready-to-paste kickoff prompt for the next agent
  session: mandatory reading order, Phase 5.0 stages (seed artifacts → intake script → dry run
  of 10 draft proposals), per-stage commit discipline, non-negotiable rules, stretch backlog.

Verified:
- Docs only; build untouched.

Next:
- Next session runs the kickoff prompt (Phase 5.0, three committed stages).

### 2026-09-27 — Lead agent — Phase 5.0: intake tooling + dry run complete

Changed:
- Stage 1 — seed artifacts (commit `cc4ad08`):
  - `scripts/research/fetch-defillama-monad.js` — build-time fetch of `api.llama.fi/protocols`
    filtered to the Monad chain tag (140 protocols captured; name/symbol/category/site/address/
    slug/chains/twitter kept; nothing else). Exclusive file creation; refuses to overwrite.
  - `scripts/research/fetch-app-portal.js` — build-time capture of the official Monad App Portal
    (app.monad.xyz): statically parses the server-rendered Next.js flight payload (no JS
    executed) into 143 directory apps, 4 featured sections (with external `appLink`s), and the
    5-app "Most Active Apps" gas ranking; records HTML SHA-256 for audit.
  - `data/research/defillama-monad-2026-09-26.json`, `data/research/monad-app-portal-2026-09-26.json`
    (artifact dates are UTC capture dates; local capture time was 2026-09-27).
  - `data/research/README.md` — dating rules, new-source rules, hard boundaries.
  - `package.json` — `research:fetch-defillama`, `research:fetch-app-portal` scripts.
- Stage 2 — intake tooling (commit `6c21f7c`):
  - `scripts/ecosystem-intake.js` (dependency-free Node, build-time only): loads the latest
    seed artifacts, resolves identities across sources (normalized names incl. trailing
    variant-token stripping, cross-source registrable-domain join, App Portal slugs), applies
    the scale-plan §3 inclusion bar, drafts manifests + `proposed` evidence candidates mirroring
    the v2 App Portal record shape (official-directory-listing | mutable-url, Observed,
    artifact-observation-only), validates every candidate with the evidence-contract runtime
    gate (extended with the new proposal ids) plus workspace-shape checks, and writes dated
    outputs. Refuses to write outside `data/research/` and never touches
    `data/evidence-snapshots/`, `src/evidence-snapshots/`, or `src/`. Existing city identities
    are mirrored from `src/main.js` with fictional-demo guards (Pixel Forge/"kintsu",
    Nad Arcade vs Nad.fun) surfaced as human-review flags instead of auto-decisions.
  - `package.json` — `research:intake` script.
- Stage 3 — dry run (this commit):
  - `data/research/proposals-draft-2026-09-26.json` — 231 identity groups → **35 full draft
    proposals for NEW projects** (each with one exact-source evidence candidate), 85
    manifest-only drafts (pass the bar via DefiLlama but need exact-source work), 105 pending
    (App Portal only, no verifiable deployment record), 3 CEX exclusions, 3 existing matches
    (Kuru, aPriori, Magma). All candidates `reviewStatus: proposed`, `reviewedAt: null`.
    No relationship candidates: the seeds contain no citable typed-edge basis.
  - `data/research/intake-report-2026-09-26.json` — identity/dedupe report: per-group outcomes,
    alias/domain/slug rules, 9 near-miss alias groups left unmerged for human review,
    human-review flags, honest address-matching limitation (DefiLlama `address` is the
    dominant-chain address, not a Monad explorer record).
  - Nothing was promoted; the active `phase-3.5-v2` snapshot, its generated module, and
    governance files are untouched; exact claim sentences from approved snapshots were not
    reworded or reused.

Files changed:
- `scripts/research/fetch-defillama-monad.js`, `scripts/research/fetch-app-portal.js`
- `scripts/ecosystem-intake.js`
- `data/research/README.md`, `data/research/defillama-monad-2026-09-26.json`,
  `data/research/monad-app-portal-2026-09-26.json`, `data/research/proposals-draft-2026-09-26.json`,
  `data/research/intake-report-2026-09-26.json`
- `package.json`, `docs/WORKLOG.md`

Verified:
- `npm run build` green before every commit (evidence verify-promotion gate; SHA-256
  `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58` unchanged).
- Every drafted evidence candidate passes `validateCandidateEvidenceRecord` (runtime gate with
  extended project-id set) and the workspace-shape checks (network Monad mainnet/143, cadence
  pair, support-mode pairing, supportedProposition === scope, provenance consistency).
- Output-path guards: intake refuses to write to `data/evidence-snapshots/`, `src/`, or outside
  the repo (tested).
- Intake re-run determinism: same inputs produce identical outcomes (35/85/105/3/3).

Limitations:
- Pre-existing: `npm run evidence:validate` requires `--workspace` and cannot pass against any
  checked-in artifact today, because approved-only snapshots/exports lack retained predecessor
  lineage (e.g. `E-KURU-MEM-001`). Unrelated to this phase; the build's verify-promotion gate
  is the active snapshot validation. New review flows need a lineage-complete workspace.
- DefiLlama-only projects get manifest-only drafts: no auto-draftable exact-source claim yet;
  `protocol-registry-snapshot` requires a pinned snapshot URL that api.llama.fi cannot provide.
- Deployment addresses are not captured: DefiLlama's `address` field is dominant-chain only;
  explorer verification is Batch 1 source work (stated in every draft manifest).
- Districts are derived from a category mapping and are illustrative layout only; unmapped
  categories stay unassigned for human decision (33 DeFi / 1 Gaming / 1 Infrastructure of the
  35 full drafts).
- Portal taglines/blurbs are publisher marketing copy, kept attributed and out of descriptions;
  descriptions are neutral registry statements.
- Seed artifacts and drafts are dated 2026-09-26 (UTC capture date).

Next:
- HUMAN REVIEW WINDOW for the Phase 5.0 dry-run proposals (see Phase 5.0 handoff above) —
  Batch 1 selection, source inspection, phase-3.7 decisions; then `evidence:prepare`
  into a lineage-complete workspace, snapshot v3, promotion, city layout, and data-driven
  Navigator copy (scale plan §5.1). Do not self-approve these proposals.
- Deferred seed extension: retain DefiLlama `oraclesBreakdown` to source future
  relationship candidates (needs the curated-six endpoint contract expanded first).
- v2.2 visual backlog (separate tasks/commits): relationship hover tooltip on beams; 390px
  view-toggle clip; district ground-label occlusion.

### 2026-09-27 — Lead agent — Phase 5.1 Batch 1: 30 projects live (snapshot phase-3.5-v3)

Owner authorization: after reviewing the Phase 5.0 dry-run artifacts, the owner approved
implementation ("Я все проверил — переходим к реализации"). That owner decision is the human
review window for this batch; per-record decisions below record it through the official
evidence workflow with controlled metadata. Nothing beyond the reviewed drafts was approved.

Changed (commits `e93cc86`, `1254263`, `0c6ffc7`, `cf99c5a`):
- Batch composition: `scripts/research/select-batch-1.js` ranks the 35 full intake drafts by
  DefiLlama TVL (batch-composition signal only — never rendered) and selects 30
  (`data/research/batch-1-selection-2026-09-27.json`); 5 deferred to Batch 2. The defillama
  fetch retains `tvl` since the 2026-09-27 artifact.
- Entity contract expansion (trust/data change per EVIDENCE_DATA_CONTRACT.md §Phase 5.1):
  `KNOWN_PROJECT_IDS` = curated six + `BATCH1_PROJECT_IDS` (30); workflow/validators accept
  the union; per-version projection sizes pinned in `EXPECTED_SNAPSHOT_COUNTS` (v2 22/6,
  v3 52/6); contract `evidenceFingerprint` now treats `reviewMetadata` as review-only (the
  inline contract's own rule).
- Review workspace (`scripts/build-batch-1-workspace.js`): rebuilds the full retained
  candidate history (24 evidence + 8 relationships, including the three superseded
  predecessors recorded `stale`/`superseded` at the 2026-09-22 refresh instant), imports the
  legacy decisions inline under the opaque transition token `reviewer:r-c929f58a13e3588e`
  (schema-mapping only, not an actor), appends the 30 drafted records as `proposed`, and
  emits the decision plan (`data/research/batch-1-review-plan-2026-09-27.json`). All 30
  approvals were recorded per record through `npm run evidence:review` with the owner token
  `reviewer:r-2722378757f140a8`, method `manual-artifact-and-payload-inspection`, reason
  `supported-with-limitations`, at `2026-09-27T11:34:28Z`.
- Snapshot `phase-3.5-v3`: 52 approved evidence records / 6 relationships, created and
  reviewed `2026-09-27T11:34:47Z`, canonical SHA-256
  `4e515a65186b2525693a3df612778a82dcde241a136d70264a0b776ecb283b39`, promoted to
  `src/evidence-snapshots/phase-3.5-v3.generated.js`. The v2 pair and its governance
  companion remain untouched as the rollback boundary. `evidence:verify-promotion` now
  validates the v3 pair (package.json paths updated).
- Governance display is inline: the runtime synthesizes the decision view and cadence rows
  from each subject's `reviewMetadata` (58 governed subjects, 0 due at the release as-of);
  fixture self-checks became data-driven.
- City wiring: 30 deterministic batch-1 entries in `src/main.js` (uniform height 50 — every
  batch-1 project carries exactly one record; neutral descriptions; district palette; spiral
  placement inside the island, ≥44 units apart, via `scripts/research/compose-batch-1-city.js`).
  The fictional Demo building "Pixel Forge" reidentified from the legacy internal id
  `kintsu` to `pixel-forge` (two demo edges re-endpointed) so the real Kintsu could enter.
  Graph-view viewBox widened for the 40-node layout.
- Navigator copy is data-driven: sourced-subset answers now state live coverage
  ("36 of 40 shown projects carry exact records") computed from the snapshot and project
  list (scale plan §7); AI_NAVIGATOR.md and the evidence contract updated to match.

Verified:
- `npm run build` green on every commit (verify-promotion gate; v3 SHA confirmed).
- `evidence:load` + `evidence:promote` explicit confirmations passed; runtime contract
  validates 52 records / 36 represented projects / 58 governed subjects at load.
- In-browser QA (1440×900 and 390×844): 40 buildings render with synced keyboard list and
  district counts (DeFi 32, AI 1, Infrastructure 4, Gaming 2, Identity 1); selecting a
  batch-1 building opens a Source-backed passport with the exact portal-listing claim,
  governance action, and site; Navigator "lending" returns 5 batch-1 projects with the
  36-of-40 coverage note and evidence references; Graph view renders 40 nodes; narrow layout
  has no horizontal overflow; zero console errors.

Limitations:
- Batch 1 is directory-listing evidence only (one portal record per project): it proves
  listing membership at the capture instant, not deployments, activity, safety, or
  legitimacy. Explorer/contract verification remains Batch 2 source work.
- DeFi district is dense (32 buildings); label LOD and data-driven district layout land in
  Phase 5.2.
- No new relationships: batch-1 records support no typed edges; the relationship graph is
  unchanged (17 active edges).
- The transition token maps historical decisions without actor attribution, mirroring the
  v2 companion semantics; tokens are opaque and confer no authority.

Next:
- Phase 5.2 (owner go-ahead): Batch 2 toward 100+ — explorer/contract verification for
  batch-1 deployments, portal-only pending queue resolution, label LOD, data-driven
  district layout, performance budget measurement.
- Refresh cadence: batch-1 records are 30-day-cadence directory listings; the governance
  report computes due dates from the inline metadata.

### 2026-09-27 — Lead agent / visual — Phase 5.2 (pulled forward): district archipelago

Owner direction after seeing the single-island Batch 1 render: «Давай сделаем отдельно
каждый остров по дистриктам, потому что на одном острове ничего непонятно». The data-driven
district-layout item of scale plan §5.2 is pulled forward as the visual answer.

Changed:
- `src/city3d.js` — the single voxel island became an archipelago:
  - one island per district cluster, derived from the buildings themselves (centroid center,
    farthest-building radius + beach margin), plus a small central islet for the Monad spire —
    re-placing buildings reshapes islands automatically, no hardcoded terrain geometry;
  - wobbly coastline, per-island sand ring, plaza at each island center; roads removed
    (they crossed buildings at district scale); filler houses/trees per island with
    island-scaled caps, still seeded and never beside a project;
  - district ground labels moved to each island's outward shore (offset 0.78·radius,
    opacity 0.74, depthTest off — always-on wayfinding), sized per island;
  - water plane widened to r=340, fog 240–560, shadow camera ±90, camera default
    radius 176 / elevation 0.62, zoom clamps 38–215, pan clamp ±60, district focus radius 92;
  - relationship beams now span water between islands — the graph metaphor reads as bridges.
- `scripts/research/compose-archipelago-city.js` — deterministic composer rewriting ONLY the
  x/y coordinates of all 40 project entries in src/main.js: Monad at (0,0), five district
  clusters on a ring (radius 520 project units, angles 45°/117°/189°/261°/333°), buildings
  spiraling out per island (gap 54–68 project units), cross-island clearance ≥150 asserted.
  Ring angles and spiral order encode no ranking.
- `src/main.js` — archipelago coordinates applied; SVG graph view plate and viewBox became
  data-driven (fit to projected node bounds, zoom recenters on the plate dynamically).

Files changed:
- `src/city3d.js`, `src/main.js`, `scripts/research/compose-archipelago-city.js`, `docs/WORKLOG.md`

Verified:
- `npm run build` green (SHA-256 gate unchanged — visual-only change, snapshot untouched).
- In-browser 1440×900: whole archipelago frames at the default camera; district ground labels
  (AI, IDENTITY, GAMING, INFRASTRUCTURE, DEFI) read on their shores; DeFi focus shows the
  32-building quarter on its own island with the DEFI shore label; district filter dims
  foreign islands — much more readable than the single-island dimming; beams cross water as
  bridges; passport/Navigator/selection unaffected; Graph view auto-fits 40 nodes.
- 390×844: city-first layout intact, no horizontal overflow, zero console errors.

Limitations:
- DeFi quarter remains dense (32 buildings at one label tier) — per-tier label LOD and
  building-count-based heights stay in the Phase 5.2 backlog.
- Beam hover hitboxes and beams ignore water height (flat at y=2) — acceptable; arched
  bridges are a possible polish item.
- Ring angles/spiral are fixed in the composer; Batch 2 (100+) will need multi-ring islands
  and per-island label tiers.

Next:
- Continue Phase 5.2 per plan: Batch 2 intake, explorer/contract verification, label LOD,
  performance budget.

### 2026-09-27 — Lead agent — Phase 5.2: Batch 2 live (snapshot phase-3.5-v4, 130 buildings)

Owner direction: «Остров DEFI нужно увеличить… Давай перейдем в Phase 5.2». Two deliverables:
the DeFi island de-densification (+ label LOD pulled from §5.2/§6) and Batch 2.

Changed (commits `207f4c3`, batch-2 commits):
- DeFi island roomier: archipelago composer spiral gap 54→76 (DeFi), ring radius 520→660;
  camera default radius 300 after Batch 2 growth.
- Label LOD (scale plan §6): at archipelago range only selected / navigator-matched / hovered
  buildings plus two landmark buildings per district (and Monad) keep name pills; the full
  label layer returns when the camera radius drops under 95. District ground labels stay
  always-on. Intro stagger capped at 45·70ms so 130 buildings build up in ~3.3s.
- Batch 2 intake (90 projects, 36 → 126 evidence-backed):
  - `scripts/ecosystem-intake.js` v2: manifest-only groups (§3-bar pass via DefiLlama alone)
    now receive exact-source registry candidates — `official-directory-listing` |
    `mutable-url` against `https://api.llama.fi/protocols`, publisher DefiLlama, status
    Observed, bounded to the capture instant. Vocabulary interpretation documented in
    EVIDENCE_DATA_CONTRACT.md §Phase 5.2 (publisher carries the registry; limitations state
    the third-party nature); reviewer rejection path documented.
  - District category map extended (risk curators, onchain capital allocator, CeDeFi, NFT
    marketplace, cross-chain bridge, privacy, leveraged farming, payments, liquid restaking,
    liquidity automation, uncollateralized lending → districts).
  - `scripts/research/select-batch-2.js`: selects all §3-bar-passing drafts not already live —
    85 registry + 5 deferred Batch 1 portal drafts
    (`data/research/batch-2-selection-2026-09-27.json`).
  - `scripts/build-batch-2-workspace.js`: carried v3 projection as-is (no re-decisions) + the
    four superseded predecessors re-recorded stale (opaque transition token) + 90 appended
    `proposed`; all 90 approved per record through `npm run evidence:review` with the owner
    token `reviewer:r-…` (see `data/research/batch-2-review-plan-2026-09-27.json`) at
    `2026-09-27T13:06:37Z`, method `manual-artifact-and-payload-inspection`, reason
    `supported-with-limitations`.
- Snapshot `phase-3.5-v4`: 142 approved evidence records / 6 relationships, created and
  reviewed `2026-09-27T13:08:02Z`, canonical SHA-256
  `a13d37a032bdc6d65cf721480aff6896428ec401b0301acfa5ca320ec75963d7`, promoted to
  `src/evidence-snapshots/phase-3.5-v4.generated.js`; verify-promotion paths switched; v3
  pair remains as the rollback boundary.
- `src/evidence.js`: `BATCH2_PROJECT_IDS` (90), `KNOWN_PROJECT_IDS` → 126,
  `EXPECTED_SNAPSHOT_COUNTS['phase-3.5-v4'] = {142, 6}`.
- City wiring: `scripts/research/compose-archipelago-city.js` now INSERTS city entries for
  selected-but-unwired proposals (from the reviewed draft manifests) and re-places all
  buildings — 130 entries total (114 DeFi, 10 Infrastructure, 4 Gaming, 1 AI, 1 Identity,
  1 Monad islet); DeFi island radius grew to ~48 world units on ring 660.

Verified:
- `npm run build` green per commit (verify-promotion gate; v4 SHA confirmed; runtime contract
  validates 142 records / 126 represented projects at load).
- In-browser 1440×900: 130 buildings render; label LOD keeps the far view clean (9 pills);
  Morpho Blue passport shows the Source-backed registry claim with capture date; Navigator
  "oracle" query reports the data-driven coverage «126 of 130 shown projects carry exact
  records»; district counts 114/1/10/4/1; 390×844 without overflow; zero console errors.
- Performance budget (scale plan §6): 60 fps sampled over 2s at the default camera with 130
  buildings (measured in-browser; the IAB tab must be foreground — rAF suspends otherwise).

Limitations:
- Batch 2 evidence is directory/registry listing only: it proves listing membership at the
  capture instant — no deployments, activity, safety, or legitimacy. Explorer/contract
  verification stays open work; the registry vocabulary interpretation is flagged for
  governance review (rejectable per record without invalidating the batch).
- DeFi island at 114 buildings still has a single label tier; building-count heights and
  multi-tier LOD remain backlog. No new relationships (17 active edges unchanged).
- 105 App-portal-only pending projects still need deployment resolution (explorer work).

Next:
- Governance window for batch-2 records (30-day cadence computed from inline metadata).
- Batch 3 / full sweep (§5.3): pending-queue deployment resolution, relationship candidates,
  refresh runbook execution.

### 2026-09-27 — Lead agent — Phase 5.2 exit confirmed + §5.3 groundwork

Changed:
- `docs/IMPLEMENTATION_PLAN.md` — Phase 5 status: 5.0/5.1/5.2 marked executed with commit
  pointers; Phase 5.3 (full sweep) named next; Phase 5.4 stays closed.
- §5.2 exit items re-verified in-browser at 130 buildings: Navigator name search finds
  batch-2 projects ("Accountable"), district filter scopes to "Infrastructure · 10 in view",
  keyboard selection + Source-backed passport work, zero console errors.
- Oracle seed extension (§5.3 prep): `scripts/research/fetch-defillama-monad.js` retains a
  compact `oracles` field (Monad-chain oracle entries only, with proof URLs);
  `data/research/defillama-monad-2026-09-27-b.json` captured (same-day artifact, `-b` suffix
  per data/research/README.md). `scripts/ecosystem-intake.js` oracle-observation block now
  reads the compact field.

Verified:
- Build green; intake smoke run with the `-b` seed passes; oracle observations section works.

Limitations:
- The oracle basis is EMPTY today: DefiLlama's Monad entries declare oracles for exactly 1
  protocol and name neither Pyth nor Switchboard. No relationship candidates were drafted —
  the draft envelope's `candidateRelationships` stays honestly empty. Future refreshes may
  populate it; nothing is forced from thin air.

Next:
- Phase 5.3 needs an owner decision: explorer tooling for the 105 App-portal-only pending
  projects (deployment resolution), and the refresh cadence start (batch-1/2 records are
  30-day-cadence; the runtime governance report tracks due dates).

### 2026-09-27 — Lead agent / frontend — v2.2 stretch: beam tooltip + narrow-layout fixes

Changed:
- `src/style.css` (commit `8c76604`): fixed the 390px view-toggle overlap. Root cause: in the
  ≤940px layer the legend strip pins `top: 12px; left: 12px` with no right constraint and
  paints after the toggle, so at 390px its chips ran across the City/Graph toggle. The legend
  now reserves the toggle corner (`right: 168px`, `156px` at ≤420px) and the toggle buttons
  compact at ≤420px. Verified overlap-free at 320/390/480/768/940.
- `src/city3d.js` (commit `b374f0f`): district ground labels render above buildings — the
  label planes now use `depthTest: false` + `renderOrder 10`, so tall buildings no longer
  occlude them (scale plan: district ground labels stay always-on).
- `src/city3d.js` + `src/style.css` (commit `a44fe9d`): relationship hover tooltip on beams.
  Invisible thicker hitbox per beam (zero-opacity, volume for the raycaster); buildings keep
  hover/click priority; tooltip names the two projects, relationship type, and evidence state,
  reusing `RELATIONSHIP_TYPES`/`RELATIONSHIP_STATES` from `src/data.js`. Trust semantics:
  sourced edges read "Limited source-backed record; supports only its cited scope — not
  verification, endorsement, or current operation"; Demo edges show their existing state
  meaning. Tooltip hides on drag, click, pointer leave, and Graph view; hovered beam
  brightens via the same base-opacity formula used by `sync()`.

Files changed:
- `src/city3d.js`, `src/style.css`, `docs/WORKLOG.md`

Verified:
- `npm run build` green per commit (SHA-256 gate unchanged).
- In-browser at 1440×900 and 390×844: demo-edge tooltip ("Kuru ↔ Pyth Network · Onchain
  interaction · Onchain observed" + demo meaning) and sourced-edge tooltip ("Monad ↔ aPriori ·
  Ecosystem membership · Sourced · Observed" + bounded-scope disclosure) both render; building
  click still opens the Passport and hides the tooltip; Graph view hides it; no console errors;
  no horizontal overflow at 390px; district labels readable across buildings.
- Phase 5.0 stages unaffected (visual-only changes).

Limitations:
- Beam tooltips are desktop hover (pointer without buttons); touch users keep the Graph View
  and Passport as relationship surfaces.
- Ground labels with `depthTest: false` show through buildings behind them — intended
  always-on wayfinding; opacity 0.55 keeps them background.
- The legend wraps to two rows at 390px (three at 320px) to keep the toggle clear.

Next:
- HUMAN REVIEW WINDOW for the Phase 5.0 dry-run proposals (see Phase 5.0 handoff above) —
  Batch 1 selection, source inspection, phase-3.7 decisions.



## Open questions

- Which independent third-party source could support a genuinely bounded `Attested` record without implying endorsement?
- Which stable opaque reviewer references should future maintainers assign without encoding names,
  organizations, wallet identity, or authority?
- What stability threshold should the limited subset meet before any broader indexer or discovery work is considered?

## Handoff template

```md
### YYYY-MM-DD — Agent / role

Changed:
- 

Verified:
- 

Limitations:
- 

Next:
- 
```
