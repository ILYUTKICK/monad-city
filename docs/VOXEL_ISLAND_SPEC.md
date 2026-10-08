# Monad City — Voxel Island Spec (Visual Architecture v2)

Status: approved by product owner 2026-09-26/27 (mockup iterations v1–v4, final approved
`docs/research/2026-09-27-voxel-island-mockup-v4-guidebook-text.png`). This document is the
binding architecture for the three.js City View rework. It supersedes the SVG city rendering in
VISUAL_SYSTEM.md; VISUAL_SYSTEM rules that remain binding are listed in §7.

## 1. Approved direction

- City View is a real-time 3D voxel island (three.js, vendored ES module, no bundler).
- Graph View stays the existing SVG implementation.
- Data, evidence, retrieval, governance semantics are unchanged; the snapshot SHA-256
  promotion gate is untouched.
- Mood: the previous version's dark "map room" (#0a0a0f) translated to a night voxel island —
  dark indigo terrain, glowing per-project roofs, lavender accents. Not a sunny toy island.

## 2. Reference-to-decision mapping

| Source | Take | Reject |
| --- | --- | --- |
| Voxel city-builder reference (owner video) | island frame (water/beach), voxel volume, one light, terminal-ish query line | Mayor's Order / builder chat / autonomous construction; "LIVE" wording |
| Previous app version (owner: "вернуть фиолетовым") | dark background, per-project accent colors, monogram letters, dark panels | flat SVG buildings |
| Guidebook infographic (owner reference for text) | one family, weight hierarchy, thin rules, bold label + muted description, no dot-chains | mixed-font panels, caps eyebrows, colored chips |

## 3. Scene spec (City View)

Terrain: rounded-square voxel island (instanced boxes), dark checker grass `#272238/#242030`,
sand ring `#3f3656`, dark water plane `#1e1a2d`, island skirt to water. Plaza (r≈5) at center
`#453d63`. Roads: avenues x=0 and z=0, cross streets x=±14, z=+20, outer ring m≈26.5, color
`#3a3454`. Layout constants live in `src/city3d.js` and are deterministic (no runtime randomness
beyond a seeded hash).

World mapping: world X = project.x / 10, world Z = project.y / 10, building height =
project.h / 10, footprint 4.1 × 3.4. Monad sits at origin as the distinct white-lavender spire.

Buildings: dark body `#574a80` + pedestal `#3a3356`, bright roof slab in `project.color`, dark
monogram letter (`project.abbr`) on the roof, provenance beacon micro-cube (sourced `#8ebbd7`
when approved snapshot records exist for the project; demo pattern `#7d7490` otherwise;
AI-inferred `#9d81bd` when the project state is AI-inferred). Filler fabric: ≤ 40 small dim
houses/towers and ≤ 30 dark trees, seeded scatter, never within 4.5 units of a project, never
labelled. Ambient detail: boats, stars. One directional light with soft shadows + ambient.

Relationships: elevated thin beams at y≈1.9 colored by provenance class — approved sourced
`#8ebbd7`, demo pattern `#7d7490`, AI-inferred/illustrative `#9d81bd` — with the same
visibility/opacity semantics as the SVG lines (active, navigator-match, filtered-out).

Labels: project name pills are DOM overlays projected from 3D (webfont quality, pointer-events
none); district labels are flat ground textures (mono caps, district color ~0.55 alpha).

Camera: perspective, default azimuth ≈ 45°, elevation ≈ 35°, orbit + zoom + limited pan,
damped; clamped elevation 15°–75°, radius 45–160. `prefers-reduced-motion`: no intro animation,
no idle motion (there is no idle motion anyway).

## 4. Interaction contract

1. Intro "city scan" (one-time, ≤ 2s, staggered build-in + slight camera sweep; skippable on
   pointerdown; disabled under reduced motion).
2. Click/tap building (raycast) → select: Passport syncs, lavender ground ring + roof outline,
   camera glides to frame.
3. Navigator result → beacons (floating octahedra) over matches, non-matches dimmed, camera
   focus flight; relationship beams highlight by class color.
4. District filter → filtered-out buildings drop to low opacity.
5. City/Graph toggle → 3D pauses (graph shows SVG); no background rendering in graph mode.
6. Keyboard: a visually-hidden button list mirrors project selection (focus = select + focus
   flight); canvas itself is focusable and arrow keys step through projects.

## 5. HUD and typography (guidebook contract)

- Submission polish (2026-10-08): Instrument Sans is the one self-hosted UI family,
  weights 400/500/600/700, with the upstream OFL license and provenance in
  `src/assets/fonts/instrument-sans/`. The existing brand wording is unchanged.
  Mono is reserved for record identifiers, addresses, tool traces, and roof monograms.
  Query inputs and district billboards use the UI family; canvas labels refresh after font load.
- Reading text: 14px/1.55; panel titles: 16px/600; Passport project name: 24px/600;
  supporting text: 12–13px. Counts use tabular numerals.
- No "·" separator chains in panel copy; em-dash allowed; two-line "bold label + muted
  description" is the default text pattern.
- Section headers: 13.5px/600 with a thin bottom rule; no caps, no letterspacing.
- Colors in panel text only for relationship classes (matching beams/legend).
- Navigator: left floating panel, large, collapsible. Passport: right floating panel,
  collapsible, text-only structure (Status / Evidence / Relationships), all previously disclosed
  fields remain in the DOM (collapsed `<details>` tiers unchanged).
- No hackathon marks in product surfaces: no "Demo"/"LOCAL"/"HYBRID"/snapshot-version chips, no
  disclaimer paragraphs. Trust states remain visible as product-language statuses
  ("Claimed — stated by the project; independent proof pending."). The About dialog keeps the
  full evidence-state definitions and dataset disclosure.

## 6. Files

- `src/vendor/three.module.min.js` — vendored three.js, pinned r170, no modifications.
- `src/city3d.js` (new) — scene, deterministic builders, orbit controls, raycast, sync API.
- `src/main.js` — mount city3d into `#city-stage`, keep SVG only for Graph mode, wire
  select/focus/filter/highlights, HUD copy pass (de-hackathonize), hidden keyboard list.
- `src/style.css` — floating panel layout (over full-bleed canvas), guidebook panel styles,
  collapse control, label overlay, responsive sheets; appended override section.
- `index.html` — unchanged shell.

Rollback: pre-edit backup in `/tmp/monad-city-backup-v2/`; Graph view and all data paths remain
intact, so reverting `main.js`/`style.css` restores the previous prototype.

## 7. Invariants preserved (from AGENTS.md / VISUAL_SYSTEM.md)

- Observed / Claimed / Attested / AI-inferred stay distinct in the Passport and About dialog.
- Relationship provenance classes stay three on the map (sourced / demo pattern / inferred).
- A sourced edge renders as class 1 only if it is an approved snapshot record.
- Illustrative records never read as verification or endorsement; statuses use product language
  without asserting proof.
- All evidence record fields stay rendered in the DOM; collapsing is presentation only.
- `npm run build` must pass (evidence verify-promotion gate included).
- No backend, wallet, live pipeline, external API at runtime; three.js is a static vendored
  asset, no CDN dependency.

## 8. Phasing and acceptance

- v2.1 (this pass): island + buildings + labels + selection + navigator focus + filters + HUD
  restructure + keyboard support. Acceptance: `npm run build` green; desktop 1440×900 and
  390×844 QA of the AGENTS.md flow (load, select, passport, navigator, city/graph, filter,
  search, narrow); no console errors; reduced-motion respected.
- v2.2 (next): intro scan polish, relationship hover tooltips, mobile gesture tuning,
  demo-script alignment.
