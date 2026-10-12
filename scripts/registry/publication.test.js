import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const { validatePublication, validatePublicationTime, checkPublication, checkAvailability, verifyPublicationReceipt, publicationData, ZERO, PUBLICATION_PREDECESSORS } = await import('../../tools/registry-publish/core.js');
const { hash } = await import('../../tools/registry-deploy/core.js');
const { hexBytes, encodeWord } = await import('../../src/onchain-rpc.js');
const { decodeWords } = await import('../../src/onchain-rpc.js');
const json = p => JSON.parse(fs.readFileSync(new URL('../../' + p, import.meta.url)));
const request = json('tools/registry-publish/request.json');
const artifact = json('contracts/artifacts/MonadCityRegistry.json');
const deployment = json('data/registry/deployments/monad-testnet-genesis.json');
const bundle = { manifest: json('data/registry/phase-3.5-v6/manifest.json'),
  evidenceArtifact: json('data/registry/phase-3.5-v6/evidence-proofs.json'),
  relationshipArtifact: json('data/registry/phase-3.5-v6/relationship-proofs.json'), snapshot: json('data/evidence-snapshots/phase-3.5-v6.json') };
test('publication ABI independently matches cast and approved full proof bundle', async () => {
  await validatePublication(request, artifact, bundle, deployment);
});
test('publication validation rejects destination, value, network, calldata and URI changes', async () => {
  for (const [field, value] of [['to', '0x' + '33'.repeat(20)], ['from', '0x' + '44'.repeat(20)], ['value', '0x1'], ['chainId', '0x1'], ['data', request.transaction.data.slice(0, -2) + '01']]) {
    const changed = structuredClone(request); changed.transaction[field] = value;
    await assert.rejects(validatePublication(changed, artifact, bundle, deployment));
  }
  const changed = structuredClone(request); changed.manifestUri = changed.manifestUri.replace('manifest', 'other');
  await assert.rejects(validatePublication(changed, artifact, bundle, deployment), /URI/);
});
test('availability check rejects gateway errors and changed public bytes', async () => {
  await assert.rejects(checkAvailability(request, async () => new Response('offline', { status: 503 })), /unavailable/);
  await assert.rejects(checkAvailability(request, async () => new Response('modified')), /bytes differ/);
});
test('publication simulation rejects a wrong chain before further calls', async () => {
  await assert.rejects(checkPublication(request, artifact, deployment, async () => '0x1'), /network mismatch/);
});
test('publication receipt distinguishes pending from reverted transactions', async () => {
  const txHash = '0x' + 'aa'.repeat(32);
  assert.equal(await verifyPublicationReceipt(txHash, request, artifact, bundle, deployment, async method => method === 'eth_chainId' ? '0x279f' : null), null);
  await assert.rejects(verifyPublicationReceipt(txHash, request, artifact, bundle, deployment, async method => method === 'eth_chainId' ? '0x279f' : { transactionHash: txHash, status: '0x0' }), /reverted/);
});
test('successor calldata binds the nonzero predecessor; changing a reviewed predecessor is rejected', async () => {
  const previous = PUBLICATION_PREDECESSORS['phase-3.5-v7'];
  const encoded = publicationData(bundle.manifest, request.manifestUri, previous);
  const tuple = decodeWords('0x' + encoded.slice(10, 10 + 64 * 11), 11);
  assert.equal(tuple[5], previous);
  assert.equal(decodeWords('0x' + request.transaction.data.slice(10, 10 + 64 * 11), 11)[5], ZERO);
  const changed = structuredClone(request);
  changed.previousPublicationId = previous;
  changed.transaction.data = encoded;
  await assert.rejects(validatePublication(changed, artifact, bundle, deployment), /predecessor/);
});

const v8 = { manifest: json('data/registry/phase-3.5-v8/manifest.json'),
  evidenceArtifact: json('data/registry/phase-3.5-v8/evidence-proofs.json'),
  relationshipArtifact: json('data/registry/phase-3.5-v8/relationship-proofs.json'),
  snapshot: json('data/evidence-snapshots/phase-3.5-v8.json') };
// In-memory fixture only: this URI is not a public v8 upload or availability audit.
async function releaseFixture(releaseBundle = v8) {
  const fixture = structuredClone(request), m = releaseBundle.manifest;
  fixture.snapshotVersion = m.snapshot.version;
  fixture.previousPublicationId = PUBLICATION_PREDECESSORS[m.snapshot.version];
  fixture.portableSnapshotId = m.snapshot.portableSnapshotId;
  fixture.transaction.data = publicationData(m, fixture.manifestUri, fixture.previousPublicationId);
  fixture.transactionDataSha256 = await hash(hexBytes(fixture.transaction.data));
  fixture.expectedPublicationId = await hash(hexBytes(m.domains.publicationId.id
    + encodeWord(10143n, 'uint256') + encodeWord(deployment.address, 'address')
    + m.snapshot.portableSnapshotId.slice(2)));
  const files = ['manifest.json', 'evidence-proofs.json', 'relationship-proofs.json', m.snapshot.sourcePath];
  const gateways = [...new Set(request.storageCopies.map(copy => copy.gateway))];
  fixture.storageCopies = [];
  for (const gateway of gateways) for (const file of files) {
    const local = file.startsWith('data/') ? file : `data/registry/${m.snapshot.version}/` + file;
    fixture.storageCopies.push({ gateway, path: file,
      sha256: await hash(fs.readFileSync(new URL('../../' + local, import.meta.url))) });
  }
  return fixture;
}
test('v8 binds all 194 relationship proofs, 217 evidence proofs and the actual v7 predecessor', async () => {
  const fixture = await releaseFixture();
  await validatePublication(fixture, artifact, v8, deployment);
  assert.equal(fixture.expectedPublicationId, '0x83e176b46b4f6a2155f76977aa5e895efa0105b88a98ead5658107193b4c9a30');
  const words = decodeWords('0x' + fixture.transaction.data.slice(10, 10 + 64 * 11), 11);
  assert.equal(words[5], '0x749a1fa2b3b731ba051f7d18697b8db563adc0b038cb9b3c864430187b62421c');
  assert.equal(BigInt(words[6]), 217n);
  assert.equal(BigInt(words[7]), 194n);
  for (const previous of [ZERO, PUBLICATION_PREDECESSORS['phase-3.5-v7']]) {
    const changed = structuredClone(fixture); changed.previousPublicationId = previous;
    changed.transaction.data = publicationData(v8.manifest, changed.manifestUri, previous);
    await assert.rejects(validatePublication(changed, artifact, v8, deployment), /predecessor/);
  }
  const changed = structuredClone(fixture); changed.transaction.data = request.transaction.data;
  await assert.rejects(validatePublication(changed, artifact, v8, deployment), /calldata/);
});
test('future review dates reject before network simulation, with the exact boundary accepted', async () => {
  const timestamp = BigInt(Date.parse(v8.manifest.snapshot.reviewedAt) / 1000);
  assert.throws(() => validatePublicationTime(v8.manifest, timestamp - 1n), /dated in the future/);
  assert.doesNotThrow(() => validatePublicationTime(v8.manifest, timestamp));
  const invalid = structuredClone(v8.manifest); invalid.snapshot.createdAt = '2026-10-12T00:00:00Z';
  assert.throws(() => validatePublicationTime(invalid, timestamp), /timestamps/);
  const calls = [];
  await assert.rejects(checkPublication(await releaseFixture(), artifact, deployment, async method => {
    calls.push(method);
    if (method === 'eth_chainId') return '0x279f';
    if (method === 'eth_getBlockByNumber') return { timestamp: '0x' + (timestamp - 1n).toString(16) };
    throw new Error('Unexpected network call before the timestamp gate');
  }), /dated in the future/);
  assert.deepEqual(calls, ['eth_chainId', 'eth_getBlockByNumber']);
});

test('v9 corrects review times, preserves factual payloads and binds the still-active v7 predecessor', async () => {
  const v9 = { manifest: json('data/registry/phase-3.5-v9/manifest.json'),
    evidenceArtifact: json('data/registry/phase-3.5-v9/evidence-proofs.json'),
    relationshipArtifact: json('data/registry/phase-3.5-v9/relationship-proofs.json'),
    snapshot: json('data/evidence-snapshots/phase-3.5-v9.json') };
  assert.deepEqual(v9.snapshot.records, v8.snapshot.records);
  const oldIds = new Set(json('data/evidence-snapshots/phase-3.5-v7.json').relationships.map(r => r.id));
  const factual = ({ reviewedAt, reviewMetadata, ...payload }) => payload;
  assert.deepEqual(v9.snapshot.relationships.map(factual), v8.snapshot.relationships.map(factual));
  assert.deepEqual(v9.snapshot.relationships.filter(r => oldIds.has(r.id)), v8.snapshot.relationships.filter(r => oldIds.has(r.id)));
  const time = BigInt(Date.parse(v9.snapshot.reviewedAt) / 1000);
  assert.doesNotThrow(() => validatePublicationTime(v9.manifest, time));
  assert.throws(() => validatePublicationTime(v8.manifest, time), /future/);
  const fixture = await releaseFixture(v9);
  await validatePublication(fixture, artifact, v9, deployment);
  assert.equal(fixture.expectedPublicationId, '0xcaae763cd989d32777036d2d443bdae036d24ab5217ecf6324ecb10dd485bc7e');
  assert.equal(fixture.previousPublicationId, PUBLICATION_PREDECESSORS['phase-3.5-v8']);
  assert.equal(v8.snapshot.reviewedAt, '2026-10-11T22:30:00Z');
});
