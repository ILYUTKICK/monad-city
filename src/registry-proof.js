const UTF8 = new TextEncoder();

export const REGISTRY_PROOF_SCHEMA_VERSION = 1;
export const REGISTRY_CANONICALIZATION = 'monad-city-canonical-json-v1';
export const REGISTRY_NAMESPACE = 'monad-city:registry:main:v1';

export const REGISTRY_DOMAIN_TAGS = Object.freeze({
  snapshotId: 'monad-city:registry:snapshot-id:v1',
  publicationId: 'monad-city:registry:publication-id:v1',
  deploymentId: 'monad-city:registry:deployment-id:v1',
  evidenceLeaf: 'monad-city:registry:evidence-leaf:v1',
  evidenceNode: 'monad-city:registry:evidence-node:v1',
  relationshipLeaf: 'monad-city:registry:relationship-leaf:v1',
  relationshipNode: 'monad-city:registry:relationship-node:v1',
});

const ZERO_BYTES32 = new Uint8Array(32);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertJsonValue(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert(Number.isFinite(value), `${path} must contain only finite JSON numbers`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`));
    return;
  }
  assert(value && typeof value === 'object', `${path} is not a JSON value`);
  const prototype = Object.getPrototypeOf(value);
  assert(prototype === Object.prototype || prototype === null, `${path} must be a plain JSON object`);
  Object.entries(value).forEach(([key, item]) => {
    assert(item !== undefined, `${path}.${key} must not be undefined`);
    assertJsonValue(item, `${path}.${key}`);
  });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

export function canonicalJson(value) {
  assertJsonValue(value);
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function bytesFrom(value) {
  if (typeof value === 'string') return UTF8.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new Error('Expected a string, ArrayBuffer, or typed byte array');
}

function concatBytes(...values) {
  const arrays = values.map(bytesFrom);
  const result = new Uint8Array(arrays.reduce((sum, value) => sum + value.length, 0));
  let offset = 0;
  arrays.forEach((value) => {
    result.set(value, offset);
    offset += value.length;
  });
  return result;
}

function compareBytes(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

export function bytesToHex(value) {
  return `0x${[...bytesFrom(value)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToBytes(value, label = 'hex value') {
  assert(typeof value === 'string', `${label} must be a string`);
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  assert(normalized.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(normalized), `${label} must be hexadecimal`);
  const result = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return result;
}

function bytes32(value, label) {
  const result = hexToBytes(value, label);
  assert(result.length === 32, `${label} must be 32 bytes`);
  return result;
}

function cryptoApi() {
  const api = globalThis.crypto;
  assert(api?.subtle, 'WebCrypto SHA-256 is unavailable in this runtime');
  return api;
}

export async function sha256Bytes(value) {
  return new Uint8Array(await cryptoApi().subtle.digest('SHA-256', bytesFrom(value)));
}

export async function sha256Hex(value) {
  return bytesToHex(await sha256Bytes(value));
}

async function domainHashes() {
  const entries = await Promise.all(
    Object.entries(REGISTRY_DOMAIN_TAGS).map(async ([key, tag]) => [key, await sha256Bytes(UTF8.encode(tag))]),
  );
  return Object.fromEntries(entries);
}

function assertSubjectKind(subjectKind) {
  assert(
    subjectKind === 'evidence' || subjectKind === 'relationship',
    'subjectKind must be evidence or relationship',
  );
}

export async function computeRegistryContext({
  namespace = REGISTRY_NAMESPACE,
  snapshotVersion,
  snapshotSha256,
}) {
  assert(typeof namespace === 'string' && namespace.length > 0, 'Registry namespace is required');
  assert(typeof snapshotVersion === 'string' && snapshotVersion.length > 0, 'Snapshot version is required');
  const snapshotDigest = bytes32(snapshotSha256, 'snapshotSha256');
  const [namespaceId, versionHash, domains] = await Promise.all([
    sha256Bytes(UTF8.encode(namespace)),
    sha256Bytes(UTF8.encode(snapshotVersion)),
    domainHashes(),
  ]);
  const portableSnapshotId = await sha256Bytes(
    concatBytes(domains.snapshotId, namespaceId, versionHash, snapshotDigest),
  );
  return Object.freeze({
    namespace,
    namespaceId: bytesToHex(namespaceId),
    snapshotVersion,
    versionHash: bytesToHex(versionHash),
    snapshotSha256: bytesToHex(snapshotDigest),
    portableSnapshotId: bytesToHex(portableSnapshotId),
    domainHashes: Object.freeze(
      Object.fromEntries(Object.entries(domains).map(([key, value]) => [key, bytesToHex(value)])),
    ),
  });
}

export async function hashRegistrySubject({ subjectKind, subjectId, payload, context }) {
  assertSubjectKind(subjectKind);
  assert(typeof subjectId === 'string' && subjectId.length > 0, 'subjectId is required');
  assert(payload?.id === subjectId, `Payload id must equal subjectId ${subjectId}`);
  const [idHash, payloadSha256] = await Promise.all([
    sha256Bytes(UTF8.encode(subjectId)),
    sha256Bytes(UTF8.encode(canonicalJson(payload))),
  ]);
  const leafDomain = bytes32(
    context.domainHashes[subjectKind === 'evidence' ? 'evidenceLeaf' : 'relationshipLeaf'],
    `${subjectKind} leaf domain`,
  );
  const leafSha256 = await sha256Bytes(
    concatBytes(
      leafDomain,
      bytes32(context.namespaceId, 'namespaceId'),
      bytes32(context.portableSnapshotId, 'portableSnapshotId'),
      idHash,
      payloadSha256,
    ),
  );
  return Object.freeze({
    subjectKind,
    subjectId,
    idHash: bytesToHex(idHash),
    payloadSha256: bytesToHex(payloadSha256),
    leafSha256: bytesToHex(leafSha256),
  });
}

async function hashNode(left, right, nodeDomain) {
  const leftBytes = bytes32(left, 'left node');
  const rightBytes = bytes32(right, 'right node');
  const [first, second] = compareBytes(leftBytes, rightBytes) <= 0
    ? [leftBytes, rightBytes]
    : [rightBytes, leftBytes];
  return bytesToHex(await sha256Bytes(concatBytes(nodeDomain, first, second)));
}

export async function buildRegistryTree(subjects, { subjectKind, context }) {
  assertSubjectKind(subjectKind);
  assert(Array.isArray(subjects), 'subjects must be an array');
  const seenIds = new Set();
  const seenIdHashes = new Set();
  const seenLeaves = new Set();
  const hashed = await Promise.all(subjects.map(async (subject) => {
    assert(subject?.payload, 'Every subject must include payload');
    const subjectId = subject.subjectId ?? subject.payload.id;
    assert(!seenIds.has(subjectId), `Duplicate ${subjectKind} id ${subjectId}`);
    seenIds.add(subjectId);
    const hashes = await hashRegistrySubject({ subjectKind, subjectId, payload: subject.payload, context });
    assert(!seenIdHashes.has(hashes.idHash), `Duplicate ${subjectKind} id hash ${hashes.idHash}`);
    assert(!seenLeaves.has(hashes.leafSha256), `Duplicate ${subjectKind} leaf ${hashes.leafSha256}`);
    seenIdHashes.add(hashes.idHash);
    seenLeaves.add(hashes.leafSha256);
    return { ...hashes, payload: subject.payload };
  }));

  hashed.sort((left, right) => compareBytes(hexToBytes(left.leafSha256), hexToBytes(right.leafSha256)));
  if (hashed.length === 0) {
    return Object.freeze({ subjectKind, root: bytesToHex(ZERO_BYTES32), count: 0, entries: Object.freeze([]) });
  }

  const proofs = hashed.map(() => []);
  let level = hashed.map((entry, index) => ({ hash: entry.leafSha256, members: [index] }));
  const nodeDomain = bytes32(
    context.domainHashes[subjectKind === 'evidence' ? 'evidenceNode' : 'relationshipNode'],
    `${subjectKind} node domain`,
  );
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      left.members.forEach((member) => proofs[member].push(right.hash));
      if (right !== left) right.members.forEach((member) => proofs[member].push(left.hash));
      next.push({
        hash: await hashNode(left.hash, right.hash, nodeDomain),
        members: right === left ? [...left.members] : [...left.members, ...right.members],
      });
    }
    level = next;
  }

  const entries = hashed.map((entry, index) => Object.freeze({ ...entry, proof: Object.freeze(proofs[index]) }));
  return Object.freeze({
    subjectKind,
    root: level[0].hash,
    count: entries.length,
    entries: Object.freeze(entries),
  });
}

export async function verifyRegistryProof({
  subjectKind,
  subjectId,
  payload,
  proof,
  expectedRoot,
  context,
}) {
  assertSubjectKind(subjectKind);
  assert(Array.isArray(proof), 'proof must be an array');
  assert(proof.length <= 64, 'proof must contain at most 64 siblings');
  const subject = await hashRegistrySubject({ subjectKind, subjectId, payload, context });
  const nodeDomain = bytes32(
    context.domainHashes[subjectKind === 'evidence' ? 'evidenceNode' : 'relationshipNode'],
    `${subjectKind} node domain`,
  );
  let computed = subject.leafSha256;
  for (const sibling of proof) computed = await hashNode(computed, sibling, nodeDomain);
  return computed.toLowerCase() === bytesToHex(bytes32(expectedRoot, 'expectedRoot')).toLowerCase();
}

export function getRegistryProofInput({
  subjectKind,
  subjectId,
  context,
  evidenceArtifact,
  relationshipArtifact,
}) {
  assertSubjectKind(subjectKind);
  assert(typeof subjectId === 'string' && subjectId.length > 0, 'subjectId is required');
  assert(context && typeof context === 'object', 'Registry context is required');
  const artifact = subjectKind === 'evidence' ? evidenceArtifact : relationshipArtifact;
  assert(artifact && typeof artifact === 'object', `${subjectKind} artifact is required`);
  assert(artifact.subjectKind === subjectKind, `${subjectKind} artifact has invalid subjectKind`);
  assert(Array.isArray(artifact.entries), `${subjectKind} artifact entries must be an array`);
  assertEqual(artifact.portableSnapshotId, context.portableSnapshotId, `${subjectKind} portableSnapshotId`);
  const matches = artifact.entries.filter((entry) => entry?.subjectId === subjectId);
  assert(matches.length <= 1, `Duplicate ${subjectKind} artifact id ${subjectId}`);
  assert(matches.length === 1, `${subjectKind} ${subjectId} is absent from registry artifact`);
  const entry = matches[0];
  assert(entry.payload?.id === subjectId, `${subjectKind} payload id does not match ${subjectId}`);
  assert(Array.isArray(entry.proof), `${subjectKind} ${subjectId} proof must be an array`);
  return Object.freeze({
    subjectKind,
    subjectId,
    payload: entry.payload,
    proof: entry.proof,
    expectedRoot: artifact.root,
    context,
  });
}

export async function evaluateRegistryMembership({
  proof,
  lifecycle,
}) {
  const proofValid = await verifyRegistryProof(proof);
  const publicationStatus = ['none', 'active', 'superseded', 'migrated', 'revoked'].includes(
    lifecycle?.publicationStatus,
  )
    ? lifecycle.publicationStatus
    : 'unknown';
  // This value must cover the complete predecessor-registry lineage for the namespace.
  // A current-deployment-only mapping is insufficient because revocation is permanent across migrations.
  const subjectRevocationScope = lifecycle?.subjectRevocationScope === 'namespace-lineage'
    ? 'namespace-lineage'
    : 'unknown';
  const subjectRevocationKnown = subjectRevocationScope === 'namespace-lineage'
    && (lifecycle?.subjectRevoked === true || lifecycle?.subjectRevoked === false);
  const normalized = {
    deploymentConfigured: lifecycle?.deploymentConfigured === true,
    publicationStatus,
    publicationExists: publicationStatus !== 'none' && publicationStatus !== 'unknown',
    publicationActive: publicationStatus === 'active',
    publicationRevoked: publicationStatus === 'revoked',
    publicationSuperseded: publicationStatus === 'superseded',
    publicationMigrated: publicationStatus === 'migrated',
    subjectRevocationScope,
    subjectRevocationKnown,
    subjectRevoked: lifecycle?.subjectRevoked === true,
  };
  const reasons = [];
  if (!proofValid) reasons.push('invalid-membership-proof');
  if (!normalized.deploymentConfigured) reasons.push('deployment-unconfigured');
  if (publicationStatus === 'unknown') reasons.push('publication-status-unknown');
  if (publicationStatus === 'none') reasons.push('publication-not-found');
  if (normalized.publicationRevoked) reasons.push('publication-revoked');
  if (normalized.publicationSuperseded) reasons.push('publication-superseded');
  if (normalized.publicationMigrated) reasons.push('publication-migrated');
  if (subjectRevocationScope !== 'namespace-lineage') reasons.push('subject-revocation-scope-unknown');
  else if (!subjectRevocationKnown) reasons.push('subject-revocation-unknown');
  if (normalized.subjectRevoked) reasons.push('subject-globally-revoked');
  return Object.freeze({
    proofValid,
    ...normalized,
    usable: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

export async function evaluateRelationshipEvidenceMembership({
  relationshipProof,
  relationshipLifecycle,
  evidenceProofs,
}) {
  assert(relationshipProof?.subjectKind === 'relationship', 'relationshipProof must use relationship subjectKind');
  assert(Array.isArray(relationshipProof.payload?.evidenceIds), 'Relationship payload lacks evidenceIds');
  assert(Array.isArray(evidenceProofs), 'evidenceProofs must be an array');
  const expectedIds = relationshipProof.payload.evidenceIds;
  assert(new Set(expectedIds).size === expectedIds.length, 'Relationship payload has duplicate evidenceIds');
  const supplied = new Map();
  evidenceProofs.forEach((item) => {
    assert(item?.proof?.subjectKind === 'evidence', 'Supporting proof must use evidence subjectKind');
    const id = item.proof.subjectId;
    assert(!supplied.has(id), `Duplicate supporting evidence proof ${id}`);
    supplied.set(id, item);
  });
  assert(supplied.size === expectedIds.length, 'Supporting evidence proof count mismatch');
  expectedIds.forEach((id) => assert(supplied.has(id), `Missing supporting evidence proof ${id}`));

  const relationship = await evaluateRegistryMembership({
    proof: relationshipProof,
    lifecycle: relationshipLifecycle,
  });
  const evidence = [];
  for (const id of expectedIds) {
    const item = supplied.get(id);
    evidence.push(Object.freeze({
      subjectId: id,
      result: await evaluateRegistryMembership({ proof: item.proof, lifecycle: item.lifecycle }),
    }));
  }
  const reasons = [...relationship.reasons];
  evidence.forEach(({ subjectId, result }) => {
    if (!result.usable) reasons.push(`supporting-evidence-unusable:${subjectId}`);
  });
  return Object.freeze({
    relationship,
    evidence: Object.freeze(evidence),
    usable: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

function assertEqual(actual, expected, label) {
  assert(actual === expected, `${label} mismatch: expected ${expected}, received ${actual}`);
}

export async function verifyRegistrySnapshotBinding({ snapshot, manifest, evidenceArtifact, relationshipArtifact }) {
  assert(snapshot?.version === manifest.snapshot.version, 'Snapshot version does not match registry manifest');
  assertEqual(snapshot.createdAt, manifest.snapshot.createdAt, 'Snapshot createdAt');
  assertEqual(snapshot.reviewedAt, manifest.snapshot.reviewedAt, 'Snapshot reviewedAt');
  assertEqual(snapshot.reviewPolicyVersion, manifest.snapshot.reviewPolicyVersion, 'Snapshot reviewPolicyVersion');
  const digest = await sha256Hex(UTF8.encode(canonicalJson(snapshot)));
  assertEqual(digest, manifest.snapshot.canonicalSha256Bytes32, 'Snapshot canonical SHA-256');
  assertEqual(digest.slice(2), manifest.snapshot.canonicalSha256, 'Snapshot canonical SHA-256 text');
  assert(Array.isArray(snapshot.records), 'Snapshot records must be an array');
  assert(Array.isArray(snapshot.relationships), 'Snapshot relationships must be an array');
  assertEqual(snapshot.records.length, evidenceArtifact.count, 'Snapshot evidence count');
  assertEqual(snapshot.relationships.length, relationshipArtifact.count, 'Snapshot relationship count');
  for (const [label, snapshotItems, artifact] of [
    ['evidence', snapshot.records, evidenceArtifact],
    ['relationship', snapshot.relationships, relationshipArtifact],
  ]) {
    const entriesById = new Map(artifact.entries.map((entry) => [entry.subjectId, entry]));
    assert(entriesById.size === artifact.entries.length, `Duplicate ${label} artifact id`);
    snapshotItems.forEach((item) => {
      const entry = entriesById.get(item.id);
      assert(entry, `Snapshot ${label} ${item.id} is absent from registry artifact`);
      assertEqual(canonicalJson(entry.payload), canonicalJson(item), `Snapshot ${label} ${item.id} payload`);
    });
  }
  return true;
}

export async function verifyRegistryBundle({ manifest, evidenceArtifact, relationshipArtifact, snapshot = null }) {
  assert(manifest?.kind === 'monad-city-evidence-registry-manifest', 'Invalid registry manifest kind');
  assert(manifest.schemaVersion === REGISTRY_PROOF_SCHEMA_VERSION, 'Unsupported registry manifest schema');
  assert(manifest.canonicalization === REGISTRY_CANONICALIZATION, 'Unsupported registry canonicalization');
  assert(manifest.hashAlgorithm === 'sha256', 'Unsupported registry hash algorithm');
  assert(manifest.namespace?.value === REGISTRY_NAMESPACE, 'Unsupported registry namespace');
  assert(manifest.deployment?.status === 'unconfigured', 'Checked-in registry deployment must be unconfigured');
  const deploymentValues = Object.entries(manifest.deployment).filter(([key]) => key !== 'status');
  deploymentValues.forEach(([key, value]) => assert(value === null, `Unconfigured deployment ${key} must be null`));
  assert(manifest.lifecycle?.status === 'unconfigured', 'Checked-in registry lifecycle must be unconfigured');
  Object.entries(manifest.lifecycle)
    .filter(([key]) => key !== 'status')
    .forEach(([key, value]) => assert(value === null, `Unconfigured lifecycle ${key} must be null`));

  const context = await computeRegistryContext({
    namespace: manifest.namespace.value,
    snapshotVersion: manifest.snapshot.version,
    snapshotSha256: manifest.snapshot.canonicalSha256,
  });
  assertEqual(context.namespaceId, manifest.namespace.id, 'namespaceId');
  assertEqual(context.versionHash, manifest.snapshot.versionHash, 'versionHash');
  assertEqual(context.snapshotSha256, manifest.snapshot.canonicalSha256Bytes32, 'snapshotSha256 bytes32');
  assertEqual(context.portableSnapshotId, manifest.snapshot.portableSnapshotId, 'portableSnapshotId');
  for (const [key, tag] of Object.entries(REGISTRY_DOMAIN_TAGS)) {
    assertEqual(manifest.domains?.[key]?.value, tag, `${key} domain value`);
    assertEqual(manifest.domains?.[key]?.id, context.domainHashes[key], `${key} domain id`);
  }

  const [evidenceArtifactSha256, relationshipArtifactSha256] = await Promise.all([
    sha256Hex(UTF8.encode(canonicalJson(evidenceArtifact))),
    sha256Hex(UTF8.encode(canonicalJson(relationshipArtifact))),
  ]);
  assertEqual(manifest.artifacts?.evidence?.path, 'evidence-proofs.json', 'Evidence artifact path');
  assertEqual(manifest.artifacts?.relationship?.path, 'relationship-proofs.json', 'Relationship artifact path');
  assertEqual(evidenceArtifactSha256.slice(2), manifest.artifacts.evidence.canonicalSha256, 'Evidence artifact canonical SHA-256');
  assertEqual(relationshipArtifactSha256.slice(2), manifest.artifacts.relationship.canonicalSha256, 'Relationship artifact canonical SHA-256');

  const verifiedEvidenceIds = new Set();
  for (const [subjectKind, artifact] of [
    ['evidence', evidenceArtifact],
    ['relationship', relationshipArtifact],
  ]) {
    assert(artifact?.subjectKind === subjectKind, `${subjectKind} artifact has invalid subjectKind`);
    const expectedArtifactKind = subjectKind === 'evidence'
      ? 'monad-city-evidence-registry-proofs'
      : 'monad-city-relationship-registry-proofs';
    assert(artifact.kind === expectedArtifactKind, `${subjectKind} artifact has invalid kind`);
    assert(artifact.schemaVersion === REGISTRY_PROOF_SCHEMA_VERSION, `${subjectKind} artifact has unsupported schema`);
    assertEqual(artifact.portableSnapshotId, context.portableSnapshotId, `${subjectKind} portableSnapshotId`);
    const commitment = manifest.commitments[subjectKind];
    assertEqual(artifact.root, commitment.root, `${subjectKind} root`);
    assertEqual(artifact.count, commitment.count, `${subjectKind} count`);
    assert(Array.isArray(artifact.entries) && artifact.entries.length === artifact.count, `${subjectKind} count does not match entries`);
    const ids = new Set();
    for (const entry of artifact.entries) {
      assert(!ids.has(entry.subjectId), `Duplicate ${subjectKind} artifact id ${entry.subjectId}`);
      ids.add(entry.subjectId);
      assertEqual(entry.payload.id, entry.subjectId, `${subjectKind} payload id`);
      assert(entry.payload.reviewStatus === 'approved', `${subjectKind} ${entry.subjectId} is not approved`);
      assert(entry.payload.dataMode === 'sourced-limited', `${subjectKind} ${entry.subjectId} is not sourced-limited`);
      if (subjectKind === 'evidence') {
        assert(entry.payload.source?.kind !== 'placeholder', `Evidence ${entry.subjectId} uses a Demo placeholder`);
        verifiedEvidenceIds.add(entry.subjectId);
      } else {
        assert(
          Array.isArray(entry.payload.evidenceIds) && entry.payload.evidenceIds.length > 0,
          `Relationship ${entry.subjectId} lacks evidenceIds`,
        );
        assert(
          new Set(entry.payload.evidenceIds).size === entry.payload.evidenceIds.length,
          `Relationship ${entry.subjectId} has duplicate evidenceIds`,
        );
        entry.payload.evidenceIds.forEach((id) => assert(
          verifiedEvidenceIds.has(id),
          `Relationship ${entry.subjectId} has unresolved evidence ${id}`,
        ));
      }
      const subject = await hashRegistrySubject({ subjectKind, subjectId: entry.subjectId, payload: entry.payload, context });
      assertEqual(subject.idHash, entry.idHash, `${subjectKind} ${entry.subjectId} idHash`);
      assertEqual(subject.payloadSha256, entry.payloadSha256, `${subjectKind} ${entry.subjectId} payloadSha256`);
      assertEqual(subject.leafSha256, entry.leafSha256, `${subjectKind} ${entry.subjectId} leafSha256`);
      assert(
        await verifyRegistryProof({
          subjectKind,
          subjectId: entry.subjectId,
          payload: entry.payload,
          proof: entry.proof,
          expectedRoot: artifact.root,
          context,
        }),
        `${subjectKind} ${entry.subjectId} proof is invalid`,
      );
    }
    const rebuilt = await buildRegistryTree(
      artifact.entries.map((entry) => ({ subjectId: entry.subjectId, payload: entry.payload })),
      { subjectKind, context },
    );
    assertEqual(rebuilt.root, artifact.root, `${subjectKind} rebuilt root`);
  }
  if (snapshot) {
    await verifyRegistrySnapshotBinding({ snapshot, manifest, evidenceArtifact, relationshipArtifact });
  }
  return Object.freeze({ valid: true, context });
}
