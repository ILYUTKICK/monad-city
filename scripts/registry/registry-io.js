import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { reviewedRegistryRelease } from './releases.js';
import {
  REGISTRY_CANONICALIZATION,
  REGISTRY_DOMAIN_TAGS,
  REGISTRY_NAMESPACE,
  REGISTRY_PROOF_SCHEMA_VERSION,
  buildRegistryTree,
  canonicalJson,
  computeRegistryContext,
  sha256Hex,
  verifyRegistryBundle,
} from '../../src/registry-proof.js';

// Node 18 always exposes WebCrypto through node:crypto, but some releases do not install it
// on globalThis unless the experimental global flag is enabled. Keep that compatibility shim
// in this Node-only workflow module so the dependency-free browser verifier stays browser-native.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: false,
  });
}

export const ACTIVE_REGISTRY_SNAPSHOT = reviewedRegistryRelease('phase-3.5-v7');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function readJson(filePath) {
  const resolved = path.resolve(filePath);
  let source;
  try {
    source = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${resolved}: ${error.message}`);
  }
  try {
    return { resolved, value: JSON.parse(source) };
  } catch (error) {
    throw new Error(`Invalid JSON in ${resolved}: ${error.message}`);
  }
}

function assertUniqueIds(items, label) {
  const ids = new Set();
  items.forEach((item) => {
    assert(item && typeof item === 'object' && !Array.isArray(item), `${label} item must be an object`);
    assert(typeof item.id === 'string' && item.id.length > 0, `${label} item lacks id`);
    assert(!ids.has(item.id), `${label} has duplicate id ${item.id}`);
    ids.add(item.id);
  });
  return ids;
}

export async function validateRegistrySnapshot(snapshot, expected = reviewedRegistryRelease(snapshot?.version)) {
  assert(snapshot?.kind === 'approved-evidence-snapshot', 'Source is not an approved evidence snapshot');
  assert(snapshot.version === expected.version, `Expected snapshot ${expected.version}, received ${snapshot.version}`);
  assert(snapshot.dataMode === 'sourced-limited', 'Snapshot dataMode must be sourced-limited');
  assert(Array.isArray(snapshot.records), 'Snapshot records must be an array');
  assert(Array.isArray(snapshot.relationships), 'Snapshot relationships must be an array');
  assert(snapshot.records.length === expected.evidenceCount, `Expected ${expected.evidenceCount} evidence records`);
  assert(snapshot.relationships.length === expected.relationshipCount, `Expected ${expected.relationshipCount} relationships`);
  const digest = (await sha256Hex(canonicalJson(snapshot))).slice(2);
  assert(digest === expected.canonicalSha256, `Snapshot canonical SHA-256 ${digest} does not match ${expected.canonicalSha256}`);

  const evidenceIds = assertUniqueIds(snapshot.records, 'Snapshot evidence');
  assertUniqueIds(snapshot.relationships, 'Snapshot relationships');
  snapshot.records.forEach((record) => {
    assert(record.reviewStatus === 'approved', `Evidence ${record.id} is not approved`);
    assert(record.dataMode === 'sourced-limited', `Evidence ${record.id} is not sourced-limited`);
    assert(record.source?.kind !== 'placeholder', `Evidence ${record.id} uses a Demo placeholder`);
  });
  snapshot.relationships.forEach((relationship) => {
    assert(relationship.reviewStatus === 'approved', `Relationship ${relationship.id} is not approved`);
    assert(relationship.dataMode === 'sourced-limited', `Relationship ${relationship.id} is not sourced-limited`);
    assert(Array.isArray(relationship.evidenceIds) && relationship.evidenceIds.length > 0, `Relationship ${relationship.id} lacks evidenceIds`);
    assert(new Set(relationship.evidenceIds).size === relationship.evidenceIds.length, `Relationship ${relationship.id} has duplicate evidenceIds`);
    relationship.evidenceIds.forEach((id) => assert(evidenceIds.has(id), `Relationship ${relationship.id} has unresolved evidence ${id}`));
  });
  return digest;
}

export async function buildRegistryArtifacts(snapshot, sourcePath) {
  const digest = await validateRegistrySnapshot(snapshot);
  const context = await computeRegistryContext({
    namespace: REGISTRY_NAMESPACE,
    snapshotVersion: snapshot.version,
    snapshotSha256: digest,
  });
  const [evidenceTree, relationshipTree] = await Promise.all([
    buildRegistryTree(snapshot.records.map((payload) => ({ payload })), { subjectKind: 'evidence', context }),
    buildRegistryTree(snapshot.relationships.map((payload) => ({ payload })), { subjectKind: 'relationship', context }),
  ]);
  const evidenceArtifact = {
    kind: 'monad-city-evidence-registry-proofs',
    schemaVersion: REGISTRY_PROOF_SCHEMA_VERSION,
    subjectKind: 'evidence',
    portableSnapshotId: context.portableSnapshotId,
    root: evidenceTree.root,
    count: evidenceTree.count,
    entries: evidenceTree.entries,
  };
  const relationshipArtifact = {
    kind: 'monad-city-relationship-registry-proofs',
    schemaVersion: REGISTRY_PROOF_SCHEMA_VERSION,
    subjectKind: 'relationship',
    portableSnapshotId: context.portableSnapshotId,
    root: relationshipTree.root,
    count: relationshipTree.count,
    entries: relationshipTree.entries,
  };
  const [evidenceArtifactSha256, relationshipArtifactSha256] = await Promise.all([
    sha256Hex(canonicalJson(evidenceArtifact)),
    sha256Hex(canonicalJson(relationshipArtifact)),
  ]);
  const manifest = {
    kind: 'monad-city-evidence-registry-manifest',
    schemaVersion: REGISTRY_PROOF_SCHEMA_VERSION,
    canonicalization: REGISTRY_CANONICALIZATION,
    hashAlgorithm: 'sha256',
    namespace: { value: context.namespace, id: context.namespaceId },
    domains: Object.fromEntries(
      Object.entries(REGISTRY_DOMAIN_TAGS).map(([key, value]) => [key, { value, id: context.domainHashes[key] }]),
    ),
    snapshot: {
      sourcePath,
      version: snapshot.version,
      versionHash: context.versionHash,
      canonicalSha256: digest,
      canonicalSha256Bytes32: context.snapshotSha256,
      portableSnapshotId: context.portableSnapshotId,
      createdAt: snapshot.createdAt,
      reviewedAt: snapshot.reviewedAt,
      reviewPolicyVersion: snapshot.reviewPolicyVersion,
    },
    commitments: {
      evidence: { root: evidenceTree.root, count: evidenceTree.count },
      relationship: { root: relationshipTree.root, count: relationshipTree.count },
    },
    artifacts: {
      evidence: { path: 'evidence-proofs.json', canonicalSha256: evidenceArtifactSha256.slice(2) },
      relationship: { path: 'relationship-proofs.json', canonicalSha256: relationshipArtifactSha256.slice(2) },
    },
    deployment: {
      status: 'unconfigured',
      chainId: null,
      registryAddress: null,
      contractCodeHash: null,
      publisherAddress: null,
      publicationId: null,
      transactionHash: null,
      blockNumber: null,
      publishedAt: null,
      manifestURI: null,
    },
    lifecycle: {
      status: 'unconfigured',
      publicationLookup: null,
      globalEvidenceRevocationLookup: null,
      globalRelationshipRevocationLookup: null,
    },
    limitations: [
      'This export commits to approved snapshot bytes and membership only; it does not verify source truth, freshness, project safety, legitimacy, activity, or endorsement.',
      'No deployment is configured and this export does not claim that either root has been published onchain.',
      'A relationship proof establishes snapshot membership only; factual use must also verify every referenced evidence record separately.',
      'Permanent subject revocation must be checked across the complete predecessor-registry lineage for this namespace; a current-deployment-only lookup is insufficient.',
    ],
  };
  await verifyRegistryBundle({ manifest, evidenceArtifact, relationshipArtifact });
  return { manifest, evidenceArtifact, relationshipArtifact };
}

export function writeNewRegistryDirectory(outputDirectory, artifacts) {
  const resolved = path.resolve(outputDirectory);
  const release = reviewedRegistryRelease(artifacts.manifest.snapshot.version);
  assert(artifacts.manifest.snapshot.canonicalSha256 === release.canonicalSha256, 'Registry output differs from the reviewed release');
  assert(path.basename(resolved) === release.version, `Registry output directory must be named ${release.version}`);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  try {
    fs.mkdirSync(resolved, { recursive: false });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Refusing to overwrite immutable registry export ${resolved}`);
    throw error;
  }
  for (const [fileName, value] of [
    ['manifest.json', artifacts.manifest],
    ['evidence-proofs.json', artifacts.evidenceArtifact],
    ['relationship-proofs.json', artifacts.relationshipArtifact],
  ]) {
    fs.writeFileSync(path.join(resolved, fileName), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  }
  return resolved;
}

export async function verifyRegistryFiles(directory, snapshot = null) {
  const resolved = path.resolve(directory);
  const manifest = readJson(path.join(resolved, 'manifest.json')).value;
  const evidenceArtifact = readJson(path.join(resolved, 'evidence-proofs.json')).value;
  const relationshipArtifact = readJson(path.join(resolved, 'relationship-proofs.json')).value;
  const evidenceArtifactSha256 = (await sha256Hex(canonicalJson(evidenceArtifact))).slice(2);
  const relationshipArtifactSha256 = (await sha256Hex(canonicalJson(relationshipArtifact))).slice(2);
  assert(evidenceArtifactSha256 === manifest.artifacts.evidence.canonicalSha256, 'Evidence artifact canonical SHA-256 mismatch');
  assert(relationshipArtifactSha256 === manifest.artifacts.relationship.canonicalSha256, 'Relationship artifact canonical SHA-256 mismatch');
  await verifyRegistryBundle({ manifest, evidenceArtifact, relationshipArtifact, snapshot });
  return { resolved, manifest, evidenceArtifact, relationshipArtifact };
}
