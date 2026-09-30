import {
  DATA_MODE,
  PROJECT_STATES,
  RELATIONSHIP_STATES,
  RELATIONSHIP_TYPES,
  createProjectEvidence,
  relationships,
  validateDataContract,
} from './data.js';
import {
  REVIEW_GOVERNANCE_AS_OF,
  REVIEW_GOVERNANCE_POLICY_VERSION,
  evidenceRecords,
  evidenceSnapshot,
  governanceRowBySubjectId,
  reviewGovernance,
  reviewGovernanceCompanion,
} from './evidence.js';
import { retrieveNavigator, runDistrictNavigatorChecks } from './retrieval.js';
import { loadAiSettings, saveAiSettings, aiEnabled, groundAnswer } from './ai.js';
import {
  DISTRICT_EXPERIENCES,
  DISTRICT_TABS,
  districtBySlug,
  districtSlug,
  districtClusterForType,
  districtClusterList,
  getDistrictCoverage,
  getDistrictEvidence,
  getDistrictFeaturedProjects,
  getDistrictProjects,
  getDistrictRelationships,
  getDistrictTypes,
  plural,
} from './districts.js';
import { createCity3D } from './city3d.js';

const projects = [
  {
    id: 'monad',
    name: 'Monad',
    abbr: 'M',
    district: 'Infrastructure',
    tag: 'The foundation for what’s next.',
    description:
      'A high-performance Layer 1 bringing parallel execution to the EVM. The connective foundation of Monad City.',
    x: 0,
    y: 0,
    h: 150,
    color: '#a58aff',
    state: 'Attested',
    type: 'Layer 1 network',
    site: 'monad.xyz',
  },
  {
    id: 'kuru',
    name: 'Kuru',
    abbr: 'K',
    district: 'DeFi',
    tag: 'Liquidity, without limits.',
    description:
      'An onchain order book built for the speed of Monad. Discover how its liquidity connects across the ecosystem.',
    x: 552,
    y: 552,
    h: 92,
    color: '#93d6c6',
    state: 'Attested',
    type: 'Onchain exchange',
    site: 'kuru.io',
  },
  {
    id: 'aPriori',
    name: 'aPriori',
    abbr: 'a',
    district: 'DeFi',
    tag: 'Putting staked capital to work.',
    description:
      'A liquid staking and MEV infrastructure protocol connecting Monad validators, stakers, and DeFi applications.',
    x: 617,
    y: 592,
    h: 75,
    color: '#93d6c6',
    state: 'Claimed',
    type: 'Liquid staking',
    site: 'apriori.fi',
  },
  {
    id: 'magma',
    name: 'Magma',
    abbr: '▲',
    district: 'DeFi',
    tag: 'A more liquid ecosystem.',
    description:
      'A liquid staking project exploring productive capital and composable staking on Monad.',
    x: 550,
    y: 628,
    h: 62,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid staking',
    site: 'magma.finance',
  },
  {
    id: 'switchboard',
    name: 'Switchboard',
    abbr: 'S',
    district: 'Infrastructure',
    tag: 'A data layer in the graph.',
    description:
      'A customizable oracle network connecting applications with external data and verifiable randomness.',
    x: -354,
    y: 695,
    h: 94,
    color: '#a58aff',
    state: 'Attested',
    type: 'Oracle infrastructure',
    site: 'switchboard.xyz',
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    abbr: 'P',
    district: 'Infrastructure',
    tag: 'Market data at city speed.',
    description:
      'A financial oracle network delivering price feeds to connected DeFi applications.',
    x: -291,
    y: 734,
    h: 88,
    color: '#a58aff',
    state: 'Attested',
    type: 'Price oracle',
    site: 'pyth.network',
  },
  {
    id: 'talus',
    name: 'Talus',
    abbr: 'T',
    district: 'AI',
    tag: 'Agents with a place in the city.',
    description:
      'An agent infrastructure concept for discovering autonomous services and their ecosystem dependencies.',
    x: -122,
    y: -770,
    h: 104,
    color: '#91baff',
    state: 'AI-inferred',
    type: 'AI agent infrastructure',
    site: 'talus.network',
  },
  {
    id: 'nadfun',
    name: 'Nad Arcade',
    abbr: 'n',
    district: 'Gaming',
    tag: 'Where community comes to play.',
    description:
      'An illustrative onchain arcade where players discover games, build reputation, and carry achievements across the ecosystem.',
    x: -770,
    y: -122,
    h: 78,
    color: '#e9b07c',
    state: 'Claimed',
    type: 'Onchain arcade',
    site: null,
  },
  {
    id: 'pixel-forge',
    name: 'Pixel Forge',
    abbr: 'F',
    district: 'Gaming',
    tag: 'Explore the edges of the graph.',
    description:
      'A fictional game studio connecting verifiable randomness, player-owned worlds, and shared achievements. Created for this prototype.',
    x: -707,
    y: -83,
    h: 57,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Game studio',
    site: null,
  },
  {
    id: 'moca',
    name: 'Moca Network',
    abbr: '◈',
    district: 'Identity',
    tag: 'An identity that travels with you.',
    description:
      'A digital identity network represented here to explore identity and reputation relationships across the city.',
    x: 695,
    y: -354,
    h: 65,
    color: '#e5a5cd',
    state: 'AI-inferred',
    type: 'Digital identity',
    site: 'moca.network',
  },
  // ---------- Phase 5.1 Batch 1 (snapshot phase-3.5-v3) ----------
  // Placements are illustrative layout; height is uniform because every batch-1 project
  // carries exactly one approved record. Order and coordinates encode no ranking.
  {
    id: 'aave-v3',
    name: 'Aave',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Aave is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 485,
    y: 588,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'aave.com',
  },
  {
    id: 'pancakeswap',
    name: 'PancakeSwap',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'PancakeSwap is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 487,
    y: 512,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'pancakeswap.finance',
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    abbr: 'U',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Uniswap is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 554,
    y: 476,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'app.uniswap.org',
  },
  {
    id: 'curve',
    name: 'Curve',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Curve is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 619,
    y: 516,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'curve.finance',
  },
  {
    id: 'pendle',
    name: 'Pendle',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'Pendle is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 621,
    y: 687,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'pendle.finance',
  },
  {
    id: 'upshift',
    name: 'Upshift',
    abbr: 'U',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Upshift is a DefiLlama-listed protocol in the ’Onchain Capital Allocator’ category with TVL tracked on the Monad chain.',
    x: 550,
    y: 704,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: 'app.upshift.finance',
  },
  {
    id: 'euler',
    name: 'Euler',
    abbr: 'E',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Euler is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 480,
    y: 686,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'euler.finance',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    abbr: 'L',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Lagoon is a DefiLlama-listed protocol in the ’Onchain Capital Allocator’ category with TVL tracked on the Monad chain.',
    x: 426,
    y: 637,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: 'lagoon.finance',
  },
  {
    id: 'curvance',
    name: 'Curvance',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Curvance is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 401,
    y: 568,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'app.curvance.com',
  },
  {
    id: 'renzo',
    name: 'Renzo',
    abbr: 'R',
    district: 'DeFi',
    tag: 'Listed under ‘Liquid Restaking’.',
    description:
      'Renzo is a DefiLlama-listed protocol in the ’Liquid Restaking’ category with TVL tracked on the Monad chain.',
    x: 411,
    y: 496,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid Restaking',
    site: 'app.renzoprotocol.com',
  },
  {
    id: 'beefy',
    name: 'Beefy',
    abbr: 'B',
    district: 'DeFi',
    tag: 'Listed under ‘Yield Aggregator’.',
    description:
      'Beefy is a DefiLlama-listed protocol in the ’Yield Aggregator’ category with TVL tracked on the Monad chain.',
    x: 453,
    y: 437,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield Aggregator',
    site: 'beefy.com',
  },
  {
    id: 'yuzu-money',
    name: 'Yuzu Money',
    abbr: 'Y',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'Yuzu Money is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 517,
    y: 404,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'app.yuzu.money',
  },
  {
    id: 'balancer',
    name: 'Balancer',
    abbr: 'B',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Balancer is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 590,
    y: 405,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'balancer.fi',
  },
  {
    id: 'spectra',
    name: 'Spectra',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'Spectra is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 654,
    y: 439,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'app.spectra.finance',
  },
  {
    id: 'mento',
    name: 'Mento',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Algo-Stables’.',
    description:
      'Mento is a DefiLlama-listed protocol in the ’Algo-Stables’ category with TVL tracked on the Monad chain.',
    x: 695,
    y: 500,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Algo-Stables',
    site: 'app.mento.org',
  },
  {
    id: 'neverland',
    name: 'Neverland',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Neverland is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 703,
    y: 572,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'neverland.money',
  },
  {
    id: 'ample',
    name: 'Ample',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Yield Lottery’.',
    description:
      'Ample is a DefiLlama-listed protocol in the ’Yield Lottery’ category with TVL tracked on the Monad chain.',
    x: 676,
    y: 640,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield Lottery',
    site: 'ample.money',
  },
  {
    id: 'perpl',
    name: 'Perpl',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'Perpl is a DefiLlama-listed protocol in the ’Derivatives’ category with TVL tracked on the Monad chain.',
    x: 534,
    y: 779,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: 'perpl.xyz',
  },
  {
    id: 'woofi',
    name: 'WOOFi',
    abbr: 'W',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'WOOFi is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 461,
    y: 761,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'woofi.com',
  },
  {
    id: 'leverup',
    name: 'LeverUp',
    abbr: 'L',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'LeverUp is a DefiLlama-listed protocol in the ’Derivatives’ category with TVL tracked on the Monad chain.',
    x: 398,
    y: 720,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: 'app.leverup.xyz',
  },
  {
    id: 'kintsu',
    name: 'Kintsu',
    abbr: 'K',
    district: 'DeFi',
    tag: 'Listed under ‘Liquid Staking’.',
    description:
      'Kintsu is a DefiLlama-listed protocol in the ’Liquid Staking’ category with TVL tracked on the Monad chain.',
    x: 352,
    y: 661,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid Staking',
    site: 'kintsu.xyz',
  },
  {
    id: 'levr-bet',
    name: 'Levr Bet',
    abbr: 'L',
    district: 'DeFi',
    tag: 'Listed under ‘Prediction Market’.',
    description:
      'Levr Bet is a DefiLlama-listed protocol in the ’Prediction Market’ category with TVL tracked on the Monad chain.',
    x: 327,
    y: 590,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Prediction Market',
    site: 'levr.bet',
  },
  {
    id: 'sumer-money',
    name: 'Sumer Money',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Sumer Money is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 327,
    y: 515,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: null,
  },
  {
    id: 'monday-trade',
    name: 'Monday Trade',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'Monday Trade is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 351,
    y: 444,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: 'app.monday.trade',
  },
  {
    id: 'capricorn',
    name: 'Capricorn',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Capricorn is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 397,
    y: 385,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'capricorn.exchange',
  },
  {
    id: 'nad-fun',
    name: 'Nad.fun',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpad’.',
    description:
      'Nad.fun is a DefiLlama-listed protocol in the ’Launchpad’ category with TVL tracked on the Monad chain.',
    x: 460,
    y: 344,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpad',
    site: 'nad.fun',
  },
  {
    id: 'drake',
    name: 'Drake',
    abbr: 'D',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'Drake is a DefiLlama-listed protocol in the ’Derivatives’ category with TVL tracked on the Monad chain.',
    x: 532,
    y: 325,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: 'drake.exchange',
  },
  {
    id: 'kizzy',
    name: 'Kizzy',
    abbr: 'K',
    district: 'DeFi',
    tag: 'Listed under ‘Prediction Market’.',
    description:
      'Kizzy is a DefiLlama-listed protocol in the ’Prediction Market’ category with TVL tracked on the Monad chain.',
    x: 607,
    y: 331,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Prediction Market',
    site: 'kizzy.io',
  },
  {
    id: 'nabla-finance',
    name: 'Nabla Finance',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Nabla Finance is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 676,
    y: 361,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'symbiosis',
    name: 'Symbiosis',
    abbr: 'S',
    district: 'Infrastructure',
    tag: 'Listed under ‘Cross Chain Bridge’.',
    description:
      'Symbiosis is a DefiLlama-listed protocol in the ’Cross Chain Bridge’ category with TVL tracked on the Monad chain.',
    x: -356,
    y: 769,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Cross Chain Bridge',
    site: 'symbiosis.finance',
  },

  {
    id: 'bean-exchange',
    name: 'Bean Exchange',
    abbr: 'B',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Bean Exchange is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 731,
    y: 411,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'clober',
    name: 'Clober',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Clober is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 767,
    y: 477,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'app.clober.io',
  },
  {
    id: 'covenant',
    name: 'Covenant',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Covenant is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 780,
    y: 551,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'app.covenant.finance',
  },
  {
    id: 'narbet',
    name: 'Narbet',
    abbr: 'N',
    district: 'Gaming',
    tag: 'Listed under ‘Luck Games’.',
    description:
      'Narbet is a DefiLlama-listed protocol in the ’Luck Games’ category with TVL tracked on the Monad chain.',
    x: -772,
    y: -48,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Luck Games',
    site: 'nar.bet',
  },
  {
    id: 'narwhal-finance',
    name: 'Narwhal Finance',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'Narwhal Finance is a DefiLlama-listed protocol in the ’Derivatives’ category with TVL tracked on the Monad chain.',
    x: 768,
    y: 625,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: 'narwhal.finance',
  },
  {
    id: 'accountable',
    name: 'Accountable',
    aliases: ['YieldApp by Accountable'],
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Uncollateralized Lending’.',
    description:
      'Accountable is listed in the pinned Monad protocol registry (entry accountable, live) under Yield Aggregator with 8 Monad mainnet contract addresses.',
    x: 732,
    y: 691,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Uncollateralized Lending',
    site: 'accountable.capital',
  },
  {
    id: 'aethonswap',
    name: 'AethonSwap',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'AethonSwap is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 677,
    y: 742,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'agua',
    name: 'Agua',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Agua is a DefiLlama-listed protocol in the ’Onchain Capital Allocator’ category with TVL tracked on the Monad chain.',
    x: 609,
    y: 773,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: null,
  },
  {
    id: 'alphagrowth',
    name: 'alphagrowth',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'alphagrowth is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 373,
    y: 798,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'app.euler.finance',
  },
  {
    id: 'atlantis-dex',
    name: 'Atlantis DEX',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Atlantis DEX is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 318,
    y: 746,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'atlantisdex.xyz',
  },
  {
    id: 'august-digital',
    name: 'August Digital',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'August Digital is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 277,
    y: 681,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'augustdigital.io',
  },
  {
    id: 'autofinance',
    name: 'AUTOfinance',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'AUTOfinance is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 253,
    y: 609,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'auto.finance',
  },
  {
    id: 'brownfi-v2',
    name: 'BrownFi V2',
    abbr: 'B',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'BrownFi V2 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 249,
    y: 533,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'brownfi.io',
  },
  {
    id: 'clearstar',
    name: 'Clearstar',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Clearstar is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 263,
    y: 458,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'clearstar.xyz',
  },
  {
    id: 'detrade',
    name: 'DeTrade',
    abbr: 'D',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'DeTrade is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 295,
    y: 389,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: null,
  },
  {
    id: 'enjoyoors',
    name: 'Enjoyoors',
    abbr: 'E',
    district: 'DeFi',
    tag: 'Listed under ‘CDP’.',
    description:
      'Enjoyoors is a DefiLlama-listed protocol in the ’CDP’ category with TVL tracked on the Monad chain.',
    x: 344,
    y: 330,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'CDP',
    site: 'enjoyoors.xyz',
  },
  {
    id: 'euclid-protocol',
    name: 'Euclid Protocol',
    abbr: 'E',
    district: 'Infrastructure',
    tag: 'Listed under ‘Cross Chain Bridge’.',
    description:
      'Euclid Protocol is a DefiLlama-listed protocol in the ’Cross Chain Bridge’ category with TVL tracked on the Monad chain.',
    x: -419,
    y: 730,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Cross Chain Bridge',
    site: 'euclidprotocol.io',
  },
  {
    id: 'euler-dao',
    name: 'Euler DAO',
    abbr: 'E',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Euler DAO is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 406,
    y: 285,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'app.euler.finance',
  },
  {
    id: 'folks-finance-xchain',
    name: 'Folks Finance',
    aliases: ['Folks Finance xChain'],
    abbr: 'F',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Folks Finance is listed in the pinned Monad protocol registry (entry folks_finance, live) under Lending, Cross Chain with 18 Monad mainnet contract addresses.',
    x: 477,
    y: 257,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'xapp.folks.finance',
  },
  {
    id: 'fusion-by-ipor',
    name: 'Fusion by IPOR',
    abbr: 'F',
    district: 'DeFi',
    tag: 'Listed under ‘Yield Aggregator’.',
    description:
      'Fusion by IPOR is a DefiLlama-listed protocol in the ’Yield Aggregator’ category with TVL tracked on the Monad chain.',
    x: 552,
    y: 248,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield Aggregator',
    site: 'app.ipor.io',
  },
  {
    id: 'gamma-research',
    name: 'Gamma Research',
    abbr: 'G',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Gamma Research is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 628,
    y: 258,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'gammaresearch.xyz',
  },
  {
    id: 'gearbox',
    name: 'Gearbox',
    aliases: ['Gearbox Protocol'],
    abbr: 'G',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Gearbox is listed in the pinned Monad protocol registry (entry gearbox_protocol, live) under Lending, Leveraged Farming with 26 Monad mainnet contract addresses.',
    x: 699,
    y: 286,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'gearbox.finance',
  },
  {
    id: 'ghost-protocol',
    name: 'Ghost Protocol',
    abbr: 'G',
    district: 'Infrastructure',
    tag: 'Listed under ‘Privacy’.',
    description:
      'Ghost Protocol is a DefiLlama-listed protocol in the ’Privacy’ category with TVL tracked on the Monad chain.',
    x: -417,
    y: 656,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Privacy',
    site: 'ghost-protocol.xyz',
  },
  {
    id: 'gluehook',
    name: 'GlueHook',
    abbr: 'G',
    district: 'DeFi',
    tag: 'Listed under ‘Liquidity Automation’.',
    description:
      'GlueHook is a DefiLlama-listed protocol in the ’Liquidity Automation’ category with TVL tracked on the Monad chain.',
    x: 760,
    y: 331,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquidity Automation',
    site: 'gluehook.trade',
  },
  {
    id: 'hanji-protocol',
    name: 'Hanji Protocol',
    abbr: 'H',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Hanji Protocol is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 809,
    y: 389,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'hanji.io',
  },
  {
    id: 'huma',
    name: 'Huma',
    abbr: 'H',
    district: 'DeFi',
    tag: 'Listed under ‘RWA’.',
    description:
      'Huma is a DefiLlama-listed protocol in the ’RWA’ category with TVL tracked on the Monad chain.',
    x: 841,
    y: 458,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'RWA',
    site: 'app.huma.finance',
  },
  {
    id: 'hyperithm',
    name: 'Hyperithm',
    abbr: 'H',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Hyperithm is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 855,
    y: 533,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'hyperithm.com',
  },
  {
    id: 'iziswap',
    name: 'iZiSwap',
    abbr: 'I',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'iZiSwap is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 851,
    y: 609,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'izumi.finance',
  },
  {
    id: 'joe-dex',
    name: 'Joe DEX',
    abbr: 'J',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Joe DEX is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 827,
    y: 682,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'lfj.gg',
  },
  {
    id: 'k3-capital',
    name: 'K3 Capital',
    abbr: 'K',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'K3 Capital is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 786,
    y: 746,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'k3.capital',
  },
  {
    id: 'k613',
    name: 'K613',
    abbr: 'K',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'K613 is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 730,
    y: 798,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'k613.net',
  },
  {
    id: 'layerzero-v2',
    name: 'LayerZero V2',
    abbr: 'L',
    district: 'Infrastructure',
    tag: 'Listed under ‘Bridge’.',
    description:
      'LayerZero V2 is a DefiLlama-listed protocol in the ’Bridge’ category with TVL tracked on the Monad chain.',
    x: -352,
    y: 621,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Bridge',
    site: 'layerzero.network',
  },
  {
    id: 'lemonad',
    name: 'LeMONAD',
    abbr: 'L',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'LeMONAD is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 664,
    y: 835,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'lfj-poe',
    name: 'LFJ',
    aliases: ['LFJ POE'],
    abbr: 'L',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'LFJ is listed in the pinned Monad protocol registry (entry lfj, live) under DEX, Memecoin with 26 Monad mainnet contract addresses.',
    x: 590,
    y: 854,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'lfj.gg',
  },
  {
    id: 'lunarbase',
    name: 'Lunarbase',
    abbr: 'L',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Lunarbase is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 514,
    y: 854,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'lunarbase.gg',
  },
  {
    id: 'madness-finance',
    name: 'Madness Finance',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Madness Finance is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 440,
    y: 835,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'mellow',
    name: 'Mellow',
    aliases: ['Mellow Core', 'Mellow Restaking'],
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Mellow is listed in the pinned Monad protocol registry (entry mellow, live) under Leveraged Farming, Yield with 52 Monad mainnet contract addresses.',
    x: 201,
    y: 697,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: 'app.mellow.finance',
  },
  {
    id: 'metric-v2',
    name: 'Metric V2',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Metric V2 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 179,
    y: 623,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'metric.xyz',
  },
  {
    id: 'monad-grid',
    name: 'Monad Grid',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpad’.',
    description:
      'Monad Grid is a DefiLlama-listed protocol in the ’Launchpad’ category with TVL tracked on the Monad chain.',
    x: 172,
    y: 547,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpad',
    site: null,
  },
  {
    id: 'moonmace',
    name: 'Moonmace',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Liquid Staking’.',
    description:
      'Moonmace is a DefiLlama-listed protocol in the ’Liquid Staking’ category with TVL tracked on the Monad chain.',
    x: 181,
    y: 470,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid Staking',
    site: 'moonmace.ai',
  },
  {
    id: 'morpho-blue',
    name: 'Morpho',
    aliases: ['Morpho Blue'],
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Morpho is listed in the pinned Monad protocol registry (entry morpho, live) under Lending with 35 Monad mainnet contract addresses.',
    x: 205,
    y: 397,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'app.morpho.org',
  },
  {
    id: 'mu-digital',
    name: 'Mu Digital',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘RWA’.',
    description:
      'Mu Digital is a DefiLlama-listed protocol in the ’RWA’ category with TVL tracked on the Monad chain.',
    x: 243,
    y: 331,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'RWA',
    site: 'mudigital.net',
  },
  {
    id: 'murk-finance',
    name: 'Murk Finance',
    abbr: 'M',
    district: 'Infrastructure',
    tag: 'Listed under ‘Privacy’.',
    description:
      'Murk Finance is a DefiLlama-listed protocol in the ’Privacy’ category with TVL tracked on the Monad chain.',
    x: -289,
    y: 660,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Privacy',
    site: 'murk.finance',
  },
  {
    id: 'native-lend-curator',
    name: 'Native Lend Curator',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Native Lend Curator is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 294,
    y: 273,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'native.org',
  },
  {
    id: 'near-intents',
    name: 'NEAR Intents',
    abbr: 'N',
    district: 'Infrastructure',
    tag: 'Listed under ‘Bridge’.',
    description:
      'NEAR Intents is a DefiLlama-listed protocol in the ’Bridge’ category with TVL tracked on the Monad chain.',
    x: -287,
    y: 827,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Bridge',
    site: 'near.com',
  },
  {
    id: 'neutral-trade',
    name: 'Neutral Trade',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Neutral Trade is a DefiLlama-listed protocol in the ’Onchain Capital Allocator’ category with TVL tracked on the Monad chain.',
    x: 355,
    y: 227,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: 'neutral.trade',
  },
  {
    id: 'noxa-dex-v2',
    name: 'NOXA DEX V2',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'NOXA DEX V2 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 425,
    y: 194,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'fun.noxa.eth.limo',
  },
  {
    id: 'noxa-fun',
    name: 'NOXA Fun',
    abbr: 'N',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpad’.',
    description:
      'NOXA Fun is a DefiLlama-listed protocol in the ’Launchpad’ category with TVL tracked on the Monad chain.',
    x: 500,
    y: 176,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpad',
    site: 'fun.noxa.eth.limo',
  },
  {
    id: 'obsdn',
    name: 'OBSDN',
    abbr: 'O',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'OBSDN is a DefiLlama-listed protocol in the ’Derivatives’ category with TVL tracked on the Monad chain.',
    x: 576,
    y: 173,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: 'obsdn.trade',
  },
  {
    id: 'octoswap-cl',
    name: 'OctoSwap CL',
    abbr: 'O',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'OctoSwap CL is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 652,
    y: 185,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'octo.exchange',
  },
  {
    id: 'ouroboros-capital',
    name: 'Ouroboros Capital',
    abbr: 'O',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Ouroboros Capital is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 724,
    y: 213,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'yuzu.money',
  },
  {
    id: 'pangolin-v3',
    name: 'Pangolin V3',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Pangolin V3 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 789,
    y: 255,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'app.pangolin.exchange',
  },
  {
    id: 'parity-dex',
    name: 'Parity DEX',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Parity DEX is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 844,
    y: 308,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'app.parity.exchange',
  },
  {
    id: 'peridot',
    name: 'Peridot',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Peridot is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 887,
    y: 372,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'peridot.finance',
  },
  {
    id: 'pingu-exchange',
    name: 'Pingu Exchange',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Derivatives’.',
    description:
      'Pingu Exchange is a DefiLlama-listed protocol in the ’Derivatives’ category with TVL tracked on the Monad chain.',
    x: 916,
    y: 443,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Derivatives',
    site: null,
  },
  {
    id: 'pinot-v3',
    name: 'Pinot V3',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Pinot V3 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 931,
    y: 519,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'printr',
    name: 'Printr',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpad’.',
    description:
      'Printr is a DefiLlama-listed protocol in the ’Launchpad’ category with TVL tracked on the Monad chain.',
    x: 929,
    y: 596,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpad',
    site: null,
  },
  {
    id: 'purpsexchange',
    name: 'PurpsExchange',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'PurpsExchange is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 913,
    y: 671,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'app.purps.xyz',
  },
  {
    id: 'quantus-lend',
    name: 'Quantus Lend',
    abbr: 'Q',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Quantus Lend is a DefiLlama-listed protocol in the ’Lending’ category with TVL tracked on the Monad chain.',
    x: 882,
    y: 741,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: null,
  },
  {
    id: 'reservoir-protocol',
    name: 'Reservoir Protocol',
    abbr: 'R',
    district: 'DeFi',
    tag: 'Listed under ‘CDP’.',
    description:
      'Reservoir Protocol is a DefiLlama-listed protocol in the ’CDP’ category with TVL tracked on the Monad chain.',
    x: 837,
    y: 803,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'CDP',
    site: 'app.reservoir.xyz',
  },
  {
    id: 'rockawayx',
    name: 'RockawayX',
    abbr: 'R',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'RockawayX is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 780,
    y: 856,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'rockawayx.com',
  },
  {
    id: 'sablier-lockup',
    name: 'Sablier Lockup',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Payments’.',
    description:
      'Sablier Lockup is a DefiLlama-listed protocol in the ’Payments’ category with TVL tracked on the Monad chain.',
    x: 715,
    y: 895,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Payments',
    site: 'sablier.com',
  },
  {
    id: 'saffron-vaults',
    name: 'Saffron Vaults',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'Saffron Vaults is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 642,
    y: 921,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'saffron.finance',
  },
  {
    id: 'sherpa',
    name: 'Sherpa',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Sherpa is a DefiLlama-listed protocol in the ’Onchain Capital Allocator’ category with TVL tracked on the Monad chain.',
    x: 566,
    y: 932,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: 'earn.sherpa.trade',
  },
  {
    id: 'shmonad',
    name: 'ShMonad',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Liquid Staking’.',
    description:
      'ShMonad is a DefiLlama-listed protocol in the ’Liquid Staking’ category with TVL tracked on the Monad chain.',
    x: 489,
    y: 927,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid Staking',
    site: 'shmonad.xyz',
  },
  {
    id: 'skate-amm',
    name: 'Skate AMM',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Skate AMM is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 415,
    y: 906,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'amm.skatechain.org',
  },
  {
    id: 'someswap-amm',
    name: 'SomeSwap CL',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'SomeSwap CL is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 347,
    y: 872,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'springx',
    name: 'SpringX',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'SpringX is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 286,
    y: 824,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'springx.finance',
  },
  {
    id: 'steakhouse-financial',
    name: 'Steakhouse Financial',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Steakhouse Financial is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 237,
    y: 765,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'steakhouse.financial',
  },
  {
    id: 'stoneusd',
    name: 'STONEUSD',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘CeDeFi’.',
    description:
      'STONEUSD is a DefiLlama-listed protocol in the ’CeDeFi’ category with TVL tracked on the Monad chain.',
    x: 102,
    y: 480,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'CeDeFi',
    site: 'stakestone.io',
  },
  {
    id: 'swaap-maker-v2',
    name: 'Swaap Maker V2',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Swaap Maker V2 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 120,
    y: 407,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'swaap.finance',
  },
  {
    id: 'sweep-n-flip',
    name: 'Sweep n Flip',
    abbr: 'S',
    district: 'Gaming',
    tag: 'Listed under ‘NFT Marketplace’.',
    description:
      'Sweep n Flip is a DefiLlama-listed protocol in the ’NFT Marketplace’ category with TVL tracked on the Monad chain.',
    x: -835,
    y: -87,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'NFT Marketplace',
    site: 'sweepnflip.io',
  },
  {
    id: 'swyrl-cl',
    name: 'Swyrl CL',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Swyrl CL is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 149,
    y: 338,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: null,
  },
  {
    id: 'theo-network-thbill',
    name: 'Theo Network thBill',
    abbr: 'T',
    district: 'DeFi',
    tag: 'Listed under ‘RWA’.',
    description:
      'Theo Network thBill is a DefiLlama-listed protocol in the ’RWA’ category with TVL tracked on the Monad chain.',
    x: 190,
    y: 274,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'RWA',
    site: 'app.theo.xyz',
  },
  {
    id: 'thesauros',
    name: 'Thesauros',
    abbr: 'T',
    district: 'DeFi',
    tag: 'Listed under ‘Yield’.',
    description:
      'Thesauros is a DefiLlama-listed protocol in the ’Yield’ category with TVL tracked on the Monad chain.',
    x: 241,
    y: 219,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield',
    site: 'thesauros.io',
  },
  {
    id: 'townsquare',
    name: 'TownSquare',
    aliases: ['TownSquare Lending', 'TownSquare Loop Vaults'],
    abbr: 'T',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'TownSquare is listed in the pinned Monad protocol registry (entry townsquare, live) under Lending, Cross Chain with 15 Monad mainnet contract addresses.',
    x: 300,
    y: 172,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'app.townsq.xyz',
  },
  {
    id: 'travessia-credit',
    name: 'Travessia Credit',
    abbr: 'T',
    district: 'DeFi',
    tag: 'Listed under ‘RWA’.',
    description:
      'Travessia Credit is a DefiLlama-listed protocol in the ’RWA’ category with TVL tracked on the Monad chain.',
    x: 366,
    y: 136,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'RWA',
    site: 'travessiacredit.com',
  },
  {
    id: 'tulipa-capital',
    name: 'Tulipa Capital',
    abbr: 'T',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Tulipa Capital is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 437,
    y: 111,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'tulipa.capital',
  },
  {
    id: 'ultrayield-curator',
    name: 'UltraYield Curator',
    abbr: 'U',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'UltraYield Curator is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 511,
    y: 98,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'ultrayield.app',
  },
  {
    id: 'unified-labs',
    name: 'Unified Labs',
    abbr: 'U',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Unified Labs is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 587,
    y: 97,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'unifiedlabs.io',
  },
  {
    id: 'unit',
    name: 'Unit',
    abbr: 'U',
    district: 'Infrastructure',
    tag: 'Listed under ‘Bridge’.',
    description:
      'Unit is a DefiLlama-listed protocol in the ’Bridge’ category with TVL tracked on the Monad chain.',
    x: -356,
    y: 843,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Bridge',
    site: 'hyperunit.xyz',
  },
  {
    id: 'valos',
    name: 'Valos',
    abbr: 'V',
    district: 'DeFi',
    tag: 'Listed under ‘RWA’.',
    description:
      'Valos is a DefiLlama-listed protocol in the ’RWA’ category with TVL tracked on the Monad chain.',
    x: 661,
    y: 109,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'RWA',
    site: 'valos.io',
  },
  {
    id: 'veda',
    name: 'Veda',
    abbr: 'V',
    district: 'DeFi',
    tag: 'Listed under ‘Onchain Capital Allocator’.',
    description:
      'Veda is a DefiLlama-listed protocol in the ’Onchain Capital Allocator’ category with TVL tracked on the Monad chain.',
    x: 732,
    y: 133,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Onchain Capital Allocator',
    site: 'veda.tech',
  },
  {
    id: 'vfat-io',
    name: 'vfat.io',
    abbr: 'V',
    district: 'DeFi',
    tag: 'Listed under ‘Yield Aggregator’.',
    description:
      'vfat.io is a DefiLlama-listed protocol in the ’Yield Aggregator’ category with TVL tracked on the Monad chain.',
    x: 799,
    y: 169,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield Aggregator',
    site: 'vfat.io',
  },
  {
    id: 'vii-finance',
    name: 'VII Finance',
    abbr: 'V',
    district: 'DeFi',
    tag: 'Listed under ‘Leveraged Farming’.',
    description:
      'VII Finance is a DefiLlama-listed protocol in the ’Leveraged Farming’ category with TVL tracked on the Monad chain.',
    x: 859,
    y: 214,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Leveraged Farming',
    site: 'vii.finance',
  },
  {
    id: 'wombat-exchange',
    name: 'Wombat Exchange',
    abbr: 'W',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'Wombat Exchange is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 910,
    y: 269,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'wombat.exchange',
  },
  {
    id: 'y10k-capital',
    name: 'Y10K Capital',
    abbr: 'Y',
    district: 'DeFi',
    tag: 'Listed under ‘Risk Curators’.',
    description:
      'Y10K Capital is a DefiLlama-listed protocol in the ’Risk Curators’ category with TVL tracked on the Monad chain.',
    x: 952,
    y: 332,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Risk Curators',
    site: 'y10k.capital',
  },
  {
    id: 'zkswap-v2',
    name: 'zkSwap V2',
    abbr: 'Z',
    district: 'DeFi',
    tag: 'Listed under ‘Dexs’.',
    description:
      'zkSwap V2 is a DefiLlama-listed protocol in the ’Dexs’ category with TVL tracked on the Monad chain.',
    x: 982,
    y: 401,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Dexs',
    site: 'zkswap.finance',
  },
  {
    id: 'lumiterra',
    name: 'Lumiterra',
    abbr: 'L',
    district: 'Gaming',
    tag: 'Listed under ‘Games’.',
    description:
      'Listed in the pinned Monad protocol registry (entry lumiterra, live) under Games with 5 Monad mainnet contract addresses.',
    x: -833,
    y: -161,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Games',
    site: 'lumiterra.net',
  },
  {
    id: 'bro-fun',
    name: 'Bro.fun',
    abbr: 'B',
    district: 'Gaming',
    tag: 'Listed under ‘Games’.',
    description:
      'Listed in the pinned Monad protocol registry (entry bro_fun, live) under Games, Mobile-First with 1 Monad mainnet contract addresses.',
    x: -768,
    y: -196,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Games',
    site: 'bro.fun',
  },
  {
    id: 'matcha',
    name: 'Matcha',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry matcha, live) under Cross Chain, DEX Aggregator with 6 Monad mainnet contract addresses.',
    x: 1001,
    y: 474,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'matcha.xyz',
  },
  {
    id: 'opensea',
    name: 'OpenSea',
    abbr: 'O',
    district: 'Gaming',
    tag: 'Listed under ‘Marketplace’.',
    description:
      'Listed in the pinned Monad protocol registry (entry opensea, live) under Marketplace with 2 Monad mainnet contract addresses.',
    x: -705,
    y: -157,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Marketplace',
    site: 'opensea.io',
  },
  {
    id: 'fastlane',
    name: 'FastLane',
    abbr: 'F',
    district: 'DeFi',
    tag: 'Listed under ‘Liquid Staking’.',
    description:
      'Listed in the pinned Monad protocol registry (entry fastlane, live) under Liquid Staking, Staking, MEV with 3 Monad mainnet contract addresses.',
    x: 1008,
    y: 549,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid Staking',
    site: 'shmonad.xyz',
  },
  {
    id: 'agora',
    name: 'Agora',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Stablecoin’.',
    description:
      'Listed in the pinned Monad protocol registry (entry agora, live) under Stablecoin, Asset Issuers with 2 Monad mainnet contract addresses.',
    x: 1002,
    y: 624,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Stablecoin',
    site: 'agora.finance',
  },
  {
    id: 'bonad',
    name: 'BONAD',
    abbr: 'B',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpads’.',
    description:
      'Listed in the pinned Monad protocol registry (entry bonad, live) under Launchpads, Memecoin with 7 Monad mainnet contract addresses.',
    x: 984,
    y: 697,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpads',
    site: 'bonad.fun',
  },
  {
    id: 'kyberswap',
    name: 'KyberSwap',
    abbr: 'K',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry kyberswap, live) under Cross Chain, DEX Aggregator with 4 Monad mainnet contract addresses.',
    x: 955,
    y: 766,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'kyberswap.com',
  },
  {
    id: 'pingme',
    name: 'PingMe',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Neobanks’.',
    description:
      'Listed in the pinned Monad protocol registry (entry pingme, live) under Neobanks with 3 Monad mainnet contract addresses.',
    x: 914,
    y: 830,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Neobanks',
    site: 'pingme.xyz',
  },
  {
    id: 'lootgo',
    name: 'LootGO',
    abbr: 'L',
    district: 'Gaming',
    tag: 'Listed under ‘Mobile-First’.',
    description:
      'Listed in the pinned Monad protocol registry (entry lootgo, live) under Mobile-First, Games, Other with 6 Monad mainnet contract addresses.',
    x: -703,
    y: 10,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Mobile-First',
    site: 'lootgo.app',
  },
  {
    id: 'monorail',
    name: 'Monorail',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘DEX Aggregator’.',
    description:
      'Listed in the pinned Monad protocol registry (entry monorail, live) under DEX Aggregator, Trading Interfaces with 1 Monad mainnet contract addresses.',
    x: 863,
    y: 885,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'DEX Aggregator',
    site: 'monorail.xyz',
  },
  {
    id: 'aarna',
    name: 'aarna',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Yield Aggregator’.',
    description:
      'Listed in the pinned Monad protocol registry (entry aarna, live) under Yield Aggregator with 2 Monad mainnet contract addresses.',
    x: 804,
    y: 932,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Yield Aggregator',
    site: 'aarna.ai',
  },
  {
    id: 'across',
    name: 'Across',
    abbr: 'A',
    district: 'Infrastructure',
    tag: 'Listed under ‘Interoperability’.',
    description:
      'Listed in the pinned Monad protocol registry (entry across, live) under Interoperability with 3 Monad mainnet contract addresses.',
    x: -424,
    y: 825,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Interoperability',
    site: 'across.to',
  },
  {
    id: 'apebond',
    name: 'ApeBond',
    abbr: 'A',
    district: 'DeFi',
    tag: 'Listed under ‘Other’.',
    description:
      'Listed in the pinned Monad protocol registry (entry apebond, live) under Other with 4 Monad mainnet contract addresses.',
    x: 738,
    y: 968,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Other',
    site: 'ape.bond',
  },
  {
    id: 'blinq',
    name: 'Blinq',
    abbr: 'B',
    district: 'Infrastructure',
    tag: 'Listed under ‘Prediction Market’.',
    description:
      'Listed in the pinned Monad protocol registry (entry blinq, live) under Prediction Market, Perpetuals / Derivatives with 1 Monad mainnet contract addresses.',
    x: -477,
    y: 778,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Prediction Market',
    site: 'blinq.fi',
  },
  {
    id: 'bungee',
    name: 'Bungee',
    abbr: 'B',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry bungee, live) under Cross Chain, Interoperability with 17 Monad mainnet contract addresses.',
    x: 667,
    y: 993,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'bungee.exchange',
  },
  {
    id: 'cashmere',
    name: 'Cashmere',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry cashmere, live) under Cross Chain with 1 Monad mainnet contract addresses.',
    x: 593,
    y: 1006,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'cashmere.exchange',
  },
  {
    id: 'cctp-exchange',
    name: 'CCTP Exchange',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry cctp_exchange, live) under Cross Chain, Interoperability with 1 Monad mainnet contract addresses.',
    x: 517,
    y: 1007,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'cctp.exchange',
  },
  {
    id: 'clanker-world',
    name: 'Clanker World',
    abbr: 'C',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpads’.',
    description:
      'Listed in the pinned Monad protocol registry (entry clanker_world, live) under Launchpads, Other with 8 Monad mainnet contract addresses.',
    x: 443,
    y: 995,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpads',
    site: 'clanker.world',
  },
  {
    id: 'debridge',
    name: 'deBridge',
    abbr: 'D',
    district: 'Infrastructure',
    tag: 'Listed under ‘Interoperability’.',
    description:
      'Listed in the pinned Monad protocol registry (entry debridge, live) under Interoperability with 4 Monad mainnet contract addresses.',
    x: -501,
    y: 711,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Interoperability',
    site: 'debridge.com',
  },
  {
    id: 'definitive',
    name: 'Definitive',
    abbr: 'D',
    district: 'DeFi',
    tag: 'Listed under ‘Trading Interfaces’.',
    description:
      'Listed in the pinned Monad protocol registry (entry definitive, live) under Trading Interfaces with 3 Monad mainnet contract addresses.',
    x: 372,
    y: 971,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Trading Interfaces',
    site: 'definitive.fi',
  },
  {
    id: 'dfusion-ai',
    name: 'dFusion AI',
    abbr: 'D',
    district: 'Infrastructure',
    tag: 'Listed under ‘Data’.',
    description:
      'Listed in the pinned Monad protocol registry (entry dfusion_ai, live) under Data with 1 Monad mainnet contract addresses.',
    x: -492,
    y: 641,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Data',
    site: 'dfusion.ai',
  },
  {
    id: 'dirol',
    name: 'Dirol',
    abbr: 'D',
    district: 'DeFi',
    tag: 'Listed under ‘DEX’.',
    description:
      'Listed in the pinned Monad protocol registry (entry dirol, live) under DEX, DEX Aggregator, Launchpads, Memecoin, Stableswap, Trading Interfaces with 2 Monad mainnet contract addresses.',
    x: 305,
    y: 935,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'DEX',
    site: 'dex.dirol.io',
  },
  {
    id: 'flap',
    name: 'Flap',
    abbr: 'F',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpads’.',
    description:
      'Listed in the pinned Monad protocol registry (entry flap, live) under Launchpads with 4 Monad mainnet contract addresses.',
    x: 245,
    y: 890,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpads',
    site: 'flap.sh',
  },
  {
    id: 'gmgn',
    name: 'GMGN',
    abbr: 'G',
    district: 'DeFi',
    tag: 'Listed under ‘DEX Aggregator’.',
    description:
      'Listed in the pinned Monad protocol registry (entry gmgn, live) under DEX Aggregator with 1 Monad mainnet contract addresses.',
    x: 194,
    y: 835,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'DEX Aggregator',
    site: 'gmgn.ai',
  },
  {
    id: 'grimmys',
    name: 'Grimmy’s',
    abbr: 'G',
    district: 'Gaming',
    tag: 'Listed under ‘Games’.',
    description:
      'Listed in the pinned Monad protocol registry (entry grimmys, live) under Games, Mobile-First with 3 Monad mainnet contract addresses.',
    x: -772,
    y: 26,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Games',
    site: 'grimmy.fun',
  },
  {
    id: 'kinetk',
    name: 'KINETK',
    abbr: 'K',
    district: 'AI',
    tag: 'Listed under ‘Consumer AI’.',
    description:
      'Listed in the pinned Monad protocol registry (entry kinetk, live) under Consumer AI, Data, RWA, Other with 2 Monad mainnet contract addresses.',
    x: -59,
    y: -731,
    h: 50,
    color: '#91baff',
    state: 'Observed',
    type: 'Consumer AI',
    site: 'kinetk.ai',
  },
  {
    id: 'kinic',
    name: 'Kinic',
    abbr: 'K',
    district: 'AI',
    tag: 'Listed under ‘Consumer AI’.',
    description:
      'Listed in the pinned Monad protocol registry (entry kinic, live) under Consumer AI, Storage with 1 Monad mainnet contract addresses.',
    x: -124,
    y: -696,
    h: 50,
    color: '#91baff',
    state: 'Observed',
    type: 'Consumer AI',
    site: 'kinicmemory.com',
  },
  {
    id: 'mayan',
    name: 'Mayan',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry mayan, live) under Cross Chain, DEX, Intents, Memecoin, Stableswap, Trading Interfaces with 4 Monad mainnet contract addresses.',
    x: 152,
    y: 772,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'mayan.finance',
  },
  {
    id: 'memetok',
    name: 'MemeTok',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Trading Interfaces’.',
    description:
      'Listed in the pinned Monad protocol registry (entry memetok, live) under Trading Interfaces, Social, Launchpads with 2 Monad mainnet contract addresses.',
    x: 122,
    y: 703,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Trading Interfaces',
    site: 'memetok.app',
  },
  {
    id: 'mevx',
    name: 'MevX',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Trading Interfaces’.',
    description:
      'Listed in the pinned Monad protocol registry (entry mevx, live) under Trading Interfaces with 14 Monad mainnet contract addresses.',
    x: 103,
    y: 630,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Trading Interfaces',
    site: 'mevx.io',
  },
  {
    id: 'mona-trading-bot',
    name: 'Mona Trading Bot',
    abbr: 'M',
    district: 'DeFi',
    tag: 'Listed under ‘Trading Interfaces’.',
    description:
      'Listed in the pinned Monad protocol registry (entry mona_trading_bot, live) under Trading Interfaces with 5 Monad mainnet contract addresses.',
    x: 96,
    y: 555,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Trading Interfaces',
    site: 't.me',
  },
  {
    id: 'openocean',
    name: 'OpenOcean',
    abbr: 'O',
    district: 'DeFi',
    tag: 'Listed under ‘DEX’.',
    description:
      'Listed in the pinned Monad protocol registry (entry openocean, live) under DEX, DEX Aggregator, Trading Interfaces, Cross Chain with 1 Monad mainnet contract addresses.',
    x: 148,
    y: 206,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'DEX',
    site: 'openocean.finance',
  },
  {
    id: 'playkami',
    name: 'PlayKami',
    abbr: 'P',
    district: 'Infrastructure',
    tag: 'Listed under ‘E-commerce / Ticketing’.',
    description:
      'Listed in the pinned Monad protocol registry (entry playkami, live) under E-commerce / Ticketing, Other with 4 Monad mainnet contract addresses.',
    x: -451,
    y: 583,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'E-commerce / Ticketing',
    site: 'playkami.io',
  },
  {
    id: 'puffer',
    name: 'Puffer',
    abbr: 'P',
    district: 'DeFi',
    tag: 'Listed under ‘Liquid Staking’.',
    description:
      'Listed in the pinned Monad protocol registry (entry puffer, live) under Liquid Staking, Staking with 1 Monad mainnet contract addresses.',
    x: 201,
    y: 152,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Liquid Staking',
    site: 'puffer.fi',
  },
  {
    id: 'relay',
    name: 'Relay',
    abbr: 'R',
    district: 'DeFi',
    tag: 'Listed under ‘Cross Chain’.',
    description:
      'Listed in the pinned Monad protocol registry (entry relay, live) under Cross Chain with 7 Monad mainnet contract addresses.',
    x: 262,
    y: 106,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Cross Chain',
    site: 'relay.link',
  },
  {
    id: 'rug-rumble',
    name: 'Rug Rumble',
    abbr: 'R',
    district: 'Gaming',
    tag: 'Listed under ‘Mobile-First’.',
    description:
      'Listed in the pinned Monad protocol registry (entry rug_rumble, live) under Mobile-First, Games, Other with 1 Monad mainnet contract addresses.',
    x: -840,
    y: 8,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Mobile-First',
    site: 'rugrumble.xyz',
  },
  {
    id: 'stakestone',
    name: 'StakeStone',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘Asset Issuers’.',
    description:
      'Listed in the pinned Monad protocol registry (entry stakestone, live) under Asset Issuers, Liquid Staking, Stablecoin, Yield with 2 Monad mainnet contract addresses.',
    x: 328,
    y: 69,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Asset Issuers',
    site: 'stakestone.io',
  },
  {
    id: 'sushiswap',
    name: 'Sushiswap',
    abbr: 'S',
    district: 'DeFi',
    tag: 'Listed under ‘DEX Aggregator’.',
    description:
      'Listed in the pinned Monad protocol registry (entry sushiswap, live) under DEX Aggregator, DEX with 5 Monad mainnet contract addresses.',
    x: 399,
    y: 42,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'DEX Aggregator',
    site: 'sushi.com',
  },
  {
    id: 'tadle',
    name: 'Tadle',
    abbr: 'T',
    district: 'DeFi',
    tag: 'Listed under ‘Lending’.',
    description:
      'Listed in the pinned Monad protocol registry (entry tadle, live) under Lending, CDP, Launchpads, Liquid Staking, DEX Aggregator, Yield Aggregator, Interoperability, Stablecoin, Yield with 2 Monad mainnet contract addresses.',
    x: 473,
    y: 26,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Lending',
    site: 'tadle.com',
  },
  {
    id: 'wormhole-portal',
    name: 'Wormhole Portal',
    abbr: 'W',
    district: 'Infrastructure',
    tag: 'Listed under ‘Interoperability’.',
    description:
      'Listed in the pinned Monad protocol registry (entry wormhole_portal, live) under Interoperability with 17 Monad mainnet contract addresses.',
    x: -388,
    y: 551,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Interoperability',
    site: 'wormhole.com',
  },
  {
    id: 'trendle',
    name: 'Trendle',
    abbr: 'T',
    district: 'Infrastructure',
    tag: 'Listed under ‘Prediction Market’.',
    description:
      'Listed in the pinned Monad protocol registry (entry trendle, live) under Prediction Market with 2 Monad mainnet contract addresses.',
    x: -317,
    y: 552,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Prediction Market',
    site: 'trendle.fi',
  },
  {
    id: 'plabs',
    name: 'PLabs',
    abbr: 'P',
    district: 'Infrastructure',
    tag: 'Listed under ‘Privacy / Encryption’.',
    description:
      'Listed in the pinned Monad protocol registry (entry plabs, live) under Privacy / Encryption with 2 Monad mainnet contract addresses.',
    x: -254,
    y: 585,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Privacy / Encryption',
    site: 'app.plabs.online',
  },
  {
    id: 'crsh-market',
    name: 'CRSH Market',
    abbr: 'C',
    district: 'Infrastructure',
    tag: 'Listed under ‘Prediction Market’.',
    description:
      'Listed in the pinned Monad protocol registry (entry crsh, live) under Prediction Market with 1 Monad mainnet contract addresses.',
    x: -215,
    y: 644,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Prediction Market',
    site: 'crshmarket.com',
  },
  {
    id: 'collective-memory',
    name: 'Collective Memory',
    abbr: 'C',
    district: 'Infrastructure',
    tag: 'Listed under ‘Social’.',
    description:
      'Listed in the pinned Monad protocol registry (entry collective_memory, live) under Social with 5 Monad mainnet contract addresses.',
    x: -207,
    y: 715,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Social',
    site: 'collectivememory.ai',
  },
  {
    id: 'oripa',
    name: 'Oripa',
    abbr: 'O',
    district: 'Gaming',
    tag: 'Listed under ‘Games’.',
    description:
      'Listed in the pinned Monad protocol registry (entry oripa) under Games, Marketplace with 5 Monad mainnet contract addresses.',
    x: -893,
    y: -39,
    h: 50,
    color: '#e9b07c',
    state: 'Observed',
    type: 'Games',
    site: 'oripa.cards',
  },
  {
    id: 'anomapay',
    name: 'AnomaPay',
    abbr: 'A',
    district: 'Infrastructure',
    tag: 'Listed under ‘Privacy / Encryption’.',
    description:
      'Listed in the pinned Monad protocol registry (entry anoma, live) under Privacy / Encryption, Orchestration with 2 Monad mainnet contract addresses.',
    x: -233,
    y: 781,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Privacy / Encryption',
    site: 'anomapay.app',
  },
  {
    id: 'o1-exchange',
    name: 'o1 exchange',
    abbr: 'O',
    district: 'DeFi',
    tag: 'Listed under ‘Launchpads’.',
    description:
      'Listed in the pinned Monad protocol registry (entry o1_exchange, live) under Launchpads, DEX Aggregator with 4 Monad mainnet contract addresses.',
    x: 549,
    y: 20,
    h: 50,
    color: '#93d6c6',
    state: 'Observed',
    type: 'Launchpads',
    site: 'o1.exchange',
  },
];

projects.forEach((project) => {
  project.evidence = createProjectEvidence(project.state);
});
validateDataContract(projects);

const districts = ['All districts', 'DeFi', 'AI', 'Infrastructure', 'Gaming', 'Identity'];

let selected = 'monad';
let filter = 'All districts';
let zoom = 1;
let showLinks = true;
let offset = { x: 0, y: 0 };
let graph = false;
let scope = 'city'; // 'city' | 'district'
let activeDistrict = null;
let districtTab = 'overview';
let districtEvidenceMode = 'all'; // 'all' | 'source-backed' | 'demo'
let districtTypeFilter = null;
let districtEvidenceView = 'all';
let districtSelectedEdgeId = null;
let districtPlaqueDismissed = false;
let navigatorProjectHighlights = new Set();
let navigatorRelationshipHighlights = new Set();

const stateClass = (state) => state.toLowerCase().replace(/[\s-]/g, '');
const selectedProject = () => projects.find((project) => project.id === selected);
const relationshipsForProject = (projectId) =>
  relationships.filter((item) => item.from === projectId || item.to === projectId);
const connectedProject = (item, projectId) =>
  projects.find((project) => project.id === (item.from === projectId ? item.to : item.from));
const projectById = (id) => projects.find((project) => project.id === id);
const evidenceById = new Map(evidenceRecords.map((record) => [record.id, record]));
const governanceDecisionBySubject = new Map([
  ...reviewGovernanceCompanion.evidenceDecisions.map((decision) => [`evidence:${decision.subjectId}`, decision]),
  ...reviewGovernanceCompanion.relationshipDecisions.map((decision) => [`relationship:${decision.subjectId}`, decision]),
]);
const evidenceForProject = (projectId) => evidenceRecords.filter((record) => record.projectId === projectId);
const evidenceForRelationship = (relationship) =>
  (relationship.evidenceIds || []).map((id) => evidenceById.get(id)).filter(Boolean);
const isApprovedSourcedRelationship = (relationship) =>
  relationship?.dataMode === 'sourced-limited' && relationship.reviewStatus === 'approved';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

document.querySelector('#app').innerHTML = `
  <header>
    <a class="brand" href="#" aria-label="Monad City home">
      <span class="brand-symbol">◈</span>
      <span>MONAD <span class="brand-city">CITY</span></span>
    </a>
    <span class="header-caption">AI-readable ecosystem trust graph</span>
    <nav aria-label="Primary navigation">
      <button class="nav-active" id="explore">Explore city</button>
      <button id="about">About the graph <span>↗</span></button>
    </nav>
  </header>

  <div class="district-bar" id="district-bar" hidden>
    <nav class="district-crumbs" aria-label="Breadcrumb">
      <button type="button" id="crumb-city">Monad City</button>
      <span class="crumb-sep" aria-hidden="true">/</span>
      <span>Districts</span>
      <span class="crumb-sep" aria-hidden="true">/</span>
      <span class="crumb-here" id="crumb-district" aria-current="page"></span>
    </nav>
    <div class="district-tabs" id="district-tabs" role="tablist" aria-label="District views"></div>
  </div>

  <main>
    <aside class="navigator">
      <div class="navigator-head">
        <h1>AI Navigator</h1>
        <button class="panel-collapse" id="navigator-collapse" aria-expanded="true" aria-controls="navigator-body" aria-label="Collapse AI Navigator">—</button>
      </div>
      <div id="navigator-body">
        <form id="search-form">
          <label class="sr-only" for="search">Ask the Navigator</label>
          <input id="search" placeholder="Ask the project graph" autocomplete="off" />
          <button aria-label="Run Navigator search">↗</button>
        </form>
        <div id="navigator-result" role="status"></div>
        <div class="prompt-list" aria-label="Suggested Navigator prompts">
          <button class="prompt" data-prompt="Show me the DeFi landscape">
            <span>Show me the DeFi landscape</span><b aria-hidden="true">↗</b>
          </button>
          <button class="prompt" data-prompt="Who’s connected to Monad?">
            <span>Who’s connected to Monad?</span><b aria-hidden="true">↗</b>
          </button>
          <button class="prompt" data-prompt="Find AI projects with active contracts">
            <span>Find AI projects with active contracts</span><b aria-hidden="true">↗</b>
          </button>
        </div>
        <div class="hr"></div>
        <section class="district-section" aria-labelledby="district-heading">
          <div class="section-heading">
            <h2 id="district-heading">Districts</h2>
            <span>5</span>
          </div>
          <div id="district-list"></div>
        </section>
        <details class="ai-panel" id="ai-panel">
          <summary>Grounded AI <span class="ai-state" id="ai-state">off</span></summary>
          <form id="ai-form">
            <label>API endpoint (OpenAI-compatible)<input id="ai-base-url" autocomplete="off" spellcheck="false" /></label>
            <label>Model<input id="ai-model" autocomplete="off" spellcheck="false" /></label>
            <label>API key<input id="ai-key" type="password" autocomplete="off" /></label>
            <p class="ai-note">The model only reformulates the exact records a search returns and cites their record IDs — it cannot add facts. Your key is stored in this browser and sent only to the endpoint above. Without a key the Navigator stays fully deterministic.</p>
            <button type="submit">Save AI settings</button>
          </form>
        </details>
      </div>
    </aside>

    <section class="city" aria-label="Interactive city map">
      <div id="city-stage">
        <div
          id="city-gl"
          role="application"
          tabindex="0"
          aria-label="Interactive 3D city. Focus the project list to browse buildings with the keyboard; click a building to open its passport."
        ></div>
        <div id="city-labels" aria-hidden="true"></div>
        <svg
          id="city-svg"
          hidden
          viewBox="-140 100 1030 550"
          role="group"
          aria-label="Relationship graph of the ecosystem. Select a node to view its passport."
        >
          <g id="world"></g>
        </svg>
        <ul class="sr-only" id="city-keyboard" aria-label="Project buildings"></ul>

        <div class="view-toggle" aria-label="View mode">
          <button class="selected" id="city-view">◈ <span>City</span></button>
          <button id="graph-view">⌘ <span>Graph</span></button>
        </div>

        <div class="city-context" aria-live="polite">
          <span class="context-dot"></span>
          <strong id="context-label">Monad selected</strong>
          <span class="context-line"></span>
          <span id="visible-count">All districts · 10 in view</span>
        </div>

        <div class="city-controls" aria-label="Map controls">
          <button id="zoom-in" aria-label="Zoom in">+</button>
          <button id="zoom-out" aria-label="Zoom out">−</button>
          <span></span>
          <button id="reset" aria-label="Reset city view">⌖</button>
        </div>

        <div class="legend" aria-label="Relationship provenance classes">
          <button id="links-toggle" aria-pressed="true">
            <span class="line-sample"></span> Relationships
          </button>
          <span class="legend-state sourced"><i></i> Sourced</span>
          <span class="legend-state demopattern"><i></i> Declared</span>
          <span class="legend-state inferred"><i></i> AI-inferred</span>
        </div>
      </div>
    </section>

    <aside class="passport" id="passport"></aside>

    <button class="panel-handle left" id="navigator-handle" aria-expanded="true" aria-controls="navigator-body" aria-label="Collapse AI Navigator panel">‹</button>
    <button class="panel-handle right" id="passport-handle" aria-expanded="false" aria-label="Expand project passport panel">›</button>
  </main>

  <footer>
    <span><span class="footer-mark">◈</span> An AI-readable trust graph. A human-explorable city.</span>
    <span>Static curated dataset</span>
  </footer>

  <dialog id="about-dialog">
    <button id="close-dialog" aria-label="Close">×</button>
    <span class="eyebrow">THE IDEA BEHIND THE CITY</span>
    <h2>Trust has a geography.</h2>
    <p>
      Monad City makes an ecosystem’s relationships explorable. Buildings are projects,
      districts organize discovery, and connections make dependencies visible.
    </p>
    <p>
      This hybrid prototype has a limited static sourced subset of exact claims and relationships;
      all other placements, descriptions, project-state patterns, and unsupported relationships are
      illustrative Demo data. A source supports only its stated scope, never generic endorsement,
      safety, quality, current operation, or global verification. AI Navigator uses deterministic
      local retrieval; no live AI, wallet, blockchain, or backend is connected.
    </p>
    <h3>Project state requirements</h3>
    <div class="state-explain">
      <b>Observed</b> The exact named artifact was inspected; not a safety, currency, or endorsement claim.<br />
      <b>Claimed</b> The named publisher made a bounded statement; not a wallet/owner claim or independent proof.<br />
      <b>Attested</b> Requires a named attestor, scope, source, and timestamp; no real Attested record exists here.<br />
      <b>AI-inferred</b> A model-proposed classification; never proof.
    </div>
    <h3>Relationship evidence states</h3>
    <div class="state-explain relationship-explain">
      <b>Source observed</b> A limited sourced edge backed by exact inspected records.<br />
      <b>Publisher claimed</b> A limited sourced edge from a named publisher’s bounded statement.<br />
      <b>Demo patterns</b> Onchain, owner-claimed, and attested patterns remain illustrative where labelled Demo.<br />
      <b>AI-inferred</b> A similarity suggestion; not verification.<br />
      <b>Illustrative</b> A Demo-only edge with no factual claim.
    </div>
    <p class="dialog-note">This is a static Hybrid view, not Live or Verified. Inspect each exact source record and its limitations.</p>
  </dialog>
`;

function iso(x, y, z = 0) {
  return [425 + (x - y) * 1.03, 365 + (x + y) * 0.51 - z];
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATUS_COPY = {
  Observed: 'Public signal observed at snapshot time; not an endorsement.',
  Claimed: 'Stated by the project; independent proof pending.',
  Attested: 'Attested by a named third party within its stated scope.',
  'AI-inferred': 'Proposed by model similarity; never proof.',
};
const beaconByProject = Object.fromEntries(projects.map((project) => {
  if (project.state === 'AI-inferred') return [project.id, '#9d81bd'];
  return [project.id, evidenceForProject(project.id).length ? '#8ebbd7' : '#7d7490'];
}));
const city3d = createCity3D({
  container: document.querySelector('#city-gl'),
  labelContainer: document.querySelector('#city-labels'),
  projects,
  relationships,
  onSelect: (id) => select(id),
  onDistrictActivate: (district) => navigateToDistrict(district),
  reducedMotion,
  beaconByProject,
});

function renderKeyboardList() {
  const list = document.querySelector('#city-keyboard');
  // District scope: the keyboard mirror exposes only in-scope buildings, not all 176.
  const listed = scope === 'district'
    ? projects.filter((project) => project.district === activeDistrict)
    : projects;
  list.innerHTML = listed.map((project) => `
    <li><button type="button" data-id="${project.id}" aria-selected="${project.id === selected}">
      ${project.name}, ${project.district}, status ${project.state}
    </button></li>`).join('');
  list.querySelectorAll('button').forEach((element) => {
    element.onclick = () => {
      select(element.dataset.id);
      if (!graph) city3d.focusProject(element.dataset.id);
    };
  });
}

document.querySelector('#navigator-collapse').onclick = (event) => {
  const collapsed = document.querySelector('.navigator').classList.toggle('collapsed');
  event.currentTarget.textContent = collapsed ? '+' : '—';
  event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  event.currentTarget.setAttribute('aria-label', collapsed ? 'Expand AI Navigator' : 'Collapse AI Navigator');
};

document.querySelector('#passport').addEventListener('click', (event) => {
  if (!event.target.closest('#passport-collapse')) return;
  const button = event.target.closest('#passport-collapse');
  const collapsed = document.querySelector('.passport').classList.toggle('collapsed');
  button.textContent = collapsed ? '+' : '—';
  button.setAttribute('aria-expanded', String(!collapsed));
});

function setPassportExpanded(expanded) {
  document.querySelector('.passport').classList.toggle('collapsed', !expanded);
  const handle = document.querySelector('#passport-handle');
  handle.textContent = expanded ? '›' : '‹';
  handle.setAttribute('aria-expanded', String(expanded));
  handle.setAttribute('aria-label', expanded ? 'Collapse project passport panel' : 'Expand project passport panel');
}

function setNavigatorExpanded(expanded) {
  document.querySelector('.navigator').classList.toggle('collapsed', !expanded);
  const handle = document.querySelector('#navigator-handle');
  handle.textContent = expanded ? '‹' : '›';
  handle.setAttribute('aria-expanded', String(expanded));
  handle.setAttribute('aria-label', expanded ? 'Collapse AI Navigator panel' : 'Expand AI Navigator panel');
}

document.querySelector('#passport-handle').onclick = () => {
  setPassportExpanded(document.querySelector('.passport').classList.contains('collapsed'));
};

document.querySelector('#navigator-handle').onclick = () => {
  setNavigatorExpanded(document.querySelector('.navigator').classList.contains('collapsed'));
};

setPassportExpanded(false);

document.querySelector('#city-gl').addEventListener('keydown', (event) => {
  if (graph) return;
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const list = projects.filter(visible);
  if (!list.length) return;
  const index = list.findIndex((project) => project.id === selected);
  const next = list[(index + step + list.length) % list.length];
  select(next.id);
  city3d.focusProject(next.id);
});

function poly(points, fill, stroke = '#ffffff14', extra = '') {
  return `<polygon points="${points.map((point) => point.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" ${extra} />`;
}

function block(x, y, width, depth, height, color, detail = true) {
  const a = iso(x - width / 2, y - depth / 2);
  const b = iso(x + width / 2, y - depth / 2);
  const c = iso(x + width / 2, y + depth / 2);
  const e = iso(x - width / 2, y + depth / 2);
  const at = iso(x - width / 2, y - depth / 2, height);
  const bt = iso(x + width / 2, y - depth / 2, height);
  const ct = iso(x + width / 2, y + depth / 2, height);
  const et = iso(x - width / 2, y + depth / 2, height);

  let out = poly([e, c, ct, et], '#302b40');
  out += poly([b, c, ct, bt], '#22202e');
  out += poly([at, bt, ct, et], color);

  if (detail) {
    for (let z = 14; z < height - 6; z += 18) {
      for (let q = 8; q < width - 3; q += 15) {
        const v = iso(x - width / 2 + q, y + depth / 2 + 0.2, z);
        out += `<path d="M${v[0]} ${v[1]}v-4l5 2.5v4z" fill="${color}" opacity="${(q + z) % 3 === 0 ? 0.52 : 0.2}" />`;
      }
      for (let q = 8; q < depth - 3; q += 15) {
        const v = iso(x + width / 2 + 0.2, y - depth / 2 + q, z);
        out += `<path d="M${v[0]} ${v[1]}v-4l-5 2.5v4z" fill="${color}" opacity=".25" />`;
      }
    }
  }

  return out;
}

function visible(project) {
  return filter === 'All districts' || project.district === filter;
}

function renderCity() {
  if (graph) dismissPlaque();
  document.querySelector('#city-svg').hidden = !graph;
  city3d.sync({
    selected,
    filter,
    showLinks,
    highlightProjects: navigatorProjectHighlights,
    highlightRelationships: navigatorRelationshipHighlights,
    graph,
  });
  if (graph) {
    renderSvgCity();
  } else {
    renderKeyboardList();
  }
  document.querySelector('#context-label').textContent = selectedProject()
    ? `${selectedProject().name} selected`
    : scope === 'district'
      ? `${activeDistrict} district — select a building`
      : 'City view';
  document.querySelector('#visible-count').textContent = `${filter} · ${projects.filter(visible).length} in view`;
}

function renderSvgCity() {
  // Data-driven graph framing: fit the plate and viewBox to the projected node bounds so the
  // layout scales with the city (archipelago coordinates span much wider than the original ten).
  // District Relationships tab: render the relationship subgraph (nodes incident to the
  // qualifying edges plus their external endpoints) instead of the full district population.
  const inRelationshipsTab = scope === 'district' && districtTab === 'relationships';
  const districtIds = scope === 'district' ? districtProjectIdSet() : null;
  let subgraphIds = null;
  if (inRelationshipsTab && districtIds) {
    subgraphIds = new Set(
      getDistrictRelationships(relationships, districtIds)
        .filter((relationship) =>
          districtRelFilter === 'all'
          || (districtRelFilter === 'sourced' && isApprovedSourcedRelationship(relationship))
          || (districtRelFilter === 'inferred' && (relationship.evidenceState === 'AI-inferred' || relationship.evidenceState === 'illustrative'))
          || (districtRelFilter === 'declared' && !isApprovedSourcedRelationship(relationship) && relationship.evidenceState !== 'AI-inferred' && relationship.evidenceState !== 'illustrative'))
        .flatMap((relationship) => [relationship.from, relationship.to]),
    );
  }
  const framedProjects = subgraphIds ? projects.filter((project) => subgraphIds.has(project.id)) : projects;
  // Schematic layout for the subgraph: real archipelago coordinates collapse a district
  // diagonal into one corner under the isometric projection, so the analytical view lays the
  // subgraph out deterministically instead — in-district nodes on an inner ring, external
  // endpoints on an outer ring (sorted ids, so the arrangement is stable).
  const layoutPositions = new Map();
  if (subgraphIds) {
    const inside = [...subgraphIds].filter((id) => districtIds.has(id)).sort();
    const outside = [...subgraphIds].filter((id) => !districtIds.has(id)).sort();
    inside.forEach((id, index) => {
      const angle = (index / Math.max(inside.length, 1)) * Math.PI * 2 - Math.PI / 2;
      layoutPositions.set(id, { x: Math.round(Math.cos(angle) * 140), y: Math.round(Math.sin(angle) * 70) });
    });
    outside.forEach((id, index) => {
      const angle = (index / Math.max(outside.length, 1)) * Math.PI * 2;
      layoutPositions.set(id, { x: Math.round(Math.cos(angle) * 290), y: Math.round(Math.sin(angle) * 145) });
    });
  }
  const projected = framedProjects.map((project) => {
    const layout = layoutPositions.get(project.id);
    return layout ? [layout.x, layout.y] : iso(project.x, project.y);
  });
  const bounds = {
    minX: Math.min(...projected.map(([x]) => x)),
    maxX: Math.max(...projected.map(([x]) => x)),
    minY: Math.min(...projected.map(([, y]) => y)),
    maxY: Math.max(...projected.map(([, y]) => y)),
  };
  const pad = 90;
  const plateHalfW = (bounds.maxX - bounds.minX) / 2 + pad;
  const plateHalfH = plateHalfW * 0.5;
  const plateCx = (bounds.maxX + bounds.minX) / 2;
  const plateCy = (bounds.maxY + bounds.minY) / 2;
  svgPlateCenter = { x: plateCx, y: plateCy };

  let out = `<path d="M${plateCx} ${plateCy - plateHalfH}L${plateCx + plateHalfW} ${plateCy} ${plateCx} ${plateCy + plateHalfH} ${plateCx - plateHalfW} ${plateCy}Z" fill="#111019" stroke="#2a2634" stroke-width="1" />`;

  if (showLinks) {
    relationships.forEach((relationship) => {
      if (subgraphIds && (!subgraphIds.has(relationship.from) || !subgraphIds.has(relationship.to))) return;
      const project = projects.find((item) => item.id === relationship.from);
      const connected = projects.find((item) => item.id === relationship.to);
      const evidenceState = RELATIONSHIP_STATES[relationship.evidenceState];
      // The map encodes only the provenance class (sourced / demo / inferred);
      // the exact evidence state stays in the title and data attributes.
      const sourcedEdge = isApprovedSourcedRelationship(relationship);
      const nonFactualEdge = relationship.evidenceState === 'AI-inferred' || relationship.evidenceState === 'illustrative';
      const lineColor = sourcedEdge ? '#8ebbd7' : nonFactualEdge ? '#9d81bd' : '#7d7490';
      const lineDash = nonFactualEdge ? '4 4' : '';
      const startLayout = layoutPositions?.get(project.id);
      const endLayout = layoutPositions?.get(connected.id);
      const start = startLayout ? [startLayout.x, startLayout.y] : iso(project.x, project.y, graph ? 20 : 2);
      const end = endLayout ? [endLayout.x, endLayout.y] : iso(connected.x, connected.y, graph ? 20 : 2);
      const active = relationship.from === selected || relationship.to === selected;
      const navigatorMatch = navigatorRelationshipHighlights.has(relationship.id);
      const pairVisible = subgraphIds ? true : visible(project) && visible(connected);
      const relationshipDisclosure = isApprovedSourcedRelationship(relationship)
        ? `Limited sourced relationship; exact evidence IDs: ${(relationship.evidenceIds || []).join(', ')}; ${relationship.claimStatus} claim status.`
        : relationship.dataMode === 'sourced-limited'
          ? 'Withheld review candidate; it is not displayed as source-backed support.'
          : 'Demo illustrative relationship; unavailable evidence placeholder.';
      const title = `${project.name} to ${connected.name}: ${RELATIONSHIP_TYPES[relationship.type].label}; ${evidenceState.label}; ${relationshipDisclosure}`;

      out += `<path class="relationship-line ${navigatorMatch ? 'navigator-match' : ''}" data-relationship="${relationship.id}" data-evidence-state="${relationship.evidenceState}" d="M${start} L${end}" fill="none" stroke="${lineColor}" stroke-width="${navigatorMatch ? 2.5 : active ? 1.8 : 0.7}" opacity="${pairVisible ? (navigatorMatch ? 1 : active ? 0.86 : 0.24) : 0.035}" ${lineDash ? `stroke-dasharray="${lineDash}"` : ''} vector-effect="non-scaling-stroke"><title>${title}</title></path>`;
    });
  }

  [...framedProjects]
    .sort((a, b) => a.x + a.y - (b.x + b.y))
    .forEach((project) => {
      const layout = layoutPositions?.get(project.id);
      const [x, y] = layout ? [layout.x, layout.y] : iso(project.x, project.y);
      const active = project.id === selected;
      const navigatorMatch = navigatorProjectHighlights.has(project.id);
      const external = Boolean(subgraphIds) && project.district !== activeDistrict;
      const isVisible = subgraphIds ? true : visible(project);
      const projectOpacity = isVisible ? (active || navigatorMatch ? 1 : navigatorProjectHighlights.size ? 0.48 : 0.78) : 0.1;
      const current = active ? ' aria-current="true"' : '';

      out += `<g class="building ${active ? 'active' : ''} ${navigatorMatch ? 'navigator-match' : ''}" data-id="${project.id}" tabindex="${isVisible ? 0 : -1}" role="button" aria-label="${project.name}, ${project.district}, status ${project.state}"${current} opacity="${projectOpacity}">`;

      if (!layout && (active || navigatorMatch)) {
        out += poly(
          [iso(project.x - 43, project.y - 43), iso(project.x + 43, project.y - 43), iso(project.x + 43, project.y + 43), iso(project.x - 43, project.y + 43)],
          navigatorMatch && !active ? '#9bc6ff0a' : '#b89cff09',
          navigatorMatch && !active ? '#a9d0ff' : '#d7c2ff',
          `stroke-width="${active ? 2 : 1.4}" vector-effect="non-scaling-stroke"`,
        );
      }

      if (!layout) {
        out += poly(
          [iso(project.x - 34, project.y - 34), iso(project.x + 34, project.y - 34), iso(project.x + 34, project.y + 34), iso(project.x - 34, project.y + 34)],
          active ? '#a98afa18' : '#44385312',
          active ? '#c8acff' : '#7161813d',
          `stroke-width="${active ? 1.5 : 0.8}" vector-effect="non-scaling-stroke"`,
        );
      }

      if (graph) {
        if (active) {
          out += `<circle cx="${x}" cy="${y - 20}" r="31" fill="none" stroke="#d7c2ff" stroke-width="2" vector-effect="non-scaling-stroke" />`;
        }
        out += `<circle cx="${x}" cy="${y - 20}" r="${active ? 25 : 22}" fill="#211e2b" stroke="${active ? '#d7c2ff' : project.color}" vector-effect="non-scaling-stroke" />`;
        out += `<text x="${x}" y="${y - 14}" fill="${active ? '#f3edff' : project.color}" font-size="19" text-anchor="middle">${project.abbr}</text>`;
      }

      const labelWidth = project.name.length * 7 + 24;
      const labelHeight = active ? 26 : 22;
      out += `<rect x="${x - labelWidth / 2}" y="${y + 11}" width="${labelWidth}" height="${labelHeight}" rx="5" fill="${active ? '#382b50' : '#121119e8'}" stroke="${active ? '#d1b9ff' : '#34303e'}" stroke-width="${active ? 1.4 : 0.8}" vector-effect="non-scaling-stroke" />`;
      out += `<text x="${x}" y="${y + (active ? 28 : 26)}" text-anchor="middle" fill="${active ? '#f5efff' : '#bbb4c5'}" font-size="${active ? 11.5 : 10.5}" font-weight="${active ? 650 : 500}">${project.name}</text>${external ? `<text x="${x}" y="${y + (active ? 41 : 39)}" text-anchor="middle" fill="#8f86a8" font-size="9">outside district</text>` : ''}`;
      out += '</g>';
    });

  document.querySelector('#world').innerHTML = out;
  // Subgraph mode insets the SVG to the zone between the floating panels (inline styles:
  // style.css is cached separately from main.js and a stale cache would drop the rule).
  // Desktop only — the narrow layout stacks panels below the city.
  const svgEl = document.querySelector('#city-svg');
  const desktopWide = window.matchMedia('(min-width: 941px)').matches;
  svgEl.classList.toggle('subgraph', Boolean(subgraphIds));
  if (subgraphIds && desktopWide) {
    svgEl.style.position = 'absolute';
    svgEl.style.left = '384px';
    svgEl.style.right = '320px';
    svgEl.style.top = '0px';
    svgEl.style.bottom = '0px';
    svgEl.style.width = 'auto';
    svgEl.style.height = 'auto';
  } else {
    svgEl.style.position = '';
    svgEl.style.left = '';
    svgEl.style.right = '';
    svgEl.style.top = '';
    svgEl.style.bottom = '';
    svgEl.style.width = '';
    svgEl.style.height = '';
  }
  if (graph && projects.length) {
    const vbMinX = plateCx - plateHalfW - 40;
    const vbMinY = plateCy - plateHalfH - 70;
    document.querySelector('#city-svg').setAttribute(
      'viewBox',
      `${vbMinX} ${vbMinY} ${plateHalfW * 2 + 80} ${plateHalfH * 2 + 140}`,
    );
  }
  transform();

  document.querySelectorAll('.building').forEach((element) => {
    element.onclick = () => select(element.dataset.id);
    element.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(element.dataset.id);
      }
    };
  });

  document.querySelector('#context-label').textContent = selectedProject()
    ? `${selectedProject().name} selected`
    : scope === 'district'
      ? `${activeDistrict} district — select a building`
      : 'City view';
  document.querySelector('#visible-count').textContent = `${filter} · ${projects.filter(visible).length} in view`;
}

function clearNavigatorHighlights() {
  navigatorProjectHighlights = new Set();
  navigatorRelationshipHighlights = new Set();
}

function select(id, { preserveNavigatorHighlights = false } = {}) {
  if (!preserveNavigatorHighlights) clearNavigatorHighlights();
  selected = id;
  dismissPlaque();
  if (!visible(selectedProject())) {
    filter = 'All districts';
    renderDistricts();
  }
  renderCity();
  renderPassport();
  setPassportExpanded(true);
}

function setMapView(view) {
  if (!view) return;
  graph = view === 'graph';
  document.querySelector('#graph-view').classList.toggle('selected', graph);
  document.querySelector('#city-view').classList.toggle('selected', !graph);
}

function focusProjectOnMap(id, { neighborhood = false } = {}) {
  const project = projectById(id);
  if (!project) return;
  if (!graph) {
    city3d.focusProject(id, { neighborhood });
    return;
  }
  const [x, y] = iso(project.x, project.y);
  zoom = neighborhood ? 1.16 : 1.32;
  offset = { x: (425 - x) * zoom, y: (390 - y) * zoom };
  transform();
}

function outcomeLabel(outcome) {
  return {
    results: 'Results',
    'insufficient-evidence': 'Evidence unavailable',
    'no-result': 'No result',
    'unsupported-request': 'Unsupported request',
    'invalid-query': 'Empty query',
  }[outcome] || 'Result';
}

function projectName(id) {
  return projectById(id)?.name || id;
}

function navigatorAvailabilityLabel(availability) {
  return {
    partial: 'Some sources unavailable',
    unavailable: 'Source unavailable',
    'source-only': 'Source available · no published timestamp',
    'source-and-timestamp': 'Source and timestamp available',
  }[availability] || 'Source availability unavailable';
}

// Retrieval references intentionally omit review metadata. Resolve only the
// review fields from the canonical approved runtime record after an exact ID
// match; an unknown record never inherits approval from its surrounding result.
function resolveNavigatorCitation(record) {
  const canonical = evidenceById.get(record?.id);
  if (!canonical || canonical.reviewStatus !== 'approved') return record;
  return {
    ...record,
    reviewStatus: canonical.reviewStatus,
    reviewedAt: canonical.reviewedAt,
  };
}

function renderNavigatorResult(result) {
  const container = document.querySelector('#navigator-result');

  const projectControls = result.selectedProjectIds.length
    ? result.selectedProjectIds
        .map((id) => `<button class="navigator-project" data-project="${escapeHtml(id)}">${escapeHtml(projectName(id))}${result.outOfScopeProjectIds?.includes(id) ? '<small class="navigator-outside">outside district</small>' : ''}<span>Open</span></button>`)
        .join('')
    : '<p class="navigator-empty">No project profiles were selected.</p>';
  const relationshipControls = result.relationshipContexts.length
    ? result.relationshipContexts
        .map((relationship) => {
          const type = RELATIONSHIP_TYPES[relationship.type]?.label || relationship.type;
          const activeRelationship = relationships.find((item) => item.id === relationship.id);
          const mode = isApprovedSourcedRelationship(activeRelationship) ? 'Approved snapshot' : 'Demo illustrative';
          const claim = relationship.claimStatus ? ` · ${relationship.claimStatus}` : '';
          return `<button class="navigator-relationship" data-relationship="${escapeHtml(relationship.id)}"><span>${escapeHtml(projectName(relationship.from))} ↔ ${escapeHtml(projectName(relationship.to))}</span><small>${escapeHtml(type)} · ${mode}${escapeHtml(claim)}</small></button>`;
        })
        .join('')
    : '<p class="navigator-empty">No typed relationships returned.</p>';
  const evidenceControls = result.evidenceReferences.length
    ? result.evidenceReferences
        .map((reference) => {
          const subject = reference.subjectKind === 'relationship'
            ? (relationships.find((item) => item.id === reference.subjectId) || {})
            : projectById(reference.subjectId);
          const label = reference.subjectKind === 'relationship'
            ? `${projectName(subject.from)} ↔ ${projectName(subject.to)}`
            : projectName(reference.subjectId);
          const sourceTitle = reference.source?.title || 'No source record';
          const records = (reference.records || []).map(resolveNavigatorCitation);
          const citations = records.length
            ? `<div class="navigator-citations">${records.map((record) => evidenceRecordCard(record, { compact: true })).join('')}</div>`
            : '';
          return `<details class="navigator-evidence"><summary><span>${escapeHtml(label)}</span><small>Approved snapshot · ${escapeHtml(navigatorAvailabilityLabel(reference.availability))} · ${escapeHtml(sourceTitle)}</small></summary>${citations}<button class="navigator-evidence-focus" data-evidence="${escapeHtml(reference.id)}">Focus ${reference.subjectKind === 'relationship' ? 'relationship' : 'project'}</button></details>`;
        })
        .join('')
    : '<p class="navigator-empty">No evidence references returned.</p>';
  const uncertainty = result.uncertainty.notes.length
    ? result.uncertainty.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')
    : '<li>No additional uncertainty was returned.</li>';
  const resultDetails = result.outcome === 'unsupported-request'
    ? ''
    : `
      <details class="navigator-details" open>
        <summary>Relevant projects <span>${result.selectedProjectIds.length}</span></summary>
        <div class="navigator-control-list">${projectControls}</div>
      </details>
      <details class="navigator-details">
        <summary>Typed relationships <span>${result.relationshipContexts.length}</span></summary>
        <div class="navigator-control-list">${relationshipControls}</div>
      </details>
      <details class="navigator-details">
        <summary>Evidence references <span>${result.evidenceReferences.length}</span></summary>
        <div class="navigator-control-list">${evidenceControls}</div>
      </details>
      <details class="navigator-details">
        <summary>Uncertainty <span>${escapeHtml(result.uncertainty.level)}</span></summary>
        <ul class="navigator-uncertainty">${uncertainty}</ul>
      </details>`;

  container.innerHTML = `
    <section class="navigator-result-card outcome-${escapeHtml(result.outcome)}" aria-label="Local Navigator result">
      <div class="navigator-result-heading">
        <span class="navigator-outcome">${escapeHtml(outcomeLabel(result.outcome))}</span>
      </div>
      <p class="navigator-answer">${escapeHtml(result.answer.text)}</p>
      <p class="navigator-next"><strong>Next:</strong> ${escapeHtml(result.answer.nextStep)}</p>
      ${resultDetails}
    </section>
  `;

  container.querySelectorAll('.navigator-project').forEach((element) => {
    element.onclick = () => {
      select(element.dataset.project, { preserveNavigatorHighlights: true });
      focusProjectOnMap(element.dataset.project);
    };
  });
  container.querySelectorAll('.navigator-relationship').forEach((element) => {
    element.onclick = () => focusNavigatorRelationship(element.dataset.relationship);
  });
  container.querySelectorAll('.navigator-evidence-focus').forEach((element) => {
    element.onclick = () => {
      const reference = result.evidenceReferences.find((item) => item.id === element.dataset.evidence);
      if (!reference) return;
      if (reference.subjectKind === 'relationship') {
        focusNavigatorRelationship(reference.subjectId);
      } else {
        select(reference.subjectId, { preserveNavigatorHighlights: true });
        focusProjectOnMap(reference.subjectId);
      }
    };
  });
  queueGroundedAnswer(result);
}

// Grounded AI layer: the deterministic result above renders instantly and stays the source
// of truth; the model only reformulates it with per-claim record citations. No configured
// key → no AI section at all, so default behavior is unchanged.
let groundedAiAbort = null;

function queueGroundedAnswer(result) {
  const card = document.querySelector('#navigator-result .navigator-result-card');
  if (!card) return;
  if (groundedAiAbort) groundedAiAbort.abort();
  const settings = loadAiSettings();
  if (!aiEnabled(settings) || result.outcome === 'unsupported-request') return;
  const mount = document.createElement('section');
  mount.className = 'navigator-ai';
  mount.innerHTML = '<p class="navigator-ai-status">Grounded AI · reformulating the exact records…</p>';
  card.append(mount);
  groundedAiAbort = new AbortController();
  const { signal } = groundedAiAbort;
  groundAnswer({ result, projects, relationships, settings, signal })
    .then(({ text, model }) => {
      if (signal.aborted) return;
      mount.innerHTML = `
        <p class="navigator-ai-label">AI-inferred answer · model ${escapeHtml(model)}</p>
        <p class="navigator-ai-text">${escapeHtml(text)}</p>
        <p class="navigator-ai-note">Reformulated from the exact records above; every claim carries its record ID. The deterministic result remains the source of truth.</p>`;
    })
    .catch((error) => {
      if (signal.aborted || error?.name === 'AbortError') return;
      mount.innerHTML = `
        <p class="navigator-ai-label">Grounded AI unavailable</p>
        <p class="navigator-ai-status">${escapeHtml(error?.message || 'Unknown error')}</p>
        <p class="navigator-ai-note">The deterministic result above is unaffected.</p>`;
    });
}

function reflectAiState() {
  const settings = loadAiSettings();
  document.querySelector('#ai-state').textContent = aiEnabled(settings)
    ? `on · ${settings.model}`
    : 'off';
}

function initAiPanel() {
  const form = document.querySelector('#ai-form');
  const settings = loadAiSettings();
  document.querySelector('#ai-base-url').value = settings.baseUrl;
  document.querySelector('#ai-model').value = settings.model;
  document.querySelector('#ai-key').value = settings.apiKey;
  reflectAiState();
  form.onsubmit = (event) => {
    event.preventDefault();
    saveAiSettings({
      baseUrl: document.querySelector('#ai-base-url').value.trim(),
      model: document.querySelector('#ai-model').value.trim(),
      apiKey: document.querySelector('#ai-key').value.trim(),
    });
    reflectAiState();
  };
}

function focusNavigatorRelationship(id) {
  const relationship = relationships.find((item) => item.id === id);
  if (!relationship) return;
  setMapView('graph');
  showLinks = true;
  document.querySelector('#links-toggle').setAttribute('aria-pressed', 'true');
  navigatorProjectHighlights = new Set([relationship.from, relationship.to]);
  navigatorRelationshipHighlights = new Set([relationship.id]);
  selected = relationship.from;
  filter = 'All districts';
  renderDistricts();
  renderCity();
  renderPassport();
  focusProjectOnMap(relationship.from, { neighborhood: true });
}

function applyNavigatorMapAction(result) {
  const action = result.mapAction;

  if (action.type === 'preserve-view') {
    return;
  }

  clearNavigatorHighlights();
  navigatorProjectHighlights = new Set(action.highlightProjectIds);
  navigatorRelationshipHighlights = new Set(action.highlightRelationshipIds);
  if (navigatorRelationshipHighlights.size) {
    showLinks = true;
    document.querySelector('#links-toggle').setAttribute('aria-pressed', 'true');
  }
  setMapView(action.view);
  if (action.type === 'focus-district' && action.district) {
    filter = action.district;
    zoom = 1;
    offset = { x: 0, y: 0 };
    if (action.openPassportProjectId) {
      selected = action.openPassportProjectId;
    }
  } else if (action.openPassportProjectId) {
    filter = 'All districts';
    selected = action.openPassportProjectId;
  }

  renderDistricts();
  renderCity();
  renderPassport();
  // A search that opens a single passport also expands the panel — otherwise the updated
  // passport stays hidden behind the collapsed drawer the result just advertised.
  if (action.openPassportProjectId) setPassportExpanded(true);
  if (action.focusProjectId && action.type !== 'focus-district') {
    focusProjectOnMap(action.focusProjectId, {
      neighborhood: action.type === 'focus-neighborhood',
    });
  }
}

function runNavigatorSearch(value) {
  const result = retrieveNavigator({
    query: value,
    projects,
    relationships,
    evidenceRecords,
    contextProjectIds: selected ? [selected] : [],
    districtScope: scope === 'district' ? activeDistrict : null,
  });
  applyNavigatorMapAction(result);
  renderNavigatorResult(result);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Not published / unavailable';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatSnapshotDate(timestamp) {
  if (!timestamp) return 'Unavailable';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(timestamp));
}

function reviewStatusLabel(status) {
  return {
    approved: 'Approved for snapshot',
    proposed: 'Proposed · withheld',
    'needs-review': 'Needs review · withheld',
    rejected: 'Rejected · withheld',
    stale: 'Stale · withheld',
  }[status] || 'Review state unavailable · withheld';
}

function canRenderAsApprovedEvidence(record) {
  return record?.reviewStatus === 'approved';
}

function formatConfidence(confidence) {
  return confidence === 'not-assessed' ? 'Not assessed' : confidence;
}

function qualityFlags(quality = {}) {
  const flags = ['conflict', 'incomplete', 'stale', 'unavailable'].filter((flag) => quality[flag]);
  return flags.length ? flags.map((flag) => `<span class="quality-flag ${flag}">${escapeHtml(flag)}</span>`).join('') : '<span class="quality-neutral">No recorded warning · not a trust mark.</span>';
}

function governanceRow(subjectKind, subjectId) {
  return governanceRowBySubjectId.get(`${subjectKind}:${subjectId}`) || null;
}

function governanceState(row) {
  if (!row) return '<span class="governance-state unavailable">Governance unavailable</span>';
  return `<span class="governance-state ${row.reviewDue ? 'due' : 'current'}">Review ${row.reviewDue ? 'due' : 'current'}</span>`;
}

function governanceDetails(subjectKind, subjectId) {
  const row = governanceRow(subjectKind, subjectId);
  const decision = governanceDecisionBySubject.get(`${subjectKind}:${subjectId}`);
  if (!row || !decision) return '<span class="governance-note">Governance metadata unavailable; this does not change the evidence review state.</span>';
  return `<div class="governance-details">
    <div><span>Cadence</span><strong>${governanceState(row)}</strong><small>Next review ${escapeHtml(formatSnapshotDate(row.nextReviewAt))}</small></div>
    <div><span>Review action</span><strong>${escapeHtml(decision.reviewerRole)}</strong><small>${escapeHtml(decision.reviewMethod)} · ${escapeHtml(decision.reviewerRef)}</small></div>
    <p>Reviewer metadata records the review action only. It is not authentication, source truth, freshness proof, endorsement, safety, legitimacy, activity, or onchain verification.</p>
  </div>`;
}

function evidenceRecordCard(record, { compact = false } = {}) {
  if (!canRenderAsApprovedEvidence(record)) {
    const status = record?.reviewStatus || 'unavailable';
    return `<article class="withheld-evidence ${compact ? 'citation-record' : 'exact-evidence-record'}"><div class="evidence-record-heading"><code>${escapeHtml(record?.id || 'WITHHELD')}</code><span class="review-status withheld">${escapeHtml(reviewStatusLabel(status))}</span></div><p class="evidence-claim">This candidate is withheld from the approved source-backed snapshot. It is not presented as support.</p></article>`;
  }
  const source = record.source || {};
  const sourceLink = source.url && source.available
    ? `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title || 'Open source')} <span aria-hidden="true">↗</span></a>`
    : `<span class="evidence-availability unavailable">${escapeHtml(source.title || 'No source record')}</span>`;
  const limitations = (record.limitations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No limitations were supplied.</li>';
  const reviewGovernanceRow = governanceRow('evidence', record.id);
  if (compact) {
    return `<article class="citation-record"><strong>${escapeHtml(record.id)}</strong><span class="citation-status">${escapeHtml(record.status || 'Unavailable')} · ${escapeHtml(record.supportMode || 'unavailable-only')}</span><span class="review-status approved">${escapeHtml(reviewStatusLabel(record.reviewStatus))}</span>${governanceState(reviewGovernanceRow)}${sourceLink}<p>${escapeHtml(record.scope || record.supportedProposition || 'Evidence record unavailable.')}</p><div class="quality-flags">${qualityFlags(record.quality)}</div></article>`;
  }
  return `
    <article class="exact-evidence-record">
      <p class="evidence-claim">${escapeHtml(record.claim || record.supportedProposition || 'Evidence record unavailable.')}</p>
      <div class="evidence-meta">
        <span class="evidence-state-word">${escapeHtml(record.status || 'Unavailable')}</span>
        ${sourceLink}
      </div>
      <details class="record-audit">
        <summary>Inspect full record</summary>
        <dl class="evidence-list">
          <div><dt>Record</dt><dd>${escapeHtml(record.id)}</dd></div>
          <div><dt>Claim type</dt><dd>${escapeHtml(record.evidenceType || 'Unavailable')}</dd></div>
          <div><dt>Snapshot review</dt><dd><span class="review-status approved">${escapeHtml(reviewStatusLabel(record.reviewStatus))}</span>${record.reviewedAt ? `<br />${escapeHtml(formatTimestamp(record.reviewedAt))}` : ''}</dd></div>
          <div><dt>Governance</dt><dd>${governanceState(reviewGovernanceRow)}${reviewGovernanceRow ? `<br /><span class="support-note">Next review ${escapeHtml(formatSnapshotDate(reviewGovernanceRow.nextReviewAt))}</span>` : ''}</dd></div>
          <div><dt>Review action</dt><dd>${governanceDetails('evidence', record.id)}</dd></div>
          <div><dt>Support</dt><dd>${escapeHtml(record.supportMode || 'unavailable-only')}<br /><span class="support-note">${escapeHtml(record.supportedProposition || record.scope || '')}</span></dd></div>
          <div><dt>Source</dt><dd>${sourceLink}</dd></div>
          <div><dt>Publisher</dt><dd>${escapeHtml(source.publisher || 'Unavailable')}</dd></div>
          <div><dt>Retrieved</dt><dd>${formatTimestamp(record.retrievedAt)}</dd></div>
          <div><dt>Published</dt><dd>${formatTimestamp(record.publishedAt)}</dd></div>
          <div><dt>Network</dt><dd>${escapeHtml(record.network?.name || 'Unavailable')}${record.network?.chainId ? ` · chain ${escapeHtml(record.network.chainId)}` : ''}</dd></div>
          <div><dt>Scope</dt><dd>${escapeHtml(record.scope || 'Unavailable')}</dd></div>
          <div><dt>Provenance</dt><dd>${escapeHtml(record.provenance?.notes || record.provenanceNotes || 'Unavailable')}</dd></div>
          <div><dt>Reference</dt><dd>${escapeHtml(source.referenceType || 'Unavailable')}${source.presentationMutable === true ? ' · presentation may change' : ''}</dd></div>
          <div><dt>Quality</dt><dd><div class="quality-flags">${qualityFlags(record.quality)}</div></dd></div>
          <div><dt>Time-bound</dt><dd>${record.quality?.timeBoundEligible ? 'Eligible only for this exact dated scope; it does not establish current activity.' : 'Not eligible for a time-bound claim.'}</dd></div>
          <div><dt>Limitations</dt><dd><ul class="limitations-list">${limitations}</ul></dd></div>
          <div><dt>Data mode</dt><dd><span class="sourced-value">LIMITED SOURCED</span> Exact claim only; not a project-wide trust badge.</dd></div>
        </dl>
      </details>
    </article>`;
}

function evidenceList(evidence) {
  return `
    <dl class="evidence-list">
      <div>
        <dt>Source</dt>
        <dd>
          <span class="evidence-availability unavailable">No source record</span>
          ${escapeHtml(evidence.source.title)}
        </dd>
      </div>
      <div>
        <dt>Timestamp</dt>
        <dd>${formatTimestamp(evidence.timestamp)}</dd>
      </div>
      <div class="evidence-scope">
        <dt>Scope</dt>
        <dd>${escapeHtml(evidence.scope)}</dd>
      </div>
      <div>
        <dt>Provenance</dt>
        <dd>${escapeHtml(evidence.provenance.label)}</dd>
      </div>
      <div>
        <dt>Confidence</dt>
        <dd>${formatConfidence(evidence.confidence)}</dd>
      </div>
      <div>
        <dt>Data mode</dt>
        <dd>Illustrative profile; no source connected</dd>
      </div>
    </dl>
  `;
}

function renderPassport() {
  if (scope === 'district' && !selected) {
    renderDistrictLens();
    return;
  }
  const project = selectedProject();
  if (!project) return;
  const projectRecords = evidenceForProject(project.id);
  const connections = relationshipsForProject(project.id).map((relationship) => ({
    relationship,
    project: connectedProject(relationship, project.id),
  }));

  document.querySelector('#passport').innerHTML = `
    <div class="passport-head">
      <div class="passport-title-row">
        ${scope === 'district' ? '<button type="button" class="lens-back" id="back-to-lens" aria-label="Back to District Lens">‹ District</button>' : ''}
        <h2>${project.name}</h2>
        <button class="panel-collapse" id="passport-collapse" aria-expanded="true" aria-label="Collapse project passport">—</button>
      </div>
      <p class="passport-subtitle">${project.type}, ${project.district} district</p>
      <p class="project-description">${project.description}</p>
      <div class="project-actions">
        ${
          project.site
            ? `<a href="https://${project.site}" target="_blank" rel="noopener noreferrer">Open website <span>↗</span></a>`
            : '<span class="mock-site">Concept profile — no public site</span>'
        }
        <button id="focus-project" aria-label="Focus ${project.name} on map">⌖</button>
      </div>
    </div>

    <div class="passport-body">
      <div class="sec">Status</div>
      ${projectRecords.length
        ? '<div class="item"><b>Source-backed</b><span>Exact records below; each carries its own status and cited scope.</span></div>'
        : `<div class="item"><b>${project.state}</b><span>${escapeHtml(STATUS_COPY[project.state] || '')}</span></div>`}

      <div class="sec sec-row">
        <span>Evidence</span>
        <button class="info" id="trust-info" title="Open evidence-state definitions" aria-label="Open evidence-state definitions">ⓘ</button>
      </div>
      ${projectRecords.length ? `<div class="exact-evidence-list">${projectRecords.map((record) => evidenceRecordCard(record)).join('')}</div>` : `<div class="evidence-panel project-evidence">${evidenceList(project.evidence)}</div>`}

      <div class="sec">Relationships</div>
      <div class="connections">
        ${connections
          .map(({ relationship, project: connected }) => {
            const evidenceState = RELATIONSHIP_STATES[relationship.evidenceState];
            const relationshipType = RELATIONSHIP_TYPES[relationship.type];
            const evidenceClass = stateClass(relationship.evidenceState);
            const sourced = isApprovedSourcedRelationship(relationship);
            const records = evidenceForRelationship(relationship);
            const label = sourced ? 'Sourced' : evidenceState.shortLabel;
            return `
              <article class="relationship-card ${evidenceClass} ${sourced ? 'sourced-relationship' : ''}" data-relationship="${relationship.id}">
                <button class="connection" data-project="${connected.id}">
                  <span class="connection-logo" style="color:${connected.color}">${connected.abbr}</span>
                  <span class="connection-copy">
                    <strong>${connected.name}</strong>
                    <small>${relationshipType.label}</small>
                  </span>
                  <span class="connection-state ${evidenceClass}">${escapeHtml(label)}</span>
                  <span class="connection-arrow" aria-hidden="true">↗</span>
                </button>
                <details class="relationship-evidence">
                  <summary>
                    <span>Inspect evidence</span>
                    <span class="summary-state">${sourced ? `${relationship.claimStatus} · ${relationship.evidenceState}` : evidenceState.label}</span>
                  </summary>
                  <p class="evidence-meaning">${sourced ? `This relationship is a limited source-backed ${relationship.claimStatus} claim. It is not a global verification, endorsement, or current-operation statement.` : evidenceState.meaning}</p>
                  <div class="relationship-type">
                    <span>Relationship type</span>
                    <strong>${relationshipType.label}</strong>
                    <code>${relationship.type}</code>
                  </div>
                  ${sourced ? `<div class="relationship-evidence-ids"><strong>Exact evidence IDs</strong><span>${relationship.evidenceIds.map(escapeHtml).join(', ')}</span></div><p class="relationship-scope">${escapeHtml(relationship.scope)}</p>${governanceDetails('relationship', relationship.id)}<div class="exact-evidence-list">${records.map((record) => evidenceRecordCard(record)).join('')}</div>` : evidenceList(relationship)}
                </details>
              </article>
            `;
          })
          .join('')}
      </div>

      <details class="snapshot-audit">
        <summary>Snapshot &amp; governance audit <span>${escapeHtml(evidenceSnapshot.version)}</span></summary>
        <div class="passport-snapshot">
          <span>APPROVED SNAPSHOT</span>
          <strong>${escapeHtml(evidenceSnapshot.version)}</strong>
          <small>Created ${escapeHtml(formatSnapshotDate(evidenceSnapshot.createdAt))} · reviewed ${escapeHtml(formatSnapshotDate(evidenceSnapshot.reviewedAt))}</small>
          <small>Policy ${escapeHtml(REVIEW_GOVERNANCE_POLICY_VERSION)} · as of <code>${escapeHtml(REVIEW_GOVERNANCE_AS_OF)}</code></small>
          <small>${reviewGovernance.summary.reviewCurrent} review current · ${reviewGovernance.summary.reviewDue} due across ${reviewGovernance.summary.subjects} governed subjects</small>
        </div>
      </details>

      <p class="passport-note">States apply to their exact cited scope.</p>
    </div>
  `;

  document.querySelectorAll('.connection').forEach((element) => {
    element.onclick = () => select(element.dataset.project);
  });

  document.querySelector('#focus-project').onclick = () => {
    focusProjectOnMap(project.id);
  };

  document.querySelector('#trust-info').onclick = () => document.querySelector('#about-dialog').showModal();

  document.querySelector('#back-to-lens')?.addEventListener('click', () => {
    selected = null;
    renderPassport();
  });
}

// ---- District experience (spec: docs/DISTRICT_EXPERIENCE_SPEC.md) ----
// One shared renderer driven by src/districts.js. A district is a lens on the same city:
// same scene, same passports, same evidence semantics. Placement stays illustrative;
// every visible count derives from data. Cluster membership never implies a relationship.

const CITY_PROMPTS = [...document.querySelectorAll('.prompt')].map((element) => element.dataset.prompt);

function districtConfig() {
  return activeDistrict ? DISTRICT_EXPERIENCES[activeDistrict] ?? null : null;
}

function districtProjectIdSet() {
  return new Set(getDistrictProjects(projects, activeDistrict).map((project) => project.id));
}

// The Evidence tab is shown only when the district carries source-backed records: an empty
// inspection layer reads as a broken screen, not as honesty (owner decision 2026-09-29).
function districtHasEvidence() {
  if (!activeDistrict) return false;
  const districtIds = districtProjectIdSet();
  return evidenceRecords.some((record) => districtIds.has(record.projectId) && record.reviewStatus === 'approved');
}

function projectIsSourceBacked(project) {
  return evidenceForProject(project.id).some((record) => record.reviewStatus === 'approved');
}

function districtStatusLabel(project) {
  return projectIsSourceBacked(project) ? 'Source-backed' : 'Illustrative';
}

function districtModeProjects(list) {
  if (districtEvidenceMode === 'source-backed') return list.filter(projectIsSourceBacked);
  if (districtEvidenceMode === 'demo') return list.filter((project) => !projectIsSourceBacked(project));
  return list;
}

function setNavigatorContext() {
  const config = districtConfig();
  const search = document.querySelector('#search');
  if (search) search.placeholder = config ? 'Ask this district…' : 'Ask the project graph';
  document.querySelectorAll('.prompt').forEach((element, index) => {
    const prompt = config ? config.prompts[index] ?? null : CITY_PROMPTS[index] ?? null;
    if (prompt) {
      element.dataset.prompt = prompt;
      const label = element.querySelector('span');
      if (label) label.textContent = prompt;
      element.hidden = false;
    } else {
      element.hidden = true;
    }
  });
}

function renderDistrictBar() {
  const config = districtConfig();
  const bar = document.querySelector('#district-bar');
  bar.hidden = scope !== 'district';
  // Left panel becomes the contextual District Navigator in district scope (spec §5.1):
  // district identity, local menu, then the existing search/prompts/world switcher.
  const headTitle = document.querySelector('.navigator-head h1');
  const identity = document.querySelector('#district-identity');
  if (!config) {
    if (headTitle) headTitle.textContent = 'AI Navigator';
    identity?.remove();
    return;
  }
  document.documentElement.style.setProperty('--district-accent', config.accent);
  document.querySelector('#crumb-district').textContent = `${config.glyph} ${activeDistrict}`;
  const tabs = document.querySelector('#district-tabs');
  const visibleTabs = DISTRICT_TABS.filter((tab) => tab.id !== 'evidence' || districtHasEvidence());
  tabs.innerHTML = visibleTabs.map((tab) => `
    <button type="button" role="tab" aria-selected="${districtTab === tab.id}"
      class="district-tab ${districtTab === tab.id ? 'active' : ''}"
      data-tab="${tab.id}" tabindex="${districtTab === tab.id ? 0 : -1}">${tab.label}</button>
  `).join('');
  tabs.querySelectorAll('.district-tab').forEach((element) => {
    element.onclick = () => applyDistrictTab(element.dataset.tab);
    element.onkeydown = districtTabKeydown;
  });
  if (headTitle) headTitle.textContent = config.title;
  if (!identity) {
    const block = document.createElement('div');
    block.className = 'district-identity';
    block.id = 'district-identity';
    block.innerHTML = `
      <p class="district-id-sub">${escapeHtml(config.subtitle)}</p>
      <nav class="district-menu" aria-label="District sections">
        <button type="button" data-tab="overview" class="${districtTab === 'overview' ? 'active' : ''}"><span class="menu-glyph" aria-hidden="true">▙</span> District overview <b aria-hidden="true">›</b></button>
        <button type="button" data-tab="projects" class="${districtTab === 'projects' ? 'active' : ''}"><span class="menu-glyph" aria-hidden="true">▦</span> Project index <b aria-hidden="true">›</b></button>
        <button type="button" data-tab="relationships" class="${districtTab === 'relationships' ? 'active' : ''}"><span class="menu-glyph" aria-hidden="true">⇄</span> Relationships <b aria-hidden="true">›</b></button>
        ${districtHasEvidence() ? `<button type="button" data-tab="evidence" class="${districtTab === 'evidence' ? 'active' : ''}"><span class="menu-glyph" aria-hidden="true">▤</span> Evidence coverage <b aria-hidden="true">›</b></button>` : ''}
      </nav>
      <p class="district-id-note">A focused view of ${escapeHtml(activeDistrict)} projects and their connections in Monad.</p>`;
    document.querySelector('#navigator-body').prepend(block);
  } else {
    identity.querySelectorAll('.district-menu button').forEach((element) => {
      element.classList.toggle('active', element.dataset.tab === districtTab);
    });
  }
}

function districtTabKeydown(event) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const ids = DISTRICT_TABS.map((tab) => tab.id);
  const index = ids.indexOf(districtTab);
  const next = event.key === 'ArrowRight' ? (index + 1) % ids.length : (index + ids.length - 1) % ids.length;
  applyDistrictTab(ids[next]);
  document.querySelector(`[data-tab="${ids[next]}"]`)?.focus();
  event.preventDefault();
}

function applyDistrictTab(tab) {
  // districtTab is NOT mutated here: the hash is the source of truth, and applyRoute must
  // see the PREVIOUS tab to restore the city view when leaving the Relationships graph.
  if (scope !== 'district' || !DISTRICT_TABS.some((entry) => entry.id === tab)) return;
  const target = `#/district/${districtSlug(activeDistrict)}/${tab}`;
  if (location.hash === target) applyRoute();
  else location.hash = target;
}

function routeHash() {
  if (scope !== 'district' || !activeDistrict) return '#/city';
  return `#/district/${districtSlug(activeDistrict)}/${districtTab}`;
}

function navigateToDistrict(district, { tab = 'overview' } = {}) {
  const config = DISTRICT_EXPERIENCES[district];
  if (!config) return;
  const targetHash = `#/district/${config.slug}/${tab}`;
  if (location.hash === targetHash) applyRoute();
  else location.hash = targetHash;
}

function returnToCity() {
  if (!location.hash || location.hash === '#/city') applyRoute();
  else location.hash = '#/city';
}

function parseHash(hash) {
  const parts = String(hash ?? '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0 || parts[0] === 'city') return { scope: 'city' };
  if (parts[0] === 'district' && parts[1]) {
    const district = districtBySlug(parts[1]);
    if (!district) return null;
    const tab = DISTRICT_TABS.some((entry) => entry.id === parts[2]) ? parts[2] : 'overview';
    return { scope: 'district', district, tab };
  }
  return null;
}

function renderPlaque() {
  document.querySelector('#district-plaque')?.remove();
  const config = districtConfig();
  if (!config || districtPlaqueDismissed) return;
  const plaque = document.createElement('div');
  plaque.className = 'district-plaque';
  plaque.id = 'district-plaque';
  plaque.innerHTML = `
    <div class="plaque-glyph" style="color:${config.accent}">${config.glyph}</div>
    <div class="plaque-title">${escapeHtml(activeDistrict.toUpperCase())}</div>
    <div class="plaque-tag">Explore the local project graph</div>`;
  document.querySelector('#city-stage').appendChild(plaque);
}

function dismissPlaque() {
  districtPlaqueDismissed = true;
  document.querySelector('#district-plaque')?.remove();
}

function lensCubeSvg(color) {
  return `<svg class="lens-cube" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 20 7.5 12 12 4 7.5Z" fill="${color}" opacity="0.85"/>
    <path d="M4 7.5 12 12v9L4 16.5Z" fill="${color}" opacity="0.45"/>
    <path d="M20 7.5 12 12v9l8-4.5Z" fill="${color}" opacity="0.65"/>
  </svg>`;
}

// Mini node-link diagram for the district's relationships (Overview tab). In-district nodes
// sit on the right, external endpoints on the left; sourced edges are solid, illustrative
// dashed. Every edge resolves to a real relationship record.
function lensRelationshipDiagram(config, districtIds) {
  const rels = getDistrictRelationships(relationships, districtIds);
  if (rels.length === 0) {
    return '<div class="item"><b>No relationship records touch this district yet</b><span>Connections appear only from relationship records — never from proximity.</span></div>';
  }
  const shown = rels.slice(0, 8);
  const externalNames = [];
  const insideNames = [];
  const nameOf = (id) => projectById(id)?.name ?? id;
  shown.forEach((relationship) => {
    if (!districtIds.has(relationship.from)) externalNames.push(nameOf(relationship.from));
    if (!districtIds.has(relationship.to)) externalNames.push(nameOf(relationship.to));
    if (districtIds.has(relationship.from)) insideNames.push(nameOf(relationship.from));
    if (districtIds.has(relationship.to)) insideNames.push(nameOf(relationship.to));
  });
  const externals = [...new Set(externalNames)];
  const insides = [...new Set(insideNames)];
  const rowH = 34;
  const height = Math.max(externals.length, insides.length) * rowH + 12;
  const leftY = (index) => 10 + index * rowH + rowH / 2;
  const rightY = (index) => 10 + index * rowH + rowH / 2;
  const lines = shown.map((relationship) => {
    const from = nameOf(relationship.from);
    const to = nameOf(relationship.to);
    const fromExternal = !districtIds.has(relationship.from);
    const label = fromExternal ? from : to;
    const li = (fromExternal ? externals : insides).indexOf(label);
    const ri = (fromExternal ? insides : externals).indexOf(fromExternal ? to : from);
    if (li < 0 || ri < 0) return '';
    const sourced = isApprovedSourcedRelationship(relationship);
    return `<line x1="96" y1="${leftY(li)}" x2="204" y2="${rightY(ri)}" stroke="${sourced ? '#c9c0e0' : '#5d5478'}" stroke-width="1.4" ${sourced ? '' : 'stroke-dasharray="4 3"'}/>`;
  }).join('');
  const nodeRect = (x, y, label) => {
    const truncated = label.length > 15 ? label.slice(0, 14) + '…' : label;
    return `<rect x="${x}" y="${y - 12}" width="100" height="24" rx="5" fill="rgba(232,226,244,0.07)" stroke="rgba(232,226,244,0.18)"/>
      <text x="${x + 50}" y="${y + 4}" text-anchor="middle" font-size="11" fill="#e8e2f4">${escapeHtml(truncated)}</text>`;
  };
  const leftNodes = externals.map((label, index) => nodeRect(0, leftY(index), label)).join('');
  const rightNodes = insides.map((label, index) => nodeRect(200, rightY(index), label)).join('');
  const moreNote = rels.length > shown.length ? `<p class="lens-muted">+ ${rels.length - shown.length} more relationship records in the Relationships tab.</p>` : '';
  return `
    <div class="lens-diagram">
      <svg viewBox="0 0 300 ${height}" width="100%" height="${height}" role="img" aria-label="District relationship diagram">
        ${lines}${leftNodes}${rightNodes}
      </svg>
      <div class="lens-legend">
        <span><i class="line-solid"></i> Sourced</span>
        <span><i class="line-dashed"></i> Illustrative</span>
      </div>
      ${moreNote}
    </div>`;
}

function lensModeButtons() {
  return `
    <div class="sec">Evidence mode</div>
    <div class="lens-modes" role="group" aria-label="Evidence mode">
      <button type="button" data-mode="all" aria-pressed="${districtEvidenceMode === 'all'}">All</button>
      <button type="button" data-mode="source-backed" aria-pressed="${districtEvidenceMode === 'source-backed'}">With cited evidence</button>
      <button type="button" data-mode="demo" aria-pressed="${districtEvidenceMode === 'demo'}">Illustrative profiles</button>
    </div>`;
}

function lensRelRow(relationship, districtIds) {
  const type = RELATIONSHIP_TYPES[relationship.type];
  const state = RELATIONSHIP_STATES[relationship.evidenceState];
  const sourced = isApprovedSourcedRelationship(relationship);
  const fromIn = districtIds.has(relationship.from);
  const toIn = districtIds.has(relationship.to);
  const external = [
    fromIn ? null : projectById(relationship.from)?.name ?? relationship.from,
    toIn ? null : projectById(relationship.to)?.name ?? relationship.to,
  ].filter(Boolean);
  const records = evidenceForRelationship(relationship);
  const selected = districtSelectedEdgeId === relationship.id;
  return `
    <div class="lens-rel ${selected ? 'selected' : ''}">
      <button type="button" class="lens-rel-row" data-rel="${relationship.id}">
        <b>${escapeHtml(projectById(relationship.from)?.name ?? relationship.from)} ↔ ${escapeHtml(projectById(relationship.to)?.name ?? relationship.to)}</b>
        <span>${escapeHtml(type?.label ?? relationship.type)} — ${sourced ? `Sourced · ${relationship.claimStatus}` : escapeHtml(state?.shortLabel ?? relationship.evidenceState)}${external.length ? ` · outside district: ${escapeHtml(external.join(', '))}` : ''}</span>
      </button>
      ${selected ? `<div class="lens-rel-details">
        <p class="lens-muted">${sourced
          ? 'Limited source-backed claim; supports only its cited scope — not verification, endorsement, or current operation.'
          : escapeHtml(state?.meaning ?? 'Illustrative presentation; asserts no factual relationship.')}</p>
        ${sourced ? `<div class="relationship-evidence-ids"><strong>Exact evidence IDs</strong><span>${relationship.evidenceIds.map(escapeHtml).join(', ')}</span></div>
        <p class="relationship-scope">${escapeHtml(relationship.scope)}</p>
        ${governanceDetails('relationship', relationship.id)}
        <div class="exact-evidence-list">${records.map((record) => evidenceRecordCard(record, { compact: true })).join('')}</div>` : evidenceList(relationship)}
      </div>` : ''}
    </div>`;
}

function lensRelationshipsSection(districtIds) {
  const rels = getDistrictRelationships(relationships, districtIds);
  if (rels.length === 0) {
    return `
      <div class="sec">Relationships</div>
      <div class="item"><b>No relationship records touch this district yet</b><span>Connections appear only from relationship records — never from proximity or shared category.</span></div>`;
  }
  const rows = rels
    .filter((relationship) => districtRelFilter === 'all'
      || (districtRelFilter === 'sourced' && isApprovedSourcedRelationship(relationship))
      || (districtRelFilter === 'inferred' && (relationship.evidenceState === 'AI-inferred' || relationship.evidenceState === 'illustrative'))
      || (districtRelFilter === 'declared' && !isApprovedSourcedRelationship(relationship) && relationship.evidenceState !== 'AI-inferred' && relationship.evidenceState !== 'illustrative'))
    .map((relationship) => lensRelRow(relationship, districtIds))
    .join('');
  return `
    <div class="sec">Relationships</div>
    <div class="lens-modes" role="group" aria-label="Relationship evidence filter">
      <button type="button" data-relfilter="all" aria-pressed="${districtRelFilter === 'all'}">All</button>
      <button type="button" data-relfilter="sourced" aria-pressed="${districtRelFilter === 'sourced'}">Sourced</button>
      <button type="button" data-relfilter="declared" aria-pressed="${districtRelFilter === 'declared'}">Declared</button>
      <button type="button" data-relfilter="inferred" aria-pressed="${districtRelFilter === 'inferred'}">AI-inferred</button>
    </div>
    ${rows || '<div class="item"><b>No relationships in this class</b><span>Switch the filter to see other classes.</span></div>'}
    <p class="lens-muted">The graph shows in-district projects plus directly connected external endpoints. Proximity never implies a relationship.</p>`;
}

function lensCoverageSection(coverage) {
  return `
    <div class="sec">Coverage</div>
    <div class="lens-facts">
      <div class="item"><b>${plural(coverage.totalProjects, 'project')}</b><span>in this district view</span></div>
      <div class="item"><b>${coverage.sourceBackedProjects} with source-backed records</b><span>${plural(coverage.illustrativeProjects, 'illustrative profile')}</span></div>
      <div class="item"><b>${plural(coverage.relationships, 'relationship')}</b><span>${coverage.sourcedRelationships} sourced · ${coverage.illustrativeRelationships} illustrative or AI-inferred</span></div>
      ${coverage.warningRecords ? `<div class="item"><b>${plural(coverage.warningRecords, 'record')} with warnings</b><span>stale, conflicting, incomplete, or unavailable flags stay visible</span></div>` : ''}
    </div>`;
}

function lensOverviewHtml(config, districtProjectsList, coverage, districtIds) {
  const matches = [...navigatorProjectHighlights].filter((id) => districtIds.has(id));
  const featured = getDistrictFeaturedProjects({
    projects: districtProjectsList,
    districtProjectIds: districtIds,
    evidenceRecords,
    navigatorMatches: matches,
    limit: 4,
  });
  const filtered = districtModeProjects(featured);
  const featuredRows = filtered.map((project) => `
    <button type="button" class="lens-row lens-featured" data-project="${project.id}">
      ${lensCubeSvg(config.accent)}
      <span class="lens-featured-copy"><b>${escapeHtml(project.name)}</b><small>${escapeHtml(districtStatusLabel(project))} profile</small></span>
      <span class="lens-chevron" aria-hidden="true">›</span>
    </button>`).join('');
  const clusters = districtClusterList(config, districtProjectsList)
    .map((cluster) => `<div class="cat"><b>${escapeHtml(cluster.label)}</b><span>${plural(cluster.count, 'project')}</span></div>`)
    .join('');
  const sparseNote = districtProjectsList.length < 5
    ? `<div class="item"><b>Limited coverage</b><span>This district currently contains ${plural(districtProjectsList.length, 'project')}. Open space is more truthful than filler, and new projects enter only through the evidence workflow.</span></div>`
    : '';
  return `
    ${lensCoverageSection(coverage)}
    ${sparseNote}
    <div class="sec">Categories</div>
    <div class="lens-cats">${clusters}</div>
    ${lensModeButtons()}
    <div class="sec">Featured projects</div>
    <p class="lens-muted">Featured means Navigator matches first, then source-backed records, then alphabetical — never a ranking or endorsement.</p>
    ${featuredRows || '<div class="item"><b>No projects in this evidence mode</b><span>Switch the evidence mode above.</span></div>'}
    <div class="sec">District relationships</div>
    ${lensRelationshipDiagram(config, districtIds)}
    <div class="lens-info-note"><span class="info" aria-hidden="true">ⓘ</span> Source-backed claims apply only to their cited scope. City placement is illustrative.</div>`;
}

function lensProjectsHtml(config, districtProjectsList) {
  const types = getDistrictTypes(districtProjectsList);
  const chips = ['<button type="button" class="lens-chip" data-type="" aria-pressed="' + (districtTypeFilter === null ? 'true' : 'false') + '">All</button>']
    .concat(types.map((type) => `<button type="button" class="lens-chip" data-type="${escapeHtml(type)}" aria-pressed="${districtTypeFilter === type ? 'true' : 'false'}">${escapeHtml(type)}</button>`))
    .join('');
  const filtered = districtModeProjects(districtProjectsList)
    .filter((project) => !districtTypeFilter || project.type === districtTypeFilter)
    .sort((left, right) => left.name.localeCompare(right.name));
  const rows = filtered.map((project) => `
    <button type="button" class="lens-row" data-project="${project.id}">
      <b>${escapeHtml(project.name)}</b>
      <span>${escapeHtml(project.type)} — ${escapeHtml(districtStatusLabel(project))}</span>
    </button>`).join('');
  return `
    <div class="sec">Filter by type</div>
    <div class="lens-chips">${chips}</div>
    ${lensModeButtons()}
    <div class="sec">Projects — alphabetical</div>
    ${rows || '<div class="item"><b>Nothing matches this filter</b><span>Clear the type filter or switch the evidence mode.</span></div>'}`;
}

function lensEvidenceHtml(districtProjectsList, districtIds) {
  const views = ['all', 'observed', 'claimed', 'attested', 'ai-inferred', 'demo', 'review-due', 'warnings'];
  const chips = views.map((view) => `<button type="button" class="lens-chip" data-evidenceview="${view}" aria-pressed="${districtEvidenceView === view ? 'true' : 'false'}">${view === 'review-due' ? 'Review due' : view === 'ai-inferred' ? 'AI-inferred' : view[0].toUpperCase() + view.slice(1)}</button>`).join('');
  const groups = districtProjectsList
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((project) => {
      const records = evidenceForProject(project.id).filter((record) => {
        if (districtEvidenceView === 'all') return true;
        if (districtEvidenceView === 'review-due') return governanceRow('evidence', record.id)?.reviewDue === true;
        if (districtEvidenceView === 'warnings') return record.quality?.stale || record.quality?.conflict || record.quality?.incomplete || record.quality?.unavailable;
        return record.status === districtEvidenceView;
      });
      if (districtEvidenceView === 'demo') {
        return projectIsSourceBacked(project) ? '' : `<div class="lens-evidence-group"><b>${escapeHtml(project.name)}</b><div class="evidence-panel project-evidence">${evidenceList(project.evidence)}</div></div>`;
      }
      if (districtEvidenceView === 'all' && !records.length) {
        return `<div class="lens-evidence-group"><b>${escapeHtml(project.name)}</b><div class="evidence-panel project-evidence">${evidenceList(project.evidence)}</div></div>`;
      }
      if (!records.length) return '';
      return `<div class="lens-evidence-group"><b>${escapeHtml(project.name)}</b><div class="exact-evidence-list">${records.map((record) => evidenceRecordCard(record, { compact: true })).join('')}</div></div>`;
    })
    .join('');
  return `
    <div class="sec">Filter records</div>
    <div class="lens-chips">${chips}</div>
    ${groups || '<div class="item"><b>No records match this filter</b><span>Review-due is a derived governance state — it never becomes stale by itself.</span></div>'}
    <p class="lens-muted">Review-due means the review interval has elapsed at the governance instant. It is never an automatic status change.</p>`;
}

function renderDistrictLens() {
  const config = districtConfig();
  if (!config) return;
  const districtIds = districtProjectIdSet();
  const districtProjectsList = getDistrictProjects(projects, activeDistrict);
  const coverage = getDistrictCoverage({ projects: districtProjectsList, evidenceRecords, relationships, districtProjectIds: districtIds });
  let content = '';
  if (districtTab === 'projects') content = lensProjectsHtml(config, districtProjectsList);
  else if (districtTab === 'relationships') content = lensRelationshipsSection(districtIds);
  else if (districtTab === 'evidence') content = lensEvidenceHtml(districtProjectsList, districtIds);
  else content = lensOverviewHtml(config, districtProjectsList, coverage, districtIds);

  document.querySelector('#passport').innerHTML = `
    <div class="passport-head">
      <div class="passport-title-row">
        <h2 class="lens-title">DISTRICT LENS</h2>
        <button class="panel-collapse" id="passport-collapse" aria-expanded="true" aria-label="Collapse district panel">—</button>
      </div>
      <p class="lens-coverage-line">${plural(coverage.totalProjects, 'project')} · ${coverage.sourceBackedProjects} with source-backed records · ${plural(coverage.relationships, 'relationship')}</p>
    </div>
    <div class="passport-body" id="district-panel" role="tabpanel" aria-label="${escapeHtml(config.title)} ${districtTab}">${content}</div>
  `;

  document.querySelectorAll('#district-panel .lens-modes button').forEach((element) => {
    element.onclick = () => {
      districtEvidenceMode = element.dataset.mode;
      renderPassport();
    };
  });
  document.querySelectorAll('#district-panel .lens-chip[data-type]').forEach((element) => {
    element.onclick = () => {
      districtTypeFilter = element.dataset.type || null;
      renderPassport();
    };
  });
  document.querySelectorAll('#district-panel .lens-chip[data-evidenceview]').forEach((element) => {
    element.onclick = () => {
      districtEvidenceView = element.dataset.evidenceview;
      renderPassport();
    };
  });
  document.querySelectorAll('#district-panel .lens-modes button[data-relfilter]').forEach((element) => {
    element.onclick = () => {
      districtRelFilter = element.dataset.relfilter;
      districtSelectedEdgeId = null;
      renderPassport();
      renderCity();
    };
  });
  document.querySelectorAll('#district-panel .lens-row').forEach((element) => {
    element.onclick = () => {
      dismissPlaque();
      select(element.dataset.project);
      focusProjectOnMap(element.dataset.project);
    };
  });
  document.querySelectorAll('#district-panel .lens-rel-row').forEach((element) => {
    element.onclick = () => {
      districtSelectedEdgeId = districtSelectedEdgeId === element.dataset.rel ? null : element.dataset.rel;
      focusNavigatorRelationship(districtSelectedEdgeId ?? element.dataset.rel);
      renderPassport();
      renderCity();
    };
  });
}

function exitDistrictScope({ restoreCamera = true } = {}) {
  city3d.leaveDistrict({ restoreCamera });
  filter = 'All districts';
  clearNavigatorHighlights();
  document.documentElement.style.removeProperty('--district-accent');
  document.querySelector('#district-plaque')?.remove();
}

function applyRoute() {
  const parsed = parseHash(location.hash);
  if (!parsed || parsed.scope === 'city') {
    if (parsed === null && location.hash && location.hash !== '#/city') {
      location.hash = '#/city';
      return;
    }
    if (scope !== 'city') {
      const leftDistrict = activeDistrict;
      scope = 'city';
      activeDistrict = null;
      districtTab = 'overview';
      exitDistrictScope();
      if (graph) {
        // #/city is the archipelago route; a district relationships visit must not leak
        // graph mode into it.
        setMapView('city');
      }
      renderDistrictBar();
      setNavigatorContext();
      renderDistricts();
      renderCity();
      renderPassport();
      setPassportExpanded(false);
      if (leftDistrict) {
        document.querySelector(`#district-list .district[data-district="${leftDistrict}"]`)?.focus();
      }
    }
    return;
  }

  const districtChanged = scope !== 'district' || activeDistrict !== parsed.district;
  scope = 'district';
  activeDistrict = parsed.district;
  if (parsed.tab === 'evidence' && !districtHasEvidence()) {
    // The Evidence tab exists only for districts with source-backed records; an evidence
    // deep link for an evidence-less district falls back to Overview.
    location.replace('#/district/' + districtSlug(activeDistrict) + '/overview');
    return;
  }
  districtTab = parsed.tab;
  if (districtChanged) {
    city3d.enterDistrict(activeDistrict, { animate: !reducedMotion });
    filter = activeDistrict;
    districtEvidenceMode = 'all';
    districtTypeFilter = null;
    districtEvidenceView = 'all';
    districtRelFilter = 'all';
    districtSelectedEdgeId = null;
    districtPlaqueDismissed = false;
    clearNavigatorHighlights();
    // Lens-first entry (spec §2.1): a dedicated route opens District Lens; the startup
    // default selection (monad) or any out-of-district selection never auto-opens a
    // Passport. An in-district selection is also reset — the route is the source of truth.
    selected = null;
    renderPlaque();
    setNavigatorExpanded(true);
  }
  renderDistrictBar();
  setNavigatorContext();
  renderDistricts();
  renderCity();
  renderPassport();
  setPassportExpanded(true);
  if (districtTab === 'relationships') {
    if (!graph) {
      setMapView('graph');
      renderCity();
    }
  } else if (graph) {
    // Only the relationships tab is a graph view; arriving from city Graph mode or from
    // relationships must restore the island render.
    setMapView('city');
    renderCity();
  }
}

let districtRelFilter = 'all';

window.addEventListener('hashchange', applyRoute);
document.querySelector('#crumb-city').onclick = () => returnToCity();

function renderDistricts() {
  const glyphs = ['◈', '◫', '✧', '▥', '⚄', '◎'];
  const colors = ['#b99afa', '#9ad7c6', '#91baff', '#aa8ae8', '#dbac80', '#d89cc9'];

  document.querySelector('#district-list').innerHTML = districts
    .map(
      (district, index) => `
        <button class="district ${filter === district ? 'active' : ''}" data-district="${district}">
          <span class="district-glyph" style="color:${colors[index]}">${glyphs[index]}</span>
          <span>${district}</span>
          <span class="district-count">${index ? projects.filter((project) => project.district === district).length : projects.length}</span>
        </button>
      `,
    )
    .join('');

  document.querySelectorAll('.district').forEach((element) => {
    element.onclick = () => {
      const district = element.dataset.district;
      clearNavigatorHighlights();
      // District entries are hash routes (spec §4): scope, tab, and camera framing live on
      // the route. "All districts" returns to the city; the quick-filter dimming is
      // preserved inside district scope through `filter`.
      if (district === 'All districts') returnToCity();
      else navigateToDistrict(district);
    };
  });
}

let svgPlateCenter = { x: 425, y: 365 };

function transform() {
  document
    .querySelector('#world')
    .setAttribute(
      'transform',
      `translate(${svgPlateCenter.x * (1 - zoom) + offset.x} ${svgPlateCenter.y * (1 - zoom) + offset.y}) scale(${zoom})`,
    );
}

document.querySelector('#zoom-in').onclick = () => {
  if (graph) {
    zoom = Math.min(1.8, zoom + 0.15);
    transform();
  } else {
    city3d.zoomBy(0.85);
  }
};

document.querySelector('#zoom-out').onclick = () => {
  if (graph) {
    zoom = Math.max(0.65, zoom - 0.15);
    transform();
  } else {
    city3d.zoomBy(1.18);
  }
};

document.querySelector('#reset').onclick = reset;

function reset() {
  zoom = 1;
  offset = { x: 0, y: 0 };
  if (scope === 'district') {
    // District framing: reset returns to the island view, not the global camera.
    city3d.enterDistrict(activeDistrict, { animate: !reducedMotion });
    renderCity();
    return;
  }
  filter = 'All districts';
  clearNavigatorHighlights();
  document.querySelector('#search').value = '';
  city3d.reset();
  renderDistricts();
  renderCity();
}

document.querySelector('#links-toggle').onclick = (event) => {
  showLinks = !showLinks;
  event.currentTarget.setAttribute('aria-pressed', showLinks);
  renderCity();
};

document.querySelector('#graph-view').onclick = () => {
  setMapView('graph');
  renderCity();
};

document.querySelector('#city-view').onclick = () => {
  setMapView('city');
  renderCity();
};

document.querySelectorAll('.prompt').forEach((element) => {
  element.onclick = () => {
    const prompt = element.dataset.prompt;
    document.querySelector('#search').value = prompt;
    runNavigatorSearch(prompt);
  };
});

document.querySelector('#search-form').onsubmit = (event) => {
  event.preventDefault();
  runNavigatorSearch(document.querySelector('#search').value);
};

// Implicit Enter submission is not reliable in every embedded WebView, so request it
// explicitly — the keyboard path must match the ↗ button.
document.querySelector('#search').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  document.querySelector('#search-form').requestSubmit();
});

document.querySelector('#about').onclick = () => document.querySelector('#about-dialog').showModal();
document.querySelector('#close-dialog').onclick = () => document.querySelector('#about-dialog').close();
document.querySelector('#explore').onclick = reset;
document.querySelector('.brand').onclick = (event) => {
  event.preventDefault();
  reset();
  select('monad');
};

let drag = null;
const svg = document.querySelector('#city-svg');

svg.onpointerdown = (event) => {
  if (event.target.closest('.building')) return;
  drag = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add('dragging');
};

svg.onpointermove = (event) => {
  if (!drag) return;
  const scale = 850 / svg.getBoundingClientRect().width;
  offset = {
    x: drag.ox + (event.clientX - drag.x) * scale,
    y: drag.oy + (event.clientY - drag.y) * scale,
  };
  transform();
};

svg.onpointerup = svg.onpointercancel = () => {
  drag = null;
  svg.classList.remove('dragging');
};

renderDistricts();
renderCity();
renderPassport();
initAiPanel();

// District routes: the hash is the source of truth for scope/tab (spec §13). Apply the
// current route once at startup so deep links like #/district/defi/overview work.
applyRoute();

// Deterministic district Navigator regression coverage (P0): the two corrected queries and
// their invariants. Failures are logged, never silent.
{
  const districtChecks = runDistrictNavigatorChecks({ projects, relationships, evidenceRecords });
  districtChecks.filter((check) => !check.pass).forEach((check) => {
    console.error(`[district-navigator-check] ${check.name}: ${check.detail}`);
  });
}
