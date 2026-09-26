# Controlled evidence refresh — source review for `phase-3.5-v1`

> Historical review gate. Runtime integration subsequently promoted these approved decisions as
> active snapshot `phase-3.5-v2`; `phase-3.5-v1` remains the rollback boundary.

Refresh-review timestamp (UTC): `2026-09-22T22:02:32Z`  
Prior snapshot: `phase-3.5-v1`  
Prior snapshot created/reviewed: `2026-09-09T07:43:40Z`  
Prior canonical SHA-256: `a26c65fafbb030b85bd427ddb3e25c9727958b2142510205478da97971e6d5ea`  
Review boundary: the same 23 approved records, six entity IDs (`monad`, `kuru`, `aPriori`, `magma`, `switchboard`, `pyth`), and six sourced relationships. No project discovery or active-artifact change is proposed here.

## Decision summary

| Decision | Count | Evidence IDs |
|---|---:|---|
| `unchanged` | 21 | All current IDs except `E-KURU-MEM-001` and `E-PYTH-CAP-001`. |
| `successor required` | 1 | `E-KURU-MEM-001` → proposed `E-KURU-MEM-002`. |
| `stale` | 1 | `E-PYTH-CAP-001`; no positive successor should be fabricated. |
| `rejected` | 0 | — |
| `unavailable` | 0 | — |
| `conflict requires preservation` | 0 | — (the Kuru and Pyth conflicts already encoded in unchanged records remain mandatory). |

The refresh found two material mutable-page changes:

1. The Monad App Portal still includes Kuru in Spot Trading, but its displayed copy is now **“Trading Hub on Monad,”** not the stored **“Onchain Orderbook & Aggregator.”** The old evidence payload must not be edited in place.
2. Pyth's current EVM contract-address page still describes the 2026-08-26 EVM upgrade generally, but its current mainnet table does not list Monad or either stored Monad address. The old mutable page therefore no longer lets a reviewer inspect the exact Monad address/migration claim. The separate current Pyth push-feed page and Monad infrastructure directory still list Monad/Pyth, so this is not evidence that Pyth has ceased operating on Monad; it is only a loss of support for the exact contract-address record.

## Record-by-record matrix

`r` is the prior `retrievedAt`; `p` is the prior `publishedAt`. Every decision below is exactly one of the controlled refresh decisions. “No change” means no immutable evidence payload edit is recommended; it does not make a project verified, safe, legitimate, active, current, or endorsed.

| Evidence ID | Prior claim / status / source / timestamps | Current observation at refresh | Decision | Successor ID and exact lineage | Proposed quality / review change | Relationship impact |
|---|---|---|---|---|---|---|
| `E-MONAD-CAP-001` | `Claimed`: Monad docs describe an Ethereum-compatible Layer 1 and parallel execution. [Monad for Developers](https://docs.monad.xyz/introduction/monad-for-developers), Monad Foundation. `r=2026-09-09T07:43:40Z`; `p=null`. | Stored official page is available and still calls Monad an Ethereum-compatible Layer-1 and documents parallel execution. No exact publication timestamp is exposed. | `unchanged` | None; retain sequence 1. | Keep approved and all existing quality flags. Self-published capability wording only. | None. |
| `E-MONAD-MAINNET-001` | `Observed`: Monad Foundation announced public mainnet launch on 2025-11-24. [Stored announcement URL](https://www.monad.xyz/announcements/get-started-on-monad-mainnet), Monad Foundation. `r=2026-09-09T07:43:40Z`; `p=2025-11-24T00:00:00Z` (day precision). | Stored URL redirects to the current canonical `/blog/get-started-on-monad-mainnet` page. Title, publisher, visible publication day, and launch wording remain present. | `unchanged` | None; retain sequence 1. | Keep approved and `timeBoundEligible=true`; retain day-precision limitation. Redirect alone does not require a payload revision while the stored URL resolves. | None. |
| `E-MONAD-NET-001` | `Observed`: official docs identify Monad mainnet as chain ID 143. [Network Information](https://docs.monad.xyz/developer-essentials/network-information), Monad Foundation. `r=2026-09-09T07:43:40Z`; `p=null`. | Official page remains available. Its rendered table hides some values in text-only extraction, but the page source exposed by the official docs reader still contains `Network Name=Monad Mainnet` and `Chain ID=143`. No exact publication timestamp is exposed. | `unchanged` | None; retain sequence 1. | Keep approved and the dynamic-rendering limitation. | None. |
| `E-KURU-CAP-001` | `Claimed`: Kuru docs describe a fully onchain order-book DEX and smart aggregator built on Monad. [Kuru docs](https://docs.kuru.io/), Kuru Labs. `r=2026-09-09T07:43:40Z`; `p=null`. | Current official Kuru page preserves the exact subject, Monad scope, “fully onchain order book DEX,” and “smart aggregator” wording. No exact publication timestamp is exposed. | `unchanged` | None; retain sequence 1. | Keep approved and existing self-published limitations. | None. |
| `E-KURU-CONTRACTS-001` | `Claimed`: Kuru publishes Monad-mainnet Flow Entrypoint, Flow Router, MarginAccount, and market-factory Router mappings. [Contract Addresses](https://docs.kuru.io/contracts/Contract-addresses), Kuru Labs. `r=2026-09-09T07:43:40Z`; `p=null`. | Current page still separates Mainnet and Testnet and preserves all four stored mappings: `0xb3e6…13cb`, `0x0d3a…FFa2`, `0x2A68…90c5`, `0xd651…95CC`. It also lists additional contracts/tokens/markets, which do not broaden this record. | `unchanged` | None; retain sequence 1. | Keep approved, `conflict=true`, and `incomplete=true`; preserve the Flow Router/KuruFlowRouterV2 role conflict. | None. |
| `E-KURU-REGISTRY-001` | `Observed`: pinned registry Kuru entry and conflicting router labels. [Pinned raw JSON](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json), Monad protocol registry repository. `r=2026-09-09T07:43:40Z`; `p=2026-09-07T21:59:59Z`. | Exact commit artifact is available through the equivalent GitHub blob and contains the stored Kuru categories, address mappings, `KuruFlowRouterV2=0x0d3a…FFa2`, and separate `KuruFlowRouter=0x465D…7040`. Current `main` has the same selected Kuru entry. The raw hostname was blocked by the review client, not shown to be removed upstream. | `unchanged` | None; retain sequence 1. | Keep approved, pinned reference, `conflict=true`, `incomplete=true`, and held disposition for `0x465D…7040`. | None. |
| `E-KURU-CHAIN-001` | `Observed`: one successful call to `0xb3e6…13cb` at `2026-08-13T03:10:24Z`. [MonadScan transaction](https://monadscan.com/tx/0x38f2408c6c7e6f4494abb85381fa3ef26b501d65abf54012ce0694322b582b03), MonadScan. `r=2026-09-09T07:43:40Z`; `p=2026-08-13T03:10:24Z`. | Direct transaction page remains available on Monad mainnet and shows the exact hash, success, block timestamp, destination, and “Kuru: Flow Entry Point” label. | `unchanged` | None; retain sequence 1. | Keep approved and bounded to one artifact; do not infer present activity. | None. |
| `E-KURU-MEM-001` | `Observed`: App Portal lists Kuru under Spot Trading as “Onchain Orderbook & Aggregator.” [Monad App Portal](https://app.monad.xyz/), Monad Foundation. `r=2026-09-09T07:43:40Z`; `p=null`. | Current portal still lists Kuru in Spot Trading and links to Kuru, but the displayed copy is now **“Trading Hub on Monad.”** The prior exact wording is no longer inspectable on this mutable page. | `successor required` | Add `E-KURU-MEM-002`, `revision.sequence=2`, `revision.supersedesEvidenceId="E-KURU-MEM-001"`. Exact new claim: “At the 2026-09-22 refresh, Monad Foundation App Portal listed Kuru in Spot Trading as ‘Trading Hub on Monad.’” | After the successor is reviewed, set `E-KURU-MEM-001` review status to `stale`. New record: `Observed`, `publishedAt=null`, same source/publisher/network, all warning flags false, `timeBoundEligible=false`, and the same directory-not-endorsement limitations. | `monad-kuru` cannot continue referencing the stale predecessor. Add relationship successor `monad-kuru-002` as specified below. |
| `E-APRIORI-CAP-001` | `Claimed`: Capricorn docs describe aprMON as a reward-bearing liquid-staking token accruing staking and MEV revenue and deployable across DeFi. [Capricorn introduction](https://capricorn-docs.gitbook.io/capricorn-docs/introduction-to-capricorn-tech), Capricorn Tech. `r=2026-09-09T07:43:40Z`; `p=2026-07-29T14:13:30.713Z`. | Stored path redirects to the docs root but renders the same page and exact aprMON pillar wording. Its visible “Last updated” time element still carries `2026-07-29T14:13:30.713Z`. `apr.io` still redirects to `capricorn.tech`; this remains an identity-transition aid only. | `unchanged` | None; retain sequence 1. | Keep approved and `incomplete=true`; retain legacy `aPriori` ID and identity-transition limitations. | `monad-apriori` remains supportable by the same two records. |
| `E-APRIORI-REGISTRY-001` | `Observed`: pinned legacy aPriori registry entry and aprMON mapping. [Pinned raw JSON](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json), Monad protocol registry repository. `r=2026-09-09T07:43:40Z`; `p=2026-09-07T21:59:59Z`. | Exact commit and current `main` both retain key `apriori`, legacy label aPriori, categories, `aprMON=0x0c65…0852`, and held ValidatorsRegistry mapping. | `unchanged` | None; retain sequence 1. | Keep approved, `conflict=true`, `incomplete=true`, legacy-label conflict, and held ValidatorsRegistry disposition. | `monad-apriori` unchanged. |
| `E-APRIORI-CHAIN-001` | `Observed`: one successful `deposit(uint256,address)` call on `0x0c65…0852` at `2026-09-08T17:51:10Z`. [MonadScan transaction](https://monadscan.com/tx/0x60fc294b5e48ea8997dc1b4ddfc37ab3b82a6b9913e1b6dd40a7ed33fac0c7db), MonadScan. `r=2026-09-09T07:43:40Z`; `p=2026-09-08T17:51:10Z`. | Direct page remains available and shows the exact hash, success, timestamp, destination, aPriori/aprMON explorer label, and decoded `deposit(uint256 assets,address receiver)` input. | `unchanged` | None; retain sequence 1. | Keep approved and bounded to the artifact instant; explorer label does not resolve present publisher identity. | None. |
| `E-MAGMA-CAP-001` | `Claimed`: Magma docs describe Monad liquid staking, gMON, and address `0x8498…5081`. [Liquid Staking (gMON)](https://docs.hydrogenlabs.xyz/magma/liquid-staking-gmon), Magma / Hydrogen Labs. `r=2026-09-09T07:43:40Z`; `p=null`. | Current project docs preserve the Monad liquid-staking description, gMON issuance, and exact address. The page still mixes present-tense mechanics with launch-plan wording. | `unchanged` | None; retain sequence 1. | Keep approved and existing limitations; do not add rewards, governance, or current-activity claims. | `monad-magma` unchanged. |
| `E-MAGMA-REGISTRY-001` | `Observed`: pinned Magma registry entry, categories, gMON, and Delegator mappings. [Pinned raw JSON](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json), registry repository. `r=2026-09-09T07:43:40Z`; `p=2026-09-07T21:59:59Z`. | Exact commit and current `main` preserve the Magma categories and the two stored mappings. The Delegator still lacks a second authoritative project source in this bounded review. | `unchanged` | None; retain sequence 1. | Keep approved and `incomplete=true`; keep Delegator at lower confidence. | `monad-magma` unchanged. |
| `E-MAGMA-CHAIN-001` | `Observed`: successful `depositMON(address,uint256)` at `2026-03-30T15:12:26Z`, 1,000 MON and 958.416822874522046371 gMON. [MonadScan transaction](https://monadscan.com/tx/0x90a377ccdfe51e77ee22d7843ace210f18c23ffd7e0ff95c138b7afc3e5b0ba4), MonadScan. `r=2026-09-09T07:43:40Z`; `p=2026-03-30T15:12:26Z`. | Direct page remains available and preserves the hash, success, timestamp, gMON destination/label, decoded function, 1,000 MON value, and exact minted gMON amount. | `unchanged` | None; retain sequence 1. | Keep approved and bounded to one historical artifact; do not infer activity, APY, solvency, or safety. | None. |
| `E-SWITCHBOARD-CAP-001` | `Claimed`: Switchboard docs say On-Demand supports Monad and list chain ID 143 proxy `0xB7F0…0E67`. [Switchboard on Monad](https://docs.switchboard.xyz/docs-by-chain/evm/monad), Switchboard. `r=2026-09-09T07:43:40Z`; `p=null`. | Current official page still lists Monad mainnet chain ID 143 and the same proxy address. It now adds implementation and ABI detail, but the stored bounded claim remains exactly supported. No exact page publication timestamp is exposed. | `unchanged` | None; retain sequence 1. | Keep approved and existing self-published limitations. Do not ingest the newly displayed implementation address under this ID. | `monad-switchboard` unchanged. |
| `E-SWITCHBOARD-MEM-001` | `Observed`: Monad infrastructure directory lists Switchboard in Oracle. [Infrastructure Directory](https://www.monad.xyz/infra), Monad Foundation. `r=2026-09-09T07:43:40Z`; `p=null`. | Current directory still lists Switchboard and category Oracle. The page markets its entries as “trusted tools and services,” but the evidence remains only an observed inclusion/category; the existing limitation blocks endorsement semantics. | `unchanged` | None; retain sequence 1. | Keep approved and the explicit no-endorsement/no-deployment-proof limitation. | `monad-switchboard` unchanged. |
| `E-SWITCHBOARD-REGISTRY-001` | `Observed`: pinned Switchboard `Infra::Oracle` entry and Oracle address. [Pinned raw JSON](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json), registry repository. `r=2026-09-09T07:43:40Z`; `p=2026-09-07T21:59:59Z`. | Exact commit and current `main` retain the same category and `Oracle=0xB7F0…0E67`, still agreeing with current Switchboard docs. | `unchanged` | None; retain sequence 1. | Keep approved; agreement remains mapping corroboration, not an attestation. | None. |
| `E-PYTH-CAP-001` | `Claimed`: Pyth docs list Monad Pyth Core, an upgrade effective 2026-08-26, earlier address `0x2880…7B43`, and recommended address `0xB754…508d`. [EVM contract addresses](https://docs.pyth.network/price-feeds/core/contract-addresses/evm), Pyth Network. `r=2026-09-09T07:43:40Z`; `p=null`. | Current page remains available and retains general 2026-08-26 EVM-upgrade guidance, but the current mainnet table reports zero upgraded chains and does not list Monad or either stored Monad address. The exact stored Monad migration claim is no longer inspectable at this mutable URL. This absence does not prove removal or inactivity, especially because current Pyth push-feed docs still list Monad. | `stale` | No positive successor now. A future `E-PYTH-CAP-002` must be created only from an official current Monad contract mapping or an immutable source artifact; if created it must use sequence 2 and supersede `E-PYTH-CAP-001`. | Set review status to `stale` in a candidate workspace, with this refresh timestamp. Do not mutate the old payload or reinterpret it as an onchain observation. | `monad-pyth` must stop citing this record; add relationship successor `monad-pyth-002` retaining only `E-PYTH-MEM-001`. |
| `E-PYTH-PUSH-001` | `Claimed`: Pyth docs list sponsored push feeds on Monad mainnet. [EVM push feeds](https://docs.pyth.network/price-feeds/core/push-feeds/evm), Pyth Network. `r=2026-09-09T07:43:40Z`; `p=null`. | Current page explicitly includes “Monad Mainnet” and says its listed feeds are currently sponsored there, with displayed heartbeat/deviation groups. The stored claim remains narrower than the page and does not assert individual-feed freshness. | `unchanged` | None; retain sequence 1. | Keep approved; retain feed-membership/freshness limitations. | None. |
| `E-PYTH-MEM-001` | `Observed`: Monad infrastructure directory lists Pyth Network in Oracle. [Infrastructure Directory](https://www.monad.xyz/infra), Monad Foundation. `r=2026-09-09T07:43:40Z`; `p=null`. | Current directory still lists Pyth Network with category Oracle. Existing limitations remain necessary despite the page's “trusted tools” marketing copy. | `unchanged` | None; retain sequence 1. | Keep approved and explicit no-endorsement/no-current-feed limitation. | Becomes the sole evidence ID for proposed `monad-pyth-002`. |
| `E-PYTH-REGISTRY-001` | `Observed`: pinned Pyth registry entry, prior PriceFeed address, and Entropy mapping. [Pinned raw JSON](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json), registry repository. `r=2026-09-09T07:43:40Z`; `p=2026-09-07T21:59:59Z`. | Exact pinned artifact and current `main` still list `PriceFeed=0x2880…7B43` and `Entropy=0xD458…F134`. The record already labels the PriceFeed mapping historical/stale for new integrations and holds Entropy. Current Pyth contract docs no longer expose a Monad mapping, so no resolution is available. | `unchanged` | None; retain sequence 1. | Keep approved historical evidence with `conflict=true`, `incomplete=true`, `stale=true`; preserve all conflict context. | None. |
| `E-PYTH-CHAIN-001` | `Observed`: successful pre-upgrade `updatePriceFeedsIfNecessary` call on `0x2880…7B43` at `2026-07-16T16:55:15Z`. [MonadScan transaction](https://monadscan.com/tx/0x03c93be66f8e6acd0d5c08066b9d9e0663e0e17d48a5a30db2094277c8b54d5a), MonadScan. `r=2026-09-09T07:43:40Z`; `p=2026-07-16T16:55:15Z`. | Direct page remains available and preserves the exact hash, success, timestamp, destination, Pyth label, and decoded action. It remains historical and does not resolve current contract guidance. | `unchanged` | None; retain sequence 1. | Keep approved with `stale=true` and existing historical-only limitations. | None. |
| `E-MAGMA-SWITCHBOARD-001` | `Claimed`: Magma docs name Switchboard and publish two gMON feed IDs. [gMON Oracle Feeds](https://docs.hydrogenlabs.xyz/magma/developers/gmon-oracle-feeds), Magma / Hydrogen Labs. `r=2026-09-09T07:43:40Z`; `p=null`. | Current page still has a Switchboard section with the same exchange-rate and market-rate feed IDs. It now also names RedStone as a recommended provider; that does not negate the bounded one-sided Switchboard declaration and must not be turned into exclusivity. | `unchanged` | None; retain sequence 1. | Keep approved and one-sided/no-fresh-feed limitations. | `magma-switchboard` unchanged. |

## Required relationship decisions

Only two relationship revisions are recommended. They are successors because relationship evidence IDs are immutable payload fields.

| Current relationship | Decision | Candidate successor | Exact lineage and payload | Old relationship handling |
|---|---|---|---|---|
| `monad-kuru` | Replace after `E-KURU-MEM-002` is approved. | `monad-kuru-002` | `revision.sequence=2`; `revision.supersedesRelationshipId="monad-kuru"`; endpoints and type stay `monad` → `kuru`, `ecosystem_membership`; `status="Observed"`; `evidenceIds=["E-KURU-MEM-002"]`; scope: “At the 2026-09-22 refresh, Kuru appeared in the Monad Foundation App Portal Spot Trading section as ‘Trading Hub on Monad.’” Retain directory-not-endorsement limitations. | Mark `monad-kuru` stale before snapshot projection removes `E-KURU-MEM-001`. Never edit its evidence IDs in place. |
| `monad-pyth` | Remove the now-stale contract-page corroboration while preserving directory membership. | `monad-pyth-002` | `revision.sequence=2`; `revision.supersedesRelationshipId="monad-pyth"`; endpoints/type/status stay the same; `evidenceIds=["E-PYTH-MEM-001"]`; scope remains limited to Pyth's observed Monad infrastructure-directory membership under Oracle. Add limitation: current Pyth contract-address docs do not expose a Monad mapping, and membership does not prove feed freshness or deployment. | Mark `monad-pyth` stale before `E-PYTH-CAP-001` is removed from the approved projection. Never edit its evidence IDs in place. |

The other relationships remain unchanged: `monad-apriori`, `monad-magma`, `monad-switchboard`, and `magma-switchboard`.

### Implementation-ready successor payload

The Evidence Workflow agent should construct `E-KURU-MEM-002` with these exact material fields; review metadata may advance through the normal gate without changing this payload:

```json
{
  "id": "E-KURU-MEM-002",
  "projectId": "kuru",
  "relatedProjectIds": [],
  "claim": "At the 2026-09-22 refresh, Monad Foundation App Portal listed Kuru in Spot Trading as ‘Trading Hub on Monad.’",
  "evidenceType": "official-directory-listing",
  "status": "Observed",
  "source": {
    "kind": "directory-html",
    "title": "Monad App Portal",
    "url": "https://app.monad.xyz/",
    "publisher": "Monad Foundation",
    "available": true,
    "referenceType": "mutable-url",
    "presentationMutable": true
  },
  "retrievedAt": "2026-09-22T22:02:32Z",
  "publishedAt": null,
  "network": { "name": "Monad mainnet", "chainId": 143 },
  "scope": "Kuru ecosystem-directory membership, Spot Trading placement, and displayed copy at the refresh instant.",
  "provenanceNotes": "Manually inspected on the Monad Foundation App Portal during the controlled refresh.",
  "provenance": {
    "kind": "manual-curation",
    "notes": "Manually inspected on the Monad Foundation App Portal during the controlled refresh."
  },
  "limitations": [
    "Directory inclusion is not verification, endorsement, safety review, contract mapping, or proof of activity.",
    "Dynamic directory content and displayed copy can change."
  ],
  "quality": {
    "conflict": false,
    "incomplete": false,
    "stale": false,
    "unavailable": false,
    "timeBoundEligible": false
  },
  "identifiers": null,
  "conflicts": [],
  "supportMode": "artifact-observation-only",
  "supportedProposition": "Kuru ecosystem-directory membership, Spot Trading placement, and displayed copy at the refresh instant.",
  "supportsFactualClaims": true,
  "dataMode": "sourced-limited",
  "reviewStatus": "needs-review",
  "reviewedAt": null,
  "revision": {
    "sequence": 2,
    "supersedesEvidenceId": "E-KURU-MEM-001"
  }
}
```

This successor observes the mutable directory page only. It does not convert the publisher's directory inclusion into an attestation, integration, onchain observation, or project-wide trust state.

## Recommended candidate operations

These are instructions for a separate Evidence Workflow agent. This note does not execute them.

1. Export the then-active snapshot to a retained candidate workspace and use `phase-3.5-v1` as the explicit previous boundary.
2. Prepare evidence successor `E-KURU-MEM-002` from `E-KURU-MEM-001` in revision mode. Replace every payload field that depends on the old wording; set `retrievedAt=2026-09-22T22:02:32Z`, `publishedAt=null`, and `reviewStatus=needs-review` until a maintainer approves it.
3. Prepare `monad-kuru-002` from `monad-kuru` in relationship revision mode, referencing only `E-KURU-MEM-002` and using the exact lineage above.
4. Mark `monad-kuru` stale, then mark `E-KURU-MEM-001` stale, using `reviewedAt=2026-09-22T22:02:32Z`; order the transitions so no approved relationship references non-approved evidence.
5. Mark `monad-pyth` stale before marking `E-PYTH-CAP-001` stale, using the same review timestamp.
6. Prepare `monad-pyth-002` in relationship revision mode with `evidenceIds=["E-PYTH-MEM-001"]`. Do not create a replacement Pyth contract-address record without a current official mapping or immutable artifact.
7. Validate and inspect every changed record and relationship; approve successors only after the exact payloads match this matrix.
8. Generate a new versioned approved snapshot, inspect the diff, and expect 22 approved evidence records: one added (`E-KURU-MEM-002`), two removed from the approved projection (`E-KURU-MEM-001`, `E-PYTH-CAP-001`), and 21 unchanged. Expect six approved relationships: two added successors, two removed predecessors, and four unchanged. The candidate workspace must retain every predecessor for audit and lineage.
9. Treat the count expectation as a diagnostic, not authorization. Load, diff, and promote only after human review of exact version, `reviewedAt`, and canonical SHA-256. Keep the then-active `phase-3.5-v1` pair unchanged until that separate gate succeeds.

## Inspected sources and attribution

Stored URLs inspected directly or through an equivalent rendering of the exact artifact:

- Monad Foundation documentation: [Monad for Developers](https://docs.monad.xyz/introduction/monad-for-developers), [Network Information](https://docs.monad.xyz/developer-essentials/network-information), [mainnet announcement](https://www.monad.xyz/announcements/get-started-on-monad-mainnet), [App Portal](https://app.monad.xyz/), and [Infrastructure Directory](https://www.monad.xyz/infra).
- Kuru Labs documentation: [overview](https://docs.kuru.io/) and [contract addresses](https://docs.kuru.io/contracts/Contract-addresses).
- Capricorn Tech documentation: [Introduction to Capricorn Tech](https://capricorn-docs.gitbook.io/capricorn-docs/introduction-to-capricorn-tech). Supplementary identity-bridge check: [apr.io](https://www.apr.io/) still resolves to Capricorn Tech.
- Magma / Hydrogen Labs documentation: [Liquid Staking (gMON)](https://docs.hydrogenlabs.xyz/magma/liquid-staking-gmon) and [gMON Oracle Feeds](https://docs.hydrogenlabs.xyz/magma/developers/gmon-oracle-feeds).
- Switchboard documentation: [Switchboard on Monad](https://docs.switchboard.xyz/docs-by-chain/evm/monad).
- Pyth Network documentation: [EVM contract addresses](https://docs.pyth.network/price-feeds/core/contract-addresses/evm) and [EVM push feeds](https://docs.pyth.network/price-feeds/core/push-feeds/evm).
- MonadScan stable transaction artifacts: [Kuru](https://monadscan.com/tx/0x38f2408c6c7e6f4494abb85381fa3ef26b501d65abf54012ce0694322b582b03), [aPriori/aprMON](https://monadscan.com/tx/0x60fc294b5e48ea8997dc1b4ddfc37ab3b82a6b9913e1b6dd40a7ed33fac0c7db), [Magma](https://monadscan.com/tx/0x90a377ccdfe51e77ee22d7843ace210f18c23ffd7e0ff95c138b7afc3e5b0ba4), and [Pyth](https://monadscan.com/tx/0x03c93be66f8e6acd0d5c08066b9d9e0663e0e17d48a5a30db2094277c8b54d5a).
- Monad protocol registry: stored [raw pinned commit artifact](https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json), inspected via the equivalent [GitHub blob at the same commit](https://github.com/monad-crypto/protocols/blob/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json). The five relevant entries were also compared with the current [`main` file](https://github.com/monad-crypto/protocols/blob/main/protocols-mainnet.json); their selected categories/addresses were unchanged.

## Limitations

- This was a manual point-in-time review, not source synchronization, crawling, indexing, or onchain state measurement.
- Mutable documentation and directory pages can change after `2026-09-22T22:02:32Z`. No local screenshot or content archive was created, so future historical inspection still depends on publisher availability unless the workflow deliberately adopts an immutable public artifact.
- The raw GitHub content host was blocked by the review client's content policy. The exact same commit/file was available and parsed through GitHub's blob view. This is a client-access limitation, not evidence that the upstream artifact is unavailable.
- Several explorer pages were not parseable in the text-only fetcher but loaded directly in a normal browser and exposed their hashes, status, timestamps, destinations, labels, and decoded actions. Explorer labels remain mutable presentation metadata.
- Directory inclusion remains only an observation of a publisher's directory. The word “trusted” in current Monad directory marketing copy is not imported as verification, endorsement, safety, legitimacy, or attestation.
- The current Pyth contract-address page's omission of Monad is not proof of deprecation, inactivity, or contract removal. It only makes `E-PYTH-CAP-001` unsuitable for continued current runtime support at its exact mutable URL.
- No evidence in this review supports a generic `active`, `current`, `safe`, `verified`, `legitimate`, or `endorsed` project conclusion.

## Handoff to Evidence Workflow

All 23 active evidence IDs are accounted for exactly once in the matrix: 21 unchanged, one successor required, and one stale. The active snapshot was not modified. The next agent should implement only the auditable candidate operations above, retain predecessor history, validate lineage and relationship references at every transition, and stop before runtime promotion unless a maintainer separately approves the new snapshot version, review timestamp, and canonical hash.
