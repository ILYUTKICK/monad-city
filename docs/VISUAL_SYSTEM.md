# Monad City — Visual System Architecture

Version 1 — "Calm instrument" pass. This document fixes the visual architecture before the
implementation that follows it. It applies the reviewed external references to the existing
dependency-free SVG prototype without changing the stack, the data model, or evidence semantics.

## Reference-to-decision mapping

| Reference | What we take | What we reject |
| --- | --- | --- |
| GitCity (gitcity.co) | one short copy line per surface; a single minimal HUD chip; open-source map of repos → districts → buildings | full WebGL world; 3D globe |
| GoCity | three-item legend discipline: encode the minimum that supports a decision | metric-driven procedural buildings |
| CodeCity / city-metaphor literature | every visual parameter must mean something; decorative filler must never read as data | metric-only encodings |
| Cloudcraft | unified materials, one light direction, clean aligned ground, quiet grid | light theme; per-object material variety |
| GitHub Skyline | one idea per screen; details live one level down | — |
| The Internet Map | minimal always-on elements; detail on demand (hover, expand) | — |

## Encoding contract (the key decision)

The map and the Passport answer different questions, so they encode different detail levels.
This is layered disclosure, not information removal.

### Map (City and Graph views) encodes provenance class only — three visual classes

1. **Limited sourced** — approved `sourced-limited` edge: solid light-blue stroke `#8ebbd7`.
2. **Demo pattern** — `onchain-observed`, `owner-claimed`, `third-party-attested` Demo edges:
   solid muted stroke `#7d7490`.
3. **Demo inferred · illustrative** — `AI-inferred` and `illustrative` edges: dashed violet
   stroke `#9d81bd`.

The exact evidence state of every edge remains visibly distinct where decisions are made:
in the edge `<title>` and `data-evidence-state` attribute, in the Passport connection badges
("Demo · Onchain", "Demo · Claimed", …), and in the About dialog state definitions.
`Observed`, `Claimed`, `Attested`, and `AI-inferred` therefore stay distinct in the evidence UI;
the map no longer spends six colors on states that are all non-verifying at a glance.
A sourced edge that is not an approved snapshot record must never render as class 1.

### Passport encodes exact states

- Tier 1, always visible: identity, Demo state chip, description, actions, compact evidence cards
  (record ID, claim, state badges, source link, retrieval date, quality flags, governance state).
- Tier 2, one click: per-record `<details>` "Inspect full record" with the complete evidence list
  including governance and reviewer-action metadata. All fields stay in the DOM; collapsing is
  presentation only and must never delete a disclosed field.
- Tier 3, one click: a collapsed "Snapshot & governance audit" block at the bottom of the Passport
  holds snapshot version, created/reviewed instants, policy version, `asOf`, and summary counts.

### Header carries the single snapshot chip

`HYBRID · phase-3.5-v2 · approved snapshot + Demo` appears once, in the header. The City top-left
block shows only eyebrow, headline, and three dataset metrics; the Passport top shows identity,
not snapshot admin.

## Layer model (SVG render order)

| Layer | Content | Rules |
| --- | --- | --- |
| L0 | ground diamond, grid | single light direction, grid opacity ≤ 0.4 |
| L1 | district plates + labels | solid low-contrast plates (no dashed strokes); horizontal labels, one per zone |
| L2 | filler fabric | ≤ 22 uniform blocks, opacity ≤ 0.13, never beside a real building, never labelled |
| L3 | relationship lines | the three provenance classes above; exact state in tooltip/AT only |
| L4 | buildings | pedestal + body + top; one material family; per-district hue only |
| L5 | labels | all project labels visible; selected label emphasized |
| L6 | HUD | context row, zoom controls, legend (Relationships toggle + 3 classes), map hint |

## Focus state machine

Exactly one accent source wins: `selected` (lavender outline + pin + emphasized label) >
`navigator-match` (blue outline) > `hover` (brightness) > `idle`. Navigator highlighting dims
non-matching buildings instead of adding glow. No element pulses, rotates, or floats.

## Information architecture per region

- **Left rail:** one intro sentence, AI Navigator card, district list, one combined Demo note
  (review-withholding sentence merged into it).
- **City:** headline block (eyebrow + headline + 3 metrics), map, legend with 3 classes,
  context row, controls.
- **Passport:** identity → state row → description → actions → Project evidence (status card +
  compact records) → Typed relationships (unchanged structure; sourced records inside also use
  the collapsed full-record block) → Snapshot & governance audit (collapsed) → closing note.

## Non-negotiable invariants preserved

- No stack, backend, wallet, live pipeline, or external API change; prototype stays
  dependency-free vanilla JS/CSS/SVG.
- No data, snapshot, evidence, retrieval, or governance semantics change; only presentation
  and grouping change, and every previously disclosed field remains rendered in the DOM.
- Illustrative records never read as verification, endorsement, or onchain fact.

## Acceptance criteria for this pass

- First-time user understands the page in five seconds; the selected building is the dominant
  accent on screen.
- Legend shows exactly three relationship classes; About dialog still defines all states.
- Every evidence record's full field set is reachable in one click from the Passport.
- `npm run build` passes (promotion gate included).
- Desktop and narrow-viewport QA pass with no console errors and no horizontal overflow.
