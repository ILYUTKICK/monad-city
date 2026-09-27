#!/usr/bin/env node
// Phase 5.2 Batch 2 workspace assembly (build-time only, run once).
//
// Assembles the review workspace for the phase-3.5-v4 snapshot from three inputs:
//   1. the ACTIVE approved runtime (v3: 52 evidence records + 6 relationships, already carrying
//      inline phase-3.7 review metadata — carried as-is, no re-decisions);
//   2. the retained v2-era candidate history (the four superseded predecessors, recorded
//      `stale`/`superseded` exactly as in the v3 lineage);
//   3. the batch-2 selection (scripts/research/select-batch-2.js): 90 drafted records appended
//      as `proposed` — 5 App Portal candidates (deferred Batch 1) + 85 DefiLlama registry
//      candidates. The script never approves anything: approvals happen exclusively through
//      `npm run evidence:review` driven by the emitted decision plan.
//
// Tokens are opaque, random, identify review actions only, and imply nothing about people.

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
const REFRESH_INSTANT = '2026-09-22T22:02:32Z';
const EXPECTED_PROJECTED_RECORDS = 52;
const EXPECTED_STALE_EVIDENCE = 2; // E-KURU-MEM-001, E-PYTH-CAP-001
const EXPECTED_STALE_RELATIONSHIPS = 2; // monad-kuru, monad-pyth
const EXPECTED_BATCH_RECORDS = 90;

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

function main() {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Usage: node scripts/build-batch-2-workspace.js <out-workspace.json>');
  if (fs.existsSync(outPath)) throw new Error(`Refusing to overwrite ${outPath}`);

  const draft = JSON.parse(fs.readFileSync(latestArtifact('proposals-draft'), 'utf8'));
  const selection = JSON.parse(fs.readFileSync(latestArtifact('batch-2-selection'), 'utf8'));
  if (draft.kind !== 'monad-city-ecosystem-intake-draft') throw new Error('Latest draft artifact is not an intake draft');
  if (selection.kind !== 'monad-city-batch-2-selection') throw new Error('Latest selection artifact is invalid');

  const proposalById = new Map(draft.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const batchRecords = selection.selected.map((item) => {
    const proposal = proposalById.get(item.proposalId);
    if (!proposal) throw new Error(`Selected proposal ${item.proposalId} is missing from the draft artifact`);
    const record = proposal.evidenceCandidates[0];
    if (!record) throw new Error(`Proposal ${item.proposalId} carries no evidence candidate`);
    if (record.reviewStatus !== 'proposed' || record.reviewedAt !== null) {
      throw new Error(`Candidate ${record.id} is not an unreviewed draft`);
    }
    return JSON.parse(JSON.stringify(record));
  });
  if (batchRecords.length !== EXPECTED_BATCH_RECORDS) {
    throw new Error(`Expected ${EXPECTED_BATCH_RECORDS} batch records, found ${batchRecords.length}`);
  }

  const transitionToken = randomToken();
  const ownerToken = randomToken();

  // Carried projection: keep exactly as approved in v3 (metadata inline already).
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
    note: 'Owner batch approval recorded per record through npm run evidence:review.',
  }));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, canonicalJson(workspace));

  const planPath = path.join(RESEARCH_DIR, `batch-2-review-plan-${utcDateStamp()}.json`);
  if (fs.existsSync(planPath)) throw new Error(`Refusing to overwrite ${planPath}`);
  fs.writeFileSync(
    planPath,
    canonicalJson({
      kind: 'monad-city-batch-2-review-plan',
      schemaVersion: '1',
      generatedAtUtc: canonicalTimestamp(),
      inputs: {
        assembledWorkspace: path.relative(process.cwd(), outPath),
        selection: path.relative(process.cwd(), latestArtifact('batch-2-selection')),
        draft: path.relative(process.cwd(), latestArtifact('proposals-draft')),
      },
      tokens: {
        transition: {
          reviewerRef: transitionToken,
          meaning:
            'Opaque schema-transition token re-recording the four superseded predecessors as stale in the v4 workspace lineage. It maps existing history and does not identify or create a reviewer.',
        },
        owner: {
          reviewerRef: ownerToken,
          meaning:
            'Opaque token for the 2026-09-27 owner batch approval of the 90 batch-2 directory/registry listing records. It identifies the review action only; it is not authentication or an authority.',
        },
      },
      plannedDecisions,
    }),
  );

  console.log(
    `Assembled ${outPath}: ${workspace.candidateRecords.length} candidate records ` +
      `(${records.length} carried/imported, ${batchRecords.length} appended as proposed) + ` +
      `${workspace.candidateRelationships.length} relationships. ` +
      `Decision plan: ${planPath} (${plannedDecisions.length} evidence:review calls to run).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`build-batch-2-workspace: ${error.message}`);
  process.exitCode = 1;
}
