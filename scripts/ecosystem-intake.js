#!/usr/bin/env node
// Phase 5.0 ecosystem intake (build-time only, dependency-free, no runtime fetch).
//
// Reads the dated seed artifacts in data/research/ (DefiLlama Monad listing + official Monad
// App Portal capture), resolves identities across sources, applies the inclusion bar from
// docs/ECOSYSTEM_SCALE_PLAN.md §3, drafts project manifests and evidence-record candidates
// per docs/EVIDENCE_DATA_CONTRACT.md, and writes a dated proposals draft plus an
// identity/dedupe report into data/research/.
//
// Hard boundaries:
// - never writes to data/evidence-snapshots/, src/evidence-snapshots/, or src/;
// - never approves anything: every evidence candidate is `proposed` with `reviewedAt: null`
//   and requires a human source inspection through the existing evidence workflow before any
//   review decision (phase-3.7 policy);
// - no ranking or activity signal is carried into manifests: placement and coverage decisions
//   stay with the human reviewers.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  CURATED_PROJECT_IDS,
  EVIDENCE_DATA_MODE,
  EVIDENCE_STATUSES,
  EVIDENCE_SUPPORT_MODES,
  EVIDENCE_TYPES,
  KNOWN_PROJECT_IDS,
  validateCandidateEvidenceRecord,
} from '../src/evidence.js';

const INTAKE_VERSION = 'phase-5.0';
const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
const RESEARCH_DIR = path.join('data', 'research');
const FORBIDDEN_OUTPUT_MARKERS = ['data/evidence-snapshots', 'src/evidence-snapshots', 'src/'];

// (evidenceType | source.referenceType) pairs allowed by the phase-3.7 cadence table in
// docs/EVIDENCE_DATA_CONTRACT.md. Any other pair is a validation error.
const CADENCE_PAIRS = new Set([
  'official-directory-listing|mutable-url',
  'project-address-publication|mutable-url',
  'project-declared-relationship|mutable-url',
  'network-configuration|mutable-url',
  'project-documentation|mutable-url',
  'official-launch-record|mutable-url',
  'protocol-registry-snapshot|pinned-snapshot',
  'explorer-transaction|stable-artifact-url',
]);

// Mirror of the project identities already in the city (src/main.js `projects` + the curated
// six in src/evidence.js). Keep in sync when src/main.js changes. Match on names and domains
// only — internal demo ids are NOT real identities (e.g. the fictional "Pixel Forge" reuses a
// legacy internal id "kintsu" and must never dedupe the real Kintsu staking project).
const EXISTING_CITY_PROJECTS = [
  { cityId: 'monad', curated: true, names: ['Monad'], domains: ['monad.xyz'] },
  { cityId: 'kuru', curated: true, names: ['Kuru', 'Kuru CLOB', 'Kuru Exchange'], domains: ['kuru.io'] },
  { cityId: 'aPriori', curated: true, names: ['aPriori', 'APR'], domains: ['apriori.fi', 'apr.io'] },
  { cityId: 'magma', curated: true, names: ['Magma', 'Magma Staking'], domains: ['magma.finance', 'magmastaking.xyz'] },
  { cityId: 'switchboard', curated: true, names: ['Switchboard'], domains: ['switchboard.xyz'] },
  { cityId: 'pyth', curated: true, names: ['Pyth Network', 'Pyth'], domains: ['pyth.network'] },
  { cityId: 'talus', curated: false, names: ['Talus'], domains: ['talus.network'] },
  {
    cityId: 'nad-arcade',
    curated: false,
    names: ['Nad Arcade'],
    domains: [],
    note: 'Illustrative Demo project; deliberately not matched against the real Nad.fun launchpad.',
  },
  {
    cityId: 'pixel-forge',
    curated: false,
    names: ['Pixel Forge'],
    domains: [],
    note: 'Fictional Demo project (legacy internal id "kintsu"); deliberately not matched against the real Kintsu staking project.',
  },
  { cityId: 'moca', curated: false, names: ['Moca Network', 'Moca'], domains: ['moca.network'] },
];

// District is navigational layout only, never a claim. Unmapped categories stay null and are
// flagged for human assignment.
const DISTRICT_BY_CATEGORY = {
  dexs: 'DeFi',
  dexes: 'DeFi',
  derivatives: 'DeFi',
  options: 'DeFi',
  perpetuals: 'DeFi',
  lending: 'DeFi',
  'lend & borrow': 'DeFi',
  cdp: 'DeFi',
  'liquid staking': 'DeFi',
  staking: 'DeFi',
  restaking: 'DeFi',
  yield: 'DeFi',
  'yield aggregator': 'DeFi',
  launchpad: 'DeFi',
  'leverage trading': 'DeFi',
  trading: 'DeFi',
  'prediction market': 'DeFi',
  payment: 'DeFi',
  rwa: 'DeFi',
  'asset issuer': 'DeFi',
  bridge: 'Infrastructure',
  oracle: 'Infrastructure',
  infrastructure: 'Infrastructure',
  data: 'Infrastructure',
  analytics: 'Infrastructure',
  wallet: 'Infrastructure',
  explorer: 'Infrastructure',
  interoperability: 'Infrastructure',
  gaming: 'Gaming',
  collectibles: 'Gaming',
  nft: 'Gaming',
  marketplace: 'Gaming',
  entertainment: 'Gaming',
  sports: 'Gaming',
  agent: 'AI',
  ai: 'AI',
  robotics: 'AI',
  identity: 'Identity',
  'uncollateralized lending': 'DeFi',
  'onchain capital allocator': 'DeFi',
  'risk curators': 'DeFi',
  'cross chain bridge': 'Infrastructure',
  privacy: 'Infrastructure',
  'liquidity automation': 'DeFi',
  'liquid restaking': 'DeFi',
  payments: 'DeFi',
  cedifi: 'DeFi',
  cedefi: 'DeFi',
  'nft marketplace': 'Gaming',
  'leveraged farming': 'DeFi',
  cefi: 'DeFi',
  services: 'Infrastructure',
  synthetics: 'DeFi',
  insurance: 'DeFi',
};

const STRIPPED_TRAILING_TOKENS = new Set([
  'amm',
  'dex',
  'cl',
  'classic',
  'legacy',
  'spot',
  'perps',
  'perp',
  'clob',
  'staking',
  'exchange',
  'swap',
  'vault',
  'liquidity',
  'mainnet',
  'testnet',
]);

const DEMO_NAME_OVERLAP_WATCHLIST = {
  kintsu:
    'Real Kintsu (liquid staking) is name-similar to the fictional Demo building "Pixel Forge", which reuses the legacy internal id "kintsu". They are different entities; do not merge.',
  'nad-fun':
    'Real Nad.fun (launchpad) is name-similar to the illustrative Demo building "Nad Arcade" (internal id "nadfun"). They are different entities; do not merge.',
};

function utcDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function canonicalJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertSafeOutputPath(outPath) {
  const normalized = path.resolve(outPath).replace(/\\/g, '/');
  const root = path.resolve(process.cwd()).replace(/\\/g, '/');
  if (!normalized.startsWith(root)) {
    throw new Error(`Output path escapes the repository: ${normalized}`);
  }
  FORBIDDEN_OUTPUT_MARKERS.forEach((marker) => {
    if (normalized.includes(marker)) {
      throw new Error(
        `Refusing to write ${normalized}: intake output must never touch snapshots or src/. ` +
          'Output belongs in data/research/ only.',
      );
    }
  });
  if (!normalized.startsWith(path.resolve(RESEARCH_DIR).replace(/\\/g, '/'))) {
    throw new Error(`Intake output must stay inside ${RESEARCH_DIR}/: ${normalized}`);
  }
}

function assertExclusiveOutput(outPath) {
  if (fs.existsSync(outPath)) {
    throw new Error(
      `Refusing to overwrite existing file: ${outPath}. Intake outputs are dated audit artifacts.`,
    );
  }
}

function parseArgs(argv) {
  const options = { defillama: null, portal: null, out: null, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const needsValue = ['--defillama', '--portal', '--out', '--report'];
    if (needsValue.includes(arg)) {
      options[arg.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function latestArtifact(prefix) {
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    throw new Error(
      `No seed artifact ${prefix}-<date>.json found in ${RESEARCH_DIR}/. Run the research fetch scripts first.`,
    );
  }
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function readJsonArtifact(filePath, expectedKind) {
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (value.kind !== expectedKind) {
    throw new Error(`${filePath} is not a ${expectedKind} artifact (kind: ${value.kind})`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Identity resolution
// ---------------------------------------------------------------------------

function normalizeName(name) {
  const cleaned = String(name)
    .toLowerCase()
    .replace(/[’'".,_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let tokens = cleaned.split(' ').filter(Boolean);
  // Trailing variant tokens ("Uniswap V3", "Kuru CLOB", "Monday Trade Perps") are deployment
  // or product variants of one project; matching strips them, canonical naming keeps them.
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (STRIPPED_TRAILING_TOKENS.has(last) || /^v?\d+(\.\d+)*$/.test(last)) tokens.pop();
    else break;
  }
  return tokens.join(' ');
}

function registrableDomain(url) {
  if (!url || typeof url !== 'string') return null;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  const parts = host.split('.');
  return parts.length <= 2 ? host : parts.slice(-2).join('.');
}

function kebabCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createGroup() {
  return {
    defillama: [],
    portalDirectory: [],
    portalFeatured: [],
    portalMostActive: [],
    domains: new Set(),
    portalSlugs: new Set(),
    rawNames: new Set(),
  };
}

class IdentityIndex {
  constructor() {
    this.byNormName = new Map();
    this.byDomain = new Map();
    this.byPortalSlug = new Map();
    this.groups = [];
  }

  place(group, { normName = null, domain = null, portalSlug = null }) {
    this.groups.push(group);
    if (normName && !this.byNormName.has(normName)) this.byNormName.set(normName, group);
    if (domain && !this.byDomain.has(domain)) this.byDomain.set(domain, group);
    if (portalSlug && !this.byPortalSlug.has(portalSlug)) this.byPortalSlug.set(portalSlug, group);
  }

  find({ normName = null, domain = null, portalSlug = null }) {
    if (normName && this.byNormName.has(normName)) return this.byNormName.get(normName);
    if (domain && this.byDomain.has(domain)) return this.byDomain.get(domain);
    if (portalSlug && this.byPortalSlug.has(portalSlug)) return this.byPortalSlug.get(portalSlug);
    return null;
  }
}

function indexEntry(index, group, keys) {
  const existing = index.find(keys);
  if (existing) {
    if (existing !== group) mergeGroups(index, existing, group);
    return existing;
  }
  index.place(group, keys);
  return group;
}

function mergeGroups(index, target, source) {
  if (target === source) return target;
  ['defillama', 'portalDirectory', 'portalFeatured', 'portalMostActive'].forEach((field) => {
    target[field].push(...source[field]);
  });
  source.domains.forEach((domain) => target.domains.add(domain));
  source.portalSlugs.forEach((slug) => target.portalSlugs.add(slug));
  source.rawNames.forEach((name) => target.rawNames.add(name));
  index.groups = index.groups.filter((group) => group !== source);
  // Re-point lookup maps that referenced the absorbed group.
  for (const [key, group] of index.byNormName) if (group === source) index.byNormName.set(key, target);
  for (const [key, group] of index.byDomain) if (group === source) index.byDomain.set(key, target);
  for (const [key, group] of index.byPortalSlug) if (group === source) index.byPortalSlug.set(key, target);
  return target;
}

function buildGroups(defillama, portal) {
  const index = new IdentityIndex();

  defillama.protocols.forEach((protocol) => {
    const normName = normalizeName(protocol.name);
    // Name keys only inside a source: DefiLlama sites sometimes host third-party data
    // artifacts (e.g. a curator dashboard listed as its own "protocol"), and domain-merging
    // those would false-merge unrelated projects. Domain keys apply cross-source only.
    let group = index.find({ normName });
    if (!group) {
      group = createGroup();
      index.place(group, { normName });
    } else if (normName && !index.byNormName.has(normName)) {
      index.byNormName.set(normName, group);
    }
    group.defillama.push(protocol);
    group.rawNames.add(protocol.name);
    const domain = registrableDomain(protocol.site);
    if (domain) group.domains.add(domain);
  });

  portal.directory.forEach((app) => {
    const normName = normalizeName(app.name);
    const portalSlug = app.slug ? kebabCase(app.slug) : null;
    let group = index.find({ normName, portalSlug });
    if (!group) {
      group = createGroup();
      index.place(group, { normName, portalSlug });
    } else {
      if (normName && !index.byNormName.has(normName)) index.byNormName.set(normName, group);
      if (portalSlug && !index.byPortalSlug.has(portalSlug)) index.byPortalSlug.set(portalSlug, group);
    }
    group.portalDirectory.push(app);
    group.rawNames.add(app.name);
    if (portalSlug) group.portalSlugs.add(portalSlug);
  });

  portal.featuredSections.forEach((section) => {
    section.apps.forEach((app) => {
      const normName = normalizeName(app.name);
      const domain = registrableDomain(app.appLink);
      let group = index.find({ normName, domain });
      if (!group) {
        group = createGroup();
        index.place(group, { normName, domain });
      } else {
        if (normName && !index.byNormName.has(normName)) index.byNormName.set(normName, group);
        if (domain && !index.byDomain.has(domain)) index.byDomain.set(domain, group);
      }
      group.portalFeatured.push({ ...app, section: section.section });
      group.rawNames.add(app.name);
      if (domain) group.domains.add(domain);
    });
  });

  portal.mostActiveApps.forEach((app) => {
    const normName = normalizeName(app.name);
    const portalSlug = app.slug ? kebabCase(app.slug) : null;
    let group = index.find({ normName, portalSlug });
    if (!group) {
      group = createGroup();
      index.place(group, { normName, portalSlug });
    } else {
      if (normName && !index.byNormName.has(normName)) index.byNormName.set(normName, group);
      if (portalSlug && !index.byPortalSlug.has(portalSlug)) index.byPortalSlug.set(portalSlug, group);
    }
    group.portalMostActive.push(app);
    group.rawNames.add(app.name);
    if (portalSlug) group.portalSlugs.add(portalSlug);
  });

  return index.groups;
}

function matchExistingProject(group) {
  for (const existing of EXISTING_CITY_PROJECTS) {
    const existingNames = new Set(existing.names.map(normalizeName));
    const existingDomains = new Set(existing.domains);
    for (const rawName of group.rawNames) {
      if (existingNames.has(normalizeName(rawName))) {
        return { project: existing, matchedOn: `name "${rawName}"` };
      }
    }
    for (const domain of group.domains) {
      if (existingDomains.has(domain)) {
        return { project: existing, matchedOn: `domain "${domain}"` };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Canonical naming and manifest drafting
// ---------------------------------------------------------------------------

function selectCanonical(group) {
  const portalName = group.portalDirectory[0]?.name ?? null;
  const shortestDefillama = [...group.defillama].sort((a, b) => a.name.length - b.name.length)[0]?.name ?? null;
  const featuredName = group.portalFeatured[0]?.name ?? null;
  const mostActiveName = group.portalMostActive[0]?.name ?? null;
  const name = portalName ?? shortestDefillama ?? featuredName ?? mostActiveName;
  const slugSource =
    [...group.portalSlugs][0] ??
    (group.defillama[0]?.slug ? kebabCase(group.defillama[0].slug) : null) ??
    kebabCase(name);
  return { name, id: kebabCase(slugSource) };
}

function districtFor(group) {
  const categories = new Set(
    [
      ...group.defillama.map((entry) => entry.category),
      ...group.portalDirectory.flatMap((app) => app.categories ?? []),
    ].filter(Boolean),
  );
  for (const category of categories) {
    const district = DISTRICT_BY_CATEGORY[String(category).toLowerCase()];
    if (district) return { district, fromCategory: category };
  }
  return { district: null, fromCategory: null };
}

function shortestNamedDefillamaEntry(group) {
  return [...group.defillama].sort((a, b) => a.name.length - b.name.length)[0] ?? null;
}

function buildDescription(group, canonical) {
  const entry = shortestNamedDefillamaEntry(group);
  if (entry) {
    const categoryText = entry.category ? ` in the '${entry.category}' category` : '';
    return `${canonical.name} is a DefiLlama-listed protocol${categoryText} with TVL tracked on the Monad chain.`;
  }
  return `${canonical.name} is listed on the Monad App Portal. No DefiLlama listing was found in the seed artifacts.`;
}

// Phase 5.2: groups that pass the §3 bar via DefiLlama alone (no App Portal listing) get an
// exact-source claim candidate from the registry capture itself. Vocabulary note (documented in
// docs/EVIDENCE_DATA_CONTRACT.md §Phase 5.2): `official-directory-listing` is used for
// "listing in the named directory's own catalog" — the publisher field carries the actual
// registry (DefiLlama), and limitations state the third-party nature explicitly.
function draftRegistryCandidate(group, canonical, defillamaInput) {
  const entry = shortestNamedDefillamaEntry(group);
  const category = entry?.category ? `'${entry.category}'` : 'no recorded category';
  const captureDate = defillamaInput.fetchedAtUtc.slice(0, 10);
  const evidenceId = `E-${canonical.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REG-001`;
  const provenanceNotes =
    `Drafted by scripts/ecosystem-intake.js from ${defillamaInput.file} (sha256 ${defillamaInput.sha256.slice(0, 16)}…). ` +
    'Automated draft; a human must inspect the live source before any review decision.';
  return {
    id: evidenceId,
    projectId: canonical.id,
    relatedProjectIds: [],
    claim:
      `DefiLlama's protocol registry lists ${canonical.name} in the ${category} category with a ` +
      `Monad chain entry (API capture ${captureDate}).`,
    evidenceType: 'official-directory-listing',
    status: 'Observed',
    source: {
      kind: 'registry-json',
      title: 'DefiLlama protocol registry API',
      url: 'https://api.llama.fi/protocols',
      publisher: 'DefiLlama',
      available: true,
      referenceType: 'mutable-url',
      presentationMutable: true,
    },
    retrievedAt: defillamaInput.fetchedAtUtc,
    publishedAt: null,
    network: { name: 'Monad mainnet', chainId: 143 },
    scope: `${canonical.name} DefiLlama registry listing membership, category, and Monad chain tag at the capture instant.`,
    provenance: { kind: 'manual-curation', notes: provenanceNotes },
    provenanceNotes,
    limitations: [
      'DefiLlama is a third-party registry; inclusion is not an official Monad endorsement, verification, safety review, or proof of activity.',
      'The registry API response is mutable and unpinned; its content can change after the capture instant.',
      'Drafted automatically from a dated seed artifact; the record stays outside any snapshot until a human inspects the source and records a review decision.',
    ],
    quality: { conflict: false, incomplete: false, stale: false, unavailable: false, timeBoundEligible: false },
    identifiers: null,
    conflicts: [],
    supportMode: 'artifact-observation-only',
    supportedProposition: `${canonical.name} DefiLlama registry listing membership, category, and Monad chain tag at the capture instant.`,
    supportsFactualClaims: true,
    dataMode: EVIDENCE_DATA_MODE,
    reviewStatus: 'proposed',
    reviewedAt: null,
    revision: { sequence: 1, supersedesEvidenceId: null },
    reviewMetadata: null,
  };
}

function draftEvidenceCandidate(group, canonical, portalInput) {
  const app = group.portalDirectory[0];
  const categories = (app.categories ?? []).filter(Boolean);
  const categoryText = categories.length > 0 ? categories.map((category) => `'${category}'`).join(', ') : 'no displayed category tags';
  const captureDate = portalInput.fetchedAtUtc.slice(0, 10);
  const evidenceId = `E-${canonical.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-MEM-001`;
  const provenanceNotes =
    `Drafted by scripts/ecosystem-intake.js from ${portalInput.file} (sha256 ${portalInput.sha256.slice(0, 16)}…). ` +
    'Automated draft; a human must inspect the live source before any review decision.';
  // `kind` is the controlled value the evidence workflow accepts ('manual-curation'); the
  // actual provenance — automated drafting from a seed artifact — is stated in `notes`.
  const tagline = String(app.tagline ?? '');
  const taglineSentence = /[.!?…]$/.test(tagline) ? tagline : `${tagline}.`;
  return {
    id: evidenceId,
    projectId: canonical.id,
    relatedProjectIds: [],
    claim:
      `At the ${captureDate} capture, the Monad Foundation App Portal listed ${canonical.name} in ${categoryText} ` +
      `with tagline ‘${taglineSentence}’`,
    evidenceType: 'official-directory-listing',
    status: 'Observed',
    source: {
      kind: 'directory-html',
      title: 'Monad App Portal',
      url: 'https://app.monad.xyz/',
      publisher: 'Monad Foundation',
      available: true,
      referenceType: 'mutable-url',
      presentationMutable: true,
    },
    retrievedAt: portalInput.fetchedAtUtc,
    publishedAt: null,
    network: { name: 'Monad mainnet', chainId: 143 },
    scope: `${canonical.name} App Portal listing membership, displayed categories, and displayed tagline at the capture instant.`,
    provenance: { kind: 'manual-curation', notes: provenanceNotes },
    provenanceNotes,
    limitations: [
      'Directory inclusion is not verification, endorsement, safety review, contract mapping, or proof of activity.',
      'Dynamic directory content and displayed copy can change.',
      'Drafted automatically from a dated seed artifact; the record stays outside any snapshot until a human inspects the source and records a review decision.',
    ],
    quality: { conflict: false, incomplete: false, stale: false, unavailable: false, timeBoundEligible: false },
    identifiers: null,
    conflicts: [],
    supportMode: 'artifact-observation-only',
    supportedProposition: `${canonical.name} App Portal listing membership, displayed categories, and displayed tagline at the capture instant.`,
    supportsFactualClaims: true,
    dataMode: EVIDENCE_DATA_MODE,
    reviewStatus: 'proposed',
    reviewedAt: null,
    revision: { sequence: 1, supersedesEvidenceId: null },
    reviewMetadata: null,
  };
}

// Local mirror of the evidence-workflow workspace-record constraints that go beyond
// validateCandidateEvidenceRecord, so a drafted candidate can later be dropped into an
// evidence workspace without reshaping.
function validateIntakeRecord(record) {
  const label = `Evidence ${record.id}`;
  const fail = (message) => {
    throw new Error(`${label}: ${message}`);
  };
  if (!EVIDENCE_TYPES.includes(record.evidenceType)) fail('invalid evidenceType');
  if (!EVIDENCE_STATUSES.includes(record.status)) fail('invalid claim status');
  if (record.dataMode !== EVIDENCE_DATA_MODE) fail('invalid dataMode');
  if (record.network?.name !== 'Monad mainnet' || record.network?.chainId !== 143) {
    fail('invalid network scope');
  }
  if (!CADENCE_PAIRS.has(`${record.evidenceType}|${record.source.referenceType}`)) {
    fail('unsupported evidenceType/referenceType cadence pair');
  }
  if (!EVIDENCE_SUPPORT_MODES.includes(record.supportMode)) fail('invalid supportMode');
  if (record.supportedProposition !== record.scope) {
    fail('supportedProposition must equal its bounded scope');
  }
  if (record.source.available !== !record.quality.unavailable) {
    fail('source and quality availability flags disagree');
  }
  if (record.provenance.notes !== record.provenanceNotes) fail('inconsistent provenance notes');
  if (record.status === 'Observed' && record.supportMode !== 'artifact-observation-only') {
    fail('invalid Observed support mode');
  }
  if (record.reviewStatus !== 'proposed' || record.reviewedAt !== null) {
    fail('intake drafts must stay proposed and unreviewed');
  }
  if (record.relatedProjectIds.some((id) => !KNOWN_PROJECT_IDS.includes(id))) {
    fail('relatedProjectIds outside the known entity set');
  }
  return true;
}

// ---------------------------------------------------------------------------
// Inclusion bar and outcomes
// ---------------------------------------------------------------------------

function applyInclusionBar(group) {
  const nonCexEntries = group.defillama.filter((entry) => entry.category !== 'CEX');
  if (group.defillama.length > 0 && nonCexEntries.length === 0) {
    return { outcome: 'excluded', reason: 'cex-listing: centralized-exchange reserve listings are not Monad application deployments' };
  }
  const bareToken =
    group.defillama.length > 0 &&
    nonCexEntries.length === 0 &&
    group.portalDirectory.length === 0;
  if (bareToken) {
    return { outcome: 'excluded', reason: 'no-application-surface: bare token without an application surface' };
  }
  const deploymentResolvable = nonCexEntries.length > 0;
  const hasPortalListing = group.portalDirectory.length > 0;
  if (deploymentResolvable && hasPortalListing) {
    return { outcome: 'draft', reason: 'passes the §3 bar: DefiLlama Monad listing + official App Portal listing' };
  }
  if (deploymentResolvable && !hasPortalListing) {
    return {
      outcome: 'draft-manifest-only',
      reason: 'passes the §3 bar via DefiLlama, but no exact-source claim candidate can be drafted from the seeds yet',
    };
  }
  if (!deploymentResolvable && hasPortalListing) {
    return {
      outcome: 'pending',
      reason: 'App Portal listing only: no verifiable Monad deployment record in the seeds (scale plan §3.1)',
    };
  }
  return { outcome: 'pending', reason: 'insufficient basis in the seed artifacts' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAtUtc = nowIso();
  const dateStamp = utcDateStamp();

  const defillamaPath = path.resolve(options.defillama ?? latestArtifact('defillama-monad'));
  const portalPath = path.resolve(options.portal ?? latestArtifact('monad-app-portal'));
  const defillama = readJsonArtifact(defillamaPath, 'monad-city-research-seed');
  const portal = readJsonArtifact(portalPath, 'monad-city-research-seed');
  if (!Array.isArray(defillama.protocols) || defillama.protocols.length === 0) {
    throw new Error(`${defillamaPath} carries no protocols`);
  }
  if (!Array.isArray(portal.directory) || portal.directory.length === 0) {
    throw new Error(`${portalPath} carries no directory apps`);
  }

  const inputs = [
    {
      role: 'defillama',
      file: path.relative(process.cwd(), defillamaPath),
      sha256: sha256File(defillamaPath),
      fetchedAtUtc: defillama.fetchedAtUtc,
    },
    {
      role: 'app-portal',
      file: path.relative(process.cwd(), portalPath),
      sha256: sha256File(portalPath),
      fetchedAtUtc: portal.fetchedAtUtc,
    },
  ];

  const curatedExisting = EXISTING_CITY_PROJECTS.filter((project) => project.curated).map((p) => p.cityId);
  const curatedMatches =
    curatedExisting.length === CURATED_PROJECT_IDS.length &&
    curatedExisting.every((id) => CURATED_PROJECT_IDS.includes(id));
  if (!curatedMatches) {
    throw new Error('EXISTING_CITY_PROJECTS drifted from CURATED_PROJECT_IDS in src/evidence.js; reconcile before intake.');
  }

  const groups = buildGroups(defillama, portal);
  const proposals = [];
  const reportGroups = [];
  const usedIds = new Set(EXISTING_CITY_PROJECTS.map((project) => project.cityId));
  const summary = {
    groups: groups.length,
    existingMatches: 0,
    drafts: 0,
    draftManifestOnly: 0,
    pending: 0,
    excluded: 0,
    evidenceCandidates: 0,
  };
  const humanReviewFlags = [];

  groups.forEach((group) => {
    const existing = matchExistingProject(group);
    const bar = applyInclusionBar(group);
    const canonical = selectCanonical(group);
    const reportGroup = {
      canonicalName: canonical.name,
      proposedId: canonical.id,
      names: [...group.rawNames].sort(),
      domains: [...group.domains].sort(),
      portalSlugs: [...group.portalSlugs].sort(),
      defillamaSlugs: group.defillama.map((entry) => entry.slug).filter(Boolean).sort(),
      outcome: existing ? 'existing' : bar.outcome,
      reason: existing ? `matches an existing city project on ${existing.matchedOn}` : bar.reason,
      matchedExistingId: existing ? existing.project.cityId : null,
    };
    if (existing?.project.note) reportGroup.existingNote = existing.project.note;

    if (existing) {
      summary.existingMatches += 1;
      reportGroups.push(reportGroup);
      return;
    }

    if (bar.outcome === 'draft' || bar.outcome === 'draft-manifest-only') {
      if (usedIds.has(canonical.id)) {
        humanReviewFlags.push({
          flag: 'id-collision',
          detail: `Canonical id "${canonical.id}" is already used; resolve the identity manually.`,
          canonicalName: canonical.name,
        });
        reportGroup.outcome = 'pending';
        reportGroup.reason = 'canonical id collision; human identity resolution required';
        summary.pending += 1;
        reportGroups.push(reportGroup);
        return;
      }
      usedIds.add(canonical.id);
      const { district, fromCategory } = districtFor(group);
      const evidenceCandidates =
        bar.outcome === 'draft'
          ? [draftEvidenceCandidate(group, canonical, inputs[1])]
          : bar.outcome === 'draft-manifest-only'
            ? [draftRegistryCandidate(group, canonical, inputs[0])]
            : [];
      summary.evidenceCandidates += evidenceCandidates.length;
      const reviewNotes = [];
      if (bar.outcome === 'draft-manifest-only') {
        reviewNotes.push(
          'Evidence candidate is sourced from the DefiLlama registry capture (third-party registry, mutable API); portal presence and explorer/contract verification remain open work.',
        );
      }
      if (!district) {
        reviewNotes.push('District is unassigned: no seed category maps to a city district. A human must assign it (layout only).');
      }
      if (group.portalDirectory.length === 0 && group.portalFeatured.length > 0) {
        reviewNotes.push('Portal presence is via a featured section only; re-check the live directory at review time.');
      }
      // Fictional Demo entities in the city share name space with real projects; flag the
      // known overlaps so reviewers never dedupe a real project into an illustration.
      const demoOverlap = DEMO_NAME_OVERLAP_WATCHLIST[canonical.id];
      if (demoOverlap) {
        humanReviewFlags.push({
          flag: 'name-similar-to-demo-entity',
          canonicalName: canonical.name,
          proposedId: canonical.id,
          detail: demoOverlap,
        });
        reviewNotes.push(demoOverlap);
      }
      const deployment = {
        monadResolvable: true,
        basis: 'defillama-monad-chain-tag',
        addresses: [],
        note:
          'The DefiLlama listing evidences a Monad deployment for inclusion purposes. Its `address` field is the protocol address on its dominant chain, not a verified Monad address; explorer verification is Batch 1 source work.',
      };
      proposals.push({
        proposalId: canonical.id,
        status: bar.outcome,
        manifest: {
          id: canonical.id,
          name: canonical.name,
          aliases: [...group.rawNames].filter((name) => name !== canonical.name).sort(),
          symbols: [...new Set(group.defillama.map((entry) => entry.symbol).filter((symbol) => symbol && symbol !== '-'))],
          district,
          districtBasis: fromCategory,
          applicationType:
            group.defillama.find((entry) => entry.category)?.category ??
            group.portalDirectory[0]?.categories?.[0] ??
            null,
          description: buildDescription(group, canonical),
          site:
            shortestNamedDefillamaEntry(group)?.site ??
            group.portalFeatured.find((app) => app.appLink)?.appLink ??
            null,
          deployment,
          sourceBases: {
            defillama: group.defillama.map((entry) => entry.slug).filter(Boolean),
            appPortalDirectory: group.portalDirectory.map((app) => app.slug),
            appPortalFeaturedSections: group.portalFeatured.map((app) => app.section),
            appPortalMostActive: group.portalMostActive.map((app) => app.slug),
          },
          dataMode: 'draft-intake',
        },
        evidenceCandidates,
        relationshipCandidates: [],
        reviewNotes,
      });
      if (bar.outcome === 'draft') summary.drafts += 1;
      else summary.draftManifestOnly += 1;
    } else {
      if (bar.outcome === 'pending') summary.pending += 1;
      else summary.excluded += 1;
    }
    reportGroups.push(reportGroup);
  });

  // Validate every drafted candidate against the evidence contract before anything is written.
  // The runtime gate defaults to the curated six project ids; drafts extend it with the new
  // proposal ids, which is exactly the set a Batch 1 workspace would declare.
  const knownProjectIds = [...CURATED_PROJECT_IDS, ...proposals.map((proposal) => proposal.proposalId)];
  proposals
    .flatMap((proposal) => proposal.evidenceCandidates)
    .forEach((record) => {
      validateCandidateEvidenceRecord(record, knownProjectIds);
      validateIntakeRecord(record);
    });

  // Near-miss alias pairs: unmerged groups sharing a first normalized token. Explicitly NOT
  // merged automatically; surfaced for human identity review (AI-inferred suggestion).
  const normByName = new Map();
  groups.forEach((group) => {
    const name = [...group.rawNames][0];
    if (name) normByName.set(group, normalizeName(name).split(' ')[0]);
  });
  const byFirstToken = new Map();
  groups.forEach((group) => {
    const token = normByName.get(group);
    if (!token) return;
    if (!byFirstToken.has(token)) byFirstToken.set(token, []);
    byFirstToken.get(token).push(group);
  });
  const nearMisses = [];
  byFirstToken.forEach((tokenGroups, token) => {
    if (tokenGroups.length > 1) {
      nearMisses.push({
        firstToken: token,
        groups: tokenGroups.map((group) => [...group.rawNames].sort().join(' | ')),
      });
    }
  });

  // Oracle observations for existing city oracle projects: raw input for future human-drafted
  // relationship candidates. Not drafted as relationships: the current evidence-workflow
  // contract restricts relationship endpoints to the curated six. The current defillama seed
  // does not retain oraclesBreakdown, so this section stays empty until a future seed adds it.
  const cityOracleNames = ['Pyth', 'Switchboard'];
  const oracleObservations = [];
  defillama.protocols.forEach((protocol) => {
    const breakdown = protocol.oraclesBreakdown;
    if (!Array.isArray(breakdown)) return;
    breakdown.forEach((oracle) => {
      if (!cityOracleNames.some((name) => String(oracle.name).toLowerCase().includes(name.toLowerCase()))) return;
      const monadChains = (oracle.chains ?? []).filter((chain) => chain.chain === 'Monad');
      if (monadChains.length === 0) return;
      oracleObservations.push({
        protocol: protocol.name,
        defillamaSlug: protocol.slug,
        oracle: oracle.name,
        oracleType: oracle.type ?? null,
        proof: oracle.proof ?? [],
        note: 'Registry observation only. A relationship candidate would need the trust/data contract expanded beyond the curated six endpoints first.',
      });
    });
  });

  // The oraclesBreakdown field is not retained by the defillama fetch script; observations are
  // only possible when a future seed adds it. Keep the section honest either way.
  const draft = {
    kind: 'monad-city-ecosystem-intake-draft',
    schemaVersion: '1',
    intakeVersion: INTAKE_VERSION,
    reviewPolicyVersion: REVIEW_POLICY_VERSION,
    generatedAtUtc,
    inputs,
    inclusionBar: {
      reference: 'docs/ECOSYSTEM_SCALE_PLAN.md §3',
      deploymentResolvable: 'DefiLlama listing with the Monad chain tag (explorer verification is Batch 1 work)',
      independentSource: 'official Monad App Portal and/or DefiLlama listing',
      bareTokenExclusion: 'CEX reserve listings and entries without application surface are excluded',
      dedupe: 'one project = one manifest; variants recorded as aliases',
    },
    summary,
    note:
      'DRY-RUN DRAFT — nothing here is approved, verified, or promoted. Every evidence candidate is `proposed` ' +
      'with `reviewedAt: null` and requires a human source inspection through the evidence workflow (phase-3.7) ' +
      'before any review decision. This file is not an evidence workspace and must never be promoted.',
    proposals,
    candidateRecords: proposals.flatMap((proposal) => proposal.evidenceCandidates),
    candidateRelationships: [],
  };

  const report = {
    kind: 'monad-city-intake-report',
    schemaVersion: '1',
    intakeVersion: INTAKE_VERSION,
    generatedAtUtc,
    inputs,
    summary: { ...summary, nearMissAliasGroups: nearMisses.length, oracleObservations: oracleObservations.length },
    identityRules: {
      nameMatching: 'normalized names (case/punctuation-insensitive, trailing variant tokens stripped)',
      domainMatching: 'registrable domain of project site URLs',
      slugMatching: 'App Portal slugs',
      addressMatching:
        'not applied in this run: the DefiLlama listing address is the dominant-chain address, not a Monad explorer record',
    },
    humanReviewFlags,
    nearMissAliasGroups: nearMisses,
    oracleRelationshipObservations: oracleObservations,
    groups: reportGroups,
  };

  const outPath = path.resolve(options.out ?? path.join(RESEARCH_DIR, `proposals-draft-${dateStamp}.json`));
  const reportPath = path.resolve(options.report ?? path.join(RESEARCH_DIR, `intake-report-${dateStamp}.json`));
  assertSafeOutputPath(outPath);
  assertSafeOutputPath(reportPath);
  assertExclusiveOutput(outPath);
  assertExclusiveOutput(reportPath);

  fs.writeFileSync(outPath, canonicalJson(draft));
  fs.writeFileSync(reportPath, canonicalJson(report));
  console.log(
    `Intake dry run (${INTAKE_VERSION}): ${summary.groups} identity groups -> ` +
      `${summary.drafts} full drafts, ${summary.draftManifestOnly} manifest-only drafts, ` +
      `${summary.pending} pending, ${summary.excluded} excluded, ${summary.existingMatches} existing matches. ` +
      `Wrote ${outPath} and ${reportPath}`,
  );
}

try {
  main();
} catch (error) {
  console.error(`ecosystem-intake: ${error.message}`);
  process.exitCode = 1;
}
