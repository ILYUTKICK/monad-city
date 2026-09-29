# Monad City — District Experience Corrective Implementation Prompt

Use this prompt with the coding agent that will repair the completed D1–D6 district experience.
The task is a focused corrective pass, not a redesign and not a new product phase.

---

You are the lead implementation agent for Monad City. Work only in the current Monad City
repository.

The D1–D6 district experience is already implemented for DeFi, Infrastructure, AI, Gaming, and
Identity. A live browser review on 2026-09-29 found several functional and responsive regressions.
Fix every issue in this prompt and verify the complete flow. Do not stop after fixing only the
first defect.

## Read before editing

Read these files in order:

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/VISUAL_DIRECTION.md`
5. `docs/TRUST_MODEL.md`
6. `docs/AI_NAVIGATOR.md`
7. `docs/DISTRICT_EXPERIENCE_SPEC.md`
8. `docs/IMPLEMENTATION_PLAN.md`
9. `docs/WORKLOG.md`

Then inspect the current source and reproduce the problems at `http://localhost:5173/` before
editing.

Before changing files, state:

- which files you own;
- the root cause of each reproduced defect;
- the smallest implementation plan that fixes the defects without changing product semantics.

Do not treat an earlier WORKLOG statement that QA passed as current proof. Re-run the live flows
described below. The browser behavior observed on 2026-09-29 is the regression baseline.

## Product invariants

- Monad City is a source-grounded ecosystem graph presented as a restrained city. It is not a
  metaverse, a generic 3D directory, or a game.
- The city remains the dominant interface.
- A district is a navigational category, not an endorsement, official geography, integration,
  trust score, or proof of activity.
- Keep Observed, Claimed, Attested, AI-inferred, and Demo/illustrative states distinct.
- Source-backed means only that an exact bounded record has a source. It does not make the whole
  project verified, safe, legitimate, active, or endorsed.
- Every factual relationship must resolve to its existing relationship object and evidence IDs.
- Do not infer relationships from shared district, category, proximity, or visual placement.
- Preserve the dependency-free vanilla JavaScript/CSS and vendored Three.js architecture.
- Do not add a backend, database, wallet flow, indexer, crawler, automatic discovery, external
  API, external LLM, or new dependency.
- Do not change evidence snapshots, sources, claims, contract addresses, review statuses, or
  governance metadata merely to make a UI query pass.
- Product UI copy stays in English.

## Scope

Repair the existing implementation. Do not rebuild the district experience from scratch and do
not invent new features. Preserve:

- the five district routes;
- Overview, Projects, Relationships, and Evidence tabs;
- City/Graph views;
- district filters and floating district buttons;
- Project Passport and District Lens transitions;
- deterministic local Navigator retrieval;
- project search, filters, keyboard access, camera controls, and browser Back;
- the current calmer visual direction and the distinct sparse/dense district personalities.

## P0 — Fix district-aware Navigator grounding

### Reproduction A: source-backed projects

Route:

```text
#/district/defi/overview
```

Run the existing suggested prompt:

```text
Which DeFi projects have source-backed evidence?
```

Observed regression:

- Navigator returns `NO RESULT`;
- District Lens simultaneously reports that the district contains projects with source-backed
  records.

Required behavior:

- classify this as a district + evidence query;
- return the DeFi projects that actually have eligible local evidence records under the current
  data contract;
- cite the relevant exact evidence records or bounded aggregate references;
- derive all counts and IDs from the active data;
- never hardcode the current DeFi count;
- do not call these projects globally verified;
- preserve uncertainty and exact-scope disclosure;
- focus/highlight the same projects named in the answer.

If the result set is too large for the answer UI, apply the existing deterministic limit and state
that the displayed list is a bounded subset. The map action and result list must use the same IDs.

### Reproduction B: sourced district relationships

On the same route, run:

```text
Show sourced relationships in DeFi.
```

Observed regression:

- Navigator returns relationship context involving only Talus, Moca Network, Monad, and
  Switchboard;
- all returned projects are labelled outside the DeFi district;
- the answer omits the sourced relationships that the DeFi District Lens itself displays.

Required behavior:

- classify this as a district-scoped relationship + evidence-state query;
- a matching relationship must have at least one endpoint inside the active district;
- return only typed relationships whose sourced/evidence state satisfies the query;
- include a directly connected external endpoint when the real edge crosses the district
  boundary;
- cite every returned relationship's existing evidence IDs;
- focus the exact returned edges and endpoints in Graph View;
- never convert an illustrative, declared, or AI-inferred edge into a sourced edge;
- return an honest no-result only when no qualifying relationship exists.

### General Navigator requirements

- Repair the deterministic retrieval rules rather than special-casing complete answer strings.
- Support equivalent wording such as `projects with cited evidence`, `source-backed projects`,
  `sourced edges`, and `relationships with evidence` through the existing controlled vocabulary.
- Keep project evidence state and relationship evidence state separate.
- District scope should rank and constrain results as specified in
  `docs/DISTRICT_EXPERIENCE_SPEC.md`; scope expansion is allowed only when relevant and must be
  disclosed.
- `no-result`, `insufficient-evidence`, `unsupported-request`, and `invalid-query` must remain
  distinct.
- Highlighting communicates relevance, not verification.
- Add or update deterministic local regression coverage for both reproduction queries if the
  repository has an established test/check pattern. Do not add a test dependency.

## P1 — Remove desktop page overflow

Reproduction:

1. Open `http://localhost:5173/` at `1440×900`.
2. Leave the initial Passport in its collapsed/off-canvas state.
3. Inspect the document width.

Observed regression:

```text
window.innerWidth: 1440
document.documentElement.scrollWidth: 1784
collapsed Passport rect: left 1444, right 1784, width 340
```

Required behavior:

- a collapsed left or right panel must not contribute to root document width;
- the main city must not acquire horizontal page panning;
- preserve the existing edge handle and expand/collapse behavior;
- do not solve this by permanently hiding Passport, clipping Passport content, or shrinking the
  city into an unreadable column;
- verify both expanded and collapsed panels;
- verify the home city and every district route at `1440×900` and `1280×720`;
- `document.documentElement.scrollWidth` must not exceed `window.innerWidth` by more than one
  rounding pixel.

## P1 — Fix the mobile district header/map collision

Reproduction:

1. Open `#/district/defi/overview` at `390×844`.
2. Inspect the top of the city stage.

Observed regression:

- the relationship legend and City/Graph switch overlap the district plaque;
- the `DEFI` title is partially hidden and the controls compete for the same vertical space.

Required behavior:

- no overlap between the local tab bar, relationship legend, City/Graph switch, and district
  plaque;
- the district title remains readable or is deliberately removed at this breakpoint;
- keep the city first in the mobile reading order;
- keep all required controls reachable with at least 44×44px touch targets where applicable;
- no root horizontal overflow;
- page scrolling outside the canvas must not be trapped by camera zoom/orbit handling;
- preserve the map-first composition instead of placing long Navigator or Passport content above
  the city.

Apply the solution to all five district routes, not only DeFi.

## P1 — Make the large-district Relationships view readable

Reproduction:

```text
#/district/defi/relationships
```

Observed regression:

- Graph View renders the full large district population at once;
- approximately 140 labels collapse into an unreadable mass;
- the relationship graph becomes visual texture instead of an inspection tool.

Required behavior:

- the dedicated Relationships tab defaults to the relationship subgraph, not every project in
  the district;
- include only nodes incident to the currently qualifying typed relationships plus their direct
  external endpoints;
- keep external endpoints visibly labelled as outside the district;
- filters for Sourced, Declared, and AI-inferred must recompute the visible subgraph;
- selecting a relationship highlights its exact endpoints and edge;
- preserve an honest empty state when a district/filter has no matching relationships;
- do not manufacture edges to make the graph denser;
- if an existing `Expand to ecosystem` or equivalent control is present, preserve it; otherwise
  do not add a new broad graph mode solely for this fix.

The Overview city may continue to show the complete district population. This reduction applies
to the analytical Relationships view.

## P2 — Correct generated copy and pluralization

Fix data-driven grammar everywhere in District Lens, sparse-district notes, project rows, and
accessible text.

Known regressions:

```text
1 projects
This district currently contains 1 projects.
Illustrative profile profile
```

Expected examples:

```text
1 project
This district currently contains 1 project.
Illustrative profile
```

Do not fix only these literal strings. Centralize or reuse a small dependency-free pluralization
helper so all data-derived singular/plural labels remain correct.

## Trust/data checks during the fix

- Do not change a record from Demo to source-backed to satisfy a query.
- Do not change an edge's evidence state to make it appear in the sourced filter.
- A project with one bounded observed registry/App Portal record may be described as having a
  source-backed record, but not as wholly verified or active.
- Publisher claims remain Claimed even when the publisher is authoritative about its own claim.
- Observed evidence supports only the inspected artifact and timestamp.
- Relationship answers must cite the relationship evidence, not merely one endpoint's project
  record.
- Existing stale, unavailable, incomplete, conflicting, rejected, review-due, and Demo behavior
  must remain conservative.

## Required verification

After implementation:

1. Run syntax checks for every changed JavaScript file.
2. Run:

   ```sh
   npm run build
   ```

3. Verify the home city at `1440×900` and `1280×720`:
   - no horizontal overflow with both panels expanded and collapsed;
   - building selection opens the correct Passport;
   - district buttons open the correct routes;
   - City/Graph, district filter, global search, Navigator, zoom, reset, and browser Back work.

4. Verify every district:
   - Overview, Projects, Relationships, Evidence;
   - District Lens → Passport → back to District Lens;
   - City/Graph toggle;
   - evidence-mode and type/status filters;
   - sparse AI and Identity districts remain honest and visually sparse;
   - Gaming keeps Demo profiles distinct;
   - Infrastructure keeps real cross-district endpoints visible.

5. Verify these Navigator queries exactly and with one equivalent paraphrase each:

   ```text
   Which DeFi projects have source-backed evidence?
   Show sourced relationships in DeFi.
   Show lending projects and their available evidence.
   Find AI projects with active contracts.
   Is Kuru safe?
   A deliberately unknown project name.
   ```

   Confirm the correct distinction between results, insufficient evidence, unsupported request,
   and no result. Confirm answer IDs, map focus, evidence references, and visible projects/edges
   stay synchronized.

6. Verify mobile at `390×844`:
   - city appears before long-form panels;
   - no plaque/control overlap on any district;
   - tabs remain usable;
   - the page can scroll past the canvas;
   - Passport and District Lens remain readable;
   - no horizontal overflow.

7. Check:
   - keyboard tab navigation and project selection;
   - focus restoration when leaving a district;
   - reduced-motion behavior by code review if browser emulation is unavailable;
   - zero console errors, unhandled dialogs, or failed local requests.

## Completion rules

- Do not claim completion if either of the two DeFi Navigator reproduction prompts still returns
  the wrong result set.
- Do not claim completion if the desktop root still overflows horizontally.
- Do not claim completion if the mobile district plaque or controls overlap.
- Do not claim completion if the DeFi Relationships graph still renders an unreadable full
  district label cloud by default.
- Do not weaken trust language or evidence requirements to make tests pass.
- Do not make unrelated visual changes or broad refactors.

Only after all checks pass, update `docs/WORKLOG.md` with:

- root causes;
- files changed;
- behavior fixed;
- build and browser verification results;
- trust/data checks;
- known limitations;
- the next recommended task.

The final handoff must list changed files, verification performed, remaining limitations, and any
acceptance item that could not be verified. Do not report an unverified item as passed.

