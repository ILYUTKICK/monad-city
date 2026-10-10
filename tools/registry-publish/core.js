// Isolated localhost operator tooling; the public app has no signing dependency.
import { CHAIN, rpc, hash, validateRuntime, deploymentFee } from '../registry-deploy/core.js';
import { encodeWord, hexBytes, decodeWords, wordBool } from '../../src/onchain-rpc.js';
import { verifyRegistryBundle } from '../../src/registry-proof.js';
import { reviewedRegistryRelease } from '../../scripts/registry/releases.js';
export const ZERO = '0x' + '00'.repeat(32);
export const SNAPSHOT_SHA = '0x9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b';
// Chain-specific publication lineage is independently pinned, never taken on trust from a request.
export const PUBLICATION_PREDECESSORS = Object.freeze({
  'phase-3.5-v6': ZERO,
  'phase-3.5-v7': '0x6af7ac341a2be055d1cb7f09b5af78326fb12362cc81140d231e2866adc3f6aa',
});
const SIGNATURE = 'publish((bytes32,bytes32,bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,string))';
const fail = (ok, text) => { if (!ok) throw new Error(text); };
export function publicationData(manifest, uri, previousPublicationId = ZERO) {
  hexBytes(previousPublicationId, 32);
  fail(/^ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})\/manifest\.json$/.test(uri), 'Invalid public manifest URI.');
  const text = Array.from(new TextEncoder().encode(uri), b => b.toString(16).padStart(2, '0')).join('');
  const words = [manifest.snapshot.versionHash, manifest.snapshot.canonicalSha256Bytes32,
    manifest.commitments.evidence.root, manifest.commitments.relationship.root, previousPublicationId].map(v => encodeWord(v));
  for (const v of [manifest.commitments.evidence.count, manifest.commitments.relationship.count,
    Date.parse(manifest.snapshot.createdAt) / 1000, Date.parse(manifest.snapshot.reviewedAt) / 1000]) {
    fail(Number.isSafeInteger(v) && v >= 0 && BigInt(v) < 1n << 64n, 'Invalid publication integer.');
    words.push(encodeWord(BigInt(v), 'uint256'));
  }
  return '0x9afdff70' + encodeWord(32n, 'uint256') + words.join('') + encodeWord(320n, 'uint256')
    + encodeWord(BigInt(text.length / 2), 'uint256') + text.padEnd(Math.ceil(text.length / 64) * 64, '0');
}
export async function validatePublication(request, artifact, bundle, deployment) {
  fail(request.schemaVersion === 1 && request.status === 'unsigned', 'Unsupported publication request.');
  fail(deployment.chainId === CHAIN && deployment.status === 'deployment-verified-publication-pending', 'Missing reviewed deployment.');
  fail(artifact.methodIdentifiers[SIGNATURE] === '9afdff70', 'Compiled publication selector mismatch.');
  await verifyRegistryBundle(bundle);
  const m = bundle.manifest, tx = request.transaction;
  const release = reviewedRegistryRelease(m.snapshot.version);
  fail(m.snapshot.canonicalSha256Bytes32 === '0x' + release.canonicalSha256
    && m.commitments.evidence.count === release.evidenceCount && m.commitments.relationship.count === release.relationshipCount, 'Snapshot differs from the approved release.');
  fail(request.snapshotVersion === release.version, 'Request snapshot version mismatch.');
  const previous = request.previousPublicationId ?? (release.version === 'phase-3.5-v6' ? ZERO : null);
  fail(previous && previous === PUBLICATION_PREDECESSORS[release.version], 'Unreviewed publication predecessor.');
  fail(Object.keys(tx).sort().join(',') === 'chainId,data,from,to,value' && tx.chainId === '0x279f' && tx.value === '0x0', 'Unexpected publication transaction fields.');
  fail(tx.to.toLowerCase() === deployment.address.toLowerCase() && tx.from.toLowerCase() === deployment.roles.publisher.toLowerCase(), 'Publication destination or publisher mismatch.');
  fail(tx.data === publicationData(m, request.manifestUri, previous), 'Publication calldata differs from the reviewed snapshot.');
  fail(await hash(hexBytes(tx.data)) === request.transactionDataSha256, 'Publication data hash mismatch.');
  const expected = await hash(hexBytes(m.domains.publicationId.id + encodeWord(BigInt(CHAIN), 'uint256')
    + encodeWord(deployment.address, 'address') + m.snapshot.portableSnapshotId.slice(2)));
  fail(request.expectedPublicationId === expected && request.portableSnapshotId === m.snapshot.portableSnapshotId, 'Publication identity mismatch.');
  fail(request.deployment.address === deployment.address && request.deployment.runtimeCodeSha256 === deployment.runtimeCodeSha256, 'Deployment audit mismatch.');
  const paths = ['manifest.json', 'evidence-proofs.json', 'relationship-proofs.json', m.snapshot.sourcePath];
  const gateways = [...new Set(request.storageCopies.map(c => c.gateway))];
  fail(gateways.length === 2 && gateways.includes('https://ipfs.filebase.io/ipfs/')
    && gateways.some(g => /^https:\/\/[a-z0-9-]+\.mypinata\.cloud\/ipfs\/$/.test(g)), 'Missing public storage retrieval audit.');
  fail(request.storageCopies.length === 8 && gateways.every(g => paths.every(p => request.storageCopies.filter(c => c.gateway === g && c.path === p).length === 1)), 'Incomplete storage retrieval audit.');
  for (const c of request.storageCopies) hexBytes(c.sha256, 32);
  return request;
}
export async function checkAvailability(request, fetchImpl = fetch) {
  const primary = request.storageCopies.find(c => c.gateway.includes('.mypinata.cloud/')).gateway;
  const cid = request.manifestUri.split('/')[2];
  for (const copy of request.storageCopies.filter(c => c.gateway === primary)) {
    const response = await fetchImpl(primary + cid + '/' + copy.path, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(60000) });
    fail(response.ok, `Public IPFS file is unavailable (HTTP ${response.status}).`);
    const parts = []; let size = 0;
    for await (const part of response.body) { size += part.length; fail(size <= 2097152, 'IPFS file exceeds size limit.'); parts.push(part); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    fail(await hash(bytes) === copy.sha256, 'Public IPFS bytes differ from the reviewed upload.');
  }
}
function caller(request, artifact, read, block) {
  return (signature, args = '', words = 1) => read('eth_call', [{ to: request.transaction.to,
    data: '0x' + artifact.methodIdentifiers[signature] + args }, block]).then(v => decodeWords(v, words));
}
export async function checkPublication(request, artifact, deployment, read = rpc) {
  fail(BigInt(await read('eth_chainId')) === BigInt(CHAIN), 'RPC network mismatch.');
  const block = await read('eth_getBlockByNumber', ['latest', false]);
  fail(await validateRuntime(await read('eth_getCode', [deployment.address, block.number]), artifact) === deployment.runtimeCodeSha256, 'Registry runtime pin mismatch.');
  const call = caller(request, artifact, read, block.number);
  const [head, namespace, identity, frozen, successor, role] = await Promise.all([
    call('headPublicationId()'), call('namespaceId()'), call('deploymentId()'), call('publicationFrozen()'), call('successorRegistry()'), call('PUBLISHER_ROLE()'),
  ]);
  const previous = request.previousPublicationId ?? ZERO;
  fail(previous === PUBLICATION_PREDECESSORS[request.snapshotVersion], 'Unreviewed publication predecessor.');
  fail(head[0] === previous, 'Registry head changed or this release is already published. Inspect its receipt before retrying.');
  if (previous !== ZERO) {
    const predecessor = await call('getPublication(bytes32)', encodeWord(previous), 17);
    fail(BigInt(predecessor[16]) === 1n && BigInt(predecessor[15]) === 0n, 'Previous publication must be active and unrevoked.');
  }
  fail(namespace[0] === deployment.namespaceId && identity[0] === deployment.deploymentId, 'Registry identity mismatch.');
  fail(!wordBool(frozen[0]) && /^0x0+$/.test(successor[0]), 'Registry is frozen or migrated.');
  fail(wordBool((await call('hasRole(bytes32,address)', encodeWord(role[0]) + encodeWord(request.transaction.from, 'address')))[0]), 'Publisher role is missing.');
  const tx = { from: request.transaction.from, to: request.transaction.to, data: request.transaction.data, value: '0x0' };
  const balance = await read('eth_getBalance', [tx.from, 'latest']);
  const price = await read('eth_gasPrice');
  const gas = await read('eth_estimateGas', [tx]);
  const fee = deploymentFee(gas, price, balance);
  fail(await read('eth_call', [{ ...tx, gas: fee.gas }, 'latest']) === request.expectedPublicationId, 'Publication simulation ID mismatch.');
  fail((await read('eth_getBlockByNumber', [block.number, false])).hash === block.hash, 'Inspection block changed.');
  return { ...fee, balanceWei: BigInt(balance).toString(), checkedAt: new Date().toISOString() };
}
export async function verifyPublicationReceipt(txHash, request, artifact, bundle, deployment, read = rpc) {
  hexBytes(txHash, 32);
  fail(BigInt(await read('eth_chainId')) === BigInt(CHAIN), 'RPC network mismatch.');
  const receipt = await read('eth_getTransactionReceipt', [txHash]);
  if (!receipt) return null;
  fail(receipt.transactionHash.toLowerCase() === txHash.toLowerCase() && BigInt(receipt.status) === 1n, 'Publication receipt mismatch or transaction reverted.');
  const tx = await read('eth_getTransactionByHash', [txHash]);
  fail(tx && tx.hash.toLowerCase() === txHash.toLowerCase() && tx.to?.toLowerCase() === request.transaction.to.toLowerCase()
    && tx.from.toLowerCase() === request.transaction.from.toLowerCase() && tx.input === request.transaction.data
    && BigInt(tx.value) === 0n && BigInt(tx.chainId) === BigInt(CHAIN), 'Mined transaction differs from the reviewed publication.');
  fail(tx.blockHash === receipt.blockHash && tx.blockNumber === receipt.blockNumber, 'Transaction and receipt blocks differ.');
  const block = await read('eth_getBlockByNumber', [receipt.blockNumber, false]);
  fail(block.hash === receipt.blockHash, 'Publication block mismatch.');
  fail(await validateRuntime(await read('eth_getCode', [deployment.address, block.number]), artifact) === deployment.runtimeCodeSha256, 'Registry runtime pin mismatch.');
  const call = caller(request, artifact, read, block.number), m = bundle.manifest;
  const publication = await call('getPublication(bytes32)', encodeWord(request.expectedPublicationId), 17);
  const previous = request.previousPublicationId ?? ZERO;
  const expected = [m.snapshot.portableSnapshotId, m.snapshot.versionHash, m.snapshot.canonicalSha256Bytes32,
    m.commitments.evidence.root, m.commitments.relationship.root, previous, await hash(new TextEncoder().encode(request.manifestUri)), ZERO,
    '0x' + encodeWord(request.transaction.from, 'address'), '0x' + '00'.repeat(32)];
  for (let i = 0; i < expected.length; i++) fail(publication[i] === expected[i], 'Publication commitments or publisher mismatch.');
  const numbers = [m.commitments.evidence.count, m.commitments.relationship.count, Date.parse(m.snapshot.createdAt) / 1000,
    Date.parse(m.snapshot.reviewedAt) / 1000, BigInt(block.timestamp), 0, 1];
  numbers.forEach((v, i) => fail(BigInt(publication[i + 10]) === BigInt(v), 'Publication counts, timestamps or state mismatch.'));
  fail((await call('headPublicationId()'))[0] === request.expectedPublicationId
    && (await call('publicationIdForVersion(bytes32)', encodeWord(m.snapshot.versionHash)))[0] === request.expectedPublicationId, 'Publication head or version mismatch.');
  if (previous !== ZERO) fail(BigInt((await call('getPublication(bytes32)', encodeWord(previous), 17))[16]) === 2n, 'Previous publication was not superseded.');
  fail((await read('eth_getBlockByNumber', [block.number, false])).hash === block.hash, 'Publication block changed during verification.');
  return { schemaVersion: 1, status: 'publication-receipt-verified', chainId: CHAIN, address: deployment.address,
    transactionHash: txHash, blockNumber: BigInt(block.number).toString(), blockHash: block.hash, publishedAt: BigInt(block.timestamp).toString(),
    publicationId: request.expectedPublicationId, previousPublicationId: previous, snapshotVersion: m.snapshot.version,
    snapshotSha256: m.snapshot.canonicalSha256, manifestUri: request.manifestUri, publisher: request.transaction.from,
    runtimeCodeSha256: deployment.runtimeCodeSha256, checkedAt: new Date().toISOString(),
    scope: 'Receipt and exact publication commitments checked at the publication block through one trusted RPC. Finality and current per-record lifecycle must be checked separately.' };
}
