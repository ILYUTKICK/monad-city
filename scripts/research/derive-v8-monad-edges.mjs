// Derive the v8 monad→X relationship candidates from the reviewed relationship audit.
// Owner decision 2026-10-11: ship all 166 edges. Every edge clones the structure of an
// existing approved sourced relationship and inherits scope/limitations verbatim from its
// single approved supporting record; nothing is invented here.
// Review method: approved-record-derivation (policy amendment documented in
// docs/EVIDENCE_DATA_CONTRACT.md and scripts/evidence-workflow.js).
import fs from 'node:fs';
import path from 'node:path';
import { candidateEvidenceRecords, candidateRelationshipProposals } from '../../src/evidence.js';

const ROOT = path.resolve(process.cwd());
const SNAPSHOT_PATH = path.join(ROOT, 'data/evidence-snapshots/phase-3.5-v7.json');
const AUDIT_PATH = path.join(ROOT, 'docs/research/2026-10-11-relationship-audit.md');
const OUT_PATH = path.join(ROOT, 'data/evidence-snapshots/phase-3.5-v8.workspace.json');

const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
const DECISION_AT = '2026-10-11T22:00:00Z';
// Opaque per-batch reviewer reference; identifies the derivation batch, not a person.
const REVIEWER_REF = 'reviewer:r-9d2c41a7b08e5f63';
const DATA_MODE = 'sourced-limited';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
const audit = fs.readFileSync(AUDIT_PATH, 'utf8');

function tableEntries(startMarker, endMarker) {
  const start = audit.indexOf(startMarker);
  const end = audit.indexOf(endMarker, start);
  assert(start !== -1 && end !== -1, `Audit section markers not found: ${startMarker}`);
  const rows = [];
  for (const line of audit.slice(start, end).split('\n')) {
    if (!line.startsWith('| `monad-')) continue;
    const codes = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    const id = codes[0];
    const evidenceIds = codes.filter((token) => /^E-[A-Z0-9-]+$/.test(token));
    assert(id && evidenceIds.length === 1, `Unexpected audit row: ${line}`);
    rows.push({ id, evidenceId: evidenceIds[0] });
  }
  return rows;
}

const classA = tableEntries('## 4. Готовые к внедрению', '## 5. Прочие возможные');
const classB = tableEntries('### 8.2. Класс B', '### 8.3. Класс C');
const classC = tableEntries('### 8.3. Класс C', '### 8.4. Класс E');
assert(classA.length === 35, `Class A expected 35 rows, got ${classA.length}`);
assert(classB.length === 56, `Class B expected 56 rows, got ${classB.length}`);
assert(classC.length === 75, `Class C expected 75 rows, got ${classC.length}`);

const recordsById = new Map(snapshot.records.map((record) => [record.id, record]));
const existingIds = new Set(snapshot.relationships.map((relationship) => relationship.id));
const template = snapshot.relationships.find((item) => item.id === 'monad-apriori');
assert(template, 'monad-apriori template relationship not found');

const derived = [];
const seenIds = new Set();
const seenPairs = new Set();
for (const [className, rows] of [['A', classA], ['B', classB], ['C', classC]]) {
  for (const { id, evidenceId } of rows) {
    assert(!seenIds.has(id), `Duplicate proposed id ${id}`);
    seenIds.add(id);
    assert(!existingIds.has(id), `Proposed id ${id} collides with an existing relationship`);
    const record = recordsById.get(evidenceId);
    assert(record, `Evidence record ${evidenceId} (${className}) not found in the snapshot`);
    assert(record.reviewStatus === 'approved', `Evidence record ${evidenceId} is not approved`);
    assert(record.projectId && record.projectId !== 'monad', `Record ${evidenceId} has an invalid projectId`);
    const pair = `monad->${record.projectId}`;
    assert(!seenPairs.has(pair), `Duplicate monad->${record.projectId} pair via ${id}`);
    seenPairs.add(pair);
    derived.push({
      id,
      from: 'monad',
      to: record.projectId,
      type: 'ecosystem_membership',
      status: 'Observed',
      evidenceIds: [evidenceId],
      scope: record.scope,
      limitations: structuredClone(record.limitations),
      dataMode: DATA_MODE,
      reviewStatus: 'approved',
      reviewedAt: DECISION_AT,
      reviewMetadata: {
        reviewerRef: REVIEWER_REF,
        reviewerRole: 'relationship-reviewer',
        reviewedAt: DECISION_AT,
        reviewMethod: 'approved-record-derivation',
        decisionReason: 'evidence-resolved',
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
      },
      revision: { sequence: 1, supersedesRelationshipId: null },
    });
  }
}

assert(derived.length === 166, `Expected 166 derived relationships, got ${derived.length}`);
assert(
  new Set(derived.map((item) => item.to)).size === derived.length,
  'Derived edges must target distinct projects',
);

// Revision lineage needs every referenced predecessor inside the workspace union. The v7
// approved-only projection dropped the superseded predecessors; the runtime's retained
// candidate history (src/evidence.js) is their authoritative content. Restore exactly the
// referenced ones as explicitly stale/superseded — the same treatment the phase-3.5-v3
// workspace used — so history is retained without re-entering the approved projection.
const candidateRecords = [...snapshot.records];
const candidateRelationships = [...snapshot.relationships];
const retainedEvidenceById = new Map(candidateEvidenceRecords.map((record) => [record.id, record]));
const retainedRelationshipsById = new Map(candidateRelationshipProposals.map((item) => [item.id, item]));
const restored = [];
function retainSupersededPredecessor(predecessorId, kind) {
  const present = kind === 'evidence'
    ? candidateRecords.some((record) => record.id === predecessorId)
    : candidateRelationships.some((item) => item.id === predecessorId);
  if (present) return;
  const retained = kind === 'evidence' ? retainedEvidenceById.get(predecessorId) : retainedRelationshipsById.get(predecessorId);
  assert(retained, `Predecessor ${predecessorId} (${kind}) is not in the retained candidate history`);
  const restoredRecord = structuredClone(retained);
  // Truthful governance state: this record was superseded by its reviewed successor; it must
  // not re-enter the approved projection, so it is recorded as stale with an explicit
  // withdrawal decision.
  restoredRecord.reviewStatus = 'stale';
  restoredRecord.reviewedAt = DECISION_AT;
  restoredRecord.reviewMetadata = {
    reviewerRef: REVIEWER_REF,
    reviewerRole: kind === 'evidence' ? 'evidence-reviewer' : 'relationship-reviewer',
    reviewedAt: DECISION_AT,
    reviewMethod: 'manual-governance-withdrawal',
    decisionReason: 'superseded',
    reviewPolicyVersion: REVIEW_POLICY_VERSION,
  };
  if (kind === 'evidence') candidateRecords.push(restoredRecord);
  else candidateRelationships.push(restoredRecord);
  restored.push({ id: restoredRecord.id, kind });
}
for (const record of snapshot.records) {
  if (record.revision?.supersedesEvidenceId) retainSupersededPredecessor(record.revision.supersedesEvidenceId, 'evidence');
}
for (const relationship of [...snapshot.relationships, ...derived]) {
  if (relationship.revision?.supersedesRelationshipId) retainSupersededPredecessor(relationship.revision.supersedesRelationshipId, 'relationship');
}
// Restored historical relationships reference withdrawn evidence records (e.g. monad-pyth →
// E-PYTH-CAP-001, withdrawn without a successor per docs/EVIDENCE_DATA_CONTRACT.md); the v3
// workspace recorded both as stale/superseded, which is the precedent followed here.
for (const relationship of candidateRelationships) {
  for (const evidenceId of relationship.evidenceIds) {
    if (candidateRecords.some((record) => record.id === evidenceId)) continue;
    retainSupersededPredecessor(evidenceId, 'evidence');
  }
}
candidateRelationships.push(...derived);

const workspace = {
  schemaVersion: 1,
  kind: 'evidence-candidate-workspace',
  reviewPolicyVersion: REVIEW_POLICY_VERSION,
  baseSnapshot: {
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    reviewedAt: snapshot.reviewedAt,
  },
  candidateRecords,
  candidateRelationships,
};

fs.writeFileSync(OUT_PATH, `${JSON.stringify(workspace, null, 2)}\n`);
const byClass = { A: classA.length, B: classB.length, C: classC.length };
console.log(JSON.stringify({
  written: path.relative(ROOT, OUT_PATH),
  derived: derived.length,
  byClass,
  restoredPredecessors: restored,
  decisionAt: DECISION_AT,
  reviewerRef: REVIEWER_REF,
  existingRelationships: snapshot.relationships.length,
  workspaceRelationships: workspace.candidateRelationships.length,
}, null, 2));
