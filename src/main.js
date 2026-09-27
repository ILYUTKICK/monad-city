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
import { retrieveNavigator } from './retrieval.js';
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
    x: 368,
    y: 368,
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
    x: 414,
    y: 396,
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
    x: 367,
    y: 422,
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
    x: -236,
    y: 463,
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
    x: -178,
    y: 499,
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
    x: -81,
    y: -514,
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
    x: -514,
    y: -81,
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
    x: -456,
    y: -45,
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
    x: 463,
    y: -236,
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
    x: 321,
    y: 394,
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
    x: 322,
    y: 340,
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
    x: 369,
    y: 314,
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
    x: 415,
    y: 342,
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
    x: 417,
    y: 464,
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
    x: 367,
    y: 476,
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
    x: 317,
    y: 463,
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
    x: 278,
    y: 428,
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
    x: 261,
    y: 380,
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
    x: 268,
    y: 328,
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
    x: 297,
    y: 286,
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
    x: 343,
    y: 263,
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
    x: 395,
    y: 263,
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
    x: 441,
    y: 288,
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
    x: 469,
    y: 331,
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
    x: 475,
    y: 382,
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
    x: 456,
    y: 430,
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
    x: 355,
    y: 529,
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
    x: 303,
    y: 517,
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
    x: 259,
    y: 488,
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
    x: 226,
    y: 446,
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
    x: 208,
    y: 395,
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
    x: 208,
    y: 342,
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
    x: 225,
    y: 291,
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
    x: 258,
    y: 249,
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
    x: 302,
    y: 220,
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
    x: 354,
    y: 207,
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
    x: 407,
    y: 211,
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
    x: 456,
    y: 232,
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
    x: -238,
    y: 531,
    h: 50,
    color: '#a58aff',
    state: 'Observed',
    type: 'Cross Chain Bridge',
    site: 'symbiosis.finance',
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
  reducedMotion,
  beaconByProject,
});

function renderKeyboardList() {
  const list = document.querySelector('#city-keyboard');
  list.innerHTML = projects.map((project) => `
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
  document.querySelector('#context-label').textContent = `${selectedProject().name} selected`;
  document.querySelector('#visible-count').textContent = `${filter} · ${projects.filter(visible).length} in view`;
}

function renderSvgCity() {
  // Data-driven graph framing: fit the plate and viewBox to the projected node bounds so the
  // layout scales with the city (archipelago coordinates span much wider than the original ten).
  const projected = projects.map((project) => iso(project.x, project.y));
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
      const project = projects.find((item) => item.id === relationship.from);
      const connected = projects.find((item) => item.id === relationship.to);
      const evidenceState = RELATIONSHIP_STATES[relationship.evidenceState];
      // The map encodes only the provenance class (sourced / demo / inferred);
      // the exact evidence state stays in the title and data attributes.
      const sourcedEdge = isApprovedSourcedRelationship(relationship);
      const nonFactualEdge = relationship.evidenceState === 'AI-inferred' || relationship.evidenceState === 'illustrative';
      const lineColor = sourcedEdge ? '#8ebbd7' : nonFactualEdge ? '#9d81bd' : '#7d7490';
      const lineDash = nonFactualEdge ? '4 4' : '';
      const start = iso(project.x, project.y, graph ? 20 : 2);
      const end = iso(connected.x, connected.y, graph ? 20 : 2);
      const active = relationship.from === selected || relationship.to === selected;
      const navigatorMatch = navigatorRelationshipHighlights.has(relationship.id);
      const pairVisible = visible(project) && visible(connected);
      const relationshipDisclosure = isApprovedSourcedRelationship(relationship)
        ? `Limited sourced relationship; exact evidence IDs: ${(relationship.evidenceIds || []).join(', ')}; ${relationship.claimStatus} claim status.`
        : relationship.dataMode === 'sourced-limited'
          ? 'Withheld review candidate; it is not displayed as source-backed support.'
          : 'Demo illustrative relationship; unavailable evidence placeholder.';
      const title = `${project.name} to ${connected.name}: ${RELATIONSHIP_TYPES[relationship.type].label}; ${evidenceState.label}; ${relationshipDisclosure}`;

      out += `<path class="relationship-line ${navigatorMatch ? 'navigator-match' : ''}" data-relationship="${relationship.id}" data-evidence-state="${relationship.evidenceState}" d="M${start} L${end}" fill="none" stroke="${lineColor}" stroke-width="${navigatorMatch ? 2.5 : active ? 1.8 : 0.7}" opacity="${pairVisible ? (navigatorMatch ? 1 : active ? 0.86 : 0.24) : 0.035}" ${lineDash ? `stroke-dasharray="${lineDash}"` : ''} vector-effect="non-scaling-stroke"><title>${title}</title></path>`;
    });
  }

  [...projects]
    .sort((a, b) => a.x + a.y - (b.x + b.y))
    .forEach((project) => {
      const [x, y] = iso(project.x, project.y);
      const active = project.id === selected;
      const navigatorMatch = navigatorProjectHighlights.has(project.id);
      const isVisible = visible(project);
      const projectOpacity = isVisible ? (active || navigatorMatch ? 1 : navigatorProjectHighlights.size ? 0.48 : 0.78) : 0.1;
      const current = active ? ' aria-current="true"' : '';

      out += `<g class="building ${active ? 'active' : ''} ${navigatorMatch ? 'navigator-match' : ''}" data-id="${project.id}" tabindex="${isVisible ? 0 : -1}" role="button" aria-label="${project.name}, ${project.district}, status ${project.state}"${current} opacity="${projectOpacity}">`;

      if (active || navigatorMatch) {
        out += poly(
          [iso(project.x - 43, project.y - 43), iso(project.x + 43, project.y - 43), iso(project.x + 43, project.y + 43), iso(project.x - 43, project.y + 43)],
          navigatorMatch && !active ? '#9bc6ff0a' : '#b89cff09',
          navigatorMatch && !active ? '#a9d0ff' : '#d7c2ff',
          `stroke-width="${active ? 2 : 1.4}" vector-effect="non-scaling-stroke"`,
        );
      }

      out += poly(
        [iso(project.x - 34, project.y - 34), iso(project.x + 34, project.y - 34), iso(project.x + 34, project.y + 34), iso(project.x - 34, project.y + 34)],
        active ? '#a98afa18' : '#44385312',
        active ? '#c8acff' : '#7161813d',
        `stroke-width="${active ? 1.5 : 0.8}" vector-effect="non-scaling-stroke"`,
      );

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
      out += `<text x="${x}" y="${y + (active ? 28 : 26)}" text-anchor="middle" fill="${active ? '#f5efff' : '#bbb4c5'}" font-size="${active ? 11.5 : 10.5}" font-weight="${active ? 650 : 500}">${project.name}</text>`;
      out += '</g>';
    });

  document.querySelector('#world').innerHTML = out;
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

  document.querySelector('#context-label').textContent = `${selectedProject().name} selected`;
  document.querySelector('#visible-count').textContent = `${filter} · ${projects.filter(visible).length} in view`;
}

function clearNavigatorHighlights() {
  navigatorProjectHighlights = new Set();
  navigatorRelationshipHighlights = new Set();
}

function select(id, { preserveNavigatorHighlights = false } = {}) {
  if (!preserveNavigatorHighlights) clearNavigatorHighlights();
  selected = id;
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
        .map((id) => `<button class="navigator-project" data-project="${escapeHtml(id)}">${escapeHtml(projectName(id))}<span>Open</span></button>`)
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
  const project = selectedProject();
  const projectRecords = evidenceForProject(project.id);
  const connections = relationshipsForProject(project.id).map((relationship) => ({
    relationship,
    project: connectedProject(relationship, project.id),
  }));

  document.querySelector('#passport').innerHTML = `
    <div class="passport-head">
      <div class="passport-title-row">
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
}

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
      filter = element.dataset.district;
      clearNavigatorHighlights();

      if (!visible(selectedProject())) {
        selected = projects.find(visible).id;
        renderPassport();
      }

      renderDistricts();
      renderCity();
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
