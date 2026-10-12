import { projects } from './projects.js';
import {
  DATA_MODE,
  PROJECT_STATES,
  RELATIONSHIP_STATES,
  RELATIONSHIP_TYPES,
  relationships,
} from './data.js';
import {
  REVIEW_GOVERNANCE_AS_OF,
  evidenceRecords,
  evidenceSnapshot,
  governanceRowBySubjectId,
  reviewGovernance,
  reviewGovernanceCompanion,
} from './evidence.js';
import { retrieveNavigator, runDistrictNavigatorChecks } from './retrieval.js';
import {
  HOSTED_AI_MODEL,
  aiEnabled,
  fetchHostedAiStatus,
  loadAiSettings,
  runHostedNavigator,
  runNavigatorAgent,
  saveAiSettings,
} from './ai.js';
import { checkRegistryRecord, registryStatusText } from './onchain.js';
import { REGISTRY_CONFIG } from './registry-config.js';
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
import { computeCityLayout } from './city-layout.js';
import { createCity3D } from './city3d.js';
import { formatRelationshipTooltip, relationshipTooltipText } from './relationship-tooltip.js';



const districts = ['All districts', 'DeFi', 'AI', 'Infrastructure', 'Gaming', 'Identity'];

let selected = null;
let filter = 'All districts';
let zoom = 1;
// Link disclosure for the City and Graph views. Selection and link display are separate
// states: choosing a project never implies "show all of its incident edges".
//   overview — calm city scan: aggregate Monad↔district lines only;
//   project  — connection focus: the selected project's edges (Ecosystem listing layer
//              filtered out by default, bounded shown set, counts disclosed);
//   all      — every connection line;
//   off      — individual links hidden and excluded from hit testing.
// Small Navigator results may light their matched lines in any mode except off
// (matchBeams); a large result highlights buildings and keeps the fan out of the map.
let linkMode = 'overview';
let showEcosystemListings = false;
let showAllProjectLinks = false;
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
// Full retrieval result size, kept separately from the bounded displayed subset (brief §7:
// the full answer and the visual subset are distinct states).
let navigatorTotalMatches = 0;

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
          <details class="prompt-more">
            <summary>More prompts</summary>
            <div class="prompt-more-list">
              <button class="prompt" data-prompt="Who’s connected to Monad?">
                <span>Who’s connected to Monad?</span><b aria-hidden="true">↗</b>
              </button>
              <button class="prompt" data-prompt="Find AI projects with active contracts">
                <span>Find AI projects with active contracts</span><b aria-hidden="true">↗</b>
              </button>
            </div>
          </details>
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
          <summary>AI settings <span class="ai-state" id="ai-state">Off</span></summary>
          <form id="ai-form">
            <label>Custom API endpoint (OpenAI-compatible)<input id="ai-base-url" autocomplete="off" spellcheck="false" /></label>
            <label>Custom model<input id="ai-model" autocomplete="off" spellcheck="false" /></label>
            <label>Custom API key<input id="ai-key" type="password" autocomplete="off" /></label>
            <p class="ai-note">Hosted Qwen Max runs through Monad City for guests, so no API key is needed. It uses read-only graph tools and can select only approved evidence records. Custom settings are used when the hosted service is unavailable. In that case, questions and local tool results are sent to the endpoint above; your key is stored in this browser and sent only to that endpoint.</p>
            <button type="submit">Save custom settings</button>
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

        <div id="link-focus-bar" hidden></div>

        <div class="city-context" aria-live="polite">
          <span class="context-dot"></span>
          <strong id="context-label">${projects.length} projects</strong>
          <span class="context-line" hidden></span>
          <span id="visible-count" hidden></span>
        </div>

        <div class="city-controls" aria-label="Map controls">
          <button id="zoom-in" aria-label="Zoom in">+</button>
          <button id="zoom-out" aria-label="Zoom out">−</button>
          <span></span>
          <button id="reset" aria-label="Reset city view">⌖</button>
        </div>

        <div class="legend" data-mode="overview" aria-label="Map connections">
          <details class="connections-disclosure">
            <summary class="connections-trigger">
              <span>Connections</span>
              <span class="connections-current" aria-live="polite">Overview</span>
            </summary>
            <div class="connections-panel">
              <div class="legend-links" role="group" aria-label="Show connections">
                <button type="button" data-link-mode="overview" aria-pressed="true" title="Calm city scan: aggregate Monad↔district lines only">Overview</button>
                <button type="button" data-link-mode="project" aria-pressed="false" title="Show the selected project's connection focus">Project</button>
                <button type="button" data-link-mode="all" aria-pressed="false" title="Every connection line">All</button>
                <button type="button" data-link-mode="off" aria-pressed="false" title="Hide connection lines">Off</button>
              </div>
              <span class="legend-summary">District routes · navigation only</span>
              <div class="legend-provenance" role="group" aria-label="Connection provenance">
                <strong class="connections-provenance-title">Provenance</strong>
                <span class="legend-state sourced"><i></i> Sourced</span>
                <span class="legend-state demopattern"><i></i> Declared</span>
                <span class="legend-state inferred"><i></i> AI-inferred</span>
                <small>Sourced means a cited record, not verification or safety. District routes are navigation summaries.</small>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>

    <aside class="passport" id="passport"></aside>

    <button class="panel-handle left" id="navigator-handle" aria-expanded="true" aria-controls="navigator-body" aria-label="Collapse AI Navigator panel">‹</button>
    <button class="panel-handle right" id="passport-handle" aria-expanded="false" aria-label="Expand project passport panel">›</button>
  </main>

  <footer>
    <span>Static curated dataset</span>
  </footer>

  <dialog id="about-dialog">
    <button id="close-dialog" aria-label="Close">×</button>
    <h2>About Monad City</h2>
    <p>
      Monad City makes an ecosystem’s relationships explorable. Buildings are projects,
      districts organize discovery, and connections make dependencies visible.
    </p>
    <p>
      This hybrid prototype has a limited static sourced subset of exact claims and relationships;
      all other placements, descriptions, project-state patterns, and unsupported relationships are
      illustrative Demo data. A source supports only its stated scope, never generic endorsement,
      safety, quality, current operation, or global verification. AI Navigator searches the local
      project graph and can use an optional AI provider to select relevant source records.
      The app has no wallet connection, live blockchain feed, or backend.
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
const beaconByProject = Object.fromEntries(projects.map((project) => {
  if (project.state === 'AI-inferred') return [project.id, '#9d81bd'];
  return [project.id, evidenceForProject(project.id).length ? '#8ebbd7' : '#7d7490'];
}));
// District aggregate beams: a district is a navigation category, so no relationship record
// exists for it. The label counts the district's projects holding at least one approved
// Monad-mainnet record; city3d discloses the aggregate in the hover tooltip. This is a
// derived wayfinding line, never a relationship claim.
const districtMonadLinks = (() => {
  const counts = new Map();
  projects.forEach((project) => {
    if (project.id === 'monad') return;
    if (!counts.has(project.district)) counts.set(project.district, { total: 0, withRecords: 0 });
    const entry = counts.get(project.district);
    entry.total += 1;
    if (evidenceForProject(project.id).length) entry.withRecords += 1;
  });
  return [...counts.entries()].map(([district, entry]) => ({
    district,
    total: entry.total,
    withRecords: entry.withRecords,
    label: `${entry.withRecords} of ${entry.total} projects have approved Monad-mainnet records`,
  }));
})();
// Deterministic presentation layout: quarters per district via the existing classifier.
// Purely visual — factual profiles, evidence records and relationship endpoints are untouched.
const cityLayout = computeCityLayout(projects, DISTRICT_EXPERIENCES);
const city3d = createCity3D({
  container: document.querySelector('#city-gl'),
  labelContainer: document.querySelector('#city-labels'),
  projects,
  relationships,
  districtLinks: districtMonadLinks,
  layoutPositions: cityLayout.positions,
  quarters: cityLayout.quarters,
  getExclusions: computePanelExclusions,
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

// Connection-focus partition (brief §9): records group into one visual route per neighbor,
// groups are ordered by type then name (never a hidden score), and the City shows at most
// PROJECT_FOCUS_NEIGHBOR_CAP neighbors. Counts in the focus bar always describe records —
// X of Y — while one route may group several records behind a single arc. The full list
// stays available in the Passport Connections tab.
const PROJECT_FOCUS_NEIGHBOR_CAP = 6;
function projectFocusPartition(projectId) {
  const incident = relationships.filter(
    (relationship) => relationship.from === projectId || relationship.to === projectId,
  );
  const typeOrder = (relationship) => {
    const label = RELATIONSHIP_TYPES[relationship.type]?.label ?? relationship.type;
    return `${relationship.type === 'ecosystem_membership' ? 1 : 0}:${label}`;
  };
  const ordered = [...incident].sort((left, right) => {
    const byType = typeOrder(left).localeCompare(typeOrder(right));
    if (byType !== 0) return byType;
    const leftName = connectedProject(left, projectId)?.name ?? left.to;
    const rightName = connectedProject(right, projectId)?.name ?? right.to;
    return leftName.localeCompare(rightName) || left.id.localeCompare(right.id);
  });

  // Group records by neighbor; each group keeps the primary type label of its records.
  const groupsByNeighbor = new Map();
  ordered.forEach((relationship) => {
    const neighborId = relationship.from === projectId ? relationship.to : relationship.from;
    if (!groupsByNeighbor.has(neighborId)) groupsByNeighbor.set(neighborId, []);
    groupsByNeighbor.get(neighborId).push(relationship);
  });
  const groups = [...groupsByNeighbor.entries()]
    .map(([neighborId, records]) => ({
      neighborId,
      records,
      typeLabel: RELATIONSHIP_TYPES[records[0].type]?.label ?? records[0].type,
      isListing: records.every((record) => record.type === 'ecosystem_membership'),
      key: `route:${neighborId}:${records.map((record) => record.id).join('+')}`,
    }))
    .sort((left, right) => {
      const byListing = (left.isListing ? 1 : 0) - (right.isListing ? 1 : 0);
      if (byListing !== 0) return byListing;
      const byType = left.typeLabel.localeCompare(right.typeLabel);
      if (byType !== 0) return byType;
      return (connectedProject({ to: left.neighborId }, projectId)?.name ?? left.neighborId)
        .localeCompare(connectedProject({ to: right.neighborId }, projectId)?.name ?? right.neighborId);
    });

  const integrations = groups.filter((group) => !group.isListing);
  const listings = groups.filter((group) => group.isListing);
  // The listing toggle changes the eligible layer, while the normal focus remains bounded.
  // Reserve up to two listing endpoints; only explicit Show all removes the route budget.
  const listingSlice = showEcosystemListings ? listings.slice(0, 2) : [];
  const shownGroups = showAllProjectLinks ? [...groups]
    : [...integrations.slice(0, PROJECT_FOCUS_NEIGHBOR_CAP - listingSlice.length), ...listingSlice];

  const shownRecords = shownGroups.flatMap((group) => group.records);
  const shownIds = new Set(shownRecords.map((record) => record.id));
  const shownRecordCount = shownRecords.length;
  const listingRecordCount = listings.reduce((sum, group) => sum + group.records.length, 0);
  const listingShownRecords = shownGroups.filter((group) => group.isListing)
    .reduce((sum, group) => sum + group.records.length, 0);
  const integrationRecordCount = integrations.reduce((sum, group) => sum + group.records.length, 0);
  const integrationShownRecords = shownGroups.filter((group) => !group.isListing)
    .reduce((sum, group) => sum + group.records.length, 0);

  return {
    incident,
    groups,
    shownGroups,
    shownIds,
    shownList: shownRecords,
    routes: shownGroups.map((group) => ({
      key: group.key,
      fromId: projectId,
      neighborId: group.neighborId,
      records: group.records,
    })),
    total: incident.length,
    shown: shownRecordCount,
    shownNeighborCount: shownGroups.length,
    neighborCount: groups.length,
    listingCount: listingRecordCount,
    listingHidden: listingRecordCount - listingShownRecords,
    integrationHidden: integrationRecordCount - integrationShownRecords,
  };
}

// Panel and toolbar zones the label layer must stay out of, in #city-gl CSS pixels.
function computePanelExclusions() {
  const container = document.querySelector('#city-gl');
  if (!container) return [];
  const bounds = container.getBoundingClientRect();
  const zones = [];
  const addZone = (element, margin = 10) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    zones.push({
      kind: element.id === 'link-focus-bar' ? 'focus-toolbar' : 'panel-or-control',
      left: rect.left - bounds.left - margin,
      top: rect.top - bounds.top - margin,
      right: rect.right - bounds.left + margin,
      bottom: rect.bottom - bounds.top + margin,
    });
  };
  addZone(document.querySelector('header'), 4);
  addZone(document.querySelector('.navigator'));
  addZone(document.querySelector('.passport'));
  addZone(document.querySelector('.legend'));
  addZone(document.querySelector('.connections-disclosure[open] .connections-panel'));
  addZone(document.querySelector('.view-toggle'));
  addZone(document.querySelector('.city-controls'));
  addZone(document.querySelector('.city-context'));
  addZone(document.querySelector('#link-focus-bar'));
  return zones;
}

function updateCityContext(focus = null) {
  const project = selectedProject();
  const defaultCityOverview = !project
    && scope !== 'district'
    && !graph
    && filter === 'All districts';
  const contextLabel = document.querySelector('#context-label');
  const contextLine = document.querySelector('.context-line');
  const visibleCount = document.querySelector('#visible-count');

  contextLabel.textContent = defaultCityOverview
    ? `${projects.length} projects`
    : project
      ? `${project.name} selected`
      : scope === 'district'
        ? `${activeDistrict} district — select a building`
        : graph ? 'Graph view' : 'City view';

  contextLine.hidden = defaultCityOverview;
  visibleCount.hidden = defaultCityOverview;
  if (defaultCityOverview) {
    visibleCount.textContent = '';
    return;
  }

  const externalNeighbors = !graph && filter !== 'All districts' && focus
    ? focus.routes.filter((route) => projectById(route.neighborId)?.district !== filter).length : 0;
  visibleCount.textContent = `${filter} · ${projects.filter(visible).length} in view${externalNeighbors ? ` + ${externalNeighbors} external ${externalNeighbors === 1 ? 'neighbor' : 'neighbors'}` : ''}`;
}

function renderCity() {
  refreshLinkButtons();
  if (graph) dismissPlaque();
  document.querySelector('#city-svg').toggleAttribute('hidden', !graph);
  // City labels are projected by the Three.js camera and therefore do not belong over the
  // independently pannable/zoomable SVG Graph. Graph district callouts are rendered inside
  // #world below so they share the graph's exact transform.
  document.querySelector('#city-labels').toggleAttribute('hidden', graph);
  const focus = selected && (linkMode === 'project' || graph) ? projectFocusPartition(selected) : null;
  city3d.sync({
    selected,
    filter,
    linkMode,
    projectFocusRoutes: focus?.routes ?? null,
    projectFocusIds: focus?.shownIds ?? null,
    projectFocusNeighborIds: focus ? new Set(focus.routes.map((route) => route.neighborId)) : null,
    matchBeams: navigatorRelationshipHighlights.size > 0
      && navigatorRelationshipHighlights.size <= 12
      && navigatorTotalMatches <= 12,
    highlightProjects: navigatorProjectHighlights,
    highlightRelationships: navigatorRelationshipHighlights,
    graph,
  });
  renderLinkFocusBar(focus);
  if (graph) {
    renderSvgCity();
  } else {
    renderKeyboardList();
  }
  updateCityContext(focus);
}

// Focus toolbar (mockup C): current filter, disclosed counts, and explicit expansion.
// Rendered only in Project focus; every number is computed from the loaded dataset.
function renderLinkFocusBar(focus) {
  const bar = document.querySelector('#link-focus-bar');
  if (!bar) return;
  const active = linkMode === 'project' && selected && focus && (focus.total > 0 || linkMode === 'project');
  bar.hidden = !active;
  if (!active) return;
  const project = selectedProject();
  if (focus.total === 0) {
    bar.innerHTML = `
      <strong>${escapeHtml(project?.name ?? '')} connections</strong>
      <span class="focus-count">No relationship records touch this project yet — connections appear only from records.</span>`;
    return;
  }
  const ecosystemToggle = `
    <label class="focus-eco">
      <input type="checkbox" id="eco-toggle" aria-pressed="${showEcosystemListings}" ${showEcosystemListings ? 'checked' : ''} />
      <span>Ecosystem listing</span>
      ${focus.listingHidden ? `<small>${focus.listingHidden} hidden</small>` : ''}
    </label>`;
  const expand = focus.shown < focus.total
    ? `<button type="button" id="focus-show-all">Show all ${focus.total} →</button>`
    : '';
  const capNote = !showAllProjectLinks && focus.integrationHidden
    ? `<small class="focus-cap">${focus.integrationHidden} more by type — use Show all</small>`
    : '';
  bar.innerHTML = `
    <strong>${escapeHtml(project?.name ?? '')} connections</strong>
    ${ecosystemToggle}
    <span class="focus-count">${focus.shown} of ${focus.total} records · ${focus.shownNeighborCount} neighbors shown</span>
    ${capNote}
    ${expand}`;
  bar.querySelector('#eco-toggle')?.addEventListener('change', (event) => {
    showEcosystemListings = event.currentTarget.checked;
    renderCity();
  });
  bar.querySelector('#focus-show-all')?.addEventListener('click', () => {
    showAllProjectLinks = true;
    renderCity();
  });
}

function renderSvgCity() {
  // Data-driven graph framing: fit the plate and viewBox to the projected node bounds so the
  // layout scales with the city (archipelago coordinates span much wider than the original ten).
  // District Relationships tab: render the relationship subgraph (nodes incident to the
  // qualifying edges plus their external endpoints) instead of the full district population.
  // Project connection focus (linkMode 'project' + selection): a readable local layout of the
  // selected node and its shown neighbors — City building positions are never touched.
  const inRelationshipsTab = scope === 'district' && districtTab === 'relationships';
  const districtIds = scope === 'district' ? districtProjectIdSet() : null;
  const graphFocus = graph && selected && linkMode === 'project';
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
  } else if (graphFocus) {
    const focus = projectFocusPartition(selected);
    subgraphIds = new Set([selected, ...focus.shownList.flatMap((relationship) => [relationship.from, relationship.to])]);
  }
  // Apply the current graph viewport before measuring it for annotation sizing. Focused
  // subgraphs occupy the panel-safe center column, while the whole graph keeps the full SVG.
  const svgEl = document.querySelector('#city-svg');
  const desktopWide = window.matchMedia('(min-width: 941px)').matches;
  svgEl.classList.toggle('subgraph', Boolean(subgraphIds));
  if (subgraphIds && desktopWide) {
    svgEl.style.position = 'absolute';
    svgEl.style.left = 'var(--map-left, 0px)';
    svgEl.style.right = 'var(--map-right, 0px)';
    const topInset = document.querySelector('#link-focus-bar').hidden ? '76px' : '160px';
    svgEl.style.top = topInset;
    svgEl.style.bottom = '110px';
    // SVG is a replaced element: auto height follows its viewBox ratio and ignores the
    // bottom inset. Explicit dimensions keep both small and large graphs inside the map.
    svgEl.style.width = 'calc(100% - var(--map-left, 0px) - var(--map-right, 0px))';
    svgEl.style.height = `calc(100% - ${topInset} - 110px)`;
  } else {
    svgEl.style.position = '';
    svgEl.style.left = '';
    svgEl.style.right = '';
    svgEl.style.top = '';
    svgEl.style.bottom = '';
    svgEl.style.width = '';
    svgEl.style.height = '';
  }
  const framedProjects = subgraphIds ? projects.filter((project) => subgraphIds.has(project.id)) : projects;
  // Schematic layout for the subgraph: real archipelago coordinates collapse a district
  // diagonal into one corner under the isometric projection, so the analytical view lays the
  // subgraph out deterministically instead — in-district nodes on an inner ring, external
  // endpoints on an outer ring (sorted ids, so the arrangement is stable). Whole-graph mode
  // consumes the shared quarter layout so City and Graph agree on where a project lives.
  const layoutPositions = new Map();
  if (subgraphIds && inRelationshipsTab) {
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
  } else if (subgraphIds && graphFocus) {
    const focus = projectFocusPartition(selected);
    // The focus toolbar overlays the top of the plate, so the ring center sits below it.
    layoutPositions.set(selected, { x: 0, y: 60 });
    const neighbors = focus.shownList.length;
    const rx = Math.max(215, neighbors * 30);
    const ry = Math.max(120, neighbors * 17);
    focus.shownList.forEach((relationship, index) => {
      const otherId = relationship.from === selected ? relationship.to : relationship.from;
      if (layoutPositions.has(otherId)) return;
      const angle = (index / Math.max(neighbors, 1)) * Math.PI * 2 - Math.PI / 2;
      layoutPositions.set(otherId, {
        x: Math.round(Math.cos(angle) * rx),
        y: Math.round(60 + Math.sin(angle) * ry),
      });
    });
  } else {
    cityLayout.positions.forEach((pos, id) => layoutPositions.set(id, pos));
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

  const graphDistricts = new Map();
  framedProjects.forEach((project) => {
    const layout = layoutPositions.get(project.id);
    const [x, y] = layout ? [layout.x, layout.y] : iso(project.x, project.y);
    if (!graphDistricts.has(project.district)) graphDistricts.set(project.district, []);
    graphDistricts.get(project.district).push({ x, y });
  });
  const graphCallouts = [...graphDistricts.entries()].map(([district, points]) => ({
    district,
    count: points.length,
    centerX: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    nodeAnchorY: Math.min(...points.map((point) => point.y)) - 52,
    labelWidth: Math.max(116, district.length * 9 + 42),
    color: projects.find((project) => project.district === district)?.color ?? '#9b93aa',
  }));

  const pad = 90;
  const plateHalfW = (bounds.maxX - bounds.minX) / 2 + pad;
  const plateHalfH = plateHalfW * 0.5;
  const plateCx = (bounds.maxX + bounds.minX) / 2;
  const plateCy = (bounds.maxY + bounds.minY) / 2;
  svgPlateCenter = { x: plateCx, y: plateCy };

  // SVG text uses graph units and would be only ~4–5px in the whole-graph fit. Scale the
  // complete annotation (label, leader, and dot) to a 13px initial caption target using the
  // actual SVG viewport/viewBox ratio. Focused subgraphs naturally scale back down. The
  // iterative fit includes the resulting annotation bounds, so top labels remain in-frame.
  const baseVbWidth = Math.max(640, plateHalfW * 2 + 80);
  const baseVbHeight = Math.max(460, plateHalfH * 2 + 140, bounds.maxY - bounds.minY + 180);
  const baseVb = {
    minX: plateCx - baseVbWidth / 2,
    maxX: plateCx + baseVbWidth / 2,
    minY: plateCy - baseVbHeight / 2,
    maxY: plateCy + baseVbHeight / 2,
  };
  const svgRect = svgEl.getBoundingClientRect();
  const viewportWidth = Math.max(1, svgRect.width);
  const viewportHeight = Math.max(1, svgRect.height);
  const viewToggleBottom = document.querySelector('.view-toggle').getBoundingClientRect().bottom;
  const topClearance = Math.max(0, viewToggleBottom - svgRect.top + 12);
  let annotationScale = 1;
  let fittedVb = { ...baseVb };
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const unitsToPixels = Math.min(
      viewportWidth / Math.max(1, fittedVb.maxX - fittedVb.minX),
      viewportHeight / Math.max(1, fittedVb.maxY - fittedVb.minY),
    );
    annotationScale = Math.max(0.55, Math.min(5.5, 13 / (14 * unitsToPixels)));
    fittedVb = { ...baseVb };
    graphCallouts.forEach((callout) => {
      const annotationHalfWidth = (callout.labelWidth / 2 + 6) * annotationScale;
      fittedVb.minX = Math.min(fittedVb.minX, callout.centerX - annotationHalfWidth - 10);
      fittedVb.maxX = Math.max(fittedVb.maxX, callout.centerX + annotationHalfWidth + 10);
      fittedVb.minY = Math.min(fittedVb.minY, callout.nodeAnchorY - 60 * annotationScale - 10 - topClearance / unitsToPixels);
    });
  }
  const vbWidth = fittedVb.maxX - fittedVb.minX;
  const vbHeight = fittedVb.maxY - fittedVb.minY;

  let out = `<path d="M${plateCx} ${plateCy - plateHalfH}L${plateCx + plateHalfW} ${plateCy} ${plateCx} ${plateCy + plateHalfH} ${plateCx - plateHalfW} ${plateCy}Z" fill="#111019" stroke="#2a2634" stroke-width="1" />`;

  if (linkMode !== 'off' || navigatorRelationshipHighlights.size) {
    // High-degree selections (Monad: 171 edges) must not repaint the whole graph as a fan —
    // active-edge emphasis steps down once the degree passes the focus cap.
    const selectedDegree = selected
      ? relationships.filter((item) => item.from === selected || item.to === selected).length
      : 0;
    const activeOpacity = selectedDegree > 12 ? 0.12 : 0.86;
    relationships.forEach((relationship) => {
      if (subgraphIds && (!subgraphIds.has(relationship.from) || !subgraphIds.has(relationship.to))) return;
      const project = projects.find((item) => item.id === relationship.from);
      const connected = projects.find((item) => item.id === relationship.to);
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
      const title = escapeHtml(relationshipTooltipText(formatRelationshipTooltip(
        relationship, project.name, connected.name,
      )));

      out += `<path class="relationship-line ${navigatorMatch ? 'navigator-match' : ''}" data-relationship="${relationship.id}" data-evidence-state="${relationship.evidenceState}" d="M${start} L${end}" fill="none" stroke="${lineColor}" stroke-width="${navigatorMatch ? 2.5 : active ? 1.8 : 0.7}" opacity="${pairVisible ? (navigatorMatch ? 1 : active ? activeOpacity : 0.24) : 0.035}" ${lineDash ? `stroke-dasharray="${lineDash}"` : ''} vector-effect="non-scaling-stroke"><title>${title}</title></path>`;
      if (graphFocus) {
        // Relationship type is text next to the line — color stays a secondary cue only.
        const midX = (start[0] + end[0]) / 2;
        const midY = (start[1] + end[1]) / 2;
        out += `<text x="${midX}" y="${midY - 7}" text-anchor="middle" font-size="10.5" fill="#9a92a8">${RELATIONSHIP_TYPES[relationship.type]?.label ?? relationship.type}</text>`;
      }
    });
  }

  // District callouts in Graph View are graph-space annotations derived from the nodes that
  // are actually framed. Keeping them inside #world makes pan/zoom move the label, leader,
  // and nodes together; the separate City screen-space callouts stay hidden in this mode.
  graphCallouts.forEach((callout) => {
    const districtVisible = filter === 'All districts' || filter === callout.district;
    out += `
      <g class="graph-district-callout" data-district="${callout.district}" tabindex="0" role="button"
        aria-label="Explore ${callout.district}, ${callout.count} ${callout.count === 1 ? 'project' : 'projects'}"
        opacity="${districtVisible ? 0.96 : 0.18}" style="cursor:pointer"
        transform="translate(${callout.centerX} ${callout.nodeAnchorY}) scale(${annotationScale})">
        <path d="M0 -25L0 0" fill="none" stroke="${callout.color}" stroke-width="1"
          opacity="0.72" vector-effect="non-scaling-stroke" />
        <circle cx="0" cy="0" r="2.4" fill="${callout.color}"
          vector-effect="non-scaling-stroke" />
        <rect x="${-callout.labelWidth / 2}" y="-54" width="${callout.labelWidth}" height="38" rx="6"
          fill="#0d0c13ee" stroke="#3a3545" stroke-width="1" vector-effect="non-scaling-stroke" />
        <text x="0" y="-38" text-anchor="middle" fill="#eee9f4"
          font-size="14" font-weight="650">${callout.district}</text>
        <text x="0" y="-24" text-anchor="middle" fill="#8f889b"
          font-size="10.5">${callout.count} ${callout.count === 1 ? 'project' : 'projects'}</text>
      </g>`;
  });

  [...framedProjects]
    .sort((a, b) => a.x + a.y - (b.x + b.y))
    .forEach((project) => {
      const layout = layoutPositions?.get(project.id);
      const [x, y] = layout ? [layout.x, layout.y] : iso(project.x, project.y);
      const active = project.id === selected;
      const navigatorMatch = navigatorProjectHighlights.has(project.id);
      const external = inRelationshipsTab && project.district !== activeDistrict;
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

      const labelWidth = project.name.length * 9 + 26;
      const labelHeight = active ? 32 : 28;
      out += `<rect x="${x - labelWidth / 2}" y="${y + 11}" width="${labelWidth}" height="${labelHeight}" rx="5" fill="${active ? '#382b50' : '#121119e8'}" stroke="${active ? '#d1b9ff' : '#34303e'}" stroke-width="${active ? 1.4 : 0.8}" vector-effect="non-scaling-stroke" />`;
      out += `<text x="${x}" y="${y + (active ? 32 : 30)}" text-anchor="middle" fill="${active ? '#f5efff' : '#bbb4c5'}" font-size="${active ? 15 : 14}" font-weight="${active ? 650 : 500}">${project.name}</text>${external ? `<text x="${x}" y="${y + (active ? 53 : 49)}" text-anchor="middle" fill="#8f86a8" font-size="11">outside district</text>` : ''}`;
      out += '</g>';
    });

  document.querySelector('#world').innerHTML = out;
  if (graph && projects.length) {
    svgEl.setAttribute('viewBox', `${fittedVb.minX} ${fittedVb.minY} ${vbWidth} ${vbHeight}`);
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
  document.querySelectorAll('.graph-district-callout').forEach((element) => {
    const activate = () => navigateToDistrict(element.dataset.district);
    element.onclick = activate;
    element.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    };
  });

  updateCityContext();
}

function clearNavigatorHighlights() {
  navigatorProjectHighlights = new Set();
  navigatorRelationshipHighlights = new Set();
  navigatorTotalMatches = 0;
}

function select(id, { preserveNavigatorHighlights = false } = {}) {
  if (!preserveNavigatorHighlights) clearNavigatorHighlights();
  selected = id;
  // Connection focus is re-derived for every selection: the explicit "Show all" expansion
  // never leaks from one project to the next.
  showAllProjectLinks = false;
  dismissPlaque();
  if (!visible(selectedProject())) {
    filter = 'All districts';
    renderDistricts();
  }
  renderCity();
  renderPassport();
  setPassportExpanded(true);
  if (!graph) focusProjectOnMap(id, { neighborhood: linkMode === 'project' });
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
    if (matchMedia('(max-width: 940px)').matches) {
      document.querySelector('#city-gl').scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
    }
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

// Agentic AI layer: the deterministic result above renders instantly and stays the source
// of truth. Hosted Qwen Max is preferred when the server reports it ready; saved custom
// provider settings remain an optional fallback. No model request is made until a question.
let groundedAiAbort = null;
let hostedAiStatus = { checked: false, enabled: false, model: HOSTED_AI_MODEL };
let hostedAiStatusPromise = null;

function queueGroundedAnswer(result) {
  const card = document.querySelector('#navigator-result .navigator-result-card');
  if (!card) return;
  if (groundedAiAbort) groundedAiAbort.abort();
  if (!hostedAiStatus.checked) {
    hostedAiStatusPromise?.then(() => {
      if (card.isConnected && document.querySelector('#navigator-result .navigator-result-card') === card) {
        queueGroundedAnswer(result);
      }
    });
    return;
  }
  const settings = loadAiSettings();
  const useHosted = hostedAiStatus.enabled;
  if ((!useHosted && !aiEnabled(settings)) || ['unsupported-request', 'insufficient-evidence', 'invalid-query'].includes(result.outcome)) return;
  const mount = document.createElement('section');
  mount.className = 'navigator-ai';
  mount.innerHTML = `<p class="navigator-ai-label">${useHosted ? 'Qwen Max' : 'Custom AI'} · planning with the evidence graph…</p><details class="navigator-ai-trace"><summary>Tool details</summary><div class="navigator-ai-steps"></div></details>`;
  card.append(mount);
  const steps = mount.querySelector('.navigator-ai-steps');
  groundedAiAbort = new AbortController();
  const { signal } = groundedAiAbort;
  const request = useHosted
    ? runHostedNavigator({ question: result.query || '', evidenceRecords, signal })
    : runNavigatorAgent({
      question: result.query || '',
      registryCheck: REGISTRY_CONFIG.status === 'configured'
        ? (evidenceId) => checkRegistryRecord({ subjectId: evidenceId, snapshot: evidenceSnapshot, signal }) : undefined,
      projects,
      relationships,
      evidenceRecords,
      snapshot: {
        version: evidenceSnapshot.version,
        recordCount: evidenceSnapshot.records.length,
        reviewedAt: evidenceSnapshot.reviewedAt,
      },
      settings,
      signal,
      onStep: (step) => {
        if (signal.aborted || step.type !== 'tool') return;
        const line = document.createElement('p');
        line.className = 'navigator-ai-step';
        line.textContent = `→ ${step.summary}`;
        steps.append(line);
      },
    });
  request
    .then(({ text, model, mode, records, steps: returnedSteps = [] }) => {
      if (signal.aborted) return;
      if (mode === 'local-fallback') {
        mount.innerHTML = `
          <p class="navigator-ai-label">Local Navigator result</p>
          <p class="navigator-ai-status">${escapeHtml(result.answer.text)}</p>`;
        return;
      }
      const labels = {
        evidence: 'AI-selected evidence · exact source records',
        coverage: 'AI-selected scope · local graph counts',
        'insufficient-evidence': 'Evidence gap · local tools',
      };
      const traceHtml = useHosted
        ? returnedSteps.map((step) => `<p class="navigator-ai-step">→ ${escapeHtml(step)}</p>`).join('')
        : steps.innerHTML;
      const recordHtml = (records || []).map((record) => `
        <section class="navigator-ai-record">
          <p class="navigator-ai-text">${escapeHtml(record.status)} — ${escapeHtml(record.claim)} [${escapeHtml(record.id)}]</p>
          <a class="evidence-source" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.source)} ↗</a>
          ${record.warnings?.length ? `<p class="navigator-ai-note">Warnings: ${escapeHtml(record.warnings.join(', '))}.</p>` : ''}
          <details><summary>Scope &amp; limitations</summary>
            <p class="navigator-ai-note">${escapeHtml(record.scope || '')}</p>
            <p class="navigator-ai-note">${escapeHtml((record.limitations || []).join(' '))}</p>
          </details>
        </section>`).join('');
      mount.innerHTML = `
        <p class="navigator-ai-label">${escapeHtml(labels[mode] || 'Local graph result')} · ${useHosted ? 'Qwen Max' : escapeHtml(model)}</p>
        ${useHosted ? `<p class="navigator-ai-note">Hosted model: ${escapeHtml(model)}</p>` : ''}
        <details class="navigator-ai-trace"><summary>Tool details</summary><div class="navigator-ai-steps">${traceHtml}</div></details>
        ${recordHtml || `<p class="navigator-ai-text">${escapeHtml(text)}</p>`}
        <p class="navigator-ai-note">${mode === 'evidence' ? 'AI selects relevance; source records retain their exact scope. Citation IDs were checked against eligible records retrieved by the tools.' : 'This result uses only the local graph tool output.'} The local result controls the map.</p>`;
    })
    .catch((error) => {
      if (signal.aborted || error?.name === 'AbortError') return;
      mount.innerHTML = `
        <p class="navigator-ai-label">${error?.message?.includes('incomplete (token limit)') ? 'AI response incomplete' : 'Grounded AI unavailable'}</p>
        <details class="navigator-ai-trace"><summary>Tool details</summary><div class="navigator-ai-steps">${steps.innerHTML}</div></details>
        <p class="navigator-ai-status">${escapeHtml(error?.message || 'Unknown error')}</p>
        <p class="navigator-ai-note">The deterministic result above is unaffected.</p>`;
    });
}

function reflectAiState() {
  const settings = loadAiSettings();
  const stateLabel = document.querySelector('#ai-state');
  if (!hostedAiStatus.checked) {
    stateLabel.textContent = 'Checking…';
    stateLabel.title = 'Checking hosted Qwen Max configuration';
  } else if (hostedAiStatus.enabled) {
    stateLabel.textContent = 'Qwen Max';
    stateLabel.title = `Hosted model configured: ${hostedAiStatus.model}`;
  } else if (aiEnabled(settings)) {
    stateLabel.textContent = 'Custom';
    stateLabel.title = `Custom model: ${settings.model}`;
  } else {
    stateLabel.textContent = 'Off';
    stateLabel.title = 'Hosted Qwen Max is unavailable and no custom provider is configured';
  }
}

function initAiPanel() {
  const form = document.querySelector('#ai-form');
  const settings = loadAiSettings();
  document.querySelector('#ai-base-url').value = settings.baseUrl;
  document.querySelector('#ai-model').value = settings.model;
  document.querySelector('#ai-key').value = settings.apiKey;
  reflectAiState();
  hostedAiStatusPromise = fetchHostedAiStatus().then((status) => {
    hostedAiStatus = { checked: true, ...status };
    reflectAiState();
    return hostedAiStatus;
  });
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

function refreshLinkButtons() {
  document.querySelector('.legend').dataset.mode = linkMode;
  const activeButton = document.querySelector(`.legend-links button[data-link-mode="${linkMode}"]`);
  const activeLabel = activeButton?.textContent?.trim() || 'Overview';
  const currentLabel = document.querySelector('.connections-current');
  const trigger = document.querySelector('.connections-trigger');
  if (currentLabel) currentLabel.textContent = activeLabel;
  if (trigger) trigger.setAttribute('aria-label', `Connections, current mode: ${activeLabel}`);
  document.querySelectorAll('.legend-links button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.linkMode === linkMode));
    if (button.dataset.linkMode === 'project') {
      button.disabled = !selected;
      button.title = selected ? 'Show the selected project’s connection focus' : 'Select a building to explore its connections';
    }
  });
}

function setLinkMode(mode) {
  linkMode = mode;
  // Transition 4/6 (brief §7): entering Project focus frames the selected project; returning
  // to Overview restores the district/overview camera context.
  if (mode === 'project' && selected) {
    city3d.focusProject(selected, { neighborhood: true });
  } else if (mode === 'overview') {
    if (scope === 'district' && activeDistrict) city3d.enterDistrict(activeDistrict, { animate: !reducedMotion });
    else city3d.reset();
  }
  refreshLinkButtons();
  renderCity();
  if (matchMedia('(max-width: 940px)').matches) {
    document.querySelector('#city-gl').scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
  }
}

function focusNavigatorRelationship(id) {
  const relationship = relationships.find((item) => item.id === id);
  if (!relationship) return;
  setMapView('graph');
  refreshLinkButtons();
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
  navigatorTotalMatches = Number(result.rankProjectCount ?? navigatorProjectHighlights.size ?? 0);
  // A large result never yanks the map into the dense whole-graph view: the buildings carry
  // the highlight, the full answer stays in the Navigator panel, and the connection focus
  // (Project mode) is the explicit way to draw the lines.
  const largeResult = navigatorTotalMatches > 12 || navigatorRelationshipHighlights.size > 12;
  refreshLinkButtons();
  if (!largeResult) {
    setMapView(action.view);
  }
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

function formatReviewDate(timestamp) {
  if (!timestamp) return 'Unavailable';
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
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
    approved: 'Approved source record',
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
        <span class="evidence-state-word" data-state="${escapeHtml(record.status || 'Unavailable')}">${escapeHtml(record.status || 'Unavailable')}</span>
        ${sourceLink}
      </div>
      <details class="record-audit">
        <summary>Full record</summary>
        <dl class="evidence-list">
          <div><dt>Record</dt><dd>${escapeHtml(record.id)}</dd></div>
          <div><dt>Claim type</dt><dd>${escapeHtml(record.evidenceType || 'Unavailable')}</dd></div>
          <div><dt>Source review</dt><dd><span class="review-status approved">${escapeHtml(reviewStatusLabel(record.reviewStatus))}</span>${record.reviewedAt ? `<br />${escapeHtml(formatTimestamp(record.reviewedAt))}` : ''}</dd></div>
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
        ${registryPublicationControl('evidence', record.id)}
      </details>
    </article>`;
}

function registryPublicationControl(kind, id) {
  const configured = REGISTRY_CONFIG.status === 'configured';
  return `<section class="registry-publication" data-registry-kind="${escapeHtml(kind)}" data-registry-id="${escapeHtml(id)}">
    <strong>Onchain publication</strong>
    <p class="registry-result" role="status">${configured ? 'Not checked. Read the configured registry at a specific block.' : registryStatusText({ status: 'unconfigured' })}</p>
    <button type="button" class="registry-check" ${configured ? '' : 'disabled'}>Check publication</button>
    <small>Inclusion records publication of this exact data. Source accuracy, safety and freshness require separate review. Results rely on the configured network provider and describe only the checked block.</small>
  </section>`;
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('.registry-check');
  if (!button || button.disabled) return;
  const section = button.closest('.registry-publication');
  const resultElement = section.querySelector('.registry-result');
  button.disabled = true;
  resultElement.textContent = 'Checking publication…';
  const result = await checkRegistryRecord({ subjectKind: section.dataset.registryKind,
    subjectId: section.dataset.registryId, snapshot: evidenceSnapshot });
  if (!section.isConnected) return;
  resultElement.textContent = registryStatusText(result)
    + (result.blockNumber ? ` Chain ${result.chainId}, block ${result.blockNumber}.` : '');
  section.dataset.registryStatus = result.status;
  if (result.blockHash) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Inspect publication check';
    const text = document.createElement('pre');
    text.textContent = JSON.stringify(result, null, 2);
    details.append(summary, text);
    section.querySelector('details')?.remove();
    section.append(details);
  }
  button.disabled = false;
});

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

let passportTab = 'overview';
let passportTabProject = null;

function passportConnectionRow({ relationship, project: connected }) {
  const evidenceState = RELATIONSHIP_STATES[relationship.evidenceState];
  const relationshipType = RELATIONSHIP_TYPES[relationship.type];
  const sourced = isApprovedSourcedRelationship(relationship);
  const label = sourced ? relationship.claimStatus : evidenceState.shortLabel;
  return `
    <article class="relationship-card ${sourced ? 'sourced-relationship' : ''}" data-relationship="${relationship.id}">
      <button class="connection" data-project="${connected.id}">
        <span class="connection-logo" style="color:${connected.color}">${connected.abbr}</span>
        <span class="connection-copy">
          <strong>${connected.name}</strong>
          <small>${relationshipType.label}</small>
        </span>
        <span class="connection-state">${escapeHtml(label)}</span>
        <span class="connection-arrow" aria-hidden="true">›</span>
      </button>
    </article>`;
}

function passportConnectionCard({ relationship, project: connected }) {
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
          <span>Evidence</span>
          <span class="summary-state">${sourced ? `${relationship.claimStatus} · ${relationship.evidenceState}` : evidenceState.label}</span>
        </summary>
        <p class="evidence-meaning">${sourced ? `This relationship is a limited source-backed ${relationship.claimStatus} claim. It is not a global verification, endorsement, or current-operation statement.` : evidenceState.meaning}</p>
        <div class="relationship-type">
          <span>Relationship type</span>
          <strong>${relationshipType.label}</strong>
          <code>${relationship.type}</code>
        </div>
        ${sourced ? `<div class="relationship-evidence-ids"><strong>Exact evidence IDs</strong><span>${relationship.evidenceIds.map(escapeHtml).join(', ')}</span></div><p class="relationship-scope">${escapeHtml(relationship.scope)}</p>${governanceDetails('relationship', relationship.id)}${registryPublicationControl('relationship', relationship.id)}<div class="exact-evidence-list">${records.map((record) => evidenceRecordCard(record)).join('')}</div>` : evidenceList(relationship)}
      </details>
    </article>`;
}

function passportOverviewHtml(projectRecords, connections) {
  const sourcedConnections = connections.filter(({ relationship }) => isApprovedSourcedRelationship(relationship));
  const featured = (sourcedConnections.length ? sourcedConnections : connections).slice(0, 3);
  const headingLabel = sourcedConnections.length
    ? 'Documented connections'
    : connections.length ? 'Connections' : 'No connections yet';
  const rows = featured.map(passportConnectionRow).join('');
  const scopeNote = featured[0]?.relationship.scope;
  const viewAll = connections.length > featured.length
    ? `<button type="button" class="view-all" data-tab="connections">View all ${connections.length} connections <span aria-hidden="true">→</span></button>`
    : '';
  return `
    <h3 class="panel-heading">${headingLabel}</h3>
    ${featured.length ? `<div class="connections">${rows}</div>` : '<p class="passport-empty">Connections appear only from relationship records — never from proximity or shared category.</p>'}
    ${scopeNote ? `<p class="overview-note">${escapeHtml(scopeNote)}</p>` : ''}
    ${viewAll}
    <button type="button" class="sources-link" data-tab="sources">
      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 1.5h5.2L13 5.3V14.5H4z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M9 1.8V5.4h3.7" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 8.2h5M6 10.6h5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
      <span class="sources-copy"><strong>Sources &amp; publication</strong><small>${projectRecords.length ? `${plural(projectRecords.length, 'record')} · Inspect details` : 'Illustrative profile · no evidence records'}</small></span>
      <span class="connection-arrow" aria-hidden="true">›</span>
    </button>`;
}

function passportConnectionsHtml(connections) {
  // Pinned Monad row: every profile lives in Monad City, so the L1 is offered as navigation.
  // It is identity, not a relationship claim — projects with a real monad edge already list
  // it among their sourced connections and get no duplicate row.
  const hasMonadEdge = connections.some(({ relationship }) => relationship.from === 'monad' || relationship.to === 'monad');
  const monadRow = hasMonadEdge ? '' : `
    <article class="relationship-card">
      <button class="connection" data-project="monad">
        <span class="connection-logo" style="color:#a58aff">M</span>
        <span class="connection-copy">
          <strong>Monad</strong>
          <small>Layer 1 network</small>
        </span>
        <span class="connection-state">L1</span>
        <span class="connection-arrow" aria-hidden="true">›</span>
      </button>
    </article>`;
  if (!connections.length) {
    return `${monadRow}<p class="passport-empty">Connections appear only from relationship records — never from proximity or shared category.</p>`;
  }
  return `${monadRow}<div class="connections connections-full">${connections.map(passportConnectionCard).join('')}</div>`;
}

function passportSourcesHtml(projectRecords, project) {
  return `
    ${projectRecords.length
      ? `<div class="exact-evidence-list">${projectRecords.map((record) => evidenceRecordCard(record)).join('')}</div>`
      : `<div class="evidence-panel project-evidence">${evidenceList(project.evidence)}</div>`}
    <details class="snapshot-audit">
      <summary>Source review <span>${escapeHtml(formatReviewDate(evidenceSnapshot.reviewedAt))}</span></summary>
      <div class="passport-snapshot">
        <span>APPROVED SOURCE SET</span>
        <strong>Reviewed ${escapeHtml(formatSnapshotDate(evidenceSnapshot.reviewedAt))}</strong>
        <small>Created ${escapeHtml(formatSnapshotDate(evidenceSnapshot.createdAt))} · review recorded ${escapeHtml(formatSnapshotDate(evidenceSnapshot.reviewedAt))}</small>
        <small>Governance checked ${escapeHtml(formatSnapshotDate(REVIEW_GOVERNANCE_AS_OF))}</small>
        <small>${reviewGovernance.summary.reviewCurrent} review current · ${reviewGovernance.summary.reviewDue} due across ${reviewGovernance.summary.subjects} governed subjects</small>
      </div>
    </details>`;
}

function renderPassport() {
  if (scope === 'district' && !selected) {
    renderDistrictLens();
    return;
  }
  const project = selectedProject();
  if (!project) {
    document.querySelector('#passport').innerHTML = '';
    return;
  }
  const projectRecords = evidenceForProject(project.id);
  const connections = relationshipsForProject(project.id).map((relationship) => ({
    relationship,
    project: connectedProject(relationship, project.id),
  }));
  const passportProjectChanged = passportTabProject !== project.id;
  if (passportProjectChanged) {
    passportTab = 'overview';
    passportTabProject = project.id;
  }
  const primaryRecord = projectRecords[0];
  const primarySourceTitle = primaryRecord?.source?.title || '';
  const headMeta = projectRecords.length
    ? `${escapeHtml(primarySourceTitle)} · ${escapeHtml(primaryRecord.status)}`
    : escapeHtml(project.state);

  document.querySelector('#passport').innerHTML = `
    <div class="passport-head">
      <div class="passport-title-row">
        ${scope === 'district' ? '<button type="button" class="lens-back" id="back-to-lens" aria-label="Back to District Lens">‹ District</button>' : ''}
        <h2>${project.name}</h2>
        <button class="panel-collapse" id="passport-collapse" aria-expanded="true" aria-label="Collapse project passport">—</button>
      </div>
      <p class="passport-subtitle">${escapeHtml(project.type)} · ${escapeHtml(project.district)}</p>
      <p class="project-description">${project.description}</p>
      <p class="passport-head-meta">${headMeta}</p>
      <div class="project-actions">
        ${
          project.site
            ? `<a href="https://${project.site}" target="_blank" rel="noopener noreferrer">Website <span>↗</span></a>`
            : '<span class="mock-site">Concept profile — no public site</span>'
        }
        <button type="button" id="focus-project" class="focus-link" aria-label="Focus ${project.name} on map">Focus on map</button>
      </div>
    </div>

    <div class="passport-body">
      <div class="passport-tabs" role="tablist" aria-label="Passport sections">
        <button type="button" class="passport-tab" role="tab" data-tab="overview" aria-selected="${passportTab === 'overview'}">Overview</button>
        <button type="button" class="passport-tab" role="tab" data-tab="connections" aria-selected="${passportTab === 'connections'}">Connections <span class="tab-count">${connections.length}</span></button>
        <button type="button" class="passport-tab" role="tab" data-tab="sources" aria-selected="${passportTab === 'sources'}">Sources <span class="tab-count">${projectRecords.length}</span></button>
      </div>
      <div class="passport-tabpanel" role="tabpanel">
        ${
          passportTab === 'connections'
            ? passportConnectionsHtml(connections)
            : passportTab === 'sources'
              ? passportSourcesHtml(projectRecords, project)
              : passportOverviewHtml(projectRecords, connections)
        }
      </div>
    </div>

    <p class="passport-note">Statuses apply to individual claims.</p>
  `;

  if (passportProjectChanged) document.querySelector('#passport').scrollTop = 0;

  document.querySelectorAll('.passport-tab, .view-all, .sources-link').forEach((element) => {
    element.onclick = () => {
      passportTab = element.dataset.tab;
      // Opening the connection surface is the explicit transition into connection focus
      // (brief §7, transition 4): the map shows the selected project's edges with counts.
      if (passportTab === 'connections' && linkMode === 'overview') setLinkMode('project');
      renderPassport();
    };
  });

  document.querySelectorAll('.connection').forEach((element) => {
    element.onclick = () => select(element.dataset.project);
  });

  document.querySelector('#focus-project').onclick = () => {
    focusProjectOnMap(project.id);
  };

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
    <div class="plaque-title">${escapeHtml(activeDistrict)}</div>
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
        <h2 class="lens-title">District lens</h2>
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
  linkMode = 'overview';
  showAllProjectLinks = false;
  refreshLinkButtons();
  if (scope === 'district') {
    // District framing: reset returns to the island view, not the global camera.
    city3d.enterDistrict(activeDistrict, { animate: !reducedMotion });
    renderCity();
    return;
  }
  filter = 'All districts';
  selected = null;
  clearNavigatorHighlights();
  document.querySelector('#search').value = '';
  city3d.reset();
  renderDistricts();
  renderCity();
  renderPassport();
  setPassportExpanded(false);
}

const connectionsDisclosure = document.querySelector('.connections-disclosure');
const connectionsTrigger = document.querySelector('.connections-trigger');

function closeConnectionsDisclosure({ restoreFocus = false } = {}) {
  if (!connectionsDisclosure?.open) return;
  connectionsDisclosure.open = false;
  if (restoreFocus) connectionsTrigger?.focus({ preventScroll: true });
}

document.querySelectorAll('.legend-links button').forEach((button) => {
  button.onclick = () => {
    setLinkMode(button.dataset.linkMode);
    closeConnectionsDisclosure({ restoreFocus: true });
  };
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !connectionsDisclosure?.open) return;
  event.preventDefault();
  closeConnectionsDisclosure({ restoreFocus: true });
});

document.addEventListener('pointerdown', (event) => {
  if (!connectionsDisclosure?.open || connectionsDisclosure.contains(event.target)) return;
  closeConnectionsDisclosure();
});

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
let graphResizeFrame = null;

window.addEventListener('resize', () => {
  if (!graph) return;
  if (graphResizeFrame !== null) cancelAnimationFrame(graphResizeFrame);
  graphResizeFrame = requestAnimationFrame(() => {
    graphResizeFrame = null;
    renderSvgCity();
  });
});

svg.onpointerdown = (event) => {
  if (event.target.closest('.building, .graph-district-callout')) return;
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
