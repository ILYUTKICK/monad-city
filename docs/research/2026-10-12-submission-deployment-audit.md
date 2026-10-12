# Submission deployment readiness audit

Date: 2026-10-12  
Scope: read-only deployment and public-surface audit. No deployment, push, upload, project-setting change, or application-code change was performed.

## Decision

The public URL exists and is healthy, but it is **not the current submission candidate**.

`https://monad-city.vercel.app/` returns HTTP 200 without authentication. It currently serves the `phase-3.5-v7` application from Git commit `0cd8cd36b80dfb157944132eb2835eca0230eedf`. The local submission candidate contains the v9 evidence/registry release and later City, Graph, Passport, and relationship-tooltip work, but those changes are still in a dirty working tree. A reviewable release commit does not yet exist.

Do not present the current public URL as the final submission build. The minimum release requirement is to commit the intended candidate, verify that exact commit, deploy that exact commit to the existing Vercel project, and re-check the production alias.

## Exact public target

| Item | Observed value | Status |
| --- | --- | --- |
| Public production URL | `https://monad-city.vercel.app/` | HTTP 200, public |
| Vercel team | `ilyutkick's projects` / `team_rX2aKo4gs7tCSBACaKYkCwPC` | Resolved |
| Vercel project | `monad-city` / `prj_ootYSvs7o3eLHox690lGti1B4E1K` | Resolved |
| Production deployment | `dpl_GiqwMLm7vSsdW8We37wanMibxu1i` | `READY` |
| Immutable deployment URL | `https://monad-city-er9x69fgi-ilyutkicks-projects.vercel.app/` | Current production deployment |
| Git source | GitHub `ILYUTKICK/monad-city`, branch `main` | Connected |
| Deployed commit | `0cd8cd36b80dfb157944132eb2835eca0230eedf` | Same as local `HEAD`, but local work is uncommitted |
| Deployment created | `2026-10-10T19:32:00.971Z` | Predates v9/UI candidate |

The project also has the aliases `monad-city-ilyutkicks-projects.vercel.app` and `monad-city-git-main-ilyutkicks-projects.vercel.app`. Password protection is disabled. Vercel SSO protection is configured as `all_except_custom_domains`; the custom production alias above was directly confirmed public.

The repository has no local `.vercel/project.json`. The target was resolved through the authenticated, read-only Vercel connector and the Git repository association. Any release action must explicitly use the team and project identifiers above rather than infer a target from local metadata.

## Production freshness evidence

The production deployment is operational but materially stale:

- `/src/evidence.js` returns HTTP 200 and imports `phase-3.5-v7.generated.js`.
- `/data/registry/phase-3.5-v7/manifest.json` returns HTTP 200.
- `/data/registry/phase-3.5-v9/manifest.json` returns HTTP 404.
- `/src/relationship-tooltip.js` returns HTTP 404.
- A browser check showed the older Passport layout and a `phase-3.5-v7` audit label.

The deployed commit equals local `HEAD`, which can be misleading: the intended release is entirely after `HEAD` in the working tree. At audit time Git reported 28 changed tracked files and 39 untracked entries. The tracked diff alone was 3,471 insertions and 894 deletions. It includes v9 publication/configuration work and major interface changes, while important release files also exist only as untracked files. Deploying from the current commit would reproduce v7; deploying directly from the dirty directory would make the public build hard to reproduce or review.

The current local `dist/` does match the current source for `main.js`, `city3d.js`, `style.css`, `relationship-tooltip.js`, and `registry-config.js`. The worklog records successful local build and UI checks for the latest corrections. Those results support candidate readiness, but they do not create an immutable release boundary. Final verification must run again on the exact release commit if the commit changes any built input.

## Build and public data surface

`vercel.json` is intentionally small:

- framework: none;
- build command: `npm run build`;
- output directory: `dist`;
- install command: empty.

The Vercel project uses Node.js 24.x. The build first verifies evidence promotion and registry integrity, then copies `index.html`, the complete `src/` directory, and the complete `data/registry/` directory into `dist/`.

That means a v9 release will intentionally make the following browser-readable:

- all generated evidence runtime modules currently retained from v1 through v9;
- registry manifests and evidence/relationship proof bundles for v6 through v9;
- public deployment, finality, availability, and record-check audit JSON copied under `data/registry/deployments`;
- browser source modules, including the public Monad Testnet RPC and registry publication configuration.

This material is public provenance data rather than a private runtime secret, but the breadth should be deliberate. The resulting local `dist/` is approximately 11 MB, including approximately 4.8 MB of registry data. The registry publisher operator page is outside the build output; `/tools/registry-publish/index.html` returns HTTP 404 in production.

No `.env*` filename was found within the repository's first two directory levels, and the build script does not copy environment files. No secret contents were inspected. The repository `.gitignore` does not currently include an `.env*` rule, so future local credential files would need explicit protection before being introduced.

## Network and browser security posture

The current local registry configuration is public, read-only Monad Testnet configuration:

- chain ID `10143`;
- RPC `https://testnet-rpc.monad.xyz`;
- registry `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`;
- v9 manifest URI `ipfs://bafybeig6zgvvotap5w4nqeyp6kezqj3mx3paayju7ffag2arsvdtdibvzq/manifest.json`;
- v9 publication ID `0xcaae763cd989d32777036d2d443bdae036d24ab5217ecf6324ecb10dd485bc7e`.

The RPC helper permits only `eth_chainId`, `eth_getCode`, `eth_getBlockByNumber`, and `eth_call`; it contains no signing or transaction path.

The production response includes HSTS. No `Content-Security-Policy` header was observed, and `vercel.json` defines no CSP headers. This is a hardening gap rather than the cause of the stale release. A future CSP must account for the configured Monad RPC and the user-selected OpenAI-compatible AI endpoint, or it will break those browser requests. It should be designed and tested separately rather than added during the final deployment without verification.

## AI judge flow with no key

The public app defaults to:

- endpoint `https://maas.qwencloudapi.com/compatible-mode/v1`;
- model `qwen3.8-max`;
- empty API key;
- settings stored in the judge's browser under `monad-city.ai-settings`.

With no key, the app keeps AI mode off and the Navigator uses deterministic local graph retrieval. That path is usable on the public URL and can demonstrate project search, map focus, relationship lookup, and source-bounded explanations without external credentials.

The Qwen agent/tool-calling path is **not turnkey for a judge**. It requires the judge to supply a compatible API key in browser settings; the key is then sent from that browser to the configured endpoint. No shared key is embedded or hosted. If the submission criteria require the real model path to work immediately, this is a release blocker that needs a deliberate credential and abuse-control design. Embedding a private key in the static build is not an acceptable fix.

For the present static architecture, the submission materials should accurately describe the default as deterministic local retrieval and the external model path as optional, user-configured behavior. The demo should not imply that the public site provides a hosted Qwen credential.

## Minimum release gate

1. Freeze the intended candidate and review the dirty tree so unrelated, private, or draft artifacts are excluded from the release commit.
2. Create one exact release commit and record its SHA. Do not deploy the current v7 commit or an uncommitted working directory.
3. On that commit, run `npm run build` and the relevant automated checks, then complete the standard browser flow at narrow and desktop widths.
4. Deploy the recorded commit to project `prj_ootYSvs7o3eLHox690lGti1B4E1K` in team `team_rX2aKo4gs7tCSBACaKYkCwPC`, production target. Deployment remains a separate authorized action.
5. Verify the immutable deployment URL before relying on the alias.
6. Confirm on production that:
   - `/src/evidence.js` selects `phase-3.5-v9`;
   - `/data/registry/phase-3.5-v9/manifest.json` returns 200 and matches the approved manifest;
   - `/src/relationship-tooltip.js` returns 200;
   - the City, Passport, relationship tooltip, Graph, district filter, search, and narrow layout match the reviewed candidate;
   - the no-key Navigator clearly uses deterministic local retrieval;
   - the read-only Monad Testnet publication check succeeds from the browser;
   - `https://monad-city.vercel.app/` aliases the verified deployment.

## Readiness summary

| Gate | Result |
| --- | --- |
| Stable public URL exists | Pass |
| Correct Vercel project/team identified | Pass |
| Current deployment healthy and public | Pass |
| Production contains v9 evidence and latest UI | **Fail** |
| Exact candidate release commit exists | **Fail** |
| Current local build output matches key source files | Pass |
| Default no-key Navigator is usable | Pass, deterministic retrieval only |
| Real Qwen agent works without judge credentials | **Fail** |
| Registry operator tooling is excluded from public output | Pass |
| CSP present | Advisory gap |

Release status: **not ready to publish yet**. The blocking path is concrete: create and verify the exact candidate commit, decide how the submission describes or supplies the optional real-AI path, then deploy that commit to the existing production project and verify the alias.

## Audit evidence

Local files inspected: `vercel.json`, `package.json`, `build.js`, `.gitignore`, `src/ai.js`, `src/registry-config.js`, `src/onchain-rpc.js`, current `dist/` shape, Git status/history, required product/evidence/workflow documents, and existing submission URL references. Public observations used authenticated Vercel read-only project/deployment inspection and HTTP fetches of the production alias and selected static assets. No environment-variable values, wallet secrets, private-key material, or platform credentials were read.
