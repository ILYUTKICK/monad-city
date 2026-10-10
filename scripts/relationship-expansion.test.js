import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceFingerprint, assertNoSilentOverwrite, projectApprovedRelationships, calculateEvidenceReviewCadence, calculateRelationshipReviewCadence } from '../src/evidence-contract.js';
import { validateCandidateEvidenceRecord, KNOWN_PROJECT_IDS } from '../src/evidence.js';

const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));
const base = read('data/evidence-snapshots/phase-3.5-v6.json');
const workspace = read('data/research/relationship-expansion-2026-10-10.candidates.json');
const research = read('data/research/relationship-expansion-2026-10-10.research.json');
const newIds = new Set(research.relationships.map(r => r.evidenceId));
for (const record of research.supportingTokenRecords) newIds.add(record.id);
const newRecords = workspace.candidateRecords.filter(r => newIds.has(r.id));

test('approved expansion has valid current cadence, without extending pinned declaration review intervals', () => {
  const snapshot = read('data/evidence-snapshots/phase-3.5-v7.json');
  const cadence = new Map(snapshot.records.map(r => [r.id, calculateEvidenceReviewCadence(r, r.reviewedAt)]));
  assert.equal(snapshot.records.length, 217);
  assert.equal(snapshot.relationships.length, 28);
  for (const r of snapshot.records) {
    assert.ok(Date.parse(snapshot.reviewedAt) < Date.parse(cadence.get(r.id).nextReviewAt));
    if (r.evidenceType === 'project-declared-relationship') assert.equal(cadence.get(r.id).baseCadenceDays, 60);
  }
  for (const r of snapshot.relationships) {
    assert.ok(Date.parse(snapshot.reviewedAt) < Date.parse(calculateRelationshipReviewCadence(r, r.reviewedAt, cadence).nextReviewAt));
  }
  assert.throws(() => calculateEvidenceReviewCadence({...snapshot.records[0], source: {...snapshot.records[0].source, referenceType: 'unknown'}}, snapshot.reviewedAt), /unsupported cadence/);
});

test('unreviewed expansion cannot enter the approved projection and carried payloads are unchanged', () => {
  assert.equal(newRecords.length, 24);
  for (const r of newRecords) {
    validateCandidateEvidenceRecord(r);
    assert.equal(r.reviewStatus, 'needs-review');
    assert.equal(r.reviewMetadata, null);
    assert.equal(r.quality.timeBoundEligible, false);
    assert.equal(r.quality.unavailable, false);
    assert.ok(research.sources.some(s => s.source.url === r.source.url && /^[a-f0-9]{64}$/.test(s.responseSha256)));
  }
  assertNoSilentOverwrite(base.records, workspace.candidateRecords);
  const approved = workspace.candidateRecords.filter(r => r.reviewStatus === 'approved');
  assert.deepEqual(approved.map(evidenceFingerprint), base.records.map(evidenceFingerprint));
  assert.deepEqual(projectApprovedRelationships(workspace.candidateRelationships, approved), base.relationships);
});

test('every proposed edge resolves exact support and endpoint identity; incomplete architecture stays bounded', () => {
  const ids = new Set(workspace.candidateRecords.map(r => r.id));
  const edges = workspace.candidateRelationships.filter(r => research.relationships.some(x => x.id === r.id));
  assert.equal(edges.length, 22);
  for (const r of edges) {
    assert.ok(KNOWN_PROJECT_IDS.includes(r.from) && KNOWN_PROJECT_IDS.includes(r.to));
    assert.notEqual(r.from, r.to);
    assert.equal(r.status, 'Claimed');
    assert.equal(r.type, 'declared_integration');
    assert.equal(r.reviewStatus, 'needs-review');
    assert.ok(r.evidenceIds.length > 0 && r.evidenceIds.every(id => ids.has(id)));
  }
  for (const id of ['beefy-kintsu-asset', 'beefy-shmonad-asset', 'beefy-magma-asset', 'perpl-agora-collateral']) {
    assert.equal(edges.find(r => r.id === id).evidenceIds.length, 2);
  }
  const lever = newRecords.find(r => r.id === 'E-LEVERUP-PYTH-ORACLE-001');
  assert.equal(lever.quality.incomplete, true);
  assert.match(lever.scope, /does not establish an exact Monad mainnet feed/);
  assert.match(edges.find(r => r.id === 'agora-layerzero-oft').scope, /future rollout/);
});
