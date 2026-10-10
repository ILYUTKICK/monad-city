# Monad City registry deployment and operations

This package builds and tests the immutable Monad City evidence commitment registry. It does not
contain a signer or private key. Public Testnet deployment audits are recorded separately;
repository automation prepares unsigned calls and never signs or broadcasts them.

An active registry publication proves only that one address committed exact snapshot bytes and
Merkle roots. It does not prove source accuracy, freshness, safety, legitimacy, activity, or
endorsement.

## Pinned components

- Solidity: `0.8.30`
- EVM target: Cancun
- optimizer: enabled, 200 runs, via IR
- metadata bytecode hash and CBOR metadata: disabled
- OpenZeppelin Contracts: `5.7.0`
- deployment Foundry pin: `1.8.0` in `.foundry-version`

Monad's official [Foundry guide](https://docs.monad.xyz/tooling-and-infra/toolkits/foundry) states
that versions before 1.8 do not include Monad execution support and requires `network = "monad"`
for Monad gas, transaction, hardfork, precompile, and contract-size behavior.
The local toolchain was updated to `1.8.0` on 2026-10-10 through the official installer with
attestation/hash verification. `npm run preflight:deployment` passes: 26 tests in Monad mode,
512 fuzz runs, compiler artifact checks, and the loopback Anvil/client lifecycle test.
This is a local compatibility check, not a deployment or an independent security audit.
The deployment preflight rejects versions below 1.8.0 and runs tests with `--network monad`.

## Local verification

From `contracts/`:

```sh
npm ci
npm run preflight
```

The preflight performs all of these local checks:

1. confirms OpenZeppelin resolves exactly to `5.7.0`;
2. confirms the checked-in proof manifest is still deployment-unconfigured;
3. checks Solidity formatting and compilation;
4. runs unit and fuzz tests, including proofs read directly from the JavaScript registry export;
5. checks the committed compiler ABI, selectors, bytecode, and metadata export; and
6. starts a loopback-only Anvil instance and runs the browser verifier against a real deployed
   contract through active, revoked, relationship-support-revoked, superseded, and migrated states.

The Anvil test uses unlocked local test accounts through `eth_sendTransaction`. It does not read a
private key and makes no external blockchain transaction.

Run individual steps with:

```sh
npm run fmt
npm run build
npm test
npm run artifacts:check
npm run test:e2e
```

`npm run artifacts` intentionally updates the committed compiler-derived files after a reviewed
contract change. The compact source of truth is
`artifacts/MonadCityRegistry.json`; `artifacts/ABI_SELECTORS.md` is its readable selector report.
The deployed-bytecode hash in the compiler export is a template hash because constructor immutables
are not filled. Every actual deployment must pin `SHA-256(eth_getCode(address, block))` separately.

## Roles and timing

- `DEFAULT_ADMIN_ROLE` manages publisher and revoker membership and confirms migration. It does not
  publish and has no implicit revocation power.
- `PUBLISHER_ROLE` publishes snapshots. A publication's original publisher may permanently revoke
  that publication even if the role is later removed.
- `REVOCER_ROLE` permanently revokes proof-backed evidence and relationship IDs, and may revoke any
  publication.
- Default-admin transfer is delayed, cancellable, and two step through OpenZeppelin's
  `AccessControlDefaultAdminRules`.
- Publisher/revoker grants and removals, and `confirmSuccessor`, take effect immediately when the
  admin transaction succeeds. Production administration therefore requires a reviewed multisig,
  transaction simulation, monitoring, and an operational approval policy outside this contract.

Use an overlap for publisher or revoker rotation: grant the new account, inspect role state and its
operational readiness, then remove the old account. Do not assume the default-admin delay applies to
ordinary role changes.

## Deployment gate

Before an external operator submits anything:

1. pass `npm run preflight:deployment` with the pinned toolchain;
2. complete an independent contract review and resolve material findings;
3. select and document the exact Monad network and independently recheck its chain parameters;
4. select reviewed admin, publisher, and revoker accounts and a nonzero admin-transfer delay;
5. upload the exact v6 manifest and proof files to content-addressed storage, retain repository and
   independent gateway copies, and verify all copies;
6. inspect `artifacts/MonadCityRegistry.json`, compiler settings, creation bytecode, constructor
   values, and the simulated deployment result;
7. verify that predecessor address/publication are both zero for genesis, or are the exact current
   predecessor head for a migration;
8. arrange source verification and independent runtime bytecode inspection; and
9. choose finality and monitoring policies before publication.

The deployment script reads only public constructor values:

- `REGISTRY_ADMIN`
- `REGISTRY_ADMIN_DELAY_SECONDS`
- `REGISTRY_PUBLISHER`
- `REGISTRY_REVOKER`
- optional `REGISTRY_PREDECESSOR`
- optional `REGISTRY_PREDECESSOR_PUBLICATION`

Simulate it without `--broadcast`:

```sh
forge script script/DeployMonadCityRegistry.s.sol:DeployMonadCityRegistry --network monad --rpc-url "$RPC_URL"
```

The repository does not add `--broadcast`, select an account, or provide signing instructions. An
authorized external operator must choose the signer and transaction mechanism under its own key
policy.

## First publication

### Local Testnet wallet page

The owner authorized preparation of a genesis rehearsal on Monad Testnet (chain `10143`), with
`0x9A0C8040A8C6aB9F65F544578b891Fba599799F8` as administrator, publisher and revoker, a 48-hour
administrator-transfer delay, and zero predecessor values. This overlap is a Testnet rehearsal
choice, not production administration acceptance. The owner retains control of wallet signing.

Generate the unsigned request from the pinned compiler artifact:

```sh
npm --prefix contracts run prepare:testnet -- 0x9A0C8040A8C6aB9F65F544578b891Fba599799F8
npm run dev
```

Open `http://localhost:5173/tools/registry-deploy/index.html` in a browser with an injected wallet
extension. The page works only on localhost and is excluded from the public application build.
It independently re-encodes constructor arguments and checks pinned creation/runtime hashes,
the wallet and chain, balance, gas estimate and creation simulation. Its gas limit includes a 10%
buffer; Monad charges against the gas limit. The owner clicks Deploy and confirms in the wallet.
No key or seed is accepted or stored by the page. Refreshing an unresolved wallet request blocks
a duplicate submission; restore its transaction hash from wallet history instead.

After signing, use Check receipt and download the audit JSON. The page checks the actual mined
transaction, receipt/block, runtime instructions and all immutable bindings, namespace/deployment
identity, roles/delay and empty genesis state. This is a check at one numbered deployment block
through one RPC, not independent finality, source verification or publication acceptance.
Do not activate the application config from an empty-registry deployment receipt alone.

Verification:

```sh
npm --prefix contracts run test:operator
npm --prefix contracts run test:operator:e2e
```

The second command starts disposable loopback Anvil only, funds and impersonates the public address
only on that local chain, and exercises the actual operator receipt verifier. No external signer,
private key or external transaction is involved. A funded-wallet Testnet read-only rehearsal on
2026-10-10 estimated `3,120,557` gas; the buffered fee was `0.350126526 MON` at that moment. This is
not a promised fee; always refresh immediately before signing.

For this authorized empty-registry Testnet rehearsal, the production gates above remain pending.
Publishing a snapshot and enabling the public application still require exact content-addressed
artifacts, publication/finality checks, and a reviewed deployment configuration.

The owner signed the Testnet deployment on 2026-10-10:

- Registry: `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`
- Transaction: `0xa5929d3d1600548dfbbf9a60e8e997c1cb7a534fe08bcd0e5e821a1831fc51b3`
- Block: `69845790`, hash `0x68f23aa37aceadb18cf21774b3d356ae9e0ef79e829d9376e20abaf42ad43eeb`
- Actual runtime SHA-256: `0x4a1c938da6c2eec8aa7f35d1fcf19522af88b9b93134747f0a0baa7f350fae70`
- Deployment audit: `../data/registry/deployments/monad-testnet-genesis.json`

The receipt/code/immutables/roles match; the official RPC reported this block finalized. The
registry was empty at deployment. The owner authorized public source publication; Sourcify confirmed both creation and runtime
`match` on 2026-10-10. See [verified source](https://repo.sourcify.dev/10143/0x8d53153a8a25c81701954eed66154B3EbBa8b8c7)
and `../data/registry/deployments/monad-testnet-source-verification.json`. This correspondence check
is not an independent security audit; no Etherscan/Monadscan verification is claimed.
The compiler standard input is retained in `verification/monad-testnet-standard-input.json`.

The local upload folder is `../artifacts/ipfs/phase-3.5-v6`. Upload the **folder**, not a ZIP, as
public IPFS content. It contains the three unchanged registry files and the approved snapshot at
its manifest `sourcePath`. The portable manifest intentionally retains unconfigured deployment
fields; actual deployment/publication metadata lives in separate audit records. After obtaining
the folder CID, independently retrieve and verify its files before building a publication call.

Reproduce the folder with `npm run registry:prepare-upload`. Once the real folder CID is known:

```sh
npm --prefix contracts run prepare:publication -- ipfs://REAL_CID/manifest.json https://YOUR-GATEWAY.mypinata.cloud/ipfs/
```

This command retrieves all four unchanged files through the public Pinata gateway and the
independently operated [Filebase gateway](https://filebase.com/docs/ipfs/concepts/what-is-an-ipfs-gateway).
It requires exact byte equality with the reviewed files, verifies the local proof bundle, current
Testnet identity/code/empty head/publisher role, independently encodes v6 calldata with `cast`, and
simulates the call. It writes an unsigned request to `tools/registry-publish/request.json`.
Public gateways can time out; the generator fails closed rather than skipping a missing file.
The old ipfs.io and dweb.link HTTP endpoints now return a service-worker migration response.

The owner uploaded the exact folder to public Pinata IPFS on 2026-10-10:
`ipfs://bafybeidbeznfdsuqr542slcqbdstgnkmxn7dyuf5de226jyzavhgskyo2i/manifest.json`.
Gateway retrieval is a point-in-time availability observation, not an independent retention guarantee.
Keep the owner pin and the repository copy available.

After preparation succeeds, open `http://localhost:5173/tools/registry-publish/index.html` in Chrome.
The isolated localhost page verifies the complete local bundle and independently re-encodes the
transaction. Connect the publisher wallet, select Monad Testnet and click **Check publication**.
The page re-downloads the four public files, checks code/head/role, balance, fee and simulation.
The owner clicks **Publish snapshot — confirm in wallet** and reviews the final fee in the wallet.
No contract is created in this step; the call targets the existing deployed registry with zero MON
transfer value and a gas limit including a 10% buffer. Only the network fee is charged.

The page records the hash and blocks duplicate submissions after an unresolved wallet request.
A cancelled wallet request clears the guard; an interrupted response requires manual recovery
from wallet history. **Check receipt** verifies the actual transaction and all publication fields
at its numbered block. Finality, current proof/lifecycle checks and application activation follow
separately; a prepared or simulated call is not a published snapshot.

```sh
npm --prefix contracts run test:publication
npm --prefix contracts run test:publication:e2e
```

The second command deploys and publishes only on disposable loopback Anvil. It tests mined
receipts, full commitments, duplicate blocking and rejected transaction mismatches without keys
or external transactions.

### Verified owner publication — 2026-10-10

The owner signed `0x701709d9860a724c2fba971c2a2194d9407d5078c17803861eff50d52364e5c0`.
It matches the prepared zero-value call, sender, destination and complete calldata. Publication
ID is `0x6af7ac341a2be055d1cb7f09b5af78326fb12362cc81140d231e2866adc3f6aa`, block `69858636`,
block hash `0x3c278fe9d5c1445a5f23cd7f75bc15da859da6203ee3859d10035e4ee9bd56a7`.
All fixed publication fields match v6. The official RPC reported a finalized block beyond this
matching block; representative evidence and relationship checks, including every supporting record,
returned `matched`. Separate audit records are under `../data/registry/deployments/`.
The application configuration now pins this Testnet publication. RPC trust, source truth and
production acceptance remain separate limitations.

### Publish the reviewed snapshot

`PublishPhase35V6.s.sol` pins the reviewed v6 digest, roots, counts, and exact snapshot timestamps.
It requires an empty local registry head and reads only:

- `REGISTRY_ADDRESS`
- `REGISTRY_MANIFEST_URI`

The supplied URI must identify the exact retained manifest. Simulate the call first:

```sh
forge script script/PublishPhase35V6.s.sol:PublishPhase35V6 --network monad --rpc-url "$RPC_URL"
```

After an external operator publishes and waits for its chosen finality threshold, record and
independently verify the chain ID, contract address, actual runtime code SHA-256, deployment ID,
publication ID, portable snapshot ID, sender, transaction hash, block number/hash, publication
timestamp, roots/counts, manifest URI/hash, compiler/source commit, role membership, and
representative proofs. Only then may a separate reviewed application change configure browser
verification.

## Migration

Migration deploys another immutable registry; it never upgrades this bytecode.

1. Deploy the successor with the same namespace and the predecessor's exact current head.
2. Verify successor code, constructor bindings, namespace, deployment ID, lineage depth, roles, and
   inherited revocation behavior.
3. Publish an active nonempty successor head and verify its content independently.
4. Simulate `ConfirmSuccessor.s.sol` with `REGISTRY_PREDECESSOR` and `REGISTRY_SUCCESSOR`.
5. The predecessor admin reviews the exact transaction, then separately authorizes submission.
6. Confirmation stores both deployment IDs in the event, marks an active predecessor head
   superseded, and permanently freezes predecessor publication. Reads and revocations remain live.
7. Pin the successor through a separate reviewed application configuration.

Confirmation checks reciprocal predecessor address/publication bindings, namespace equality, and
an active successor head. It cannot be undone. A defective candidate successor should be abandoned
before confirmation.

Evidence and relationship revocation keys are `(namespace, kind, subjectIdHash)`. Successors query
the complete immutable predecessor chain, so a revocation created before or after migration remains
effective in later deployments. The lineage depth limit is 32, allowing genesis plus 32 successor
deployments. A corrected subject must use a new immutable ID under the evidence revision rules.

## Operational limitations

- The contract cannot judge evidence truth or parse relationship support arrays.
- Consumers must verify every evidence ID cited by a relationship separately.
- Content commitments cannot guarantee that offchain bytes remain available.
- RPC verification trusts the inspected provider; it is not a light-client proof.
- There are no payable entry points, custody, or withdrawal path. Forced ETH can still be sent by
  EVM mechanisms and would be trapped.
- Deployment, source verification, multisig selection, publication, finality, storage replication,
  monitoring, and incident response remain external work.
