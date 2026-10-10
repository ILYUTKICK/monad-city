import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  buildRegistryTree,
  canonicalJson,
  computeRegistryContext,
  evaluateRegistryMembership,
  evaluateRelationshipEvidenceMembership,
  getRegistryProofInput,
  verifyRegistryBundle,
  verifyRegistryProof,
} from '../../src/registry-proof.js';
import {
  ACTIVE_REGISTRY_SNAPSHOT,
  buildRegistryArtifacts,
  readJson,
  validateRegistrySnapshot,
  verifyRegistryFiles,
} from './registry-io.js';

const snapshotPath = `data/evidence-snapshots/${ACTIVE_REGISTRY_SNAPSHOT.version}.json`;
const registryDirectory = `data/registry/${ACTIVE_REGISTRY_SNAPSHOT.version}`;

function nodeSha256(...parts) {
  const hash = createHash('sha256');
  parts.forEach((part) => hash.update(
    typeof part === 'string' && part.startsWith('0x')
      ? Buffer.from(part.slice(2), 'hex')
      : Buffer.from(part),
  ));
  return `0x${hash.digest('hex')}`;
}

test('active snapshot and every generated membership proof verify', async () => {
  const snapshot = readJson(snapshotPath).value;
  await validateRegistrySnapshot(snapshot);
  const verified = await verifyRegistryFiles(registryDirectory, snapshot);
  assert.equal(verified.evidenceArtifact.entries.length, 193);
  assert.equal(verified.relationshipArtifact.entries.length, 6);
  assert.equal(verified.manifest.deployment.status, 'unconfigured');
});

test('fresh deterministic export equals checked-in roots and payloads', async () => {
  const snapshot = readJson(snapshotPath).value;
  const fresh = await buildRegistryArtifacts(snapshot, snapshotPath);
  const checked = await verifyRegistryFiles(registryDirectory);
  assert.equal(canonicalJson(fresh.manifest), canonicalJson(checked.manifest));
  assert.equal(canonicalJson(fresh.evidenceArtifact), canonicalJson(checked.evidenceArtifact));
  assert.equal(canonicalJson(fresh.relationshipArtifact), canonicalJson(checked.relationshipArtifact));
});

test('independent Node crypto reproduces the portable ID, leaf, and proof root vector', async () => {
  const checked = await verifyRegistryFiles(registryDirectory);
  const entry = checked.evidenceArtifact.entries[0];
  const namespaceId = nodeSha256(checked.manifest.namespace.value);
  const versionHash = nodeSha256(checked.manifest.snapshot.version);
  const snapshotDomain = nodeSha256(checked.manifest.domains.snapshotId.value);
  const portableSnapshotId = nodeSha256(
    snapshotDomain,
    namespaceId,
    versionHash,
    checked.manifest.snapshot.canonicalSha256Bytes32,
  );
  assert.equal(portableSnapshotId, checked.manifest.snapshot.portableSnapshotId);
  const payloadSha256 = nodeSha256(canonicalJson(entry.payload));
  const idHash = nodeSha256(entry.subjectId);
  const leaf = nodeSha256(
    nodeSha256(checked.manifest.domains.evidenceLeaf.value),
    namespaceId,
    portableSnapshotId,
    idHash,
    payloadSha256,
  );
  assert.equal(payloadSha256, entry.payloadSha256);
  assert.equal(idHash, entry.idHash);
  assert.equal(leaf, entry.leafSha256);
  let computed = leaf;
  const nodeDomain = nodeSha256(checked.manifest.domains.evidenceNode.value);
  for (const sibling of entry.proof) {
    const [left, right] = [computed, sibling].sort();
    computed = nodeSha256(nodeDomain, left, right);
  }
  assert.equal(computed, checked.evidenceArtifact.root);
});

test('tampered payload, proof, domain, and order are independently rejected', async () => {
  const checked = await verifyRegistryFiles(registryDirectory);
  const context = await computeRegistryContext({
    namespace: checked.manifest.namespace.value,
    snapshotVersion: checked.manifest.snapshot.version,
    snapshotSha256: checked.manifest.snapshot.canonicalSha256,
  });
  const entry = checked.evidenceArtifact.entries[0];

  const tamperedPayload = structuredClone(entry.payload);
  tamperedPayload.scope = `${tamperedPayload.scope} altered`;
  assert.equal(await verifyRegistryProof({
    subjectKind: 'evidence', subjectId: entry.subjectId, payload: tamperedPayload,
    proof: entry.proof, expectedRoot: checked.evidenceArtifact.root, context,
  }), false);

  await assert.rejects(verifyRegistryProof({
    subjectKind: 'evidence', subjectId: `${entry.subjectId}X`, payload: entry.payload,
    proof: entry.proof, expectedRoot: checked.evidenceArtifact.root, context,
  }), /Payload id must equal subjectId/);
  const tamperedIdPayload = { ...entry.payload, id: `${entry.subjectId}X` };
  assert.equal(await verifyRegistryProof({
    subjectKind: 'evidence', subjectId: tamperedIdPayload.id, payload: tamperedIdPayload,
    proof: entry.proof, expectedRoot: checked.evidenceArtifact.root, context,
  }), false);

  const substitutedProof = [...entry.proof];
  substitutedProof[0] = `0x${'00'.repeat(32)}`;
  const removedProof = entry.proof.slice(0, -1);
  const duplicatedProof = [...entry.proof, entry.proof.at(-1)];
  const reorderedProof = [...entry.proof];
  [reorderedProof[0], reorderedProof[1]] = [reorderedProof[1], reorderedProof[0]];
  for (const alteredProof of [substitutedProof, removedProof, duplicatedProof, reorderedProof]) {
    assert.equal(await verifyRegistryProof({
      subjectKind: 'evidence', subjectId: entry.subjectId, payload: entry.payload,
      proof: alteredProof, expectedRoot: checked.evidenceArtifact.root, context,
    }), false);
  }
  await assert.rejects(verifyRegistryProof({
    subjectKind: 'evidence', subjectId: entry.subjectId, payload: entry.payload,
    proof: Array(65).fill(entry.leafSha256), expectedRoot: checked.evidenceArtifact.root, context,
  }), /at most 64/);

  const wrongContext = await computeRegistryContext({
    namespace: `${checked.manifest.namespace.value}:altered`,
    snapshotVersion: checked.manifest.snapshot.version,
    snapshotSha256: checked.manifest.snapshot.canonicalSha256,
  });
  assert.equal(await verifyRegistryProof({
    subjectKind: 'evidence', subjectId: entry.subjectId, payload: entry.payload,
    proof: entry.proof, expectedRoot: checked.evidenceArtifact.root, context: wrongContext,
  }), false);

  const orderTamperedPayload = structuredClone(entry.payload);
  assert(orderTamperedPayload.limitations.length > 1, 'Fixture must contain ordered array content');
  orderTamperedPayload.limitations.reverse();
  assert.equal(await verifyRegistryProof({
    subjectKind: 'evidence', subjectId: entry.subjectId, payload: orderTamperedPayload,
    proof: entry.proof, expectedRoot: checked.evidenceArtifact.root, context,
  }), false);

  const reversed = checked.evidenceArtifact.entries.map(({ subjectId, payload }) => ({ subjectId, payload })).reverse();
  const rebuilt = await buildRegistryTree(reversed, { subjectKind: 'evidence', context });
  assert.equal(rebuilt.root, checked.evidenceArtifact.root);
});

test('lifecycle evaluation fails closed for unconfigured, revoked, and missing publications', async () => {
  const checked = await verifyRegistryFiles(registryDirectory);
  const context = await computeRegistryContext({
    namespace: checked.manifest.namespace.value,
    snapshotVersion: checked.manifest.snapshot.version,
    snapshotSha256: checked.manifest.snapshot.canonicalSha256,
  });
  const entry = checked.relationshipArtifact.entries[0];
  const proof = {
    subjectKind: 'relationship', subjectId: entry.subjectId, payload: entry.payload,
    proof: entry.proof, expectedRoot: checked.relationshipArtifact.root, context,
  };
  const unconfigured = await evaluateRegistryMembership({ proof, lifecycle: {} });
  assert.equal(unconfigured.proofValid, true);
  assert.equal(unconfigured.usable, false);
  assert.deepEqual(unconfigured.reasons, [
    'deployment-unconfigured',
    'publication-status-unknown',
    'subject-revocation-scope-unknown',
  ]);

  const active = await evaluateRegistryMembership({
    proof,
    lifecycle: {
      deploymentConfigured: true,
      publicationStatus: 'active',
      subjectRevocationScope: 'namespace-lineage',
      subjectRevoked: false,
    },
  });
  assert.equal(active.usable, true);

  for (const [publicationStatus, reason] of [
    ['none', 'publication-not-found'],
    ['superseded', 'publication-superseded'],
    ['migrated', 'publication-migrated'],
    ['revoked', 'publication-revoked'],
  ]) {
    const result = await evaluateRegistryMembership({
      proof,
      lifecycle: {
        deploymentConfigured: true,
        publicationStatus,
        subjectRevocationScope: 'namespace-lineage',
        subjectRevoked: false,
      },
    });
    assert.equal(result.usable, false);
    assert.deepEqual(result.reasons, [reason]);
  }

  const subjectRevoked = await evaluateRegistryMembership({
    proof,
    lifecycle: {
      deploymentConfigured: true,
      publicationStatus: 'active',
      subjectRevocationScope: 'namespace-lineage',
      subjectRevoked: true,
    },
  });
  assert.equal(subjectRevoked.usable, false);
  assert.deepEqual(subjectRevoked.reasons, ['subject-globally-revoked']);

  const deploymentOnlyRevocation = await evaluateRegistryMembership({
    proof,
    lifecycle: {
      deploymentConfigured: true,
      publicationStatus: 'active',
      subjectRevocationScope: 'current-deployment',
      subjectRevoked: false,
    },
  });
  assert.equal(deploymentOnlyRevocation.usable, false);
  assert.deepEqual(deploymentOnlyRevocation.reasons, ['subject-revocation-scope-unknown']);

  const missingLineageResult = await evaluateRegistryMembership({
    proof,
    lifecycle: {
      deploymentConfigured: true,
      publicationStatus: 'active',
      subjectRevocationScope: 'namespace-lineage',
    },
  });
  assert.equal(missingLineageResult.usable, false);
  assert.deepEqual(missingLineageResult.reasons, ['subject-revocation-unknown']);
});

test('proof accessor returns an exact verifier input and rejects wrong-kind or absent subjects', async () => {
  const checked = await verifyRegistryFiles(registryDirectory);
  const context = await computeRegistryContext({
    namespace: checked.manifest.namespace.value,
    snapshotVersion: checked.manifest.snapshot.version,
    snapshotSha256: checked.manifest.snapshot.canonicalSha256,
  });
  const entry = checked.evidenceArtifact.entries[0];
  const proof = getRegistryProofInput({
    subjectKind: 'evidence',
    subjectId: entry.subjectId,
    context,
    evidenceArtifact: checked.evidenceArtifact,
    relationshipArtifact: checked.relationshipArtifact,
  });
  assert.equal(proof.payload, entry.payload);
  assert.equal(proof.proof, entry.proof);
  assert.equal(proof.expectedRoot, checked.evidenceArtifact.root);
  assert.equal(await verifyRegistryProof(proof), true);

  assert.throws(() => getRegistryProofInput({
    subjectKind: 'relationship',
    subjectId: entry.subjectId,
    context,
    evidenceArtifact: checked.evidenceArtifact,
    relationshipArtifact: checked.relationshipArtifact,
  }), /absent from registry artifact/);
  assert.throws(() => getRegistryProofInput({
    subjectKind: 'evidence',
    subjectId: 'E-UNKNOWN-001',
    context,
    evidenceArtifact: checked.evidenceArtifact,
    relationshipArtifact: checked.relationshipArtifact,
  }), /absent from registry artifact/);
});

test('bundle verification rejects manifest binding and unconfigured-state tampering', async () => {
  const snapshot = readJson(snapshotPath).value;
  const checked = await verifyRegistryFiles(registryDirectory, snapshot);
  const verify = (manifest) => verifyRegistryBundle({
    manifest,
    evidenceArtifact: checked.evidenceArtifact,
    relationshipArtifact: checked.relationshipArtifact,
    snapshot,
  });

  const wrongBytes32 = structuredClone(checked.manifest);
  wrongBytes32.snapshot.canonicalSha256Bytes32 = `0x${'00'.repeat(32)}`;
  await assert.rejects(verify(wrongBytes32), /snapshotSha256 bytes32 mismatch/);

  const wrongTimestamp = structuredClone(checked.manifest);
  wrongTimestamp.snapshot.reviewedAt = '2026-09-27T18:20:01Z';
  await assert.rejects(verify(wrongTimestamp), /Snapshot reviewedAt mismatch/);

  const wrongArtifactPath = structuredClone(checked.manifest);
  wrongArtifactPath.artifacts.evidence.path = 'replacement.json';
  await assert.rejects(verify(wrongArtifactPath), /Evidence artifact path mismatch/);

  const configuredFieldInLocalBundle = structuredClone(checked.manifest);
  configuredFieldInLocalBundle.deployment.chainId = 143;
  await assert.rejects(verify(configuredFieldInLocalBundle), /Unconfigured deployment chainId must be null/);
});

test('tree edge cases and domain separation are deterministic', async () => {
  const checked = await verifyRegistryFiles(registryDirectory);
  const context = await computeRegistryContext({
    namespace: checked.manifest.namespace.value,
    snapshotVersion: checked.manifest.snapshot.version,
    snapshotSha256: checked.manifest.snapshot.canonicalSha256,
  });
  const sample = checked.evidenceArtifact.entries.slice(0, 3).map(({ subjectId, payload }) => ({ subjectId, payload }));
  const empty = await buildRegistryTree([], { subjectKind: 'evidence', context });
  assert.equal(empty.count, 0);
  assert.equal(empty.root, `0x${'00'.repeat(32)}`);

  const single = await buildRegistryTree(sample.slice(0, 1), { subjectKind: 'evidence', context });
  assert.equal(single.root, single.entries[0].leafSha256);
  assert.deepEqual(single.entries[0].proof, []);

  const odd = await buildRegistryTree(sample, { subjectKind: 'evidence', context });
  const duplicated = odd.entries.find((entry) => entry.proof[0] === entry.leafSha256);
  assert(duplicated, 'Odd tree must include a duplicate-self sibling');
  assert.equal(await verifyRegistryProof({
    subjectKind: 'evidence', subjectId: duplicated.subjectId, payload: duplicated.payload,
    proof: duplicated.proof, expectedRoot: odd.root, context,
  }), true);

  await assert.rejects(buildRegistryTree([sample[0], sample[0]], { subjectKind: 'evidence', context }), /Duplicate evidence id/);
  const evidenceEntry = checked.evidenceArtifact.entries[0];
  assert.equal(await verifyRegistryProof({
    subjectKind: 'relationship', subjectId: evidenceEntry.subjectId, payload: evidenceEntry.payload,
    proof: evidenceEntry.proof, expectedRoot: checked.evidenceArtifact.root, context,
  }), false);
});

test('relationship usability requires every supporting evidence proof and lifecycle state', async () => {
  const checked = await verifyRegistryFiles(registryDirectory);
  const context = await computeRegistryContext({
    namespace: checked.manifest.namespace.value,
    snapshotVersion: checked.manifest.snapshot.version,
    snapshotSha256: checked.manifest.snapshot.canonicalSha256,
  });
  const relationship = checked.relationshipArtifact.entries[0];
  const evidenceById = new Map(checked.evidenceArtifact.entries.map((entry) => [entry.subjectId, entry]));
  const activeLifecycle = {
    deploymentConfigured: true,
    publicationStatus: 'active',
    subjectRevocationScope: 'namespace-lineage',
    subjectRevoked: false,
  };
  const relationshipProof = {
    subjectKind: 'relationship', subjectId: relationship.subjectId, payload: relationship.payload,
    proof: relationship.proof, expectedRoot: checked.relationshipArtifact.root, context,
  };
  const evidenceProofs = relationship.payload.evidenceIds.map((id) => {
    const entry = evidenceById.get(id);
    return {
      proof: {
        subjectKind: 'evidence', subjectId: id, payload: entry.payload,
        proof: entry.proof, expectedRoot: checked.evidenceArtifact.root, context,
      },
      lifecycle: activeLifecycle,
    };
  });
  const valid = await evaluateRelationshipEvidenceMembership({
    relationshipProof, relationshipLifecycle: activeLifecycle, evidenceProofs,
  });
  assert.equal(valid.usable, true);

  evidenceProofs[0] = { ...evidenceProofs[0], lifecycle: { ...activeLifecycle, subjectRevoked: true } };
  const invalid = await evaluateRelationshipEvidenceMembership({
    relationshipProof, relationshipLifecycle: activeLifecycle, evidenceProofs,
  });
  assert.equal(invalid.usable, false);
  assert.deepEqual(invalid.reasons, [`supporting-evidence-unusable:${relationship.payload.evidenceIds[0]}`]);

  const tamperedEvidenceProofs = structuredClone(evidenceProofs);
  tamperedEvidenceProofs[0].lifecycle = activeLifecycle;
  tamperedEvidenceProofs[0].proof.proof[0] = `0x${'00'.repeat(32)}`;
  const tampered = await evaluateRelationshipEvidenceMembership({
    relationshipProof, relationshipLifecycle: activeLifecycle, evidenceProofs: tamperedEvidenceProofs,
  });
  assert.equal(tampered.usable, false);
  assert.deepEqual(tampered.reasons, [`supporting-evidence-unusable:${relationship.payload.evidenceIds[0]}`]);

  const relationshipRevoked = await evaluateRelationshipEvidenceMembership({
    relationshipProof,
    relationshipLifecycle: { ...activeLifecycle, subjectRevoked: true },
    evidenceProofs: evidenceProofs.map((item) => ({ ...item, lifecycle: activeLifecycle })),
  });
  assert.equal(relationshipRevoked.usable, false);
  assert.deepEqual(relationshipRevoked.reasons, ['subject-globally-revoked']);

  const completeEvidenceProofs = evidenceProofs.map((item) => ({ ...item, lifecycle: activeLifecycle }));
  await assert.rejects(evaluateRelationshipEvidenceMembership({
    relationshipProof, relationshipLifecycle: activeLifecycle, evidenceProofs: completeEvidenceProofs.slice(1),
  }), /proof count mismatch/);
  await assert.rejects(evaluateRelationshipEvidenceMembership({
    relationshipProof,
    relationshipLifecycle: activeLifecycle,
    evidenceProofs: [...completeEvidenceProofs, completeEvidenceProofs[0]],
  }), /Duplicate supporting evidence proof/);
});

test('rejects Demo, unapproved, duplicated, unresolved, and content-altered snapshots', async () => {
  const snapshot = readJson(snapshotPath).value;
  for (const mutate of [
    (value) => { value.records[0].dataMode = 'demo'; },
    (value) => { value.records[0].reviewStatus = 'needs-review'; },
    (value) => { value.records.push(structuredClone(value.records[0])); },
    (value) => { value.relationships[0].evidenceIds = ['E-UNRESOLVED-001']; },
    (value) => { value.records[0].claim = `${value.records[0].claim} altered`; },
  ]) {
    const fixture = structuredClone(snapshot);
    mutate(fixture);
    await assert.rejects(validateRegistrySnapshot(fixture));
  }
});
