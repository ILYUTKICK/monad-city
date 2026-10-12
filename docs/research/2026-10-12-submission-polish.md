# Submission UI corrections — 2026-10-12

Three requested changes were delegated separately, with shared main.js edits serialized.
Immutable source records, v9 publication bindings and Merkle payloads are unchanged.

## Passport

The common renderer now displays Source review and the actual UTC review date instead of
snapshot/policy phase codes. Full review dates, cadence and bounded source/claim information
remain inspectable. All 176 project Sources tabs and expanded audits passed the browser
check for a displayed Oct 11, 2026 date and absence of phase/hackathon labels in that audit.
At 390×844, the date remains displayed and document width stays 390px.

Audit: [All Passport checks](2026-10-12-submission-passport-checks.json).
Capture: [Bean Exchange](2026-10-12-submission-passport.png).

## Connection disclosure

City record, grouped-route and district summary tooltips use a common plain-language
formatter. Graph native titles use the same formatter. Titles use “and”, text is neutral,
and dot-separated technical labels are replaced by a source-specific description and
explicit claim status. District routes retain their navigation-only meaning.
All 205 formatter outputs have no double arrow, middle-dot separators or missing values.
Actual hover on Monad/Lumiterra displayed its registry observation, Observed status,
source and bounded saved-entry scope. Measured text colors: rgb(200,194,207) and
rgb(168,161,176). Dynamic tooltip bounds kept the 320×150.4px popup inside the map.
Graph's Monad/Rug Rumble title displayed the same saved-registry explanation.

Capture: [Tooltip](2026-10-12-submission-tooltip.png).

## Graph

City screen-space callouts are hidden while Graph is active. Graph callouts derive from
the displayed node layout inside the same SVG world group. Initial browser checks showed
zoom scaling both by 1.15 and a pan shifting both label/node by +15.26px/+8.72px.
Keyboard activation of the DeFi callout opened the DeFi district.

Final annotations target 13px initial text, scale from the actual SVG fit, include their
bounds in framing and reserve clearance below the City/Graph toggle. Browser measured
15.5px text boxes, Infrastructure starting at y=144.2 below the toggle bottom y=124.
The final zoom scaled label/node widths by 1.15; pan shifted both +12.7147px/+7.2656px.
At 390×844 all five labels remained present, City labels hidden and page width 390px.
Focused Beefy Graph showed 7 nodes and a readable 18px district text box.
Temporary viewport override was reset. Navigator Beefy search and district navigation passed.

Capture: [Graph](2026-10-12-submission-graph.png).

JS syntax, diff-check and the final build passed, including unchanged v9 snapshot/proof
integrity. No browser behavior was simulated with injected events; the tooltip was checked
with actual pointer movement and the cards through normal keyboard/tab actions.

## Pre-release card fixes

Submission rehearsal also corrected Passport header status to the primary exact record
(legacy profile patterns remain in the dataset) and reset scroll only on project changes.
Monad, Kuru, Pyth and Switchboard headers display their primary Claimed source records.
Following Kintsu from a scrolled Beefy Passport resets scroll to zero and keeps its title visible.
The frozen release candidate is RC2; see `2026-10-12-submission-release.json`.
