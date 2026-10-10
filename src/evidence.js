import {
  REVIEW_STATUSES,
  REVIEW_GOVERNANCE_POLICY_VERSION,
  createReviewGovernanceFixtures,
  createEvidenceContractFixtures,
  calculateEvidenceReviewCadence,
  calculateRelationshipReviewCadence,
  isIsoTimestamp,
  projectApprovedRelationships,
  validateReviewGovernanceCompanion,
  validateReviewMetadata,
  validateRevisionLineage,
} from './evidence-contract.js';
import {
  APPROVED_EVIDENCE_SNAPSHOT,
  APPROVED_EVIDENCE_SNAPSHOT_SHA256,
} from './evidence-snapshots/phase-3.5-v7.generated.js';

export const EVIDENCE_DATA_MODE = 'sourced-limited';

export { REVIEW_STATUSES };

export const EVIDENCE_SNAPSHOT_VERSION = 'phase-3.5-v7';
export const EVIDENCE_SNAPSHOT_CREATED_AT = '2026-10-10T15:56:53Z';
export const EVIDENCE_SNAPSHOT_REVIEWED_AT = '2026-10-10T15:56:53Z';
export const REVIEW_GOVERNANCE_AS_OF = EVIDENCE_SNAPSHOT_REVIEWED_AT;
export { REVIEW_GOVERNANCE_POLICY_VERSION };

export const CURATED_PROJECT_IDS = Object.freeze([
  'monad',
  'kuru',
  'aPriori',
  'magma',
  'switchboard',
  'pyth',
]);

// Phase 5.1 Batch 1 entity expansion (data/research/batch-1-selection-2026-09-27.json):
// the 30 new projects approved into the phase-3.5-v3 snapshot. Every id is a drafted intake
// proposal id; none of these projects is verified, endorsed, or ranked by its presence here.
export const BATCH1_PROJECT_IDS = Object.freeze([
  'aave-v3',
  'pancakeswap',
  'uniswap',
  'curve',
  'pendle',
  'upshift',
  'euler',
  'lagoon',
  'curvance',
  'renzo',
  'beefy',
  'yuzu-money',
  'balancer',
  'spectra',
  'mento',
  'symbiosis',
  'neverland',
  'ample',
  'perpl',
  'woofi',
  'leverup',
  'kintsu',
  'levr-bet',
  'sumer-money',
  'monday-trade',
  'capricorn',
  'nad-fun',
  'drake',
  'kizzy',
  'nabla-finance',
]);

// Phase 5.2 Batch 2 entity expansion (data/research/batch-2-selection-2026-09-27.json):
// 90 further intake proposals approved into the phase-3.5-v4 snapshot — 85 DefiLlama
// registry-listing records + 5 App Portal records deferred from Batch 1. Same trust
// boundary as Batch 1: presence is directory/registry listing, nothing more.
export const BATCH2_PROJECT_IDS = Object.freeze([
  'bean-exchange', 'clober', 'covenant', 'narbet', 'narwhal-finance', 'accountable',
  'aethonswap', 'agua', 'alphagrowth', 'atlantis-dex', 'august-digital', 'autofinance',
  'brownfi-v2', 'clearstar', 'detrade', 'enjoyoors', 'euclid-protocol', 'euler-dao',
  'folks-finance-xchain', 'fusion-by-ipor', 'gamma-research', 'gearbox', 'ghost-protocol', 'gluehook',
  'hanji-protocol', 'huma', 'hyperithm', 'iziswap', 'joe-dex', 'k3-capital',
  'k613', 'layerzero-v2', 'lemonad', 'lfj-poe', 'lunarbase', 'madness-finance',
  'mellow-core', 'mellow-restaking', 'metric-v2', 'monad-grid', 'moonmace', 'morpho-blue',
  'mu-digital', 'murk-finance', 'native-lend-curator', 'near-intents', 'neutral-trade', 'noxa-dex-v2',
  'noxa-fun', 'obsdn', 'octoswap-cl', 'ouroboros-capital', 'pangolin-v3', 'parity-dex',
  'peridot', 'pingu-exchange', 'pinot-v3', 'printr', 'purpsexchange', 'quantus-lend',
  'reservoir-protocol', 'rockawayx', 'sablier-lockup', 'saffron-vaults', 'sherpa', 'shmonad',
  'skate-amm', 'someswap-amm', 'springx', 'steakhouse-financial', 'stoneusd', 'swaap-maker-v2',
  'sweep-n-flip', 'swyrl-cl', 'theo-network-thbill', 'thesauros', 'townsquare-lending', 'townsquare-loop-vaults',
  'travessia-credit', 'tulipa-capital', 'ultrayield-curator', 'unified-labs', 'unit', 'valos',
  'veda', 'vfat-io', 'vii-finance', 'wombat-exchange', 'y10k-capital', 'zkswap-v2',]);

// 48 further intake groups approved into the phase-3.5-v5 snapshot — resolved App-portal-only
// pending groups whose Monad deployment is recorded by the pinned Monad protocol registry
// (commit 36fddcc) and verified live on-chain via the Etherscan V2 API (chainid 143). Same
// trust boundary: a registry address mapping is a deployment record, not verification,
// activity, safety, or endorsement. Seven brand-level groups whose protocols already exist in
// the city as batch-2 manifests were excluded at assembly (data/research/batch-3-review-plan).
export const BATCH3_PROJECT_IDS = Object.freeze([
  'lumiterra', 'bro-fun', 'matcha', 'opensea',
  'fastlane', 'agora', 'bonad', 'kyberswap',
  'pingme', 'lootgo', 'monorail', 'aarna',
  'across', 'apebond', 'blinq', 'bungee',
  'cashmere', 'cctp-exchange', 'clanker-world', 'debridge',
  'definitive', 'dfusion-ai', 'dirol', 'flap',
  'gmgn', 'grimmys', 'kinetk', 'kinic',
  'mayan', 'memetok', 'mevx', 'mona-trading-bot',
  'openocean', 'playkami', 'puffer', 'relay',
  'rug-rumble', 'stakestone', 'sushiswap', 'tadle',
  'wormhole-portal', 'trendle', 'plabs', 'crsh-market',
  'collective-memory', 'oripa', 'anomapay', 'o1-exchange',]);

// Two brand-level ids introduced by the 2026-09-27 identity merges (owner decision «слей
// все 7»): Mellow and TownSquare become the manifests; their product manifests remain as
// aliases and their product records are superseded (see identity-merge-review-plan).
export const KNOWN_PROJECT_IDS = Object.freeze([
  ...CURATED_PROJECT_IDS,
  ...BATCH1_PROJECT_IDS,
  ...BATCH2_PROJECT_IDS,
  ...BATCH3_PROJECT_IDS,
  'mellow',
  'townsquare',
]);

// Version-pinned approved-projection sizes: an import that silently drops or duplicates
// records cannot pass the runtime contract, exactly as the v2 22-record freeze did.
export const EXPECTED_SNAPSHOT_COUNTS = Object.freeze({
  'phase-3.5-v2': Object.freeze({ records: 22, relationships: 6 }),
  'phase-3.5-v3': Object.freeze({ records: 52, relationships: 6 }),
  'phase-3.5-v4': Object.freeze({ records: 142, relationships: 6 }),
  'phase-3.5-v5': Object.freeze({ records: 190, relationships: 6 }),
  'phase-3.5-v6': Object.freeze({ records: 193, relationships: 6 }),
  'phase-3.5-v7': Object.freeze({ records: 217, relationships: 28 }),
});

export const EVIDENCE_STATUSES = Object.freeze([
  'Observed',
  'Claimed',
  'Attested',
  'AI-inferred',
]);

export const EVIDENCE_SUPPORT_MODES = Object.freeze([
  'artifact-observation-only',
  'publisher-statement-only',
  'scoped-attestation-only',
  'discovery-only',
]);

export const EVIDENCE_TYPES = Object.freeze([
  'project-documentation',
  'official-launch-record',
  'network-configuration',
  'project-address-publication',
  'protocol-registry-snapshot',
  'explorer-transaction',
  'official-directory-listing',
  'project-declared-relationship',
]);

export const RELATIONSHIP_TYPES = Object.freeze([
  'ecosystem_membership',
  'declared_integration',
]);

const RETRIEVED_AT = '2026-09-09T07:43:40Z';
const REGISTRY_PUBLISHED_AT = '2026-09-07T21:59:59Z';
const REGISTRY_COMMIT = '36fddcc0021fffe81c7b73a8672347538ec2c9eb';
const REGISTRY_URL = `https://raw.githubusercontent.com/monad-crypto/protocols/${REGISTRY_COMMIT}/protocols-mainnet.json`;
const REGISTRY_MAIN_URL =
  'https://raw.githubusercontent.com/monad-crypto/protocols/main/protocols-mainnet.json';
const MONAD_MAINNET = Object.freeze({ name: 'Monad mainnet', chainId: 143 });

function source({
  kind,
  title,
  url,
  publisher,
  referenceType = 'mutable-url',
  presentationMutable = true,
}) {
  return {
    kind,
    title,
    url,
    publisher,
    available: true,
    referenceType,
    presentationMutable,
  };
}

function quality(overrides = {}) {
  return {
    conflict: false,
    incomplete: false,
    stale: false,
    unavailable: false,
    timeBoundEligible: false,
    ...overrides,
  };
}

function evidence({
  id,
  projectId,
  relatedProjectIds = [],
  claim,
  evidenceType,
  status,
  source: evidenceSource,
  publishedAt = null,
  network = MONAD_MAINNET,
  scope,
  provenanceNotes,
  limitations,
  quality: evidenceQuality = quality(),
  identifiers = null,
  conflicts = [],
  reviewStatus = 'approved',
  reviewedAt = EVIDENCE_SNAPSHOT_REVIEWED_AT,
  revision = { sequence: 1, supersedesEvidenceId: null },
}) {
  const supportMode = {
    Observed: 'artifact-observation-only',
    Claimed: 'publisher-statement-only',
    Attested: 'scoped-attestation-only',
    'AI-inferred': 'discovery-only',
  }[status];

  return {
    id,
    projectId,
    relatedProjectIds,
    claim,
    evidenceType,
    status,
    source: evidenceSource,
    retrievedAt: RETRIEVED_AT,
    publishedAt,
    network,
    scope,
    provenanceNotes,
    provenance: {
      kind: 'manual-curation',
      notes: provenanceNotes,
    },
    limitations,
    quality: evidenceQuality,
    identifiers,
    conflicts,
    supportMode,
    supportedProposition: scope,
    // Backward-compatible eligibility signal. It is meaningful only together
    // with supportMode and supportedProposition; it is never generic project truth.
    supportsFactualClaims: supportMode !== 'discovery-only',
    dataMode: EVIDENCE_DATA_MODE,
    reviewStatus,
    reviewedAt,
    revision,
  };
}

function registrySource() {
  return source({
    kind: 'registry-json',
    title: `Monad mainnet protocol registry at ${REGISTRY_COMMIT}`,
    url: REGISTRY_URL,
    publisher: 'Monad protocol registry repository',
    referenceType: 'pinned-snapshot',
    presentationMutable: false,
  });
}

export const candidateEvidenceRecords = Object.freeze([
  evidence({
    id: 'E-MONAD-CAP-001',
    projectId: 'monad',
    claim:
      'Monad documentation describes Monad as an Ethereum-compatible Layer-1 and documents parallel execution.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Monad for Developers',
      url: 'https://docs.monad.xyz/introduction/monad-for-developers',
      publisher: 'Monad Foundation',
    }),
    scope: 'Protocol identity and documented execution capability.',
    provenanceNotes: 'Manually retrieved from the official Monad documentation domain.',
    limitations: [
      'Self-published technical description.',
      'Does not independently benchmark throughput, decentralization, reliability, or safety.',
    ],
  }),
  evidence({
    id: 'E-MONAD-MAINNET-001',
    projectId: 'monad',
    claim: 'Monad Foundation announced that Monad public mainnet launched on 2025-11-24.',
    evidenceType: 'official-launch-record',
    status: 'Observed',
    source: source({
      kind: 'announcement-html',
      title: 'Get Started on Monad Mainnet',
      url: 'https://www.monad.xyz/announcements/get-started-on-monad-mainnet',
      publisher: 'Monad Foundation',
    }),
    publishedAt: '2025-11-24T00:00:00Z',
    scope: 'Official launch announcement at day precision.',
    provenanceNotes:
      'The normalized midnight timestamp represents the published day, not a claimed launch time.',
    limitations: [
      'An official announcement is not independent chain-history validation.',
      'Does not support uninterrupted uptime or current network health.',
    ],
    quality: quality({ timeBoundEligible: true }),
  }),
  evidence({
    id: 'E-MONAD-NET-001',
    projectId: 'monad',
    claim: 'Monad official documentation identifies mainnet as chain ID 143.',
    evidenceType: 'network-configuration',
    status: 'Observed',
    source: source({
      kind: 'documentation-html',
      title: 'Network Information',
      url: 'https://docs.monad.xyz/developer-essentials/network-information',
      publisher: 'Monad Foundation',
    }),
    scope: 'Monad mainnet network identity only.',
    provenanceNotes: 'Official network-information page retrieved directly.',
    limitations: [
      'Dynamic rendering can omit values in text-only clients.',
      'Does not validate any project contract in the linked ecosystem registry.',
    ],
  }),

  evidence({
    id: 'E-KURU-CAP-001',
    projectId: 'kuru',
    claim:
      'Kuru documentation describes Kuru as a fully onchain order-book DEX and smart aggregator built on Monad.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Kuru Documentation',
      url: 'https://docs.kuru.io/',
      publisher: 'Kuru Labs',
    }),
    scope: 'Project identity, category, documented capabilities, and Monad deployment claim.',
    provenanceNotes: 'Project-controlled documentation aligned with the existing `kuru` entity ID.',
    limitations: [
      'Self-published project description.',
      'Does not prove execution quality, safety, liquidity, volume, or current activity.',
    ],
  }),
  evidence({
    id: 'E-KURU-CONTRACTS-001',
    projectId: 'kuru',
    claim:
      'Kuru documentation publishes Monad-mainnet addresses for Flow Entrypoint, Flow Router, MarginAccount, and the market-factory Router.',
    evidenceType: 'project-address-publication',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Kuru Contract Addresses',
      url: 'https://docs.kuru.io/contracts/Contract-addresses',
      publisher: 'Kuru Labs',
    }),
    scope: 'Four project-published Monad-mainnet address-role mappings.',
    provenanceNotes: 'Project page separates mainnet and testnet addresses.',
    limitations: [
      'Address publication does not prove control, code identity, upgrade state, or safety.',
      'The Flow Router role conflicts with the pinned registry naming.',
    ],
    quality: quality({ conflict: true, incomplete: true }),
    identifiers: {
      contracts: [
        {
          role: 'Flow Entrypoint',
          address: '0xb3e6778480b2E488385E8205eA05E20060B813cb',
          runtimeDisposition: 'candidate',
        },
        {
          role: 'Flow Router (project wording)',
          address: '0x0d3a1BE29E9dEd63c7a5678b31e847D68F71FFa2',
          runtimeDisposition: 'candidate-with-role-conflict',
        },
        {
          role: 'MarginAccount',
          address: '0x2A68ba1833cDf93fa9Da1EEbd7F46242aD8E90c5',
          runtimeDisposition: 'candidate',
        },
        {
          role: 'Market-factory Router',
          address: '0xd651346d7c789536ebf06dc72aE3C8502cd695CC',
          runtimeDisposition: 'candidate',
        },
      ],
    },
    conflicts: [
      {
        kind: 'contract-role-name',
        address: '0x0d3a1BE29E9dEd63c7a5678b31e847D68F71FFa2',
        thisSourceRole: 'Flow Router',
        conflictingEvidenceId: 'E-KURU-REGISTRY-001',
        conflictingSourceRole: 'KuruFlowRouterV2',
      },
    ],
  }),
  evidence({
    id: 'E-KURU-REGISTRY-001',
    projectId: 'kuru',
    claim:
      'The pinned Monad registry lists Kuru as live in DEX / DEX Aggregator, labels 0x0d3a…FFa2 KuruFlowRouterV2, and separately labels 0x465D…7040 KuruFlowRouter.',
    evidenceType: 'protocol-registry-snapshot',
    status: 'Observed',
    source: registrySource(),
    publishedAt: REGISTRY_PUBLISHED_AT,
    scope: 'Pinned registry entry `kuru` and its exact snapshot metadata.',
    provenanceNotes: `Immutable commit snapshot. Moving re-retrieval pointer only: ${REGISTRY_MAIN_URL}`,
    limitations: [
      'Protocol representatives submit entries; automated checks validate format, not correctness or safety.',
      'The router naming is conflicting and incomplete.',
      '0x465D…7040 is held and must not be ingested as a current contract.',
    ],
    quality: quality({ conflict: true, incomplete: true, timeBoundEligible: true }),
    identifiers: {
      contracts: [
        {
          role: 'KuruFlowEntryPoint',
          address: '0xb3e6778480b2E488385E8205eA05E20060B813cb',
          runtimeDisposition: 'candidate',
        },
        {
          role: 'KuruFlowRouterV2',
          address: '0x0d3a1BE29E9dEd63c7a5678b31e847D68F71FFa2',
          runtimeDisposition: 'candidate-with-role-conflict',
        },
        {
          role: 'MarginAccount',
          address: '0x2A68ba1833cDf93fa9Da1EEbd7F46242aD8E90c5',
          runtimeDisposition: 'candidate',
        },
        {
          role: 'Router',
          address: '0xd651346d7c789536ebf06dc72aE3C8502cd695CC',
          runtimeDisposition: 'candidate',
        },
      ],
      heldContracts: [
        {
          role: 'KuruFlowRouter (registry-only)',
          address: '0x465D06d4521ae9Ce724E0c182Daad5D8a2Ff7040',
          runtimeDisposition: 'held-not-current',
        },
      ],
    },
    conflicts: [
      {
        kind: 'contract-role-name',
        heldAddress: '0x465D06d4521ae9Ce724E0c182Daad5D8a2Ff7040',
        candidateAddress: '0x0d3a1BE29E9dEd63c7a5678b31e847D68F71FFa2',
        resolution: 'Preserve both source statements; never treat the held address as current.',
      },
    ],
  }),
  evidence({
    id: 'E-KURU-CHAIN-001',
    projectId: 'kuru',
    claim:
      'MonadScan records a successful Monad-mainnet transaction at 2026-08-13T03:10:24Z to 0xb3e6778480b2E488385E8205eA05E20060B813cb, labeled Kuru: Flow Entry Point.',
    evidenceType: 'explorer-transaction',
    status: 'Observed',
    source: source({
      kind: 'explorer-transaction-html',
      title: 'Monad transaction 0x38f2408c…2b582b03',
      url: 'https://monadscan.com/tx/0x38f2408c6c7e6f4494abb85381fa3ef26b501d65abf54012ce0694322b582b03',
      publisher: 'MonadScan',
      referenceType: 'stable-artifact-url',
    }),
    publishedAt: '2026-08-13T03:10:24Z',
    scope: 'One successful transaction, destination, explorer label, and block timestamp.',
    provenanceNotes: 'Direct transaction page cross-referenced with the project-published address.',
    limitations: [
      'Explorer labels can be curated or submitted.',
      'One transaction does not establish current activity, volume, safety, or a broad integration.',
    ],
    quality: quality({ timeBoundEligible: true }),
    identifiers: {
      transactionHash: '0x38f2408c6c7e6f4494abb85381fa3ef26b501d65abf54012ce0694322b582b03',
      destination: '0xb3e6778480b2E488385E8205eA05E20060B813cb',
      transactionStatus: 'success',
    },
  }),
  evidence({
    id: 'E-KURU-MEM-001',
    projectId: 'kuru',
    claim: 'Monad Foundation App Portal lists Kuru under Spot Trading as Onchain Orderbook & Aggregator.',
    evidenceType: 'official-directory-listing',
    status: 'Observed',
    source: source({
      kind: 'directory-html',
      title: 'Monad App Portal',
      url: 'https://app.monad.xyz/',
      publisher: 'Monad Foundation',
    }),
    scope: 'Ecosystem directory membership and displayed category at retrieval.',
    provenanceNotes: 'Official Monad Foundation portal linking to Kuru.',
    limitations: [
      'Directory inclusion is not verification, endorsement, safety review, contract mapping, or proof of activity.',
      'Dynamic directory content can change.',
    ],
  }),

  evidence({
    id: 'E-APRIORI-CAP-001',
    projectId: 'aPriori',
    claim:
      'Capricorn documentation describes aprMON as a reward-bearing liquid-staking token that accrues staking and MEV revenue and remains deployable across DeFi.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Introduction to Capricorn Tech',
      url: 'https://capricorn-docs.gitbook.io/capricorn-docs/introduction-to-capricorn-tech',
      publisher: 'Capricorn Tech',
    }),
    publishedAt: '2026-07-29T14:13:30.713Z',
    scope: 'Current publisher wording about the aprMON product pillar.',
    provenanceNotes:
      'apr.io redirected to capricorn.tech at retrieval. The prototype retains legacy project ID `aPriori` and scopes this record to Capricorn/aprMON.',
    limitations: [
      'The redirect supports an identity transition only; it does not prove every historical aPriori claim or authorize a silent rename.',
      'Self-published documentation does not establish contract address, return, safety, or current activity.',
    ],
    quality: quality({ incomplete: true }),
  }),
  evidence({
    id: 'E-APRIORI-REGISTRY-001',
    projectId: 'aPriori',
    claim:
      'The pinned Monad registry lists the legacy name aPriori in Liquid Staking / MEV / DEX Aggregator and maps aprMON to 0x0c65…0852.',
    evidenceType: 'protocol-registry-snapshot',
    status: 'Observed',
    source: registrySource(),
    publishedAt: REGISTRY_PUBLISHED_AT,
    scope: 'Pinned registry entry `apriori`, its categories, and address mappings.',
    provenanceNotes: `Immutable commit snapshot. Moving re-retrieval pointer only: ${REGISTRY_MAIN_URL}`,
    limitations: [
      'Registry live metadata is not a measured activity window.',
      'The snapshot uses legacy aPriori branding while apr.io now redirects to Capricorn.',
      'The ValidatorsRegistry mapping lacks second-source support and remains held.',
    ],
    quality: quality({ conflict: true, incomplete: true, timeBoundEligible: true }),
    identifiers: {
      contracts: [
        {
          role: 'aprMON',
          address: '0x0c65A0BC65a5D819235B71F554D210D3F80E0852',
          runtimeDisposition: 'candidate',
        },
      ],
      heldContracts: [
        {
          role: 'ValidatorsRegistry',
          address: '0x77F6e4103e32D6146e29cF9eD1645e170F90BC2b',
          runtimeDisposition: 'held-registry-only',
        },
      ],
    },
    conflicts: [
      {
        kind: 'identity-label',
        snapshotLabel: 'aPriori',
        currentPublisherContext: 'Capricorn/aprMON',
        resolution: 'Keep the existing ID; expose the legacy-label limitation.',
      },
    ],
  }),
  evidence({
    id: 'E-APRIORI-CHAIN-001',
    projectId: 'aPriori',
    claim:
      'MonadScan records successful transaction 0x60fc…c7db at 2026-09-08T17:51:10Z calling deposit(uint256,address) on 0x0c65…0852, labeled aPriori: aprMON Token.',
    evidenceType: 'explorer-transaction',
    status: 'Observed',
    source: source({
      kind: 'explorer-transaction-html',
      title: 'Monad transaction 0x60fc294b…fac0c7db',
      url: 'https://monadscan.com/tx/0x60fc294b5e48ea8997dc1b4ddfc37ab3b82a6b9913e1b6dd40a7ed33fac0c7db',
      publisher: 'MonadScan',
      referenceType: 'stable-artifact-url',
    }),
    publishedAt: '2026-09-08T17:51:10Z',
    scope: 'One transaction, destination, decoded function, explorer label, status, and timestamp.',
    provenanceNotes: 'Direct transaction page cross-referenced with the pinned registry address.',
    limitations: [
      'Explorer labels are not proof of legal identity, current publisher naming, control, or safety.',
      'The event supports activity at one instant only.',
    ],
    quality: quality({ timeBoundEligible: true }),
    identifiers: {
      transactionHash: '0x60fc294b5e48ea8997dc1b4ddfc37ab3b82a6b9913e1b6dd40a7ed33fac0c7db',
      destination: '0x0c65A0BC65a5D819235B71F554D210D3F80E0852',
      function: 'deposit(uint256,address)',
      transactionStatus: 'success',
    },
  }),

  evidence({
    id: 'E-MAGMA-CAP-001',
    projectId: 'magma',
    claim:
      'Magma documentation describes a Monad liquid-staking protocol that issues gMON and publishes gMON address 0x8498…5081.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Liquid Staking (gMON)',
      url: 'https://docs.hydrogenlabs.xyz/magma/liquid-staking-gmon',
      publisher: 'Magma / Hydrogen Labs',
    }),
    scope: 'Documented liquid-staking capability and gMON address mapping.',
    provenanceNotes: 'Project-controlled documentation with an exact address.',
    limitations: [
      'Self-published; reward, collateralization, governance, and safety claims are excluded.',
      'Page wording mixes present behavior and launch plans.',
    ],
    identifiers: {
      contracts: [
        {
          role: 'gMON token / deposit contract',
          address: '0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081',
          runtimeDisposition: 'candidate',
        },
      ],
    },
  }),
  evidence({
    id: 'E-MAGMA-REGISTRY-001',
    projectId: 'magma',
    claim:
      'The pinned Monad registry lists Magma in Liquid Staking / Staking / MEV and maps gMON and Delegator addresses.',
    evidenceType: 'protocol-registry-snapshot',
    status: 'Observed',
    source: registrySource(),
    publishedAt: REGISTRY_PUBLISHED_AT,
    scope: 'Pinned registry entry `magma`, categories, and two address mappings.',
    provenanceNotes: `Immutable commit snapshot. Moving re-retrieval pointer only: ${REGISTRY_MAIN_URL}`,
    limitations: [
      'Registry live metadata is not measured activity.',
      'The Delegator mapping lacks independent project-documentation or code-identity verification.',
    ],
    quality: quality({ incomplete: true, timeBoundEligible: true }),
    identifiers: {
      contracts: [
        {
          role: 'gMON',
          address: '0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081',
          runtimeDisposition: 'candidate',
        },
      ],
      heldContracts: [
        {
          role: 'Delegator',
          address: '0xb1d57de83d80a2abac91714744dfe97e71b73dc0',
          runtimeDisposition: 'candidate-lower-confidence',
        },
      ],
    },
  }),
  evidence({
    id: 'E-MAGMA-CHAIN-001',
    projectId: 'magma',
    claim:
      'MonadScan records successful transaction 0x90a3…0ba4 at 2026-03-30T15:12:26Z calling depositMON(address,uint256) on 0x8498…5081, staking 1,000 MON and minting 958.416822874522046371 gMON.',
    evidenceType: 'explorer-transaction',
    status: 'Observed',
    source: source({
      kind: 'explorer-transaction-html',
      title: 'Monad transaction 0x90a377cc…3e5b0ba4',
      url: 'https://monadscan.com/tx/0x90a377ccdfe51e77ee22d7843ace210f18c23ffd7e0ff95c138b7afc3e5b0ba4',
      publisher: 'MonadScan',
      referenceType: 'stable-artifact-url',
    }),
    publishedAt: '2026-03-30T15:12:26Z',
    scope: 'One transaction, decoded function, exact amounts, destination, status, and block timestamp.',
    provenanceNotes:
      'The exact block timestamp and event values were independently visible on the direct transaction page.',
    limitations: [
      'One historical event does not establish recent activity, APY, solvency, safety, or total value.',
      'Explorer labels and decoded methods are not a contract audit.',
    ],
    quality: quality({ timeBoundEligible: true }),
    identifiers: {
      transactionHash: '0x90a377ccdfe51e77ee22d7843ace210f18c23ffd7e0ff95c138b7afc3e5b0ba4',
      destination: '0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081',
      function: 'depositMON(address,uint256)',
      transactionStatus: 'success',
      assets: { amount: '1000', symbol: 'MON' },
      shares: { amount: '958.416822874522046371', symbol: 'gMON' },
    },
  }),

  evidence({
    id: 'E-SWITCHBOARD-CAP-001',
    projectId: 'switchboard',
    claim:
      'Switchboard documentation says Switchboard On-Demand supports Monad and lists chain ID 143 contract 0xB7F0…0E67.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Switchboard on Monad',
      url: 'https://docs.switchboard.xyz/docs-by-chain/evm/monad',
      publisher: 'Switchboard',
    }),
    scope: 'Documented Monad oracle deployment and exact mainnet contract address.',
    provenanceNotes: 'Project-controlled chain-specific documentation separates mainnet and testnet.',
    limitations: [
      'Self-published deployment statement.',
      'Does not establish feed freshness, usage, contract-code verification, or safety.',
    ],
    identifiers: {
      contracts: [
        {
          role: 'Oracle',
          address: '0xB7F03eee7B9F56347e32cC71DaD65B303D5a0E67',
          runtimeDisposition: 'candidate',
        },
      ],
    },
  }),
  evidence({
    id: 'E-SWITCHBOARD-MEM-001',
    projectId: 'switchboard',
    claim: 'Monad infrastructure directory lists Switchboard in the Oracle category.',
    evidenceType: 'official-directory-listing',
    status: 'Observed',
    source: source({
      kind: 'directory-html',
      title: 'Monad Infrastructure Directory',
      url: 'https://www.monad.xyz/infra',
      publisher: 'Monad Foundation',
    }),
    scope: 'Infrastructure directory membership and category at retrieval.',
    provenanceNotes: 'Official Monad Foundation directory.',
    limitations: [
      'Directory inclusion is not endorsement, contract validation, deployment proof, or proof of current operation.',
    ],
  }),
  evidence({
    id: 'E-SWITCHBOARD-REGISTRY-001',
    projectId: 'switchboard',
    claim:
      'The pinned Monad registry lists Switchboard in Infra::Oracle and maps Oracle to 0xB7F0…0E67.',
    evidenceType: 'protocol-registry-snapshot',
    status: 'Observed',
    source: registrySource(),
    publishedAt: REGISTRY_PUBLISHED_AT,
    scope: 'Pinned registry entry `switchboard` and exact Oracle mapping.',
    provenanceNotes: `Immutable commit snapshot. Moving re-retrieval pointer only: ${REGISTRY_MAIN_URL}`,
    limitations: [
      'Agreement with project docs increases mapping confidence but is not an attestation.',
      'Does not validate contract code or current feed activity.',
    ],
    quality: quality({ timeBoundEligible: true }),
    identifiers: {
      contracts: [
        {
          role: 'Oracle',
          address: '0xB7F03eee7B9F56347e32cC71DaD65B303D5a0E67',
          runtimeDisposition: 'candidate',
        },
      ],
    },
  }),

  evidence({
    id: 'E-PYTH-CAP-001',
    projectId: 'pyth',
    claim:
      'Pyth documentation lists Pyth Core on Monad, records an upgrade effective 2026-08-26, and recommends 0xB754…508d for new integrations while retaining 0x2880…7B43 as the earlier compatibility address.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Pyth Core Contract Addresses — EVM',
      url: 'https://docs.pyth.network/price-feeds/core/contract-addresses/evm',
      publisher: 'Pyth Network',
    }),
    scope: 'Monad Pyth Core deployment and dated address-migration guidance.',
    provenanceNotes: 'Project-controlled deployment matrix links both addresses to Monad explorers.',
    limitations: [
      'The two addresses must remain distinct historical/compatibility and project-recommended states.',
      'Does not prove either contract is safe or active now.',
    ],
    quality: quality({ conflict: true, incomplete: true }),
    identifiers: {
      effectiveAt: '2026-08-26T00:00:00Z',
      effectiveAtPrecision: 'day',
      contracts: [
        {
          role: 'Pyth Core',
          address: '0x2880aB155794e7179c9eE2e38200202908C17B43',
          runtimeDisposition: 'historical-compatibility',
        },
        {
          role: 'Pyth Core',
          address: '0xB754BA51E3861Ac0Cb67f73CD046dE790A36508d',
          runtimeDisposition: 'project-recommended-for-new-integrations',
        },
      ],
    },
    conflicts: [
      {
        kind: 'dated-contract-migration',
        historicalAddress: '0x2880aB155794e7179c9eE2e38200202908C17B43',
        recommendedAddress: '0xB754BA51E3861Ac0Cb67f73CD046dE790A36508d',
        effectiveAt: '2026-08-26T00:00:00Z',
        resolution: 'Never collapse the addresses or infer that the historical address is inactive.',
      },
    ],
  }),
  evidence({
    id: 'E-PYTH-PUSH-001',
    projectId: 'pyth',
    claim: 'Pyth documentation lists sponsored Pyth push feeds on Monad mainnet.',
    evidenceType: 'project-documentation',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'Pyth Push Feeds — EVM',
      url: 'https://docs.pyth.network/price-feeds/core/push-feeds/evm',
      publisher: 'Pyth Network',
    }),
    scope: 'Documented availability of a Monad-mainnet push-feed set.',
    provenanceNotes: 'Project-controlled documentation with a dedicated Monad section.',
    limitations: [
      'Feed membership and update parameters can change.',
      'Does not establish freshness or correctness of a particular feed at query time.',
    ],
  }),
  evidence({
    id: 'E-PYTH-MEM-001',
    projectId: 'pyth',
    claim: 'Monad infrastructure directory lists Pyth Network in the Oracle category.',
    evidenceType: 'official-directory-listing',
    status: 'Observed',
    source: source({
      kind: 'directory-html',
      title: 'Monad Infrastructure Directory',
      url: 'https://www.monad.xyz/infra',
      publisher: 'Monad Foundation',
    }),
    scope: 'Infrastructure directory membership and category at retrieval.',
    provenanceNotes: 'Official Monad Foundation directory.',
    limitations: [
      'Directory inclusion is not endorsement, contract validation, or proof of current feed operation.',
    ],
  }),
  evidence({
    id: 'E-PYTH-REGISTRY-001',
    projectId: 'pyth',
    claim:
      'The pinned Monad registry lists Pyth in Infra::Oracle and maps PriceFeed to the earlier 0x2880…7B43 address.',
    evidenceType: 'protocol-registry-snapshot',
    status: 'Observed',
    source: registrySource(),
    publishedAt: REGISTRY_PUBLISHED_AT,
    scope: 'Pinned registry entry `pyth`, including PriceFeed and Entropy mappings.',
    provenanceNotes: `Immutable commit snapshot. Moving re-retrieval pointer only: ${REGISTRY_MAIN_URL}`,
    limitations: [
      'The snapshot is stale and incomplete for new Pyth Core integrations after the documented 2026-08-26 upgrade.',
      'Entropy was not independently verified in this pass and remains held.',
    ],
    quality: quality({ conflict: true, incomplete: true, stale: true, timeBoundEligible: true }),
    identifiers: {
      contracts: [
        {
          role: 'PriceFeed',
          address: '0x2880aB155794e7179c9eE2e38200202908C17B43',
          runtimeDisposition: 'historical-registry-snapshot',
        },
      ],
      heldContracts: [
        {
          role: 'Entropy',
          address: '0xD458261E832415CFd3BAE5E416FdF3230ce6F134',
          runtimeDisposition: 'held-registry-only',
        },
      ],
    },
    conflicts: [
      {
        kind: 'source-staleness',
        registryAddress: '0x2880aB155794e7179c9eE2e38200202908C17B43',
        projectRecommendedAddress: '0xB754BA51E3861Ac0Cb67f73CD046dE790A36508d',
        resolution: 'Use the registry record historically, never as current integration guidance.',
      },
    ],
  }),
  evidence({
    id: 'E-PYTH-CHAIN-001',
    projectId: 'pyth',
    claim:
      'MonadScan records successful transaction 0x03c9…4d5a at 2026-07-16T16:55:15Z calling updatePriceFeedsIfNecessary on the earlier 0x2880…7B43 Pyth Price Feed contract.',
    evidenceType: 'explorer-transaction',
    status: 'Observed',
    source: source({
      kind: 'explorer-transaction-html',
      title: 'Monad transaction 0x03c93be6…8b54d5a',
      url: 'https://monadscan.com/tx/0x03c93be66f8e6acd0d5c08066b9d9e0663e0e17d48a5a30db2094277c8b54d5a',
      publisher: 'MonadScan',
      referenceType: 'stable-artifact-url',
    }),
    publishedAt: '2026-07-16T16:55:15Z',
    scope: 'One pre-upgrade transaction, destination, decoded function, status, and block timestamp.',
    provenanceNotes: 'Direct transaction page predates Pyth documented 2026-08-26 upgrade.',
    limitations: [
      'Historical evidence only; it does not establish activity after the upgrade.',
      'Does not support the current preferred-address status.',
    ],
    quality: quality({ stale: true, timeBoundEligible: true }),
    identifiers: {
      transactionHash: '0x03c93be66f8e6acd0d5c08066b9d9e0663e0e17d48a5a30db2094277c8b54d5a',
      destination: '0x2880aB155794e7179c9eE2e38200202908C17B43',
      function: 'updatePriceFeedsIfNecessary(bytes[],bytes32[],uint64[])',
      transactionStatus: 'success',
    },
  }),

  evidence({
    id: 'E-MAGMA-SWITCHBOARD-001',
    projectId: 'magma',
    relatedProjectIds: ['switchboard'],
    claim:
      'Magma documentation names Switchboard as a gMON oracle provider and publishes separate exchange-rate and market-rate feed IDs.',
    evidenceType: 'project-declared-relationship',
    status: 'Claimed',
    source: source({
      kind: 'documentation-html',
      title: 'gMON Oracle Feeds',
      url: 'https://docs.hydrogenlabs.xyz/magma/developers/gmon-oracle-feeds',
      publisher: 'Magma / Hydrogen Labs',
    }),
    scope: 'One-sided declared Magma-to-Switchboard integration with two exact feed IDs.',
    provenanceNotes: 'Project-controlled integration documentation names Switchboard.',
    limitations: [
      'No reciprocal Switchboard page or fresh feed observation was verified.',
      'Does not establish that either feed is current, live, safe, or correctly priced.',
    ],
    identifiers: {
      feedIds: [
        {
          role: 'gMON/MON exchange-rate feed',
          id: '0x34019772d4f9cb583fd07ecd056b0d8419650bc17bb64daefc16c3fd561c87e1',
        },
        {
          role: 'gMON/MON market-rate feed',
          id: '0x1a71b644b9eb846c9bf2557e75968d685d468547ad99e9ddbcf246f3e0b1a0a8',
        },
      ],
    },
  }),
]);

// The runtime consumes the explicitly promoted, versioned module. Changing the
// active snapshot is a reviewable import-line change, never an implicit "latest" lookup.
export const evidenceSnapshot = APPROVED_EVIDENCE_SNAPSHOT;
export const EVIDENCE_SNAPSHOT_SHA256 = APPROVED_EVIDENCE_SNAPSHOT_SHA256;
export const evidenceRecords = evidenceSnapshot.records;

const baseRelationshipProposals = Object.freeze([
  {
    id: 'monad-kuru',
    from: 'monad',
    to: 'kuru',
    type: 'ecosystem_membership',
    status: 'Observed',
    evidenceIds: ['E-KURU-MEM-001'],
    scope: 'Kuru appeared in the Monad Foundation App Portal Spot Trading section at retrieval.',
    limitations: ['Directory membership is not endorsement, safety review, or an onchain interaction.'],
    dataMode: EVIDENCE_DATA_MODE,
  },
  {
    id: 'monad-apriori',
    from: 'monad',
    to: 'aPriori',
    type: 'ecosystem_membership',
    status: 'Observed',
    evidenceIds: ['E-APRIORI-REGISTRY-001', 'E-APRIORI-CAP-001'],
    scope: 'The legacy aPriori entry appeared in the pinned Monad mainnet registry; current context is scoped to Capricorn/aprMON.',
    limitations: ['No signed owner claim was found; preserve the identity-transition limitation.'],
    dataMode: EVIDENCE_DATA_MODE,
  },
  {
    id: 'monad-magma',
    from: 'monad',
    to: 'magma',
    type: 'ecosystem_membership',
    status: 'Observed',
    evidenceIds: ['E-MAGMA-REGISTRY-001', 'E-MAGMA-CAP-001'],
    scope: 'Magma appeared in the pinned Monad mainnet registry and documents a Monad deployment.',
    limitations: ['Registry membership is not endorsement, safety, or measured activity.'],
    dataMode: EVIDENCE_DATA_MODE,
  },
  {
    id: 'monad-switchboard',
    from: 'monad',
    to: 'switchboard',
    type: 'ecosystem_membership',
    status: 'Observed',
    evidenceIds: ['E-SWITCHBOARD-MEM-001', 'E-SWITCHBOARD-CAP-001'],
    scope: 'Switchboard appeared in the official Monad infrastructure directory under Oracle.',
    limitations: ['No scoped third-party attestation was found.'],
    dataMode: EVIDENCE_DATA_MODE,
  },
  {
    id: 'monad-pyth',
    from: 'monad',
    to: 'pyth',
    type: 'ecosystem_membership',
    status: 'Observed',
    evidenceIds: ['E-PYTH-MEM-001', 'E-PYTH-CAP-001'],
    scope: 'Pyth appeared in the official Monad infrastructure directory under Oracle.',
    limitations: ['Membership is not endorsement or proof of fresh feeds.'],
    dataMode: EVIDENCE_DATA_MODE,
  },
  {
    id: 'magma-switchboard',
    from: 'magma',
    to: 'switchboard',
    type: 'declared_integration',
    status: 'Claimed',
    evidenceIds: ['E-MAGMA-SWITCHBOARD-001'],
    scope: 'Magma documentation names Switchboard and publishes two gMON feed IDs.',
    limitations: ['One-sided project declaration; no reciprocal confirmation or fresh-feed observation.'],
    dataMode: EVIDENCE_DATA_MODE,
  },
]);

export const candidateRelationshipProposals = Object.freeze(
  baseRelationshipProposals.map((proposal) =>
    Object.freeze({
      ...proposal,
      reviewStatus: 'approved',
      reviewedAt: EVIDENCE_SNAPSHOT_REVIEWED_AT,
      revision: Object.freeze({ sequence: 1, supersedesRelationshipId: null }),
    }),
  ),
);

// Runtime relationships come from the same approved promoted artifact as the
// evidence records, so they cannot drift onto another snapshot independently.
export const relationshipProposals = evidenceSnapshot.relationships;

// Phase-3.7 inline governance: every decided subject in a policy-bearing snapshot carries its
// own reviewMetadata, so the runtime synthesizes the governance decision view directly from
// the promoted payload. There is no companion file for v3; the immutable v2 companion at
// data/evidence-governance/phase-3.5-v2.review.json continues to govern only the v2 pair.
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const assertInlineDecision = (subject, kind) => {
  const metadata = subject.reviewMetadata;
  assert(
    metadata && typeof metadata === 'object',
    `${kind} ${subject.id} lacks inline reviewMetadata`,
  );
  return deepFreeze({
    subjectId: subject.id,
    decision: subject.reviewStatus,
    reviewerRef: metadata.reviewerRef,
    reviewerRole: metadata.reviewerRole,
    reviewedAt: metadata.reviewedAt,
    reviewMethod: metadata.reviewMethod,
    decisionReason: metadata.decisionReason,
    reviewPolicyVersion: metadata.reviewPolicyVersion,
  });
};

export const reviewGovernanceCompanion = deepFreeze({
  kind: 'monad-city-evidence-review-governance',
  schemaVersion: '1',
  reviewPolicyVersion: REVIEW_GOVERNANCE_POLICY_VERSION,
  snapshotBinding: {
    version: EVIDENCE_SNAPSHOT_VERSION,
    canonicalSha256: EVIDENCE_SNAPSHOT_SHA256,
    reviewedAt: EVIDENCE_SNAPSHOT_REVIEWED_AT,
  },
  evidenceDecisions: Object.freeze(evidenceRecords.map((record) => assertInlineDecision(record, 'Evidence'))),
  relationshipDecisions: Object.freeze(
    relationshipProposals.map((relationship) => assertInlineDecision(relationship, 'Relationship')),
  ),
});

// Governance rows are derived with the shared cadence functions at one canonical as-of
// instant (the snapshot review instant), never from the browser clock.
const inlineEvidenceCadenceById = new Map();
const inlineGovernanceRows = [
  ...evidenceRecords.map((record) => {
    const decision = reviewGovernanceCompanion.evidenceDecisions.find((item) => item.subjectId === record.id);
    const cadence = calculateEvidenceReviewCadence(record, decision.reviewedAt);
    inlineEvidenceCadenceById.set(record.id, cadence);
    return {
      subjectKind: 'evidence',
      subjectId: record.id,
      reviewedAt: decision.reviewedAt,
      baseCadenceDays: cadence.baseCadenceDays,
      nextReviewAt: cadence.nextReviewAt,
      dueBasis: 'subject-cadence',
      asOf: REVIEW_GOVERNANCE_AS_OF,
      reviewDue: Date.parse(REVIEW_GOVERNANCE_AS_OF) >= Date.parse(cadence.nextReviewAt),
    };
  }),
  ...relationshipProposals.map((relationship) => {
    const decision = reviewGovernanceCompanion.relationshipDecisions.find((item) => item.subjectId === relationship.id);
    const cadence = calculateRelationshipReviewCadence(relationship, decision.reviewedAt, inlineEvidenceCadenceById);
    return {
      subjectKind: 'relationship',
      subjectId: relationship.id,
      reviewedAt: decision.reviewedAt,
      baseCadenceDays: cadence.baseCadenceDays,
      nextReviewAt: cadence.nextReviewAt,
      dueBasis: cadence.dueBasis,
      asOf: REVIEW_GOVERNANCE_AS_OF,
      reviewDue: Date.parse(REVIEW_GOVERNANCE_AS_OF) >= Date.parse(cadence.nextReviewAt),
    };
  }),
].sort((left, right) =>
  left.subjectKind !== right.subjectKind
    ? left.subjectKind < right.subjectKind ? -1 : 1
    : left.subjectId.localeCompare(right.subjectId),
);

export const reviewGovernance = deepFreeze({
  reviewPolicyVersion: REVIEW_GOVERNANCE_POLICY_VERSION,
  asOf: REVIEW_GOVERNANCE_AS_OF,
  snapshotBinding: reviewGovernanceCompanion.snapshotBinding,
  summary: (() => {
    const reviewDue = inlineGovernanceRows.filter((row) => row.reviewDue).length;
    return {
      subjects: inlineGovernanceRows.length,
      evidence: evidenceRecords.length,
      relationships: relationshipProposals.length,
      reviewCurrent: inlineGovernanceRows.length - reviewDue,
      reviewDue,
    };
  })(),
  rows: inlineGovernanceRows,
});
export const governanceRows = reviewGovernance.rows;
export const evidenceGovernanceRows = Object.freeze(
  governanceRows.filter((row) => row.subjectKind === 'evidence'),
);
export const relationshipGovernanceRows = Object.freeze(
  governanceRows.filter((row) => row.subjectKind === 'relationship'),
);
export const governanceRowBySubjectId = new Map(
  governanceRows.map((row) => [`${row.subjectKind}:${row.subjectId}`, row]),
);

export const reviewGovernanceContractFixtures = createReviewGovernanceFixtures({
  baseEvidence: evidenceRecords.find((record) => record.id === 'E-MONAD-CAP-001'),
  baseRelationship: relationshipProposals.find((relationship) => relationship.id === 'monad-kuru-002'),
  governance: reviewGovernanceCompanion,
});

function assertFixture(condition, message) {
  if (!condition) throw new Error(`Review governance fixture failed: ${message}`);
}

function expectsFailure(callback) {
  try {
    callback();
    return false;
  } catch {
    return true;
  }
}

export function validateReviewGovernanceFixtures() {
  const expectedSubjects = evidenceRecords.length + relationshipProposals.length;
  assertFixture(
    reviewGovernance.summary.subjects === expectedSubjects,
    'current report must include every governed subject',
  );
  assertFixture(
    reviewGovernance.summary.reviewCurrent === expectedSubjects && reviewGovernance.summary.reviewDue === 0,
    'release as-of must be fully current with zero due subjects',
  );
  const earliest = [...governanceRows].sort(
    (left, right) => Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt) || left.subjectId.localeCompare(right.subjectId),
  )[0];
  assertFixture(
    earliest && earliest.nextReviewAt > reviewGovernance.asOf,
    'earliest next review must remain after the release as-of',
  );
  assertFixture(
    governanceRows.some((row) => row.nextReviewAt === earliest.nextReviewAt && !row.reviewDue),
    'review becomes due exactly at its nextReviewAt boundary',
  );

  const staleCadence = calculateEvidenceReviewCadence(
    reviewGovernanceContractFixtures.staleApproved,
    '2026-09-09T07:43:40Z',
  );
  assertFixture(staleCadence.cadenceDays === 90, 'quality.stale must not accelerate cadence');
  assertFixture(reviewGovernanceContractFixtures.staleApproved.reviewStatus === 'approved', 'quality.stale must not mutate reviewStatus');
  const unavailableConflictCadence = calculateEvidenceReviewCadence(
    reviewGovernanceContractFixtures.unavailableConflict,
    '2026-09-09T07:43:40Z',
  );
  assertFixture(unavailableConflictCadence.cadenceDays === 7, 'unavailable evidence must use the seven-day accelerator');

  const cappedRelationship = JSON.parse(JSON.stringify(reviewGovernanceContractFixtures.relationshipEvidenceCap.relationship));
  cappedRelationship.evidenceIds = [reviewGovernanceContractFixtures.relationshipEvidenceCap.supportingEvidenceId];
  const cappedCadence = calculateRelationshipReviewCadence(
    cappedRelationship,
    '2026-09-09T07:43:40Z',
    new Map([[reviewGovernanceContractFixtures.relationshipEvidenceCap.supportingEvidenceId, unavailableConflictCadence]]),
  );
  assertFixture(cappedCadence.dueBasis === `supporting-evidence:${reviewGovernanceContractFixtures.relationshipEvidenceCap.supportingEvidenceId}`, 'relationship cadence must be capped by its earliest evidence');
  assertFixture(
    expectsFailure(() => validateReviewGovernanceCompanion({
      governance: reviewGovernanceContractFixtures.missingMetadataGovernance,
      snapshot: evidenceSnapshot,
      snapshotSha256: EVIDENCE_SNAPSHOT_SHA256,
      evidenceRecords,
      relationshipProposals,
    })),
    'missing governance metadata must fail closed',
  );
  assertFixture(
    expectsFailure(() => validateReviewGovernanceCompanion({
      governance: reviewGovernanceContractFixtures.invalidBindingGovernance,
      snapshot: evidenceSnapshot,
      snapshotSha256: EVIDENCE_SNAPSHOT_SHA256,
      evidenceRecords,
      relationshipProposals,
    })),
    'invalid governance binding must fail closed',
  );
  return true;
}

export const evidenceContractFixtures = createEvidenceContractFixtures(
  candidateEvidenceRecords[0],
);

const requiredEvidenceFields = Object.freeze([
  'id',
  'projectId',
  'relatedProjectIds',
  'claim',
  'evidenceType',
  'status',
  'source',
  'retrievedAt',
  'publishedAt',
  'network',
  'scope',
  'provenanceNotes',
  'provenance',
  'limitations',
  'quality',
  'supportMode',
  'supportedProposition',
  'supportsFactualClaims',
  'dataMode',
  'reviewStatus',
  'reviewedAt',
  'revision',
]);

function isDirectHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.searchParams.has('q');
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateCandidateEvidenceRecord(
  record,
  knownProjectIds = KNOWN_PROJECT_IDS,
) {
  const knownProjects = new Set(knownProjectIds);
  const missing = requiredEvidenceFields.filter(
    (field) => !Object.prototype.hasOwnProperty.call(record, field),
  );
  assert(!missing.length, `Evidence ${record.id || '(unknown)'} missing: ${missing.join(', ')}`);
  assert(typeof record.id === 'string' && record.id.length > 0, 'Evidence ID is required');
  assert(knownProjects.has(record.projectId), `Evidence ${record.id} has unknown projectId`);
  assert(isIsoTimestamp(record.retrievedAt), `Evidence ${record.id} has invalid retrievedAt`);
  assert(
    record.publishedAt === null || isIsoTimestamp(record.publishedAt),
    `Evidence ${record.id} has invalid publishedAt; absent dates must be null`,
  );
  assert(isDirectHttpsUrl(record.source?.url), `Evidence ${record.id} lacks a direct HTTPS source`);
  assert(
    typeof record.source?.publisher === 'string' && record.source.publisher.length > 0,
    `Evidence ${record.id} lacks publisher`,
  );
  assert(
    record.provenance?.kind === 'manual-curation' &&
      typeof record.provenance.notes === 'string' &&
      record.provenance.notes.length > 0,
    `Evidence ${record.id} lacks provenance`,
  );
  assert(
    Array.isArray(record.limitations) && record.limitations.length > 0,
    `Evidence ${record.id} lacks limitations`,
  );
  assert(
    !record.quality?.conflict || (Array.isArray(record.conflicts) && record.conflicts.length > 0),
    `Evidence ${record.id} flags conflict without conflict details`,
  );
  validateReviewMetadata(record);
  return true;
}

export function validateEvidenceContract() {
  const knownProjectIds = new Set(KNOWN_PROJECT_IDS);
  const evidenceIds = new Set();
  const relationshipIds = new Set();
  const representedProjectIds = new Set();
  const requiredQualityFlags = [
    'conflict',
    'incomplete',
    'stale',
    'unavailable',
    'timeBoundEligible',
  ];

  assert(evidenceSnapshot.kind === 'approved-evidence-snapshot', 'Runtime evidence is not a promoted approved snapshot');
  assert(evidenceSnapshot.schemaVersion === 1, 'Runtime evidence snapshot has an unsupported schema version');
  assert(evidenceSnapshot.version === EVIDENCE_SNAPSHOT_VERSION, 'Runtime evidence snapshot version drifted from the active import');
  assert(evidenceSnapshot.createdAt === EVIDENCE_SNAPSHOT_CREATED_AT, 'Runtime evidence snapshot createdAt drifted');
  assert(evidenceSnapshot.reviewedAt === EVIDENCE_SNAPSHOT_REVIEWED_AT, 'Runtime evidence snapshot reviewedAt drifted');
  assert(evidenceSnapshot.dataMode === EVIDENCE_DATA_MODE, 'Runtime evidence snapshot has an invalid data mode');
  assert(/^[a-f0-9]{64}$/.test(EVIDENCE_SNAPSHOT_SHA256), 'Runtime evidence snapshot lacks its canonical SHA-256');

  evidenceRecords.forEach((record) => {
    validateCandidateEvidenceRecord(record);
    const missing = requiredEvidenceFields.filter(
      (field) => !Object.prototype.hasOwnProperty.call(record, field),
    );
    assert(!missing.length, `Evidence ${record.id || '(unknown)'} missing: ${missing.join(', ')}`);
    assert(!evidenceIds.has(record.id), `Duplicate evidence id: ${record.id}`);
    assert(knownProjectIds.has(record.projectId), `Evidence ${record.id} has unknown projectId`);
    record.relatedProjectIds.forEach((id) =>
      assert(knownProjectIds.has(id), `Evidence ${record.id} has unknown related project ${id}`),
    );
    assert(typeof record.claim === 'string' && record.claim.length > 0, `Evidence ${record.id} lacks claim`);
    assert(EVIDENCE_TYPES.includes(record.evidenceType), `Evidence ${record.id} has invalid type`);
    assert(EVIDENCE_STATUSES.includes(record.status), `Evidence ${record.id} has invalid status`);
    assert(record.dataMode === EVIDENCE_DATA_MODE, `Evidence ${record.id} has invalid data mode`);
    assert(isIsoTimestamp(record.retrievedAt), `Evidence ${record.id} has invalid retrievedAt`);
    assert(
      record.publishedAt === null || isIsoTimestamp(record.publishedAt),
      `Evidence ${record.id} has invalid publishedAt; absent dates must be null`,
    );
    assert(record.publishedAt !== 'unavailable', `Evidence ${record.id} uses forbidden date sentinel`);
    assert(record.network?.name === 'Monad mainnet', `Evidence ${record.id} has invalid network name`);
    assert(record.network?.chainId === 143, `Evidence ${record.id} has invalid chain ID`);
    assert(typeof record.scope === 'string' && record.scope.length > 0, `Evidence ${record.id} lacks scope`);
    assert(
      typeof record.provenanceNotes === 'string' && record.provenanceNotes.length > 0,
      `Evidence ${record.id} lacks provenance`,
    );
    assert(
      record.provenance.kind === 'manual-curation' &&
        record.provenance.notes === record.provenanceNotes,
      `Evidence ${record.id} has inconsistent provenance fields`,
    );
    assert(
      Array.isArray(record.limitations) && record.limitations.length > 0,
      `Evidence ${record.id} lacks limitations`,
    );
    requiredQualityFlags.forEach((flag) =>
      assert(typeof record.quality?.[flag] === 'boolean', `Evidence ${record.id} lacks quality.${flag}`),
    );
    assert(typeof record.source?.available === 'boolean', `Evidence ${record.id} lacks source availability`);
    assert(
      record.source.available === !record.quality.unavailable,
      `Evidence ${record.id} availability flags conflict`,
    );
    assert(isDirectHttpsUrl(record.source.url), `Evidence ${record.id} lacks a direct HTTPS source`);
    assert(typeof record.source.title === 'string' && record.source.title, `Evidence ${record.id} lacks source title`);
    assert(typeof record.source.publisher === 'string' && record.source.publisher, `Evidence ${record.id} lacks publisher`);
    assert(
      ['mutable-url', 'pinned-snapshot', 'stable-artifact-url'].includes(record.source.referenceType),
      `Evidence ${record.id} has invalid source reference type`,
    );
    assert(
      typeof record.source.presentationMutable === 'boolean',
      `Evidence ${record.id} lacks presentation mutability`,
    );
    assert(
      EVIDENCE_SUPPORT_MODES.includes(record.supportMode),
      `Evidence ${record.id} has invalid support mode`,
    );
    assert(
      record.supportedProposition === record.scope,
      `Evidence ${record.id} support proposition must equal its bounded scope`,
    );
    assert(
      record.status !== 'Claimed' || record.supportMode === 'publisher-statement-only',
      `Claimed evidence ${record.id} must support only the publisher statement`,
    );
    assert(
      record.status !== 'Observed' || record.supportMode === 'artifact-observation-only',
      `Observed evidence ${record.id} must support only the inspected artifact`,
    );
    assert(
      record.status !== 'Attested' || Boolean(record.attestor),
      `Evidence ${record.id} cannot be Attested without an attestor`,
    );
    assert(
      record.status !== 'AI-inferred' || record.supportsFactualClaims === false,
      `AI-inferred evidence ${record.id} cannot support factual claims`,
    );
    assert(
      !record.quality.conflict || (Array.isArray(record.conflicts) && record.conflicts.length > 0),
      `Evidence ${record.id} flags conflict without conflict details`,
    );
    assert(
      !record.quality.stale || record.limitations.some((item) => /historical|stale/i.test(item)),
      `Evidence ${record.id} flags stale without an explicit limitation`,
    );
    assert(
      !record.quality.timeBoundEligible || record.publishedAt !== null,
      `Evidence ${record.id} cannot support a time-bound statement without publishedAt`,
    );
    if (record.evidenceType === 'protocol-registry-snapshot') {
      assert(record.source.url === REGISTRY_URL, `Evidence ${record.id} must use the pinned registry URL`);
      assert(
        record.source.referenceType === 'pinned-snapshot' && !record.source.presentationMutable,
        `Evidence ${record.id} must identify the registry as a pinned snapshot`,
      );
    }
    if (record.evidenceType === 'explorer-transaction') {
      assert(
        record.source.referenceType === 'stable-artifact-url' && record.source.presentationMutable,
        `Evidence ${record.id} must distinguish its stable transaction reference from mutable presentation`,
      );
      assert(record.publishedAt !== null, `Evidence ${record.id} lacks an exact block timestamp`);
    }
    if (record.identifiers?.transactionHash) {
      const hash = record.identifiers.transactionHash.toLowerCase();
      assert(record.source.url.toLowerCase().endsWith(`/tx/${hash}`), `Evidence ${record.id} must cite its direct transaction URL`);
    }
    representedProjectIds.add(record.projectId);
    evidenceIds.add(record.id);
  });

  // Every curated project must stay represented, and every represented project must be a
  // known entity. Exact per-version size is pinned by the record/relationship counts below.
  assert(
    CURATED_PROJECT_IDS.every((id) => representedProjectIds.has(id)) &&
      [...representedProjectIds].every((id) => knownProjectIds.has(id)),
    'Evidence records must represent known projects and keep every curated project represented',
  );
  validateRevisionLineage(evidenceRecords, candidateEvidenceRecords);
  const expectedCounts = EXPECTED_SNAPSHOT_COUNTS[evidenceSnapshot.version];
  assert(expectedCounts, `No expected record counts are pinned for snapshot ${evidenceSnapshot.version}`);
  assert(
    evidenceRecords.length === expectedCounts.records,
    `The approved evidence snapshot must contain exactly ${expectedCounts.records} records for ${evidenceSnapshot.version}`,
  );
  assert(
    evidenceRecords.every((record) => record.reviewStatus === 'approved'),
    'The runtime evidence export may contain approved records only',
  );
  assert(
    !evidenceRecords.some((record) => record.status === 'Attested'),
    'The approved evidence slice contains no Attested record',
  );
  assert(
    !evidenceRecords.some(
      (record) => record.status === 'AI-inferred' && record.supportsFactualClaims,
    ),
    'AI-inferred evidence cannot be factual support',
  );

  relationshipProposals.forEach((relationship) => {
    assert(!relationshipIds.has(relationship.id), `Duplicate relationship id: ${relationship.id}`);
    assert(knownProjectIds.has(relationship.from), `Relationship ${relationship.id} has unknown from endpoint`);
    assert(knownProjectIds.has(relationship.to), `Relationship ${relationship.id} has unknown to endpoint`);
    assert(relationship.from !== relationship.to, `Relationship ${relationship.id} is self-referential`);
    assert(RELATIONSHIP_TYPES.includes(relationship.type), `Relationship ${relationship.id} has invalid type`);
    assert(EVIDENCE_STATUSES.includes(relationship.status), `Relationship ${relationship.id} has invalid status`);
    assert(relationship.dataMode === EVIDENCE_DATA_MODE, `Relationship ${relationship.id} has invalid data mode`);
    assert(
      relationship.reviewStatus === 'approved' && isIsoTimestamp(relationship.reviewedAt),
      `Runtime relationship ${relationship.id} must be approved and reviewed`,
    );
    assert(
      Array.isArray(relationship.evidenceIds) && relationship.evidenceIds.length > 0,
      `Relationship ${relationship.id} has no evidence references`,
    );
    relationship.evidenceIds.forEach((id) => {
      assert(evidenceIds.has(id), `Relationship ${relationship.id} references unknown evidence ${id}`);
      assert(
        evidenceRecords.some((record) => record.id === id && record.reviewStatus === 'approved'),
        `Relationship ${relationship.id} references evidence ${id} that is not approved`,
      );
    });
    relationshipIds.add(relationship.id);
  });
  assert(
    relationshipProposals.length === expectedCounts.relationships,
    `The approved sourced relationship slice must contain exactly ${expectedCounts.relationships} records for ${evidenceSnapshot.version}`,
  );

  const forbiddenKuruCurrent = '0x465d06d4521ae9ce724e0c182daad5d8a2ff7040';
  const currentKuruContracts = evidenceRecords
    .filter((record) => record.projectId === 'kuru')
    .flatMap((record) => record.identifiers?.contracts ?? [])
    .filter((contract) => contract.runtimeDisposition !== 'held-not-current');
  assert(
    !currentKuruContracts.some((contract) => contract.address.toLowerCase() === forbiddenKuruCurrent),
    'Kuru registry-only router must never be ingested as current',
  );

  assert(
    !evidenceRecords.some((record) => record.id === 'E-PYTH-CAP-001'),
    'The stale Pyth contract-page record must not remain in the approved runtime snapshot',
  );
  const pythMembership = relationshipProposals.find((relationship) => relationship.id === 'monad-pyth-002');
  assert(
    pythMembership?.revision?.sequence === 2 &&
      pythMembership.revision.supersedesRelationshipId === 'monad-pyth' &&
      pythMembership.evidenceIds.length === 1 &&
      pythMembership.evidenceIds[0] === 'E-PYTH-MEM-001',
    'The Pyth membership successor must retain only approved directory-membership evidence',
  );

  return true;
}

validateEvidenceContract();
