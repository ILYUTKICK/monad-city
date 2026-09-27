#!/usr/bin/env node
// Phase 5.1 Batch 1 workspace assembly (build-time only, run once).
//
// Assembles the review workspace for the phase-3.5-v3 snapshot from the runtime's retained
// candidate history (23 evidence candidates + 6 relationship candidates, including the three
// superseded predecessors) plus the reviewed intake draft and the batch-1 selection.
//
// What it does, and what it deliberately does not do:
// - marks the workspace with reviewPolicyVersion phase-3.7-review-policy-v1;
// - imports the legacy decisions INTO THE INLINE FORMAT as a schema-compatibility mapping
//   (the same operation the v2 governance companion performed, expressed with the opaque
//   transition reviewer token the inline contract requires). The 22 projected evidence
//   records and 6 projected relationships keep their exact historical decision and
//   reviewedAt; the three superseded predecessors (E-KURU-MEM-001, monad-kuru, monad-pyth)
//   are recorded as `stale`/`superseded` at the refresh instant, which is the honest status
//   their successors already imply. No new review judgment is made here;
// - appends the 30 batch-1 records exactly as drafted (`proposed`, `reviewedAt: null`,
//   `reviewMetadata: null`) — it never approves them. Approval happens exclusively through
//   `npm run evidence:review` per record, driven by the emitted decision plan.
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
  validateCandidateEvidenceRecord,
} from '../src/evidence.js';

const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
const RESEARCH_DIR = path.join('data', 'research');
const REFRESH_INSTANT = '2026-09-22T22:02:32Z';
const EXPECTED_LEGACY_RECORDS = 24; // 23 retained candidates + E-KURU-MEM-002 from the snapshot
const EXPECTED_LEGACY_RELATIONSHIPS = 8; // 6 retained candidates + the two 002 successors
const EXPECTED_SUPERSEDED = { evidence: 2, relationship: 2 };
// Records withdrawn from the approved projection at the 2026-09-22 refresh. E-KURU-MEM-001 is
// derivable from the revision pointer of its successor; E-PYTH-CAP-001 has no successor record
// and its withdrawal is documented in docs/EVIDENCE_DATA_CONTRACT.md and enforced by the
// runtime contract check.
const WITHDRAWN_EVIDENCE_IDS = Object.freeze(['E-KURU-MEM-001', 'E-PYTH-CAP-001']);
const EXPECTED_BATCH_RECORDS = 30;

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
  if (!outPath) throw new Error('Usage: node scripts/build-batch-1-workspace.js <out-workspace.json>');
  if (fs.existsSync(outPath)) throw new Error(`Refusing to overwrite ${outPath}`);

  const draft = JSON.parse(fs.readFileSync(latestArtifact('proposals-draft'), 'utf8'));
  const selection = JSON.parse(fs.readFileSync(latestArtifact('batch-1-selection'), 'utf8'));
  if (draft.kind !== 'monad-city-ecosystem-intake-draft') throw new Error('Latest draft artifact is not an intake draft');
  if (selection.kind !== 'monad-city-batch-1-selection') throw new Error('Latest selection artifact is invalid');

  const proposalById = new Map(draft.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const batchRecords = selection.selected.map((item) => {
    const proposal = proposalById.get(item.proposalId);
    if (!proposal) throw new Error(`Selected proposal ${item.proposalId} is missing from the draft artifact`);
    const record = proposal.evidenceCandidates[0];
    if (!record) throw new Error(`Proposal ${item.proposalId} carries no evidence candidate`);
    if (record.reviewStatus !== 'proposed' || record.reviewedAt !== null) {
      throw new Error(`Candidate ${record.id} is not an unreviewed draft`);
    }
    validateCandidateEvidenceRecord(record);
    return JSON.parse(JSON.stringify(record));
  });
  if (batchRecords.length !== EXPECTED_BATCH_RECORDS) {
    throw new Error(`Expected ${EXPECTED_BATCH_RECORDS} batch records, found ${batchRecords.length}`);
  }

  const transitionToken = randomToken();
  const ownerToken = randomToken();
  // Full retained history: the hand-authored candidate arrays plus the three successor
  // subjects that exist only in the promoted v2 projection. The union is the smallest
  // workspace in which every revision pointer and the approved projection resolve.
  const records = JSON.parse(JSON.stringify([...candidateEvidenceRecords, ...projectedEvidence
    .filter((record) => !candidateEvidenceRecords.some((candidate) => candidate.id === record.id))]));
  const relationships = JSON.parse(JSON.stringify([...candidateRelationshipProposals, ...projectedRelationships
    .filter((relationship) => !candidateRelationshipProposals.some((candidate) => candidate.id === relationship.id))]));
  if (records.length !== EXPECTED_LEGACY_RECORDS) {
    throw new Error(`Expected ${EXPECTED_LEGACY_RECORDS} legacy evidence candidates, found ${records.length}`);
  }
  if (relationships.length !== EXPECTED_LEGACY_RELATIONSHIPS) {
    throw new Error(`Expected ${EXPECTED_LEGACY_RELATIONSHIPS} legacy relationship candidates, found ${relationships.length}`);
  }

  // A candidate whose successor exists in the same set was withdrawn from the projection at
  // the 2026-09-22 refresh; encode that explicitly instead of re-approving it.
  const supersededEvidenceIds = new Set([
    ...records
      .map((record) => record.revision?.supersedesEvidenceId)
      .filter((id) => typeof id === 'string' && id.length > 0),
    ...WITHDRAWN_EVIDENCE_IDS,
  ]);
  const supersededRelationshipIds = new Set(
    relationships
      .map((relationship) => relationship.revision?.supersedesRelationshipId)
      .filter((id) => typeof id === 'string' && id.length > 0),
  );
  if (supersededEvidenceIds.size !== EXPECTED_SUPERSEDED.evidence) {
    throw new Error(`Expected ${EXPECTED_SUPERSEDED.evidence} superseded evidence candidate, found ${supersededEvidenceIds.size}`);
  }
  if (supersededRelationshipIds.size !== EXPECTED_SUPERSEDED.relationship) {
    throw new Error(`Expected ${EXPECTED_SUPERSEDED.relationship} superseded relationship candidates, found ${supersededRelationshipIds.size}`);
  }

  const legacyDecisions = [];
  const recordById = new Map(records.map((record) => [record.id, record]));

  records.forEach((record) => {
    if (supersededEvidenceIds.has(record.id)) {
      record.reviewStatus = 'stale';
      record.reviewedAt = REFRESH_INSTANT;
      record.reviewMetadata = {
        reviewerRef: transitionToken,
        reviewerRole: 'evidence-reviewer',
        reviewedAt: REFRESH_INSTANT,
        reviewMethod: 'manual-governance-withdrawal',
        decisionReason: 'superseded',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      };
    } else {
      if (record.reviewStatus !== 'approved') {
        throw new Error(`Legacy record ${record.id} carries unexpected status ${record.reviewStatus}`);
      }
      record.reviewMetadata = {
        reviewerRef: transitionToken,
        reviewerRole: 'evidence-reviewer',
        reviewedAt: record.reviewedAt,
        reviewMethod: 'manual-source-and-payload-inspection',
        decisionReason: record.limitations.length > 0 ? 'supported-with-limitations' : 'scope-supported',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      };
    }
    legacyDecisions.push({
      kind: 'evidence',
      subjectId: record.id,
      importedFrom: 'phase-3.5-v2 candidate history',
      decision: record.reviewStatus,
      ...record.reviewMetadata,
    });
  });

  relationships.forEach((relationship) => {
    if (supersededRelationshipIds.has(relationship.id)) {
      relationship.reviewStatus = 'stale';
      relationship.reviewedAt = REFRESH_INSTANT;
      relationship.reviewMetadata = {
        reviewerRef: transitionToken,
        reviewerRole: 'relationship-reviewer',
        reviewedAt: REFRESH_INSTANT,
        reviewMethod: 'manual-governance-withdrawal',
        decisionReason: 'superseded',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      };
    } else {
      if (relationship.reviewStatus !== 'approved') {
        throw new Error(`Legacy relationship ${relationship.id} carries unexpected status ${relationship.reviewStatus}`);
      }
      const supporting = relationship.evidenceIds.map((id) => recordById.get(id));
      if (supporting.some((record) => !record)) {
        throw new Error(`Relationship ${relationship.id} references evidence outside the legacy history`);
      }
      const allClean = supporting.every(
        (record) => record.limitations.length === 0 && !record.quality.conflict && !record.quality.incomplete,
      );
      relationship.reviewMetadata = {
        reviewerRef: transitionToken,
        reviewerRole: 'relationship-reviewer',
        reviewedAt: relationship.reviewedAt,
        reviewMethod: 'manual-relationship-evidence-inspection',
        decisionReason: allClean ? 'evidence-resolved' : 'evidence-resolved-with-limitations',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      };
    }
    legacyDecisions.push({
      kind: 'relationship',
      subjectId: relationship.id,
      importedFrom: 'phase-3.5-v2 candidate history',
      decision: relationship.reviewStatus,
      ...relationship.reviewMetadata,
    });
  });

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

  const planPath = path.join(RESEARCH_DIR, `batch-1-review-plan-${utcDateStamp()}.json`);
  if (fs.existsSync(planPath)) throw new Error(`Refusing to overwrite ${planPath}`);
  fs.writeFileSync(
    planPath,
    canonicalJson({
      kind: 'monad-city-batch-1-review-plan',
      schemaVersion: '1',
      generatedAtUtc: canonicalTimestamp(),
      inputs: {
        assembledWorkspace: path.relative(process.cwd(), outPath),
        selection: path.relative(process.cwd(), latestArtifact('batch-1-selection')),
        draft: path.relative(process.cwd(), latestArtifact('proposals-draft')),
      },
      tokens: {
        transition: {
          reviewerRef: transitionToken,
          meaning:
            'Opaque schema-transition token for importing the 2026-09-09/2026-09-22 legacy candidate decisions into the phase-3.7 inline format and recording the three superseded predecessors as stale. It maps existing history and does not identify or create a reviewer.',
        },
        owner: {
          reviewerRef: ownerToken,
          meaning:
            'Opaque token for the 2026-09-27 owner batch approval of the 30 batch-1 directory-listing records. It identifies the review action only; it is not authentication or an authority.',
        },
      },
      legacyInlineImport: legacyDecisions,
      plannedDecisions,
    }),
  );

  console.log(
    `Assembled ${outPath}: ${workspace.candidateRecords.length} candidate records ` +
      `(22 approved imported inline, 3 superseded predecessors marked stale, ${batchRecords.length} appended as proposed) ` +
      `+ ${workspace.candidateRelationships.length} relationships (6 approved imported, 2 superseded marked stale). ` +
      `Decision plan: ${planPath} (${plannedDecisions.length} evidence:review calls to run).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`build-batch-1-workspace: ${error.message}`);
  process.exitCode = 1;
}
