# RC2 integrity review

Date: 2026-10-12  
Scope: independent read-only review of the RC2 archive, manifest, `dist/`, source/data inputs, and Git closure. No application code, credentials, private browser captures, reference images, design archives, or wallet screenshots were inspected or changed.

## Decision

**Archive integrity passes. Git closure remains a release gate.**

The reviewed RC2 ZIP is internally valid and its 65 files match the release manifest, current `dist/`, and current source/data inputs exactly. The candidate is reproducible only after every required modified or untracked build input listed below is included in the release commit. Rebuild that exact commit and compare the 65 file hashes before deployment.

## Hash and file-set proof

| Check | Result |
| --- | --- |
| Archive | `artifacts/submission/monad-city-2026-10-12-rc2.zip` |
| Archive bytes | `1,258,833`, exact manifest match |
| Archive SHA-256 | `4e10b9847ac0086803e67230be053ee877216fe66adae9a44fd74866b5428eab`, exact manifest match |
| ZIP integrity | Pass; `unzip -t` reported no compressed-data errors |
| Manifest entries | 65 |
| ZIP entries | 65; exact path-set match with the manifest |
| `dist/` files | 65; exact path-set match with the manifest |
| Current root inputs | All 65 manifest paths exist |
| Manifest ↔ ZIP | 65/65 byte sizes and SHA-256 hashes match; zero mismatches |
| Manifest ↔ `dist/` | 65/65 byte sizes and SHA-256 hashes match; zero mismatches |
| Manifest ↔ source/data inputs | 65/65 byte sizes and SHA-256 hashes match; zero mismatches |

This proves the current archive is an exact package of the currently reviewed build output. It does not prove that the current Git `HEAD` can reproduce it, because the candidate still depends on working-tree changes and untracked files.

## Required exact-build commit closure

The current `npm run build` first verifies the promoted v9 snapshot and registry bundle, then copies `index.html`, all of `src/`, and all of `data/registry/` to `dist/`. The following **29 modified or untracked paths must be present in the release commit** to reproduce the reviewed RC2 contents and pass its build gates.

### Build gates and active approved snapshot

- `package.json`
- `scripts/evidence-workflow.js`
- `scripts/registry/registry-io.js`
- `scripts/registry/releases.js`
- `data/evidence-snapshots/phase-3.5-v9.json`

These paths select v9, admit the reviewed `approved-record-derivation` method, pin the v8/v9 releases, and verify the active v9 JSON/runtime pair plus registry bundle.

### Modified runtime inputs already represented in RC2

- `src/city3d.js`
- `src/evidence.js`
- `src/main.js`
- `src/registry-config.js`
- `src/retrieval.js`
- `src/style.css`

### Untracked public build inputs already represented in RC2

- `src/city-buildings.js`
- `src/city-environment.js`
- `src/city-label-layout.js`
- `src/city-layout.js`
- `src/relationship-tooltip.js`
- `src/evidence-snapshots/phase-3.5-v8.generated.js`
- `src/evidence-snapshots/phase-3.5-v9.generated.js`
- `data/registry/phase-3.5-v8/manifest.json`
- `data/registry/phase-3.5-v8/evidence-proofs.json`
- `data/registry/phase-3.5-v8/relationship-proofs.json`
- `data/registry/phase-3.5-v9/manifest.json`
- `data/registry/phase-3.5-v9/evidence-proofs.json`
- `data/registry/phase-3.5-v9/relationship-proofs.json`
- `data/registry/deployments/monad-testnet-v8-preparation.json`
- `data/registry/deployments/monad-testnet-v9-preparation.json`
- `data/registry/deployments/monad-testnet-v9-publication.json`
- `data/registry/deployments/monad-testnet-v9-publication-finality.json`
- `data/registry/deployments/monad-testnet-v9-record-checks.json`

The remaining 41 RC2 artifact inputs are already tracked and clean relative to `HEAD`; they will remain in the release commit without additional staging work.

## Verification and release-support closure

The following files do not change the 65-file production artifact, but they should accompany the release so the committed source can reproduce the current validation and publication history:

- `data/evidence-snapshots/phase-3.5-v8.json` — approved v8 source snapshot for its checked-in generated module/proof bundle and v8/v9 comparison tests.
- `scripts/ai-checks.test.js` — current 194-sourced-relationship expectation.
- `scripts/registry/registry.test.js` — current 194-proof active-registry expectation.
- `scripts/registry/publication.test.js` — v8/v9 predecessor, timestamp, payload-preservation, and commitment checks.
- `tools/registry-publish/core.js` — v8/v9 predecessor pins and publication-time validation used by publication tests/tooling.
- `tools/registry-publish/app.js`, `tools/registry-publish/index.html`, and `tools/registry-publish/requests/phase-3.5-v9.json` — the operator state and unsigned request corresponding to the published v9 release.
- `contracts/script/prepare-publication.mjs` and `contracts/script/publication-e2e.mjs` — the current preparation and disposable-chain successor checks.

`data/evidence-snapshots/phase-3.5-v8.workspace.json`, `data/evidence-snapshots/phase-3.5-v9.workspace.json`, and `scripts/research/derive-v8-monad-edges.mjs` are provenance/workspace material. They are not required by `npm run build` and are not part of the 65-file RC2 artifact; retain them only if the release commit is intended to preserve the full derivation workspace.

Documentation changes can be committed for release history, but they are not build inputs. Reference-image trees, design archives, browser captures, wallet screenshots, prior candidate archives, and the RC2 ZIP itself are not required in the production release commit.

## Bounded Passport correction review

The reviewed `src/main.js` contains both final Passport corrections:

- the header derives its displayed state from `projectRecords[0].status`, so the primary sourced record shows `Claimed` where applicable instead of inheriting an illustrative project state;
- Passport scroll resets only when `passportTabProject !== project.id`, preserving scroll during same-project tab renders and resetting it on a project jump.

The current `src/main.js` SHA-256 is `3348b88a36339720ffd44cb317f1f3716c156b89b3753d13f7746730024d961a`, and that exact hash matches the manifest, ZIP, `dist/`, and source file. This was a structural integrity review; no browser interaction was repeated here.

## Exact-commit release check

After the release commit is created:

1. Confirm the 29 required build-closure paths above are tracked in that commit.
2. Run `npm run build` from the exact commit.
3. Recompute the relative path, byte size, and SHA-256 for every file under `dist/`.
4. Require exactly 65 files and compare every row with `docs/research/2026-10-12-submission-release.json`; any added, missing, or changed file invalidates RC2 and requires a new manifest/archive.
5. Run the release test suites using the committed verification-support files.
6. Deploy only that recorded commit, then verify the immutable deployment and production alias.

No new build was run during this review because the lead will rebuild the frozen release commit and perform the definitive 65-file comparison.
