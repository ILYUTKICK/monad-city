# v9 publication handoff

The owner requested immediate publication. A bounded Trust/Data re-review completed at
`2026-10-11T21:09:41Z` found no deviations in the 166 derived Monad membership edges.
This re-review checks derivation from stored approved evidence; sources were not re-fetched.

## Corrected package

- Snapshot envelope: `createdAt = reviewedAt = 2026-10-11T21:13:06Z`.
- 217 evidence objects and the prior 28 relationships are byte-for-byte unchanged.
- The 166 derived relationships retain every factual field, evidence ID, scope and limitation;
  only governance review timestamps and opaque reviewer references change.
- Four superseded subjects in the candidate workspace retain their stale/withdrawn status;
  their erroneous future governance timestamps are corrected at package preparation time.
  They are excluded from the approved snapshot.
- v8 files are preserved. v9 is separately validated, promoted and pinned.

| Pin | Value |
|---|---|
| Canonical SHA-256 | `8147e7dedb389f2d8da5af63747aed71114692a1c2052fde0f14cd9b8133f088` |
| Portable ID | `0x9a5dffba67fd17059ecdcc6163e472dae261e4825c52cf4b9d3cba549f6d65c0` |
| Evidence root / count | `0x84bac522d8300bfa0c9306cd6946a2d38a7119bcf5f67f8569d238989ec78b8a` / 217 |
| Relationship root / count | `0xbe34ddb32a78e5f42cb39253464db6a20c81672467095cb8b4609f4f3cb2226e` / 194 |
| Expected Testnet publication | `0xcaae763cd989d32777036d2d443bdae036d24ab5217ecf6324ecb10dd485bc7e` |
| Predecessor | `0x749a1fa2b3b731ba051f7d18697b8db563adc0b038cb9b3c864430187b62421c` (v7) |

Official RPC preparation at block `70216015`, timestamp `2026-10-11T21:15:00Z`, confirms
the correct runtime, active v7 head, publisher role, unfrozen registry, empty v9 lookup and
successful timestamp eligibility. It does not simulate a real publication without public storage.
Audit: `data/registry/deployments/monad-testnet-v9-preparation.json`.

## Public upload — 2026-10-11T21:20:24Z

The public folder is ready at `artifacts/ipfs/phase-3.5-v9/` (four files, nested snapshot path).
The owner signed in to Pinata in Chrome. The lead uploaded the exact folder publicly through
the existing workspace, preserving the four-file nested layout. Pinata's public folder viewer
confirms all four paths. Pinata retrieval of all four files matches local bytes.
Upload capture: `2026-10-11-v9-ipfs-upload.png`.

Manifest URI: `ipfs://bafybeig6zgvvotap5w4nqeyp6kezqj3mx3paayju7ffag2arsvdtdibvzq/manifest.json`.
Primary gateway: `https://turquoise-written-perch-899.mypinata.cloud/ipfs/`.
Unsigned preparation completed successfully after warming Filebase's cold-CID cache.
All four files were independently retrieved byte-for-byte through Pinata and Filebase.
The generator's future Filebase requests now include the standard filename download parameter,
which was separately observed to return both proof files with exact bytes despite the old
cached timeout. The completed request truthfully retains the original URLs it retrieved.

```sh
npm --prefix contracts run prepare:publication -- \
  ipfs://bafybeig6zgvvotap5w4nqeyp6kezqj3mx3paayju7ffag2arsvdtdibvzq/manifest.json \
  https://turquoise-written-perch-899.mypinata.cloud/ipfs/ phase-3.5-v9
```

That command verifies every file through two gateways, the contract/head/roles, ABI encoding,
balance and gas, and simulation before exclusively writing the unsigned request.
The operator defaults to v9 at
`http://localhost:5173/tools/registry-publish/index.html?version=phase-3.5-v9`.
The unsigned request is `tools/registry-publish/requests/phase-3.5-v9.json` and passes full
local validation. RPC head/code/role, independent Cast ABI encoding, balance, gas and simulation
passed; simulation returned the expected v9 publication ID. Prepared gas is `0x69103`, gas
price `0x17bfac7c00`, maximum fee with buffer `43894578000000000` wei = `0.043894578` MON.
The operator rechecks these before sending. The Chrome operator connected the exact publisher
account on Monad Testnet and completed its fresh public-content/contract/balance/fee/simulation
check successfully at approximately `2026-10-11T21:28:20Z`. Wallet balance shown is
`4.562186` MON; prepared fee shown is `0.043894` MON. Publish is enabled with
"Ready for wallet confirmation". Capture: `2026-10-11-v9-wallet-ready.png`.
MetaMask's side panel had shown unlock earlier; it was closed after the page's wallet check
succeeded. The page's actual connected EVM provider passed exact account/network validation.
The owner subsequently performed Publish and final wallet confirmation. Transfer value is zero.
The real receipt/finality/proofs passed and `src/registry-config.js` now pins v9.

## Verification

PASS: candidate validation and lineage; exact promotion pair; build; all active Merkle proofs;
registry tests 10/10; publication tests 9/9; AI tests 21/21. The v9 test proves factual
payload preservation, prior-review preservation, separate identity and v7 predecessor.
Disposable loopback Anvil rehearsed actual v6→v7→v9 publication, duplicate rejection,
client/Solidity future-date rejection and acceptance at the corrected review boundary.
The lead did not sign or broadcast the external transaction; the owner confirmed it. The earlier preparation capture
`2026-10-11-v9-publication-prepared.jpg` predates public upload and unsigned preparation.

## Verified owner publication

The owner supplied transaction `0x71a3ccee9f6d928a9ddb58caa89945dae445c42d33fbcb8e287e160b8296f8e7`. It succeeded in block
`70219795` (`0x70e802ea61d525729cd92fbcce2aec94f835f6b4a589ce66ab7fee6913fe7c23`) at `2026-10-11T21:34:02Z`.
Exact calldata, publisher, runtime code, commitments, counts, URI and v7 predecessor matched.
The official RPC reported finalized block `70220297` at `2026-10-11T21:36:35.460Z`; v9 was
active and current, v7 superseded, registry unfrozen with no successor.

The production read-only verifier matched `E-BEEFY-MEM-001`, `beefy-kintsu-asset`,
`monad-aave-v3`, `monad-shmonad` and `monad-aethonswap`, including all relationship support
proofs and current revocation checks. HTTP 429 required sequential throttled verification;
all checks then passed. Evidence scope remains unchanged: publication proves exact inclusion,
not source truth, freshness, safety or endorsement.

Audits: `monad-testnet-v9-publication.json`, `monad-testnet-v9-publication-finality.json`,
`monad-testnet-v9-record-checks.json` in `data/registry/deployments/`.

Activation validation passed: build; onchain tests 11/11; registry tests 10/10. Browser
Passport Check publication matched active v9 at block `70220933`; City/Graph, district
filter, Beefy Navigator search and grounded agent record output, and 390×844 layout passed.
The temporary viewport was reset. Capture: `2026-10-11-v9-publication-verified.png`.
