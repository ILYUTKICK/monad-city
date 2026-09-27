#!/usr/bin/env node
// Identity-merge workspace assembly (build-time only, run once).
//
// Owner decision 2026-09-27 (docs/WORKLOG.md): merge all seven brand-level groups excluded
// from batch 3 into the city manifests they family-match. Two operation kinds:
//   1. Five existing manifests get a SUCCESSOR evidence record carrying the pinned-registry
//      deployment mapping (projectIds unchanged — morpho-blue, folks-finance-xchain, lfj-poe,
//      accountable, gearbox). The old directory-listing records stay in history.
//   2. Two product PAIRS collapse into one brand manifest each (mellow-core + mellow-restaking
//      -> `mellow`; townsquare-lending + townsquare-loop-vaults -> `townsquare`). The brand
//      manifests get NEW sequence-1 records, and the four product records receive explicit
//      stale decisions (superseded) through the review CLI.
// Manifest name/alias changes themselves are city edits applied after promotion; this script
// builds the EVIDENCE side only. Tokens are opaque, random, identify review actions only.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  candidateEvidenceRecords,
  candidateRelationshipProposals,
  evidenceRecords as projectedEvidence,
  relationshipProposals as projectedRelationships,
} from '../src/evidence.js';

const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
const RESEARCH_DIR = path.join('data', 'research');
const PINNED_COMMIT = '36fddcc0021fffe81c7b73a8672347538ec2c9eb';
const PINNED_URL = `https://raw.githubusercontent.com/monad-crypto/protocols/${PINNED_COMMIT}/protocols-mainnet.json`;
const PINNED_PUBLISHED_AT = '2026-09-07T21:59:59Z';
const EXPECTED_PROJECTED_RECORDS = 190;
const EXPECTED_STALE_RELATIONSHIPS = 2; // monad-kuru, monad-pyth (v2-era history, carried)

const MERGES = [
  { manifestId: 'morpho-blue', resolutionId: 'morpho', registryKey: 'morpho', newName: 'Morpho', aliases: ['Morpho Blue'], rename: true },
  { manifestId: 'folks-finance-xchain', resolutionId: 'folks-finance', registryKey: 'folks_finance', newName: 'Folks Finance', aliases: ['Folks Finance xChain'], rename: true },
  { manifestId: 'lfj-poe', resolutionId: 'lfj', registryKey: 'lfj', newName: 'LFJ', aliases: ['LFJ POE'], rename: true },
  { manifestId: 'accountable', resolutionId: 'accountable', registryKey: 'accountable', newName: 'Accountable', aliases: ['YieldApp by Accountable'], rename: false },
  { manifestId: 'gearbox', resolutionId: 'gearbox-protocol', registryKey: 'gearbox_protocol', newName: 'Gearbox', aliases: ['Gearbox Protocol'], rename: false },
  { manifestId: 'mellow', resolutionId: 'mellow', registryKey: 'mellow', newName: 'Mellow', aliases: ['Mellow Core', 'Mellow Restaking'], staleProjectIds: ['mellow-core', 'mellow-restaking'] },
  { manifestId: 'townsquare', resolutionId: 'townsquare', registryKey: 'townsquare', newName: 'TownSquare', aliases: ['TownSquare Lending', 'TownSquare Loop Vaults'], staleProjectIds: ['townsquare-lending', 'townsquare-loop-vaults'] },
];

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
  if (files.length === 0) throw new Error(`no artifact ${prefix}-<date>.json`);
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function randomToken() {
  return `reviewer:r-${crypto.randomBytes(8).toString('hex')}`;
}

function truncateAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function buildClaim(entry, key) {
  const addresses = Object.entries(entry.addresses ?? {});
  const live = entry.live === true ? ' as live' : '';
  const categories = (entry.categories ?? []).map((category) => category.split('::')[1]).join(', ');
  const categoryText = categories ? ` in ${categories}` : '';
  const examples = addresses
    .slice(0, 2)
    .map(([label, address]) => `${label} ${truncateAddress(address)}`)
    .join(', ');
  const addressText =
    addresses.length === 1
      ? `1 Monad mainnet contract address (${examples})`
      : `${addresses.length} Monad mainnet contract addresses (e.g. ${examples})`;
  return `The pinned Monad protocol registry lists ${entry.name ?? key} (entry \`${key}\`)${live}${categoryText} and maps ${addressText}.`;
}

function mergeProvenance(resolutionRow, mergeNote) {
  const checked = (resolutionRow?.explorer ?? []).length;
  const live = (resolutionRow?.explorer ?? []).filter((check) => check.hasCode);
  const names = [...new Set(live.map((check) => check.contractName).filter(Boolean))];
  const checkText = live.length > 0
    ? `At the resolution instant, ${checked} of the entry's addresses were cross-checked via the Etherscan V2 API (chainid 143): ${live.length} hold live bytecode${names.length ? `; verified contract names: ${names.join(', ')}` : '; no verified contract names published'}.`
    : 'Explorer cross-check facts are recorded in the resolution artifact.';
  return (
    'Immutable commit snapshot. Moving re-retrieval pointer only: ' +
    'https://raw.githubusercontent.com/monad-crypto/protocols/main/protocols-mainnet.json. ' +
    `Drafted by scripts/build-identity-merges.js under the owner's 2026-09-27 identity-merge decision. ${mergeNote} ` +
    `${checkText} That check is corroboration in provenance, not part of this record's claim. ` +
    'Automated draft; a human must inspect the live source before any review decision.'
  );
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Usage: node scripts/build-identity-merges.js <out-workspace.json>');
  if (fs.existsSync(outPath)) throw new Error(`Refusing to overwrite ${outPath}`);

  const resolution = JSON.parse(fs.readFileSync(latestArtifact('pending-deployments'), 'utf8'));
  const resolutionByProposal = new Map(resolution.projects.map((project) => [project.proposedId, project]));
  const registry = await (await fetch(PINNED_URL, { signal: AbortSignal.timeout(20000) })).json();

  const projectedIds = new Set(projectedEvidence.map((record) => record.id));
  const recordsByProject = new Map();
  for (const record of projectedEvidence) {
    if (!recordsByProject.has(record.projectId)) recordsByProject.set(record.projectId, []);
    recordsByProject.get(record.projectId).push(record);
  }

  const batchRecords = [];
  const manifestChanges = [];
  const removedManifestIds = [];

  for (const merge of MERGES) {
    const entry = registry[merge.registryKey];
    if (!entry) throw new Error(`registry entry ${merge.registryKey} missing`);
    const resolutionRow = resolutionByProposal.get(merge.resolutionId) ?? null;
    if (!resolutionRow) throw new Error(`no resolution row for ${merge.manifestId}`);

    const contracts = Object.entries(entry.addresses ?? {}).map(([role, address]) => ({
      address,
      role,
      runtimeDisposition: 'candidate',
    }));
    if (contracts.length === 0) throw new Error(`registry entry ${merge.registryKey} carries no addresses`);

    let successorOf = null;
    let evidenceId;
    let projectId = merge.manifestId;
    let mergeNote;

    if (merge.staleProjectIds) {
      // Brand manifest replacing a product pair: NEW sequence-1 record under the brand id.
      evidenceId = `E-${merge.manifestId.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REGISTRY-001`;
      mergeNote = `New brand-level record for the merged ${merge.aliases.join(' + ')} manifests (the brand is the manifest; the products remain aliases).`;
      for (const staleProjectId of merge.staleProjectIds) {
        const staleCandidates = recordsByProject.get(staleProjectId) ?? [];
        if (staleCandidates.length !== 1) {
          throw new Error(`Expected exactly one approved record for ${staleProjectId}, found ${staleCandidates.length}`);
        }
        removedManifestIds.push(staleProjectId);
      }
    } else {
      const predecessors = recordsByProject.get(merge.manifestId) ?? [];
      if (predecessors.length !== 1) {
        throw new Error(`Expected exactly one approved record for ${merge.manifestId}, found ${predecessors.length}`);
      }
      const predecessor = predecessors[0];
      successorOf = predecessor.id;
      evidenceId = predecessor.id.replace(/(\d+)$/, (digits) => String(Number(digits) + 1));
      mergeNote = `Successor of ${predecessor.id}: upgrades the directory-listing record with the pinned-registry deployment mapping for the same manifest.`;
    }

    if (candidateEvidenceRecords.some((record) => record.id === evidenceId)) {
      throw new Error(`evidence id ${evidenceId} collides with candidate history`);
    }

    batchRecords.push({
      id: evidenceId,
      projectId,
      relatedProjectIds: [],
      claim: buildClaim(entry, merge.registryKey),
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
      scope: `Pinned registry entry \`${merge.registryKey}\` and its exact snapshot metadata.`,
      provenance: {
        kind: 'manual-curation',
        notes: mergeProvenance(resolutionRow, mergeNote),
      },
      provenanceNotes: mergeProvenance(resolutionRow, mergeNote),
      limitations: [
        'Protocol representatives submit entries; automated checks validate format, not correctness or safety.',
        'A registry address mapping is not code ownership, activity, safety, legitimacy, or endorsement.',
        'Explorer liveness at the resolution instant is recorded in provenance only; this record supports the registry snapshot, not a current-state claim.',
      ],
      quality: { conflict: false, incomplete: false, stale: false, unavailable: false, timeBoundEligible: true },
      identifiers: { contracts },
      conflicts: [],
      supportMode: 'artifact-observation-only',
      supportedProposition: `Pinned registry entry \`${merge.registryKey}\` and its exact snapshot metadata.`,
      supportsFactualClaims: true,
      dataMode: 'sourced-limited',
      reviewStatus: 'proposed',
      reviewedAt: null,
      revision: successorOf
        ? { sequence: 2, supersedesEvidenceId: successorOf }
        : { sequence: 1, supersedesEvidenceId: null },
      reviewMetadata: null,
    });

    manifestChanges.push({
      manifestId: merge.manifestId,
      newName: merge.newName,
      aliases: merge.aliases,
      replaces: merge.staleProjectIds ?? null,
      ...(merge.rename ? {} : { nameUnchanged: !merge.staleProjectIds }),
    });
  }

  // The four product records dissolved by the collapses receive explicit stale decisions in
  // the review loop (not silently here).
  const stalePlans = [];
  for (const merge of MERGES) {
    for (const staleProjectId of merge.staleProjectIds ?? []) {
      const predecessors = recordsByProject.get(staleProjectId) ?? [];
      if (predecessors.length !== 1) {
        throw new Error(`Expected exactly one approved record for ${staleProjectId}, found ${predecessors.length}`);
      }
      const predecessor = predecessors[0];
      stalePlans.push({
        kind: 'evidence',
        subjectId: predecessor.id,
        projectId: staleProjectId,
        decision: 'stale',
        reviewMethod: 'manual-governance-withdrawal',
        decisionReason: 'superseded',
        note: `Manifest merged into ${merge.manifestId} per the owner's 2026-09-27 identity decision; the record's bounded claim remains true in history.`,
      });
    }
  }

  const transitionToken = randomToken();
  const ownerToken = randomToken();

  const records = JSON.parse(JSON.stringify(projectedEvidence));
  const relationships = JSON.parse(JSON.stringify(projectedRelationships));
  if (records.length !== EXPECTED_PROJECTED_RECORDS) {
    throw new Error(`Expected ${EXPECTED_PROJECTED_RECORDS} carried records, found ${records.length}`);
  }
  // Retained v2-era history (absent from the projection) carries forward as stale, as in the
  // v4/v5 lineage.
  let staleEvidence = 0;
  candidateEvidenceRecords.forEach((candidate) => {
    if (projectedIds.has(candidate.id)) return;
    records.push({
      ...JSON.parse(JSON.stringify(candidate)),
      reviewStatus: 'stale',
      reviewedAt: REFRESH_INSTANT_STABLE,
      reviewMetadata: {
        reviewerRef: transitionToken,
        reviewerRole: 'evidence-reviewer',
        reviewedAt: REFRESH_INSTANT_STABLE,
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
      reviewedAt: REFRESH_INSTANT_STABLE,
      reviewMetadata: {
        reviewerRef: transitionToken,
        reviewerRole: 'relationship-reviewer',
        reviewedAt: REFRESH_INSTANT_STABLE,
        reviewMethod: 'manual-governance-withdrawal',
        decisionReason: 'superseded',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      },
    });
    staleRelationships += 1;
  });
  if (staleEvidence !== 2 || staleRelationships !== EXPECTED_STALE_RELATIONSHIPS) {
    throw new Error(`Unexpected retained history: ${staleEvidence} stale evidence, ${staleRelationships} stale relationships`);
  }

  const workspace = {
    candidateRecords: [...records, ...batchRecords],
    candidateRelationships: relationships,
    reviewPolicyVersion: REVIEW_POLICY_VERSION,
  };

  const reviewAt = canonicalTimestamp();
  const plannedDecisions = [
    ...batchRecords.map((record) => ({
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
      note: 'Owner merge approval («слей все 7», 2026-09-27, recorded in docs/WORKLOG.md) applied per record through npm run evidence:review.',
    })),
    ...stalePlans.map((plan) => ({
      kind: 'evidence',
      subjectId: plan.subjectId,
      projectId: plan.projectId,
      decision: plan.decision,
      reviewedAt: reviewAt,
      reviewerRef: ownerToken,
      reviewerRole: 'evidence-reviewer',
      reviewMethod: plan.reviewMethod,
      decisionReason: plan.decisionReason,
      reviewPolicyVersion: REVIEW_POLICY_VERSION,
      note: plan.note,
    })),
  ];

  fs.writeFileSync(outPath, canonicalJson(workspace));

  const dateStamp = reviewAt.slice(0, 10);
  const planPath = path.join(RESEARCH_DIR, `identity-merge-review-plan-${dateStamp}.json`);
  if (fs.existsSync(planPath)) throw new Error(`Refusing to overwrite ${planPath}`);
  fs.writeFileSync(
    planPath,
    canonicalJson({
      kind: 'monad-city-identity-merge-review-plan',
      schemaVersion: '1',
      generatedAtUtc: reviewAt,
      inputs: { assembledWorkspace: path.relative(process.cwd(), outPath) },
      tokens: {
        transition: { reviewerRef: transitionToken, meaning: 'Opaque schema-transition token for the carried v2-era stale predecessors; identifies no reviewer.' },
        owner: { reviewerRef: ownerToken, meaning: 'Opaque token for the 2026-09-27 owner identity-merge decisions (7 approvals + 4 supersessions). It identifies the review action only.' },
      },
      manifestChanges,
      removedManifestIds,
      plannedDecisions,
    }),
  );
  console.log(
    `Assembled ${outPath}: ${workspace.candidateRecords.length} candidate records ` +
      `(${records.length} carried/history, ${batchRecords.length} merge records proposed) + ` +
      `${relationships.length} relationships.`,
  );
  console.log(`Review plan: ${planPath} (${plannedDecisions.length} evidence:review calls).`);
  console.log(`Manifest changes: ${manifestChanges.length}; removed manifest ids: ${removedManifestIds.join(', ') || 'none'}`);
}

const REFRESH_INSTANT_STABLE = '2026-09-22T22:02:32Z';

try {
  await main();
} catch (error) {
  console.error(`build-identity-merges: ${error.message}`);
  process.exitCode = 1;
}
