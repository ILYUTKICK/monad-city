# Public release audit

Date: 2026-10-12  
Role: read-only production monitor. Git, deployment, alias, and project-setting mutations are owned by the release lead.

## RC2 release boundary

- RC2 archive SHA-256: `4e10b9847ac0086803e67230be053ee877216fe66adae9a44fd74866b5428eab`
- RC2 archive contents: 65 files
- Intended production branch: `main`
- Release commit: `4d22c8c790c9e129d5d660f3be60675291b4d1c9`
- Current production deployment: `dpl_9fwUmXGEiatryoKaprJyaosLZ1KE`
- Final alias verification: passed, 65 of 65 RC2 files match

The release is complete only when one pushed Git commit is identified, a `READY` production deployment reports that exact commit, and the public alias serves the v9 evidence/runtime and RC2 interface assets.

## Confirmed Vercel target

| Field | Value |
| --- | --- |
| Team | `ilyutkick's projects` |
| Team ID | `team_rX2aKo4gs7tCSBACaKYkCwPC` |
| Project | `monad-city` |
| Project ID | `prj_ootYSvs7o3eLHox690lGti1B4E1K` |
| Git repository | `https://github.com/ILYUTKICK/monad-city` |
| GitHub repository ID | `1389856087` |
| Production branch | `main` |
| Public alias | `https://monad-city.vercel.app/` |

Before the RC2 release, the latest deployment was `dpl_GiqwMLm7vSsdW8We37wanMibxu1i`, state `READY`, for commit `0cd8cd36b80dfb157944132eb2835eca0230eedf`. That deployment serves phase-3.5-v7 and remains a rollback reference rather than the RC2 release.

## Monitoring calls

After the release commit is pushed, locate only deployments for that exact commit:

```js
list_deployments({
  teamId: 'team_rX2aKo4gs7tCSBACaKYkCwPC',
  projectId: 'prj_ootYSvs7o3eLHox690lGti1B4E1K',
  sha: '<RELEASE_COMMIT_SHA>',
  branch: 'main',
  target: 'production',
  limit: 5,
})
```

Inspect the returned deployment by immutable ID:

```js
get_deployment({
  teamId: 'team_rX2aKo4gs7tCSBACaKYkCwPC',
  idOrUrl: '<DEPLOYMENT_ID>',
  withGitRepoInfo: 'true',
})
```

The linked Git integration should deploy a push to `main` automatically. If the release lead finds that no deployment was created and chooses the explicit Git-source fallback, the prepared mutation is:

```js
create_deployment({
  teamId: 'team_rX2aKo4gs7tCSBACaKYkCwPC',
  forceNew: '1',
  requestBody: {
    name: 'monad-city',
    project: 'prj_ootYSvs7o3eLHox690lGti1B4E1K',
    target: 'production',
    gitSource: {
      type: 'github',
      repoId: 1389856087,
      ref: '<RELEASE_COMMIT_SHA>',
    },
    projectSettings: {
      framework: null,
      buildCommand: 'npm run build',
      installCommand: '',
      outputDirectory: 'dist',
      nodeVersion: '24.x',
    },
  },
})
```

This audit did not call `create_deployment` or make any release mutation. The release lead performed the deployment actions after explicit user approval.

## Deployment result

The clean release commit is `4d22c8c790c9e129d5d660f3be60675291b4d1c9`, message `Release source-grounded v9 city and submission UI polish`. Before deployment, the release lead rebuilt a clean Git archive and matched all 65 RC2 hashes. The recorded suites passed with 21 AI checks, 11 onchain checks, and 10 registry checks.

The Git push to remote `main` succeeded. Exact-SHA deployment queries initially returned no results, so the release lead used the prepared API fallback with the commit SHA as the Git ref. That created:

| Field | Value |
| --- | --- |
| Deployment | `dpl_8ywKsvY6AgkCj62TnZSN4pfcNnqW` |
| URL | `https://monad-city-7ar5o546u-ilyutkicks-projects.vercel.app/` |
| Created | `2026-10-12T11:27:59.950Z` |
| Ready | `2026-10-12T11:28:08.080Z` |
| State / target | `READY` / `production` |
| Git SHA | `4d22c8c790c9e129d5d660f3be60675291b4d1c9` |
| Git ref | exact commit SHA, by explicit pin |
| Alias error | none |

Vercel's Git integration then completed its delayed automatic deployment for the same commit:

| Field | Value |
| --- | --- |
| Deployment | `dpl_9fwUmXGEiatryoKaprJyaosLZ1KE` |
| URL | `https://monad-city-nujj4hn7o-ilyutkicks-projects.vercel.app/` |
| Created | `2026-10-12T11:29:08.948Z` |
| Ready | `2026-10-12T11:29:19.452Z` |
| State / target | `READY` / `production` |
| Source | Git |
| Git ref | `main` |
| Git SHA | `4d22c8c790c9e129d5d660f3be60675291b4d1c9` |
| Alias error | none |

The later automatic deployment is the project's reported latest deployment and owns `monad-city.vercel.app`, `monad-city-ilyutkicks-projects.vercel.app`, and `monad-city-git-main-ilyutkicks-projects.vercel.app`. Both production deployments resolve to the same exact release commit. The duplicate is a timing result of the delayed automatic deployment appearing after the explicit fallback; it does not represent a content fork.

## Production acceptance checks

The immutable deployment URL must pass before the alias is accepted:

1. Deployment state is `READY`, target is `production`, and reported Git SHA exactly equals the release commit. The API fallback reports the pinned commit SHA as its ref; the later automatic deployment reports `main`. Both resolve to the pushed commit on remote `main`.
2. `/src/evidence.js` selects `phase-3.5-v9`.
3. `/data/registry/phase-3.5-v9/manifest.json` returns HTTP 200 and its canonical release fields match the reviewed local manifest.
4. `/src/relationship-tooltip.js` returns HTTP 200.
5. `/src/registry-config.js` contains the reviewed v9 publication ID and manifest URI.
6. The public root returns HTTP 200 and no authentication challenge.
7. `https://monad-city.vercel.app/` resolves to the same deployment and serves the same checked bytes.

## Public byte verification

After the later automatic deployment owned the public alias, the audit fetched all 65 paths from the RC2 manifest directly from `https://monad-city.vercel.app/`. Every request returned HTTP 200. Every byte length and SHA-256 matched `docs/research/2026-10-12-submission-release.json`, including the binary font files.

Result: **65 checked, 65 matched, zero missing files, zero byte or hash mismatches**.

This proves that the current public alias serves the reviewed RC2 output. In particular:

- `index.html` matches RC2;
- `src/evidence.js` matches the v9 RC2 runtime;
- `data/registry/phase-3.5-v9/manifest.json` matches the reviewed v9 manifest;
- `src/registry-config.js` matches the reviewed v9 publication configuration;
- `src/relationship-tooltip.js` is present and matches RC2;
- all retained registry proof/audit JSON, generated evidence modules, application modules, styles, vendor code, and font assets match RC2.

## Public runtime smoke test

The release lead reloaded the public alias in a clean browser session and observed:

- the new City and Passport interface loaded;
- no-key Navigator search for Beefy passed using deterministic local retrieval;
- evidence record `E-BEEFY-KINTSU-ASSET-001` completed its read-only publication check as **matched, active, and unrevoked** on chain ID `10143` at block `70385689`;
- continuing from Kintsu to Graph passed, with the current Kintsu Passport overview visible at the top;
- no browser console errors or warnings were captured.

The publication-check screenshot is `docs/research/2026-10-12-public-v9-publication.png`.

## Final observation

Release status: **passed**. Commit `4d22c8c790c9e129d5d660f3be60675291b4d1c9` is on remote `main`; Vercel's current production deployment is `READY` for that exact SHA; the public alias serves all 65 RC2 files byte-for-byte; and the keyless search, Passport/Graph continuation, and read-only Monad Testnet publication check passed on the public site.
