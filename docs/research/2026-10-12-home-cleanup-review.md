# Home screen cleanup — UX / QA review

Date: 2026-10-12. Owner: `home_visual_review` (documentation only).

## Scope

The owner's screenshot shows a readable city surrounded by equally prominent controls:
three suggested questions, five district filters with repeated counts, a long status strip,
four connection modes, the provenance disclosure, a repeated footer slogan and map controls.
The large DeFi island also reaches the bottom controls. The cleanup should reduce competing
furniture while retaining discovery and exact trust distinctions.

## Recommended hierarchy

1. City and its district names remain the main visual focus. Keep City / Graph immediately reachable.
2. Keep the Navigator search and one useful DeFi suggestion visible; move the other suggestions
   into a labelled native disclosure. Existing prompt buttons and deterministic retrieval stay intact.
3. Replace the long always-open connections strip with a compact `Connections` disclosure.
   Its summary should show the active mode. Preserve Overview / Project / All / Off and their
   `aria-pressed` states; Project remains disabled until a project is selected.
4. In the expanded controls, retain the distinction between navigation-only district routes and
   project relationships. Keep source / declared / inferred definitions accessible in the same panel.
5. Reduce the count chip to the current visible project count and preserve a quiet visible
   `Static curated dataset` disclosure after removing the repeated footer slogan.
6. Use spacing and quieter borders before lowering text contrast. Keep keyboard focus visible.
7. Refit the initial camera to the free map column with bottom clearance; shrinking controls alone
   does not ensure that the whole DeFi island is visible.

## Verification targets

- Initial desktop view: whole city framed without DeFi entering the bottom controls.
- Suggested questions: one visible initially; remaining questions reachable by keyboard.
- Connections: opens by mouse and keyboard; all four modes work in City and Graph; selected
  mode stays accurate after Passport / Navigator actions; disclosure closes without losing state.
- Overview routes continue to say navigation only. Unsupported / inferred edges and exact
  evidence limitations are not relabelled or hidden in the Passport.
- Expanded connections / provenance popup contributes to label exclusion zones. Existing code
  tracks `.legend` bounds, so an absolutely positioned child may need separate exclusion handling.
- Count chip updates for filters, selected projects, external neighbors and searches. Existing
  941–1200px and mobile overrides hide count text and need inspection after markup changes.
- Desktop with both panels open; 390px narrow view; district deep link; City / Graph toggle;
  reset; search; Passport connections and publication check remain usable.
- No extra animation, provider call, evidence change or new dependency is needed.

## Review status

Integrated-code review passed. Reviewed the final `src/main.js`, `src/style.css` and
`src/city3d.js` diff read-only:

- One visible prompt and a native `More prompts` disclosure preserve all original prompt actions.
- Connections uses native disclosure semantics; active-mode text and `aria-pressed` values
  refresh with map state. Project is disabled without selection. Escape restores focus and
  outside pointer actions close the disclosure without changing the chosen mode.
- The open popup is explicitly included in label exclusion zones, refreshed by the existing
  300ms exclusion cache. Popup touch buttons have 44px minimum height on narrow screens.
- Explicit `[hidden]` overrides protect the quiet initial count against older display rules.
  The later `.connections-panel .legend-summary` rule wins over legacy mobile hiding rules,
  so Overview's navigation-only disclosure remains readable when the panel opens.
- The footer retains `Static curated dataset`. Exact statuses, provenance definitions,
  record metadata, publication checks and immutable source / registry data are unchanged.
- Desktop bottom framing reserves 78px after shortening furniture; map geometry still needs
  settled-render verification to establish that the whole DeFi island is in-frame.

The lead reports passing search → Beefy → Project → Graph, all connection modes, disabled
Project before selection, Escape focus return, native prompt disclosure keyboard activation,
390px scroll-width containment, and Passport Sources date checks. Build also passed. Those
are lead-supplied runtime results; this agent has not independently controlled the browser.

Final screenshot / settled geometry review is still pending. Include the longest narrow
district context (`Infrastructure district — select a building`) in that geometry check,
because its text can wrap above the controls.
