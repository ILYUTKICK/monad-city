# Monad City — Visual Direction

## Current direction

The owner approved the Voxel Island rework on 2026-09-26/27 (mockup iterations
`docs/research/2026-09-27-voxel-island-mockup-v4-guidebook-text.png` is the approved look):
City View moves to a three.js night-island in the previous version's dark purple palette, panels
follow the guidebook text contract. The binding architecture is `docs/VOXEL_ISLAND_SPEC.md`.
Everything below (hierarchy, color semantics, city rules, motion, copy) still applies where the
spec does not override it.

## Earlier correction

The Astra prototype is visually strong but too noisy in places. The next pass should reduce information density and decorative competition without flattening the concept.

## Desired feeling

Calm, precise, slightly futuristic, trustworthy, spatial, and observant. It should feel closer to an instrument panel or map room than a game HUD or crypto casino.

## Hierarchy

At any moment there should be one dominant focus:

1. the selected building or Navigator result;
2. its Passport/evidence;
3. surrounding relationships;
4. district context;
5. secondary metrics and decoration.

If every building glows, none is selected. If every label is loud, the map is unreadable.

## Layout principles

Desktop:

- left: compact Navigator and filters;
- center: city or graph;
- right: Passport;
- the center view must remain visually dominant;
- side panels should be quieter than the selected object.

Mobile:

- city first;
- Navigator as a compact bottom or top control;
- Passport opens as a focused sheet or section;
- do not stack every panel before the user sees the city.

## Color semantics

Use color for meaning, not decoration:

- Observed: cool neutral blue-gray;
- Claimed: warm amber;
- Attested: restrained green;
- AI-inferred: violet or magenta, always visibly uncertain;
- selected: bright lavender outline, not a permanent glow;
- relationship: muted lavender;
- inferred relationship: dashed and lower contrast.

## City rules

- Buildings need readable silhouettes and labels.
- Districts should be identifiable through restrained zones, not oversized text.
- The selected building gets one clear elevation/outline treatment.
- Unselected buildings should remain legible but quiet.
- Decorative filler buildings must never look like real projects.
- The central Monad network object should be visually distinct from application projects.
- Bridges must communicate a relationship type, not merely add visual interest.

## Motion rules

- Use motion to explain state changes: focus, construction, relationship discovery, and Navigator results.
- Avoid constant pulsing, rotating, floating, or glowing.
- New project construction should be short and readable.
- Relationship highlighting should guide the eye from source to target.
- Respect reduced-motion preferences.

## Typography and copy

Submission polish, 2026-10-08: use self-hosted Instrument Sans throughout the interface,
with weight and size carrying hierarchy. Keep map furniture quiet, primary reading copy
near-neutral, and reserve semantic color for district orientation and provenance. Design
variance 3 / motion 2 / density 5; this remains a spatial application, with no landing-page
composition or decorative animation. The supplied `taste-skill` and `redesign-skill`
guidance informs typography and preservation of the existing product.

- Short labels beat paragraphs on the map.
- Use one clear headline and one supporting sentence.
- Keep trust language concrete: “Claimed by project wallet” is better than “Trusted project.”
- Avoid hype words such as “official,” “verified,” or “safe” unless the evidence model supports them.

## Avoid

- generic metaverse aesthetics;
- excessive glassmorphism;
- neon everywhere;
- too many badges at once;
- unreadable tiny text;
- dashboard widgets without a user decision behind them;
- a chat panel that hides the map;
- decorative bridges without provenance.

