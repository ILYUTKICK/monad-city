// District experience configuration (presentation + navigation metadata ONLY).
// Factual project/evidence data stays in the existing data path (main.js/evidence.js).
// A district is a navigational category: it is not geography, ownership, endorsement,
// ranking, or proof that colocated projects integrate. Cluster membership never creates
// a relationship. Counts are never stored here — every visible number derives from data.

export const DISTRICT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'evidence', label: 'Evidence' },
];

export const DISTRICT_EXPERIENCES = {
  DeFi: {
    slug: 'defi',
    glyph: '◫',
    accent: '#9ad7c6',
    title: 'DEFI DISTRICT',
    subtitle: 'Markets, liquidity and staking',
    tagline: 'Explore protocols by capability, connection and available evidence.',
    clusters: [
      { id: 'trading', label: 'Trading', matchTypes: ['dex', 'dexs', 'dex aggregator', 'derivatives', 'trading interfaces', 'prediction market', 'onchain exchange'] },
      { id: 'credit', label: 'Credit', matchTypes: ['lending', 'cdp', 'uncollateralized lending', 'risk curators'] },
      { id: 'yield', label: 'Yield & staking', matchTypes: ['yield', 'yield aggregator', 'liquid staking', 'liquid restaking', 'onchain capital allocator'] },
      { id: 'assets', label: 'Assets & payments', matchTypes: ['rwa', 'stablecoin', 'payments', 'asset issuers', 'neobanks', 'algo-stables'] },
    ],
    prompts: [
      'Which DeFi projects have source-backed evidence?',
      'Show lending projects and their available evidence.',
      'Show sourced relationships in DeFi.',
    ],
  },
  Infrastructure: {
    slug: 'infrastructure',
    glyph: '▥',
    accent: '#aa8ae8',
    title: 'INFRASTRUCTURE DISTRICT',
    subtitle: 'Networks, data and connective services',
    tagline: 'Trace the systems and sourced links that support the ecosystem graph.',
    clusters: [
      { id: 'data', label: 'Data & oracles', matchTypes: ['oracle infrastructure', 'price oracle', 'data'] },
      { id: 'interop', label: 'Interoperability', matchTypes: ['bridge', 'cross chain bridge', 'interoperability'] },
      { id: 'privacy', label: 'Privacy & security', matchTypes: ['privacy', 'privacy / encryption'] },
      { id: 'services', label: 'Other services', matchTypes: ['prediction market', 'e-commerce / ticketing', 'social'] },
    ],
    prompts: [
      'Which infrastructure projects have source-backed evidence?',
      'Show oracle projects and their cited scope.',
      'Which sourced relationships cross into DeFi?',
    ],
  },
  AI: {
    slug: 'ai',
    glyph: '✧',
    accent: '#91baff',
    title: 'AI DISTRICT',
    subtitle: 'Agents, models and intelligent services',
    tagline: 'Explore a limited district through capabilities, sources and graph context.',
    clusters: [
      { id: 'agent-infra', label: 'Agent infrastructure', matchTypes: ['ai agent infrastructure'] },
      { id: 'consumer-ai', label: 'Consumer AI', matchTypes: ['consumer ai'] },
    ],
    prompts: [
      'Show AI projects and their evidence states.',
      'What information is missing for AI projects?',
      'Show sourced AI relationships outside this district.',
    ],
  },
  Gaming: {
    slug: 'gaming',
    glyph: '⚄',
    accent: '#dbac80',
    title: 'GAMING DISTRICT',
    subtitle: 'Games, worlds and player experiences',
    tagline: 'Discover projects and inspect the evidence behind their ecosystem connections.',
    clusters: [
      { id: 'games', label: 'Games', matchTypes: ['games', 'luck games'] },
      { id: 'studios', label: 'Studios & platforms', matchTypes: ['game studio', 'onchain arcade', 'mobile-first'] },
      { id: 'markets', label: 'Markets', matchTypes: ['marketplace', 'nft marketplace'] },
    ],
    prompts: [
      'Show source-backed projects in Gaming.',
      'Which Gaming projects are illustrative Demo entries?',
      'What evidence is available for Gaming projects?',
    ],
  },
  Identity: {
    slug: 'identity',
    glyph: '◎',
    accent: '#d89cc9',
    title: 'IDENTITY DISTRICT',
    subtitle: 'Identity, reputation and access',
    tagline: 'Inspect a small, evidence-aware view of identity-related projects.',
    clusters: [
      { id: 'identity', label: 'Identity', matchTypes: ['digital identity'] },
    ],
    prompts: [
      'Show identity projects and their evidence states.',
      'What claims are source-backed in Identity?',
      'What information is missing in this district?',
    ],
  },
};

export const DISTRICT_SLUGS = Object.fromEntries(
  Object.entries(DISTRICT_EXPERIENCES).map(([district, config]) => [config.slug, district]),
);

export function districtBySlug(slug) {
  return DISTRICT_SLUGS[slug] ?? null;
}

export function districtSlug(district) {
  return DISTRICT_EXPERIENCES[district]?.slug ?? null;
}

const CLUSTER_OTHER = { id: 'other', label: 'Other' };

export function districtClusterForType(config, type) {
  const normalized = String(type ?? '').toLowerCase().trim();
  const matched = config.clusters.find((cluster) =>
    cluster.matchTypes.some((matchType) => normalized === matchType),
  );
  return matched ?? CLUSTER_OTHER;
}

export function districtClusterList(config, projects) {
  const counts = new Map();
  projects.forEach((project) => {
    const cluster = districtClusterForType(config, project.type);
    counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
  });
  const ordered = config.clusters
    .filter((cluster) => counts.has(cluster))
    .map((cluster) => ({ ...cluster, count: counts.get(cluster) }));
  if (counts.has(CLUSTER_OTHER)) {
    ordered.push({ ...CLUSTER_OTHER, count: counts.get(CLUSTER_OTHER) });
  }
  return ordered;
}

// ---- data-derived selectors (pure; no counts are stored anywhere) ----

export function getDistrictProjects(projects, district) {
  return projects.filter((project) => project.district === district);
}

export function getDistrictRelationships(relationships, districtProjectIds, { includeExternal = true } = {}) {
  return relationships.filter((relationship) => {
    const fromIn = districtProjectIds.has(relationship.from);
    const toIn = districtProjectIds.has(relationship.to);
    if (fromIn && toIn) return true;
    return includeExternal && (fromIn || toIn);
  });
}

export function getDistrictEvidence(evidenceRecords, districtProjectIds) {
  return evidenceRecords.filter((record) => districtProjectIds.has(record.projectId));
}

export function getDistrictTypes(projects) {
  return [...new Set(projects.map((project) => project.type).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

// Coverage exposes plain facts only. It must never collapse into a score or imply that a
// district is verified, healthy, active, official, or complete.
export function getDistrictCoverage({ projects, evidenceRecords, relationships, districtProjectIds }) {
  const districtEvidence = evidenceRecords.filter((record) => districtProjectIds.has(record.projectId));
  const projectIdsWithEvidence = new Set(districtEvidence.map((record) => record.projectId));
  const districtRelationships = relationships.filter((relationship) => {
    const fromIn = districtProjectIds.has(relationship.from);
    const toIn = districtProjectIds.has(relationship.to);
    return fromIn || toIn;
  });
  const sourced = districtRelationships.filter((relationship) => relationship.dataMode === 'sourced-limited');
  const external = districtRelationships.filter((relationship) => {
    const fromIn = districtProjectIds.has(relationship.from);
    const toIn = districtProjectIds.has(relationship.to);
    return fromIn !== toIn;
  });
  return {
    totalProjects: projects.length,
    sourceBackedProjects: projects.filter((project) => projectIdsWithEvidence.has(project.id)).length,
    illustrativeProjects: projects.filter((project) => !projectIdsWithEvidence.has(project.id)).length,
    relationships: districtRelationships.length,
    sourcedRelationships: sourced.length,
    illustrativeRelationships: districtRelationships.length - sourced.length,
    externalRelationships: external.length,
    evidenceRecords: districtEvidence.length,
    warningRecords: districtEvidence.filter(
      (record) => record.quality?.stale || record.quality?.conflict || record.quality?.incomplete || record.quality?.unavailable,
    ).length,
  };
}

// Deterministic featured order, visible in accessible copy: Navigator matches first, then
// projects with approved evidence, then alphabetical. Featured never means endorsed, ranked,
// safest, largest, or most active.
export function getDistrictFeaturedProjects({ projects, districtProjectIds, evidenceRecords, navigatorMatches = [], limit = 4 }) {
  const inDistrict = projects.filter((project) => districtProjectIds.has(project.id));
  const byId = new Map(inDistrict.map((project) => [project.id, project]));
  const matchIds = navigatorMatches.filter((id) => byId.has(id));
  const hasEvidence = (project) =>
    evidenceRecords.some((record) => record.projectId === project.id && record.reviewStatus === 'approved');
  const rest = inDistrict
    .filter((project) => !matchIds.includes(project.id))
    .sort((left, right) => {
      const evidenceDelta = Number(hasEvidence(right)) - Number(hasEvidence(left));
      if (evidenceDelta !== 0) return evidenceDelta;
      return left.name.localeCompare(right.name);
    });
  return [...matchIds.map((id) => byId.get(id)), ...rest].slice(0, limit);
}
