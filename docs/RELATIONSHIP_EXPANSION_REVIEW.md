# Relationship expansion review

Status: **approved by the maintainer; published and receipt-verified on Monad Testnet**. The maintainer replied
“Да включай” on 2026-10-10. The full bounded set, including the incomplete LeverUp edge, is accepted.
The v7 successor transaction is `0x3e0fa8cc915fc02ef9590ef22420e61c1e9b15cf20362f99b39c09785e039d14`, block `69899471`. Exact calldata, commitments, publisher, runtime and finalized block were checked; v6 is superseded. Runtime activation follows this verified publication.

Approved release: `phase-3.5-v7`, **217 evidence records / 28 sourced relationships** (24 new records, 22 new edges). All new edges are `Claimed / declared_integration`, with publisher attribution and bounded scope. Existing 193 records and six relationships keep their original payloads and decisions. The graph has 39 edges, with 11 remaining illustrative patterns.

## Approved edges

| ID / endpoints | Exact scope | Source |
| --- | --- | --- |
| beefy-aave-v3: beefy → aave-v3 | Beefy configuration maps Monad product aavev3-monad-usdc (USDC) to platform Aave V3; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-morpho-blue: beefy → morpho-blue | Beefy configuration maps Monad product morpho-v2-monad-august-usdc-v2 (USDC (August v2)) to platform Morpho; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-euler: beefy → euler | Beefy configuration maps Monad product euler-monad-alphagrowth-ausd (AUSD (AlphaGrowth)) to platform Euler; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-curve: beefy → curve | Beefy configuration maps Monad product curve-monad-mon-lsts (WMON/shMON/sMON/gMON) to platform Curve; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-balancer: beefy → balancer | Beefy configuration maps Monad product balancerv3-monad-usdt0-ausd-usdc (USDT0/AUSD/USDC V3) to platform Balancer; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-neverland: beefy → neverland | Beefy configuration maps Monad product neverland-monad-wmon (WMON) to platform Neverland; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-pancakeswap: beefy → pancakeswap | Beefy configuration maps Monad product pancake-cow-monad-wmon-usdc-rp (USDC-WMON Reward Pool) to platform PancakeSwap; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-uniswap: beefy → uniswap | Beefy configuration maps Monad product uniswap-cow-monad-wbtc-usdc-rp (WBTC-USDC Reward Pool) to platform Uniswap; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-gearbox: beefy → gearbox | Beefy configuration maps Monad product gearbox-monad-edge-usdc (USDC (Edge UltraYield)) to platform Gearbox; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-curvance: beefy → curvance | Beefy configuration maps Monad product curvance-monad-ausd-earnausd-ausd (AUSD (earnAUSD-AUSD Market)) to platform Curvance; this is a documented strategy dependency. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-kintsu-asset: beefy → kintsu | Documented asset dependency through Beefy's Curve basket on Monad: sMON, mapped to Kintsu by exact published address; not a bilateral partnership. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-magma-asset: beefy → magma | Documented asset dependency through Beefy's Curve basket on Monad: gMON, mapped to Magma by exact published address; not a bilateral partnership. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-shmonad-asset: beefy → shmonad | Documented asset dependency through Beefy's Curve basket on Monad: shMON, mapped to ShMonad by exact published address; not a bilateral partnership. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| beefy-steakhouse-financial-vault: beefy → steakhouse-financial | Beefy product morpho-monad-steakhouse-prime-weth links https://app.morpho.org/monad/vault/0xbeef04b01e0275D4ac2e2986256BB14E3Ff6ef42/steakhouse-prime-eth and assigns curatorId steakhouse; only this product association is supported. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| steakhouse-financial-morpho-vault: steakhouse-financial → morpho-blue | Morpho's Monad vault page associates Steakhouse Financial with the specific named vault; publisher identification, not independently verified curator authority. | [Morpho vault](https://app.morpho.org/monad/vault/0xbeef04b01e0275D4ac2e2986256BB14E3Ff6ef42/steakhouse-prime-eth) |
| beefy-hyperithm-vault: beefy → hyperithm | Beefy product morpho-monad-hyperithm-usdc links https://app.morpho.org/monad/vault/0x78999cc96d2Ba0341588C60CcB0E91c6C33CF371/hyperithm-usdc-apex and assigns curatorId hyperithm; only this product association is supported. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| hyperithm-morpho-vault: hyperithm → morpho-blue | Morpho's Monad vault page associates Hyperithm with the specific named vault; publisher identification, not independently verified curator authority. | [Morpho vault](https://app.morpho.org/monad/vault/0x78999cc96d2Ba0341588C60CcB0E91c6C33CF371/hyperithm-usdc-apex) |
| beefy-august-digital-vault: beefy → august-digital | Beefy product morpho-v2-monad-august-usdc-v2 links https://app.morpho.org/monad/vault/0x80017bF0f793EBbE9679Cd61ff0e395B62CAbB59/august-usdc-v2 and assigns curatorId august-digital; only this product association is supported. | [Pinned Beefy configuration](https://raw.githubusercontent.com/beefyfinance/beefy-v2/b7098b467950b1ac01dbb248241bbc9bfae72e0b/src/config/vault/monad.json) |
| august-digital-morpho-vault: august-digital → morpho-blue | Morpho's Monad vault page associates August Digital with the specific named vault; publisher identification, not independently verified curator authority. | [Morpho vault](https://app.morpho.org/monad/vault/0x80017bF0f793EBbE9679Cd61ff0e395B62CAbB59/august-usdc-v2) |
| agora-layerzero-oft: agora → layerzero-v2 | Agora’s announcement associates AUSD with LayerZero OFT and Monad; the announcement describes both adoption and future rollout, not a tested bridge route. | [Agora announcement](https://www.agora.finance/blog/ausd-now-borderless-onchain) |
| perpl-agora-collateral: perpl → agora | Documented collateral dependency: Perpl mainnet uses the published AUSD token address associated with Agora in the Monad registry. | [Pinned Perpl documentation](https://raw.githubusercontent.com/PerplFoundation/api-docs/25ab6e2c75c8f84d0550da8c3be30af49ad631f2/README.md) |
| leverup-pyth-oracle: leverup → pyth | Oracle-provider architecture declared by LeverUp, a Monad-listed project; the article does not establish an exact Monad mainnet feed or contract mapping. | [LeverUp article](https://paragraph.com/@leverup/oracle-price-integrity-permissioned-validators) |

## Supporting token identity records

- E-KINTSU-TOKEN-MAPPING-001: Pinned Monad registry entry kintsu maps Kintsu's staking token address 0xA3227C5969757783154C60bF0bC1944180ed81B9; listing/address identity only. [Source](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json).
- E-SHMONAD-TOKEN-MAPPING-001: Pinned Monad registry entry fastlane maps ShMonad's staking token address 0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c; listing/address identity only. [Source](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json).

## Scope and caveats

- Beefy edges describe product dependencies, pool assets or a published curator label. They do not claim bilateral partnership.
- Morpho edges identify three specific branded Monad vaults. They do not independently verify curator key ownership or operational wallet authority.
- Agora → LayerZero retains the announcement’s partly prospective rollout wording. No working bridge route is claimed.
- LeverUp → Pyth is **incomplete**: a publisher-declared architecture plus Monad directory context; no chain-specific feed or adapter mapping. This distinction must remain visible.
- Every new record has a retrieval time, source-response SHA-256, limitations and immutable ID. Unknown publication timestamps remain null.
- Six recovered historical evidence payloads and two historical edges exist only to resolve lineage. They remain withheld; this decision does not approve them.

## Recorded maintainer decision

The maintainer approved the 24 new evidence records and 22 proposed relationships with the above
limitations. Individual decisions are recorded in
`data/research/relationship-expansion-2026-10-10.reviewed.json`; the decision manifest names every
approved ID in `data/research/relationship-expansion-2026-10-10.decision.json`.

The approved `phase-3.5-v7` snapshot was created and reviewed at `2026-10-10T15:56:53Z`, with
canonical SHA-256 `6a6c7cf9830460fca3ce75bdbfd8510b72b6fba70ada136eb145e45a95155d28`.
Its versioned generated module and all 245 Merkle proofs have been verified.
Pinned publisher declarations retain the same 60-day review cadence as mutable declarations.

The exact public folder is pinned at
`ipfs://bafybeie73hfukkqxrap2mtfp5lw2o3pv4qztrgusm4fnvibwlibw7sbat4/manifest.json`.
Both gateways retrieved all four exact files. The zero-value unsigned Testnet request is prepared
at `tools/registry-publish/requests/phase-3.5-v7.json`, against the current v6 head.
Expected publication ID: `0x749a1fa2b3b731ba051f7d18697b8db563adc0b038cb9b3c864430187b62421c`.
The owner signs at `/tools/registry-publish/index.html?version=phase-3.5-v7` on localhost.
Activate the new app snapshot only after receipt and finality checks.
The current public app remains bound to the published v6 until then.
