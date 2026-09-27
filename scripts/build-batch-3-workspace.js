#!/usr/bin/env node
// Phase 5.3 Batch 3 workspace assembly (build-time only, run once).
//
// Assembles the review workspace for the phase-3.5-v5 snapshot from:
//   1. the ACTIVE approved runtime (v4: 142 evidence records + 6 relationships, inline
//      phase-3.7 metadata — carried as-is, no re-decisions);
//   2. the retained v2-era candidate history (two superseded evidence predecessors + two
//      superseded relationship predecessors, recorded stale exactly as in the v4 lineage);
//   3. the batch-3 resolution (data/research/pending-deployments-<date>.json): resolved
//      pending groups get ONE pinned-registry evidence candidate each, drafted from the
//      pinned monad-crypto/protocols snapshot (commit 36fddcc — the same pinned artifact the
//      approved protocol-registry-snapshot records cite) with the Etherscan V2 liveness and
//      verified-name cross-check disclosed in provenance. Claims are bounded to the registry
//      snapshot; the explorer observation is never part of the claim itself.
//
// Identity discipline: a pending group whose matched registry key/name collides with an
// existing city project is EXCLUDED with a human-review flag (no twin manifests). The script
// never approves anything: approvals happen exclusively through `npm run evidence:review`
// driven by the emitted decision plan (owner in-session go recorded in docs/WORKLOG.md).
// Tokens are opaque, random, identify review actions only, and imply nothing about people.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  KNOWN_PROJECT_IDS,
  candidateEvidenceRecords,
  candidateRelationshipProposals,
  evidenceRecords as projectedEvidence,
  relationshipProposals as projectedRelationships,
} from '../src/evidence.js';

const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
const RESEARCH_DIR = path.join('data', 'research');
const REFRESH_INSTANT = '2026-09-22T22:02:32Z';
const PINNED_COMMIT = '36fddcc0021fffe81c7b73a8672347538ec2c9eb';
const PINNED_URL = `https://raw.githubusercontent.com/monad-crypto/protocols/${PINNED_COMMIT}/protocols-mainnet.json`;
const PINNED_PUBLISHED_AT = '2026-09-07T21:59:59Z'; // commit date, verified via GitHub API 2026-09-27
const EXPECTED_PROJECTED_RECORDS = 142;
const EXPECTED_STALE_EVIDENCE = 2; // E-KURU-MEM-001, E-PYTH-CAP-001
const EXPECTED_STALE_RELATIONSHIPS = 2; // monad-kuru, monad-pyth
const RESOLVED_VERDICTS = new Set(['resolved-explorer-verified-name', 'resolved-explorer-contract']);

// Canonical district table (scripts/ecosystem-intake.js DISTRICT_BY_CATEGORY), applied to the
// registry's `Prefix::Subcategory` pairs: subcategory first, then prefix fallback for
// namespaces the table does not carry. District is navigational layout only, never a claim.
const DISTRICT_BY_SUBCATEGORY = {
  dexs: 'DeFi', dexes: 'DeFi', dex: 'DeFi', derivatives: 'DeFi', options: 'DeFi',
  perpetuals: 'DeFi', lending: 'DeFi', 'lend & borrow': 'DeFi', cdp: 'DeFi',
  'liquid staking': 'DeFi', staking: 'DeFi', restaking: 'DeFi', yield: 'DeFi',
  'yield aggregator': 'DeFi', launchpad: 'DeFi', launchpads: 'DeFi', 'leverage trading': 'DeFi',
  trading: 'DeFi', 'prediction market': 'DeFi', payment: 'DeFi', payments: 'DeFi', rwa: 'DeFi',
  'asset issuers': 'DeFi', 'asset issuer': 'DeFi', 'uncollateralized lending': 'DeFi',
  'onchain capital allocator': 'DeFi', 'risk curators': 'DeFi', 'leveraged farming': 'DeFi',
  'liquidity automation': 'DeFi', 'liquid restaking': 'DeFi', cedifi: 'DeFi', cedefi: 'DeFi',
  cefi: 'DeFi', synthetics: 'DeFi', insurance: 'DeFi', intents: 'DeFi', stableswap: 'DeFi',
  'stable coin': 'DeFi', stablecoin: 'DeFi', stables: 'DeFi',
  bridge: 'Infrastructure', oracle: 'Infrastructure', infrastructure: 'Infrastructure',
  data: 'Infrastructure', analytics: 'Infrastructure', wallet: 'Infrastructure',
  explorer: 'Infrastructure', interoperability: 'Infrastructure', privacy: 'Infrastructure',
  'cross chain': 'Infrastructure', 'cross-chain': 'Infrastructure', services: 'Infrastructure',
  mev: 'Infrastructure', depin: 'Infrastructure', orchestration: 'Infrastructure',
  gaming: 'Gaming', games: 'Gaming', collectibles: 'Gaming', nft: 'Gaming',
  marketplace: 'Gaming', 'nft marketplace': 'Gaming', entertainment: 'Gaming', sports: 'Gaming',
  agent: 'AI', ai: 'AI', robotics: 'AI', identity: 'Identity',
};
const DISTRICT_BY_PREFIX = {
  DeFi: 'DeFi', Infra: 'Infrastructure', Gaming: 'Gaming', AI: 'AI', NFT: 'Gaming',
  Payments: 'DeFi', DePIN: 'Infrastructure',
  // Consumer has no honest equivalent in the five-district vocabulary; consumer applications
  // are grouped under Infrastructure for navigational layout (basis recorded on the manifest).
  Consumer: 'Infrastructure',
};

function utcDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function canonicalTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function canonicalJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function latestArtifact(prefix) {
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) throw new Error(`No artifact ${prefix}-<date>.json found in ${RESEARCH_DIR}/`);
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function randomToken() {
  return `reviewer:r-${crypto.randomBytes(8).toString('hex')}`;
}

function normalizeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function truncateAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function districtForEntry(entry) {
  const basis = [];
  for (const category of entry.categories ?? []) {
    const [prefixRaw, subRaw] = category.split('::');
    const subParts = String(subRaw ?? '')
      .toLowerCase()
      .split(/\/|\s+/)
      .filter(Boolean);
    for (const part of subParts) {
      const district = DISTRICT_BY_SUBCATEGORY[part];
      if (district) return { district, basis: category };
    }
    const prefixDistrict = DISTRICT_BY_PREFIX[prefixRaw];
    if (prefixDistrict) return { district: prefixDistrict, basis: category };
    basis.push(category);
  }
  return { district: null, basis: basis.join(', ') };
}

function buildClaim(entry, manifestName, key) {
  const addresses = Object.entries(entry.addresses ?? {});
  const live = entry.live === true ? ' as live' : '';
  const categories = (entry.categories ?? []).map((category) => category.split('::')[1]).join(', ');
  const categoryText = categories ? ` in ${categories}` : '';
  const examples = addresses
    .slice(0, 2)
    .map(([label, address]) => `${label} ${truncateAddress(address)}`)
    .join(', ');
  const count = addresses.length;
  const addressText =
    count === 1
      ? `1 Monad mainnet contract address (${examples})`
      : `${count} Monad mainnet contract addresses (e.g. ${examples})`;
  return `The pinned Monad protocol registry lists ${manifestName} (entry \`${key}\`)${live}${categoryText} and maps ${addressText}.`;
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Usage: node scripts/build-batch-3-workspace.js <out-workspace.json>');
  if (fs.existsSync(outPath)) throw new Error(`Refusing to overwrite ${outPath}`);

  const resolution = JSON.parse(fs.readFileSync(latestArtifact('pending-deployments'), 'utf8'));
  if (resolution.kind !== 'monad-city-research-deployment-resolution') {
    throw new Error('Latest resolution artifact is not a deployment-resolution artifact');
  }
  const resolved = resolution.projects.filter((project) => RESOLVED_VERDICTS.has(project.verdict));

  const existingCityIds = new Set();
  const existingCityNames = new Set();
  const mainSrc = fs.readFileSync('src/main.js', 'utf8');
  const cityBlock = mainSrc.slice(mainSrc.indexOf('const projects = ['), mainSrc.indexOf('\n];'));
  for (const match of cityBlock.matchAll(/id: '([^']+)',\n\s+name: '([^']+)'/g)) {
    existingCityIds.add(normalizeName(match[1]));
    existingCityNames.add(normalizeName(match[2]));
  }
  const knownIds = new Set(KNOWN_PROJECT_IDS);

  // Family-prefix identity rule: a candidate matches an existing city entity on exact
  // normalized equality or a shared prefix (shorter side ≥ 3 chars). Catches brand-level
  // registry entries whose protocol already lives in the city as a product-level manifest
  // (e.g. `morpho`/`morpho-blue`, `lfj`/`lfj-poe`, `townsquare`/`townsquare-lending`).
  function identityCollisions(candidates) {
    const reasons = [];
    for (const candidate of candidates) {
      const value = normalizeName(candidate);
      if (value.length < 3) continue;
      for (const existing of [...existingCityIds, ...existingCityNames]) {
        if (value === existing || existing.startsWith(value) || value.startsWith(existing)) {
          if (Math.min(value.length, existing.length) >= 3) {
            reasons.push(`family match with existing city entity '${existing}' (candidate '${value}')`);
          }
        }
      }
    }
    return [...new Set(reasons)];
  }

  // The registry is fetched from the pinned commit so claims carry the exact entry data
  // (categories, links, full address maps). The pinned commit is immutable, so this equals
  // what the resolver verified.
  const registry = await (await fetch(PINNED_URL, { signal: AbortSignal.timeout(20000) })).json();

  const batchRecords = [];
  const selectionItems = [];
  const identityFlags = [];
  const excludedIds = new Set();

  for (const project of resolved) {
    const entry = registry[project.registry.key];
    if (!entry) throw new Error(`Registry entry ${project.registry.key} missing from the pinned snapshot`);

    // Identity discipline: no twin manifests for projects the city already carries.
    const collisionReasons = [];
    if (knownIds.has(project.proposedId)) collisionReasons.push(`project id ${project.proposedId} is already known`);
    if (knownIds.has(project.registry.key)) collisionReasons.push(`registry key ${project.registry.key} is an existing project id`);
    collisionReasons.push(
      ...identityCollisions([entry.name, project.canonicalName, project.proposedId, project.registry.key]),
    );
    if (collisionReasons.length > 0) {
      excludedIds.add(project.proposedId);
      identityFlags.push({ proposedId: project.proposedId, canonicalName: project.canonicalName, registryKey: project.registry.key, reasons: collisionReasons, resolution: 'excluded from batch 3; human identity resolution required (alias recording vs separate manifest).' });
      continue;
    }

    const { district, basis: districtBasis } = districtForEntry(entry);
    if (!district) throw new Error(`No district resolvable for ${project.proposedId} (${project.canonicalName})`);

    const contracts = Object.entries(entry.addresses ?? {}).map(([role, address]) => ({
      address,
      role,
      runtimeDisposition: 'candidate',
    }));
    if (contracts.length === 0) throw new Error(`Registry entry ${project.registry.key} carries no addresses`);
    const evidenceId = `E-${project.proposedId.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REGISTRY-001`;
    const site = entry.links?.project ?? null;
    const categoryText = (entry.categories ?? []).map((category) => category.split('::')[1]).join(', ');
    const live = entry.live === true;

    batchRecords.push({
      id: evidenceId,
      projectId: project.proposedId,
      relatedProjectIds: [],
      claim: buildClaim(entry, entry.name ?? project.canonicalName, project.registry.key),
      evidenceType: 'protocol-registry-snapshot',
      status: 'Observed',
      source: {
        kind: 'registry-json',
        title: `Monad mainnet protocol registry at ${PINNED_COMMIT}`,
        url: PINNED_URL,
        publisher: 'Monad protocol registry repository',
        available: true,
        referenceType: 'pinned-snapshot',
        presentationMutable: false,
      },
      retrievedAt: canonicalTimestamp(),
      publishedAt: PINNED_PUBLISHED_AT,
      network: { name: 'Monad mainnet', chainId: 143 },
      scope: `Pinned registry entry \`${project.registry.key}\` and its exact snapshot metadata.`,
      provenance: {
        kind: 'manual-curation',
        notes:
          'Immutable commit snapshot. Moving re-retrieval pointer only: ' +
          'https://raw.githubusercontent.com/monad-crypto/protocols/main/protocols-mainnet.json. ' +
          `Drafted by scripts/build-batch-3-workspace.js from ${path.basename(latestArtifact('pending-deployments'))} ` +
          `(verdict ${project.verdict}). Address liveness${project.verdict === 'resolved-explorer-verified-name' ? ' and verified contract-name compatibility' : ''} were cross-checked via the Etherscan V2 API (chainid 143) at the resolution instant; that check is corroboration in provenance, not part of this record's claim. ` +
          'Automated draft; a human must inspect the live source before any review decision.',
      },
      provenanceNotes:
        'Immutable commit snapshot. Moving re-retrieval pointer only: ' +
        'https://raw.githubusercontent.com/monad-crypto/protocols/main/protocols-mainnet.json. ' +
        `Drafted by scripts/build-batch-3-workspace.js from ${path.basename(latestArtifact('pending-deployments'))} ` +
        `(verdict ${project.verdict}). Address liveness${project.verdict === 'resolved-explorer-verified-name' ? ' and verified contract-name compatibility' : ''} were cross-checked via the Etherscan V2 API (chainid 143) at the resolution instant; that check is corroboration in provenance, not part of this record's claim. ` +
        'Automated draft; a human must inspect the live source before any review decision.',
      limitations: [
        'Protocol representatives submit entries; automated checks validate format, not correctness or safety.',
        'A registry address mapping is not code ownership, activity, safety, legitimacy, or endorsement.',
        'Explorer liveness at the resolution instant is recorded in provenance only; this record supports the registry snapshot, not a current-state claim.',
      ],
      quality: { conflict: false, incomplete: false, stale: false, unavailable: false, timeBoundEligible: true },
      identifiers: { contracts },
      conflicts: [],
      supportMode: 'artifact-observation-only',
      supportedProposition: `Pinned registry entry \`${project.registry.key}\` and its exact snapshot metadata.`,
      supportsFactualClaims: true,
      dataMode: 'sourced-limited',
      reviewStatus: 'proposed',
      reviewedAt: null,
      revision: { sequence: 1, supersedesEvidenceId: null },
      reviewMetadata: null,
    });

    selectionItems.push({
      proposalId: project.proposedId,
      verdict: project.verdict,
      manifest: {
        id: project.proposedId,
        name: project.canonicalName.replace(/'/g, '’'),
        registryName: entry.name ?? project.canonicalName,
        aliases: entry.name && entry.name !== project.canonicalName ? [entry.name] : [],
        district,
        districtBasis: districtBasis || (entry.categories ?? []).join(', '),
        applicationType: (entry.categories ?? [])[0]?.split('::')[1] ?? 'Ecosystem project',
        description:
          `Listed in the pinned Monad protocol registry (entry \`${project.registry.key}\`${live ? ', live' : ''})` +
          `${categoryText ? ` under ${categoryText}` : ''} with ${contracts.length} Monad mainnet contract addresses.`,
        site,
        deploymentBasis: project.verdict,
      },
    });
  }

  if (batchRecords.length !== 48) {
    throw new Error(`Expected 48 batch records after identity exclusions, drafted ${batchRecords.length}`);
  }

  // Sanity: unique ids, no collisions with any candidate-history id. Project-id membership in
  // KNOWN_PROJECT_IDS is enforced by the workflow validator at approval time — the contract
  // update (BATCH3_PROJECT_IDS) must land between this assembly and the review loop.
  const candidateIds = new Set(candidateEvidenceRecords.map((record) => record.id));
  const seen = new Set();
  for (const record of batchRecords) {
    if (seen.has(record.id)) throw new Error(`Duplicate evidence id ${record.id}`);
    if (candidateIds.has(record.id)) throw new Error(`Evidence id ${record.id} collides with candidate history`);
    if (knownIds.has(record.projectId)) throw new Error(`Project id ${record.projectId} already known — identity discipline missed it`);
    seen.add(record.id);
  }

  const transitionToken = randomToken();
  const ownerToken = randomToken();

  // Carried projection: keep exactly as approved in v4 (metadata inline already).
  const records = JSON.parse(JSON.stringify(projectedEvidence));
  const relationships = JSON.parse(JSON.stringify(projectedRelationships));
  if (records.length !== EXPECTED_PROJECTED_RECORDS) {
    throw new Error(`Expected ${EXPECTED_PROJECTED_RECORDS} carried records, found ${records.length}`);
  }

  // Retained history: candidate-array entries absent from the projection are the superseded
  // predecessors; record their withdrawal as stale/superseded at the refresh instant.
  const projectedIds = new Set(records.map((record) => record.id));
  let staleEvidence = 0;
  candidateEvidenceRecords.forEach((candidate) => {
    if (projectedIds.has(candidate.id)) return;
    records.push({
      ...JSON.parse(JSON.stringify(candidate)),
      reviewStatus: 'stale',
      reviewedAt: REFRESH_INSTANT,
      reviewMetadata: {
        reviewerRef: transitionToken,
        reviewerRole: 'evidence-reviewer',
        reviewedAt: REFRESH_INSTANT,
        reviewMethod: 'manual-governance-withdrawal',
        decisionReason: 'superseded',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      },
    });
    staleEvidence += 1;
  });
  const projectedRelIds = new Set(relationships.map((relationship) => relationship.id));
  let staleRelationships = 0;
  candidateRelationshipProposals.forEach((candidate) => {
    if (projectedRelIds.has(candidate.id)) return;
    relationships.push({
      ...JSON.parse(JSON.stringify(candidate)),
      reviewStatus: 'stale',
      reviewedAt: REFRESH_INSTANT,
      reviewMetadata: {
        reviewerRef: transitionToken,
        reviewerRole: 'relationship-reviewer',
        reviewedAt: REFRESH_INSTANT,
        reviewMethod: 'manual-governance-withdrawal',
        decisionReason: 'superseded',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      },
    });
    staleRelationships += 1;
  });
  if (staleEvidence !== EXPECTED_STALE_EVIDENCE || staleRelationships !== EXPECTED_STALE_RELATIONSHIPS) {
    throw new Error(`Unexpected retained history: ${staleEvidence} stale evidence, ${staleRelationships} stale relationships`);
  }

  const workspace = {
    candidateRecords: [...records, ...batchRecords],
    candidateRelationships: relationships,
    reviewPolicyVersion: REVIEW_POLICY_VERSION,
  };

  const reviewAt = canonicalTimestamp();
  const plannedDecisions = batchRecords.map((record) => ({
    kind: 'evidence',
    subjectId: record.id,
    projectId: record.projectId,
    decision: 'approved',
    reviewedAt: reviewAt,
    reviewerRef: ownerToken,
    reviewerRole: 'evidence-reviewer',
    reviewMethod: 'manual-artifact-and-payload-inspection',
    decisionReason: 'supported-with-limitations',
    reviewPolicyVersion: REVIEW_POLICY_VERSION,
    note: 'Owner batch approval recorded per record through npm run evidence:review (in-session go for batch 3 recorded in docs/WORKLOG.md).',
  }));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, canonicalJson(workspace));

  const planPath = path.join(RESEARCH_DIR, `batch-3-review-plan-${utcDateStamp()}.json`);
  if (fs.existsSync(planPath)) throw new Error(`Refusing to overwrite ${planPath}`);
  fs.writeFileSync(
    planPath,
    canonicalJson({
      kind: 'monad-city-batch-3-review-plan',
      schemaVersion: '1',
      generatedAtUtc: canonicalTimestamp(),
      inputs: {
        assembledWorkspace: path.relative(process.cwd(), outPath),
        resolution: path.relative(process.cwd(), latestArtifact('pending-deployments')),
      },
      tokens: {
        transition: {
          reviewerRef: transitionToken,
          meaning:
            'Opaque schema-transition token re-recording the four superseded predecessors as stale in the v5 workspace lineage. It maps existing history and does not identify or create a reviewer.',
        },
        owner: {
          reviewerRef: ownerToken,
          meaning:
            'Opaque token for the 2026-09-27 owner batch approval of the batch-3 pinned-registry records. It identifies the review action only; it is not authentication or an authority.',
        },
      },
      identityFlags,
      excludedProposedIds: [...excludedIds],
      plannedDecisions,
    }),
  );

  const selectionPath = path.join(RESEARCH_DIR, `batch-3-selection-${utcDateStamp()}.json`);
  if (fs.existsSync(selectionPath)) throw new Error(`Refusing to overwrite ${selectionPath}`);
  fs.writeFileSync(
    selectionPath,
    canonicalJson({
      kind: 'monad-city-batch-3-selection',
      schemaVersion: '1',
      generatedAtUtc: canonicalTimestamp(),
      resolution: path.relative(process.cwd(), latestArtifact('pending-deployments')),
      identityFlags,
      selected: selectionItems,
    }),
  );

  const districtCounts = selectionItems.reduce((acc, item) => {
    acc[item.manifest.district] = (acc[item.manifest.district] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `Assembled ${outPath}: ${workspace.candidateRecords.length} candidate records ` +
      `(${records.length} carried/history, ${batchRecords.length} appended as proposed) + ` +
      `${workspace.candidateRelationships.length} relationships. Excluded by identity flags: ${excludedIds.size}.`,
  );
  console.log(`Districts: ${JSON.stringify(districtCounts)}`);
  console.log(`Decision plan: ${planPath} (${plannedDecisions.length} evidence:review calls). Selection: ${selectionPath}`);
}

try {
  main();
} catch (error) {
  console.error(`build-batch-3-workspace: ${error.message}`);
  process.exitCode = 1;
}
