# data/research/ — ecosystem intake seed artifacts

Research inputs for the Phase 5 intake pipeline (`docs/PROJECT_INTAKE_PIPELINE.md`). These
files are **seeds, not runtime data and not evidence**: the browser never reads them, nothing
here is an approved claim, and nothing here enters `data/evidence-snapshots/` or
`src/evidence-snapshots/` without the full human review and promotion gate.

## Files

| Artifact | Produced by | Content |
| --- | --- | --- |
| `defillama-monad-<date>.json` | `npm run research:fetch-defillama` | DefiLlama protocol listing filtered to the Monad chain tag (name, symbol, category, site, address, slug, chains, twitter; `tvl` for batch composition only) |
| `monad-app-portal-<date>.json` | `npm run research:fetch-app-portal` | Official Monad App Portal: full app directory (name, slug, tagline, categories, blurb), featured sections with external links, "Most Active Apps" gas-usage ranking |
| `proposals-draft-<date>.json` | `npm run research:intake` | Dry-run intake output: draft manifests + evidence-record candidates, all `proposed`, never approved |
| `intake-report-<date>.json` | `npm run research:intake` | Identity/dedupe/inclusion report for the same run |
| `batch-1-selection-<date>.json` | `npm run research:select-batch-1` | Batch 1 composition: top 30 full drafts by DefiLlama TVL + deferred remainder |

## Dating rules

- Artifact dates are the **UTC date of capture** (`YYYY-MM-DD`), taken from the fetch instant
  recorded in `fetchedAtUtc` inside each artifact. A capture at `2026-09-26T23:15Z` local on
  `2026-09-27` is therefore dated `2026-09-26`.
- Never rename or re-date an existing artifact: the filename is the capture identity that
  proposals and review decisions will cite.
- Rerunning a fetch on a new UTC date creates a new file; it never overwrites or replaces the
  old one. Old artifacts stay as the audit trail.
- One capture per source per UTC date. If a second capture is genuinely needed on the same
  date, use an explicit `--out` path suffix (e.g. `-a`) and explain it in the WORKLOG.

## Ranking boundary

`defillama-monad` artifacts carry `tvl` since 2026-09-27. It is a **batch-composition input
only** (scale plan §5.1 sizes Batch 1 as the top 30 by activity/TVL). TVL never reaches
manifests, placement, building size/order, Navigator copy, or any city visual — evidence
status is the only visual distinction, per the trust model.

## Adding a new source

1. Check `docs/PROJECT_INTAKE_PIPELINE.md` §1 first: the source must serve the intake bar
   (verifiable Monad deployment + independent source), not claim semantics.
2. Write a fetch script under `scripts/research/`, dependency-free Node only, build-time use.
3. The script must: record `fetchedAtUtc`, `sourceUrl`, and (for HTML) a `sha256` of the exact
   bytes parsed; use exclusive file creation (refuse to overwrite); and never write outside
   `data/research/`.
4. Keep only fields with intake value. Everything captured becomes reviewer surface — every
   field must be attributable to the source.
5. Add the artifact to the table above and to the seed-source table in
   `docs/PROJECT_INTAKE_PIPELINE.md` before committing.
6. Marketing copy captured from any source (taglines, blurbs) stays attributed to its
   publisher and is never treated as independent verification of a capability.

## Hard boundaries

- No fetch script may write to `data/evidence-snapshots/`, `src/evidence-snapshots/`, or
  `src/` at all.
- No runtime (browser) code may import or fetch anything in this directory.
- Drafted claims from these seeds enter the evidence workflow only as `proposed` candidates
  with a human-checkable exact source, and only via `scripts/ecosystem-intake.js` output that
  a human then reviews. Directory text is never auto-approved.
