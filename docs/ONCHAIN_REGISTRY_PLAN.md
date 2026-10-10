# Monad City — Onchain Registry Implementation and Deployment Acceptance Plan

Status: Testnet registry deployed; snapshot publication and app activation pending, 2026-10-10  
Target namespace: `monad-city:registry:main:v1`  
Target snapshot: `phase-3.5-v6`  
Canonical SHA-256: `9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b`

## 1. Purpose and authority boundary

This plan turns `docs/ONCHAIN_REGISTRY_ARCHITECTURE.md` into reviewable acceptance gates. It
separates work that can be completed in this repository from actions that require an authorized
external operator, reviewed accounts, storage, RPC providers, and a real Monad transaction.

Passing the local gates establishes only that the implementation reproduces the reviewed v6
snapshot commitments and behaves as specified in local tests. It does not establish that a
contract is deployed, that a publisher is authorized in the real world, or that any evidence
source is true, current, safe, legitimate, active, endorsed, or official.

This repository task performs no deployment, publication, role, revocation, migration, wallet, or
other external transaction.

## 2. Frozen release inputs

The first release candidate must use these exact values:

| Field | Required value |
|---|---|
| Snapshot | `phase-3.5-v6` |
| Snapshot digest | `0x9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b` |
| Evidence root / count | `0x5eb0597c4b583f148e760d749dd75f38c54ddce2dffeba1280b5b3500a1cb35e` / `193` |
| Relationship root / count | `0xa21b45b628eb8c4b1842900ccd6bdc0b5d2728e974bcf734e695c79e5f29e930` / `6` |
| Portable snapshot ID | `0x7c9d1211d600742ac6b34e64f53410742f156bb953f602756b12f6b1f4ac54c3` |
| Namespace | `monad-city:registry:main:v1` |
| Review policy | `phase-3.7-review-policy-v1` |

Any change to the approved snapshot, canonicalization, namespace, domains, tree construction,
compiler settings, dependency versions, contract code, or runtime verifier starts a new release
candidate and repeats every affected gate.

## 3. Acceptance gates

### Gate A — trust and scope freeze

Owner: architecture/trust reviewer.

Accept only when:

- the onchain proposition remains exactly “publisher P committed content C in deployment D at
  block B”;
- `Observed`, `Claimed`, `Attested`, and `AI-inferred` retain their existing meanings;
- publication, review approval, membership, and revocation are never rendered as project-wide
  verification, safety, legitimacy, activity, endorsement, or freshness;
- Demo relationships and unsupported project copy remain visibly illustrative;
- no wallet, signer, transaction, indexer, backend, source fetch, or automatic approval path was
  added to the application; and
- unconfigured or failed registry checks leave local source records available.

Evidence: architecture diff, trust-model review, and browser copy review.

### Gate B — deterministic snapshot and proof bundle

Owner: trust/data implementation.

Accept only when:

- the approved v6 JSON and generated evidence runtime module are unchanged and still pass the
  existing promotion gate;
- `manifest.json`, `evidence-proofs.json`, and `relationship-proofs.json` are deterministic;
- the manifest authenticates both proof files by canonical SHA-256;
- every one of 193 evidence and six relationship entries reproduces its ID hash, payload digest,
  leaf, proof path, root, and count;
- every relationship resolves all exact `evidenceIds` to approved evidence entries;
- empty, one-leaf, odd-leaf, duplicate-ID, duplicate-ID-hash, duplicate-leaf, tampered payload,
  tampered path, wrong domain, and cross-kind cases fail as specified; and
- deployment and lifecycle fields remain explicitly unconfigured with no invented chain value.

Evidence: `npm run evidence:verify-promotion`, `npm run test:registry`, and
`npm run registry:verify` output.

### Gate C — reproducible contract package

Owner: contract implementation.

Accept only when:

- Solidity is pinned to `0.8.30`, OpenZeppelin Contracts to `5.7.0`, optimizer settings and EVM
  target are recorded, and dependency lockfiles are checked in;
- the package exports compiler-generated ABI, method selectors, creation/runtime bytecode, build
  metadata, and SHA-256 of runtime bytecode;
- generated selectors equal the selectors used by the browser client;
- repeated clean builds with the approved toolchain reproduce the same runtime bytecode; and
- formatting, compilation, unit tests, and fuzz tests pass without contacting a chain.

Monad's deployment guidance named in the architecture requires Foundry 1.8 or later. The local
environment initially used during architecture review reported Foundry 1.7.1. It was updated to
the pinned Foundry 1.8.0 on 2026-10-10; the deployment preflight and Monad-mode tests now pass.
Re-run these gates for the exact release candidate before any deployment transaction is signed.

Evidence: contract preflight report, exported artifact manifest, build output, test output, and
runtime bytecode digest.

### Gate D — publication history and role security

Owner: contract reviewer.

Accept only when tests prove:

- the first local publication requires `previousPublicationId == 0`;
- later publications require the exact current local head;
- a version hash and deployment-bound publication ID cannot be reused in one deployment;
- publishing a successor supersedes an active head without changing historical content;
- a revoked head stays revoked when a later publication is created;
- superseded and revoked publications remain fully readable;
- only `PUBLISHER_ROLE` can publish and the admin has no implicit publishing permission;
- `REVOCER_ROLE` can revoke a proof-backed subject and a publication publisher can revoke only its
  own publication unless it also has the revoker role;
- removing a publisher prevents future publication and subject revocation but does not remove its
  intentionally retained right to revoke a publication it originally published; and
- default-admin transfer is delayed and two-step.

Security interpretation: OpenZeppelin's admin-transfer delay does not delay role grants, role
revocations, or `confirmSuccessor`. Those actions are immediate admin powers. Production
acceptance therefore requires a reviewed multisig or equivalent external control for the admin,
plus monitoring of role and migration events.

### Gate E — permanent namespace subject revocation

Owner: contract reviewer plus trust reviewer.

Accept only when tests cover both Evidence and Relationship kinds and prove:

- revocation requires a valid inclusion proof from an existing origin publication;
- the stored origin publication, origin payload digest, revoker, time, and reason are immutable;
- zero reasons, invalid proofs, wrong kinds, and repeat revocations fail;
- the same `(kind, idHash)` is unusable in later local publications;
- a predecessor revocation is visible in a successor deployed before confirmation;
- a revocation recorded on the predecessor after confirmation is still visible in the successor;
- a grand-predecessor revocation remains visible through at least two migrations;
- relationship usability also fails when any cited evidence ID is revoked; and
- the lineage-depth bound of 32 predecessor hops is enforced and a successor that would have
  depth 33 is rejected.

The bound permits one root plus at most 32 successors, or 33 linked deployments total. It is a
permanent protocol lifetime limit and must not be bypassed by starting a registry that omits
predecessor lookup. Any design beyond that limit requires a new reviewed protocol and explicit
continuity plan.

### Gate F — migration

Owner: contract reviewer and deployment reviewer.

Accept only when:

- the successor constructor binds the same namespace, current predecessor registry, current
  predecessor publication, and cumulative lineage depth;
- an empty or revoked successor head cannot freeze the predecessor;
- only the predecessor admin can confirm a reciprocal successor;
- confirmation stores the successor, freezes only new predecessor publications, and preserves
  reads and revocations;
- an active predecessor head becomes superseded while a revoked head remains revoked;
- the successor's initial active publication is independently verified before confirmation; and
- clients continue to pin the successor bytecode instead of treating the admin-approved pointer as
  a code-security proof.

### Gate G — dependency-free browser verifier

Owner: frontend/runtime implementation.

Accept only when:

- the default configuration is `unconfigured`, performs no RPC request on load, and requests no
  wallet;
- configured mode rejects incomplete or malformed deployment, publication, and lineage pins;
- lineage depth `0` is accepted only with zero predecessor registry/publication; depths `1..32`
  require both predecessor values to be nonzero;
- the user must explicitly press the publication-check control;
- the client recomputes the local snapshot digest, domains, portable snapshot ID, payload digest,
  leaf, path, roots, and relationship support before trusting RPC results;
- chain ID and runtime bytecode SHA-256 match;
- the reviewed publication block hash matches and the inspected block is not older than it;
- all contract calls use one numbered inspected block and its hash is re-read at completion;
- namespace, protocol version, deployment ID, predecessor binding, lineage depth, publication ID,
  previous publication ID, original publisher, manifest URI hash, timestamps, roots, counts,
  lifecycle, proof result, and cumulative subject revocation match;
- a relationship passes only when its proof and every exact supporting evidence proof/lifecycle
  pass;
- active, superseded, migrated, snapshot-revoked, subject-revoked, missing, mismatch,
  unavailable, and unconfigured outcomes remain distinct; and
- every successful display repeats the publisher/content-only trust boundary and RPC trust
  limitation.

The publication sender stored in history is authoritative for that publication. Current role
membership is an operational audit fact and must not retroactively authenticate an old release.

### Gate H — repository regression

Owner: lead/QA.

Run the combined local gate after all implementation artifacts settle:

```sh
npm run evidence:verify-promotion
npm run test:registry
npm run registry:verify
npm run test:onchain
npm run test:ai
npm run contracts:build
npm run contracts:test
npm --prefix contracts run fmt
npm --prefix contracts run artifacts:check
npm --prefix contracts run test:e2e
npm --prefix contracts run preflight
npm run build
```

The preflight compares compiler-generated ABI/selectors and code metadata to the checked-in
artifacts. A missing script or stale generated artifact fails the gate. Before a transaction is
signed, `npm --prefix contracts run preflight:deployment` must also pass under Foundry 1.8 or
later; the local warning mode is insufficient for deployment.

Browser regression must cover the normal City/Graph, Passport, Navigator, district, search, and
narrow-layout flow plus:

1. unconfigured registry copy with a disabled check;
2. explicit check against a local read-only fixture;
3. matching evidence;
4. matching relationship with all supporting evidence;
5. superseded, migrated, snapshot-revoked, subject-revoked, mismatch, unavailable, and reorg
   outcomes; and
6. no loss or relabeling of local sources after any chain-check outcome.

## 4. External production-readiness gate

No production or public-test deployment is accepted until all of the following are complete:

1. An independent smart-contract security review resolves every material finding.
2. The target Monad network, chain ID, finality threshold, RPC providers, explorer, and supported
   compiler/EVM settings are rechecked against current official documentation.
3. Admin, publisher, and revoker controllers are named by address and operational policy. The
   record states whether any roles overlap and why.
4. The admin-transfer delay and multisig thresholds are reviewed through a tabletop for publisher
   compromise, revoker compromise, admin compromise, and signer loss.
5. Monitoring covers publication, snapshot/item revocation, role grants/revocations, admin
   transfer/delay changes, and successor confirmation.
6. The exact three-file registry bundle is uploaded to a content-addressed primary location,
   retained at an immutable repository commit, and reachable through at least one independently
   operated mirror.
7. Full bundle retrieval and all 199 proof vectors pass from the retained copies.
8. A clean release commit reproduces the exact contract bytecode and proof roots with the approved
   toolchain.
9. A deployment rehearsal on the selected test environment exercises deploy, publish, proof,
   revocation, role rotation, and migration without reusing production keys.

## 5. Authorized deployment sequence

These steps are performed later by an authorized external operator. Each transaction is reviewed
before signing and recorded in the immutable deployment audit.

### 5.1 Deploy

1. Confirm a clean release commit and artifact digests.
2. Confirm namespace, admin, admin delay, publisher, revoker, and zero predecessor fields for the
   first deployment.
3. Deploy the non-upgradeable contract.
4. Wait for the chosen finality threshold.
5. Verify source and compiler settings on the selected explorer.
6. Compare `eth_getCode` SHA-256 with the reviewed runtime bytecode digest.
7. Read namespace, deployment ID, lineage depth `0`, roles, admin, and delay from independent RPCs.

### 5.2 Publish v6

1. Re-retrieve and verify the content-addressed bundle.
2. Build the publication input from the frozen v6 values and exact snapshot timestamps.
3. Set `previousPublicationId` to zero and use the exact reviewed manifest URI.
4. Have an authorized publisher sign the publication transaction.
5. Wait for finality and record transaction hash, block number/hash/time, sender, publication ID,
   event fields, gas used, and current head.
6. Verify representative evidence and relationship proofs through at least two independent RPCs.
7. Verify all fixed publication fields and confirm no revocation is present.

### 5.3 Record and activate

Create an immutable deployment audit record containing every field in architecture section 8.2.
The application runtime config is then changed from `unconfigured` to `configured` in a reviewed
commit using only the subset the browser checks. That change must:

- pin the exact chain, address, code hash, publication sender, URI, publication transaction/block,
  and lineage values;
- rerun Gates B, G, and H against at least one archival-capable provider;
- disclose whether one or two RPC operators were consulted;
- preserve the unconfigured file and previous application release as a rollback boundary; and
- ship no private key, wallet flow, write RPC method, or shared provider credential.

Only after this reviewed application release may the UI display `Active anchor matches`. A local
build, test deployment, explorer label, copied address, or successful URL field is insufficient.

## 6. Operations after activation

### New publication

Every new snapshot repeats evidence review, immutable ID/revision checks, snapshot promotion,
proof export, governance due checks, availability replication, publication dry run, exact-head
transaction review, finality wait, configuration update, and browser regression. The old
publication remains readable as superseded history.

### Revocation

- Snapshot revocation uses the original publication sender or a current revoker and a reviewed
  nonzero reason digest.
- Evidence/relationship revocation uses a current revoker, exact origin proof, and reviewed reason
  digest.
- A subject revocation is permanent. A corrected record uses a new successor ID and normal
  evidence-review lineage.
- Incident communication states what was revoked and why without claiming the underlying project
  is false, unsafe, or malicious unless separate evidence supports that statement.

### Role rotation

Publisher rotation uses grant → independent verification/dry run → revoke. Revoker rotation uses
the same overlap discipline. Admin rotation uses the contract's delayed two-step transfer. Because
role grants/revocations themselves are immediate, multisig proposal review and monitoring remain
mandatory.

### Migration

Migration follows architecture section 10 and Gates E–F. The successor is fully deployed,
published, verified, and tested for cumulative evidence and relationship revocation before the
predecessor admin confirms it. The application does not follow an unreviewed successor pointer.

## 7. Stop conditions

Do not deploy, publish, confirm a successor, or enable configured browser mode when any of these is
true:

- snapshot, roots, counts, portable ID, ABI selectors, or runtime bytecode do not reproduce;
- Foundry/compiler/EVM/dependency versions differ from the reviewed release without a new review;
- any contract, proof, onchain, AI, build, or browser acceptance test fails;
- a material security finding remains unresolved;
- admin/publisher/revoker control or recovery policy is unclear;
- the manifest is mutable-only or retained copies cannot be independently retrieved;
- provider results disagree, the publication block changed, or finality is not established;
- a configured value is inferred, guessed, copied from an explorer label, or missing its review
  evidence; or
- UI language turns publication or inclusion into a verification, safety, activity, legitimacy,
  freshness, or endorsement claim.

## 8. Local acceptance result — 2026-10-10

The repository implementation passes the local gates with the frozen v6 values in section 2:

- promotion verification confirms 193 approved evidence records, six sourced relationships, and
  canonical snapshot SHA-256
  `9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b`;
- registry verification reproduces the portable snapshot ID and both roots/counts, and the
  deterministic proof suite passes 10 tests;
- the read-only browser verifier passes 11 tests, including deployment/publication pins,
  numbered-block consistency, relationship dependencies, and compiler-derived selectors;
- Navigator grounding passes 21 tests, including in-conversation removal of evidence after a
  snapshot or subject withdrawal is observed;
- the contract passes formatting, compilation, artifact checks, and 26 Forge tests with 512 fuzz
  runs, including history, role separation, Evidence/Relationship revocation, post-confirm and
  multi-hop revocation continuity, and the 32-hop lineage bound;
- the loopback-only Anvil/client test passes active, subject-revoked,
  supporting-evidence-revoked, superseded, and migrated flows with runtime bytecode SHA-256
  `0xdf5052366940d772b12f4f9a0774032bbcb0c4b1be508b399804e54626d02da2`;
- the production application build and whitespace check pass; and
- browser regression passes the existing City, Passport, Navigator, Graph, district, search, and
  390-pixel-wide layout flow with the registry disabled and explicitly unconfigured.

All chain activity in that verification was confined to the disposable loopback Anvil process.
No external transaction was made and no private key was used for an external service.

The release is not deployment-ready under this record alone. On 2026-10-10 the installed toolchain
was updated to Foundry 1.8.0 and `preflight:deployment` passed, including all 26 Monad-mode tests
with 512 fuzz runs and the local Anvil/client lifecycle test. Compiler ABI, selectors, creation
bytecode, runtime template and immutable byte offsets are unchanged; the exported immutable AST
reference IDs were refreshed for the new build tool.
The independent security review, production account controls, content-addressed upload,
RPC/finality selection, deployment, publication, and reviewed configured application release in
sections 4–5 remain external acceptance work.

## 9. Production acceptance record

### Authorized Testnet rehearsal — 2026-10-10

The owner separately authorized preparation of an empty genesis deployment on Monad Testnet
using `0x9A0C8040A8C6aB9F65F544578b891Fba599799F8` for all three roles and a 48-hour admin transfer
delay. The public address was provided by the owner; no private key was requested. This bounded
rehearsal does not satisfy the production/publication acceptance gates in sections 4–5.
The standalone localhost operator page is outside the application build and keeps signing in
the owner's wallet. The owner signed deployment transaction
`0xa5929d3d1600548dfbbf9a60e8e997c1cb7a534fe08bcd0e5e821a1831fc51b3`, creating
`0x8d53153a8a25c81701954eed66154b3ebba8b8c7` at block `69845790`. The receipt, executable runtime
bytes and every immutable binding, genesis identity, all three wallet roles, 48-hour delay and empty
head were verified through `https://testnet-rpc.monad.xyz`. The same RPC reported finalized block
`69846297`, beyond the deployment block, whose hash matched the receipt. This is one trusted
provider's finalized status, not independent consensus verification.
The immutable deployment audit is `data/registry/deployments/monad-testnet-genesis.json`.
The owner subsequently uploaded the exact bundle to public IPFS and published it in transaction
`0x701709d9860a724c2fba971c2a2194d9407d5078c17803861eff50d52364e5c0`, block `69858636`,
hash `0x3c278fe9d5c1445a5f23cd7f75bc15da859da6203ee3859d10035e4ee9bd56a7`.
Receipt commitments, runtime pin and representative evidence/relationship inclusion/lifecycle
checks passed; the official provider reported finalized block `69859057`. The separate publication,
finality and record-check audit JSON files are in `data/registry/deployments/`.
`src/registry-config.js` now pins the authorized Testnet publication. This bounded Testnet
activation does not declare production acceptance; the production controls listed below remain pending.

The release owner signs one final record containing:

- release commit and clean-tree status;
- snapshot/version/hash/roots/counts;
- contract source and artifact digests;
- exact toolchain and dependency versions;
- local test and browser QA results;
- independent security-review disposition;
- storage locations and retrieval results;
- role controllers, thresholds, delay, and monitoring owners;
- deployment/publication transactions and final blocks;
- bytecode/source verification results;
- configured application commit and RPC disclosure;
- known limitations and rollback procedure; and
- explicit confirmation that publication proves commitment and inclusion only.

Until that production record exists, no production/Mainnet acceptance is claimed. The authorized
Testnet publication may be configured with explicit RPC and trust-boundary disclosure.
