import { REGISTRY_CONFIG } from './registry-config.js';
import { REGISTRY_SELECTORS } from './registry-abi.js';
import {
  sha256Hex, hashRegistrySubject, verifyRegistryBundle,
} from './registry-proof.js';
import {
  safeRpcUrl, decodeQuantity, hexBytes, encodeWord, encodeCall, decodeWords, wordAddress, wordBool,
  readRpc, readBlock,
} from './onchain-rpc.js';

const bundles = new WeakMap();

export function validateRegistryConfig(config) {
  if (config?.status === 'unconfigured') return false;
  if (config?.status !== 'configured') throw new Error('Invalid registry deployment state.');
  if (!Number.isSafeInteger(config.chainId) || config.chainId <= 0) throw new Error('Invalid registry chain.');
  hexBytes(config.address, 20);
  hexBytes(config.publisher, 20);
  hexBytes(config.runtimeCodeSha256, 32);
  if (/^0x0+$/i.test(config.runtimeCodeSha256)) throw new Error('Registry code audit pin is missing.');
  if (/^0x0+$/i.test(config.address) || /^0x0+$/i.test(config.publisher)) throw new Error('Registry address is missing.');
  safeRpcUrl(config.rpcUrl);
  if (config.namespace !== 'monad-city:registry:main:v1') throw new Error('Untrusted registry namespace.');
  if (typeof config.manifestUri !== 'string' || !/^(https:\/\/|ipfs:\/\/)/.test(config.manifestUri)) {
    throw new Error('Registry manifest URI is missing.');
  }
  for (const key of ['id', 'previousId', 'blockHash', 'transactionHash']) hexBytes(config.publication?.[key], 32);
  for (const key of ['id', 'blockHash', 'transactionHash']) {
    if (/^0x0+$/i.test(config.publication[key])) throw new Error('Publication audit pin is empty.');
  }
  for (const key of ['blockNumber', 'publishedAt']) {
    if (!/^\d+$/.test(String(config.publication?.[key])) || BigInt(config.publication[key]) <= 0n) throw new Error('Publication audit pin is missing.');
  }
  hexBytes(config.lineage?.predecessorRegistry, 20);
  hexBytes(config.lineage?.predecessorPublicationId, 32);
  if (!Number.isInteger(config.lineage?.depth) || config.lineage.depth < 0 || config.lineage.depth > 32) throw new Error('Registry lineage pin is missing.');
  const noPredecessor = /^0x0+$/i.test(config.lineage.predecessorRegistry);
  const noPredecessorPublication = /^0x0+$/i.test(config.lineage.predecessorPublicationId);
  if (noPredecessor !== noPredecessorPublication || (config.lineage.depth === 0) !== noPredecessor) throw new Error('Inconsistent registry lineage pin.');
  return true;
}

export async function loadRegistryBundle({ snapshot, fetchImpl = fetch, signal }) {
  if (!snapshot || !/^[a-zA-Z0-9._-]+$/.test(snapshot.version)) throw new Error('Invalid registry snapshot version.');
  // Cache only normal local artifact reads, never a fixture/alternative transport.
  if (fetchImpl === globalThis.fetch && bundles.has(snapshot)) return bundles.get(snapshot);
  const artifact = async (name) => {
    const response = await fetchImpl(`/data/registry/${snapshot.version}/${name}.json`, {
      signal, credentials: 'omit', redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) throw new Error('Registry proof files are unavailable.');
    const text = await response.text();
    if (text.length > 8 * 1024 * 1024) throw new Error('Registry proof file is too large.');
    return JSON.parse(text);
  };
  const [manifest, evidenceArtifact, relationshipArtifact] = await Promise.all([
    artifact('manifest'), artifact('evidence-proofs'), artifact('relationship-proofs'),
  ]);
  const { context } = await verifyRegistryBundle({ manifest, evidenceArtifact, relationshipArtifact, snapshot });
  const result = { manifest, context, evidenceArtifact, relationshipArtifact };
  if (fetchImpl === globalThis.fetch) bundles.set(snapshot, result);
  return result;
}

export function registryStatusText(result) {
  return {
    unconfigured: 'No onchain registry deployment is configured. Local sources remain available.',
    matched: 'This exact record matches the active, unrevoked publication at the checked block.',
    superseded: 'This record belongs to an earlier publication. It is historical, not the active version.',
    'snapshot-revoked': 'This entire snapshot publication was withdrawn. Historical inclusion remains inspectable.',
    'subject-revoked': 'This exact record ID was withdrawn across the registry lineage. Historical inclusion remains inspectable.',
    'supporting-evidence-revoked': 'A supporting evidence record was withdrawn. This relationship cannot establish an active publication match.',
    migrated: 'The registry has migrated. This deployment is historical; the successor needs separate review.',
    'not-published': 'This snapshot has not been found in the configured registry.',
    mismatch: 'The configured registry does not match these local records. No publication match is established.',
    unavailable: 'The publication check could not complete. No onchain result is established.',
  }[result?.status] || 'No publication match is established.';
}

// Live publication verification is added against the compiler-generated compact view ABI.
// All operations use the read-only transport above and the pinned deployment configuration.
export async function checkRegistryRecord({ subjectKind = 'evidence', subjectId, snapshot,
  config = REGISTRY_CONFIG, fetchImpl = fetch, signal } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 30000);
  try {
    if (!validateRegistryConfig(config)) return { status: 'unconfigured', subjectKind, subjectId };
    return await readRegistryRecord({ subjectKind, subjectId, snapshot, config, fetchImpl, signal: controller.signal });
  } catch (error) {
    return { status: 'unavailable', subjectKind, subjectId, message: error?.message || 'Registry check failed.' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

async function readRegistryRecord(options) {
  const { subjectKind, subjectId, snapshot, config, fetchImpl, signal } = options;
  if (!['evidence', 'relationship'].includes(subjectKind) || typeof subjectId !== 'string') throw new Error('Invalid registry subject.');
  const bundle = await loadRegistryBundle({ snapshot, fetchImpl, signal });
  const { context, manifest, evidenceArtifact, relationshipArtifact } = bundle;
  const entries = subjectKind === 'evidence' ? evidenceArtifact.entries : relationshipArtifact.entries;
  const entry = entries.find((item) => item.subjectId === subjectId);
  if (!entry) throw new Error('This subject is outside the approved registry snapshot.');
  const rpcOptions = { fetchImpl, signal };
  const rpc = (method, params) => readRpc(config.rpcUrl, method, params, rpcOptions);
  if (decodeQuantity(await rpc('eth_chainId', [])) !== BigInt(config.chainId)) throw new Error('Registry RPC returned the wrong chain.');
  const block = await readBlock(config.rpcUrl, 'latest', rpcOptions);
  if (decodeQuantity(block.number) < BigInt(config.publication.blockNumber)) throw new Error('RPC is behind the reviewed publication.');
  const publicationBlock = await readBlock(config.rpcUrl, `0x${BigInt(config.publication.blockNumber).toString(16)}`, rpcOptions);
  if (publicationBlock.hash !== config.publication.blockHash.toLowerCase()) throw new Error('Reviewed publication block differs.');
  const code = await rpc('eth_getCode', [config.address, block.number]);
  if (hexBytes(code).length === 0 || await sha256Hex(hexBytes(code)) !== config.runtimeCodeSha256.toLowerCase()) {
    throw new Error('Registry runtime code does not match the reviewed deployment.');
  }
  const call = async (signature, args = [], length = 1, proof = null) => {
    const data = encodeCall(REGISTRY_SELECTORS[signature], args.map((value) => ({ value })), proof);
    return decodeWords(await rpc('eth_call', [{ to: config.address, data }, block.number]), length);
  };
  const digestWords = (...words) => sha256Hex(hexBytes(`0x${words.map((word) => word.replace(/^0x/, '')).join('')}`));
  const chainWord = encodeWord(BigInt(config.chainId), 'uint256');
  const addressWord = encodeWord(config.address, 'address');
  const expectedDeployment = await digestWords(context.domainHashes.deploymentId, chainWord, addressWord, context.namespaceId);
  const expectedPublication = await digestWords(context.domainHashes.publicationId, chainWord, addressWord, context.portableSnapshotId);
  const [[protocol], [namespace], [deployment], [publicationId], [predecessor], [predecessorPublication], [depth]] = await Promise.all([
    call('REGISTRY_PROTOCOL_VERSION()'), call('namespaceId()'), call('deploymentId()'),
    call('publicationIdForVersion(bytes32)', [context.versionHash]),
    call('predecessorRegistry()'), call('predecessorPublicationId()'), call('lineageDepth()'),
  ]);
  if (BigInt(protocol) !== 1n || namespace !== context.namespaceId || deployment !== expectedDeployment
    || wordAddress(predecessor) !== config.lineage.predecessorRegistry.toLowerCase()
    || predecessorPublication !== config.lineage.predecessorPublicationId.toLowerCase()
    || BigInt(depth) !== BigInt(config.lineage.depth) || expectedPublication !== config.publication.id.toLowerCase()) {
    throw new Error('Registry protocol or deployment binding differs.');
  }
  const base = { subjectKind, subjectId, chainId: config.chainId, address: config.address,
    snapshotVersion: snapshot.version, blockNumber: decodeQuantity(block.number).toString(),
    blockHash: block.hash, blockTimestamp: decodeQuantity(block.timestamp).toString() };
  const finish = async (result) => {
    const checked = await readBlock(config.rpcUrl, block.number, rpcOptions);
    if (checked.hash !== block.hash) throw new Error('The checked block changed during verification.');
    return { ...base, ...result };
  };
  if (/^0x0+$/.test(publicationId)) return finish({ status: 'not-published', included: false });
  if (publicationId !== expectedPublication) return finish({ status: 'mismatch', included: false });
  const [publication, [head], [successorWord], [frozenWord]] = await Promise.all([
    call('getPublication(bytes32)', [publicationId], 17), call('headPublicationId()'),
    call('successorRegistry()'), call('publicationFrozen()'),
  ]);
  const publisher = wordAddress(publication[8]);
  const successor = wordAddress(successorWord);
  const frozen = wordBool(frozenWord);
  const expected = [context.portableSnapshotId, context.versionHash, context.snapshotSha256,
    manifest.commitments.evidence.root, manifest.commitments.relationship.root];
  const publicationState = Number(BigInt(publication[16]));
  // Validate integer widths and chronology before treating the record as a publication.
  const times = publication.slice(12, 16).map(BigInt);
  const numbers = publication.slice(10, 16).map(BigInt);
  const migrated = !/^0x0+$/.test(successor);
  const mismatch = expected.some((word, index) => publication[index] !== word)
    || publisher !== config.publisher.toLowerCase()
    || publication[6] !== await sha256Hex(config.manifestUri)
    || publication[5] !== config.publication.previousId.toLowerCase()
    || times[2] !== BigInt(config.publication.publishedAt)
    || times[2] !== decodeQuantity(publicationBlock.timestamp)
    || BigInt(publication[10]) !== BigInt(manifest.commitments.evidence.count)
    || BigInt(publication[11]) !== BigInt(manifest.commitments.relationship.count)
    || numbers.some((number) => number >= 1n << 64n)
    || times[0] !== BigInt(Date.parse(snapshot.createdAt) / 1000)
    || times[1] !== BigInt(Date.parse(snapshot.reviewedAt) / 1000)
    || times[0] <= 0n || times[1] < times[0] || times[2] < times[1]
    || times[2] > decodeQuantity(block.timestamp) || times[3] > decodeQuantity(block.timestamp)
    || ![1, 2, 3].includes(publicationState)
    || (publicationState === 3) !== (times[3] !== 0n)
    || (publicationState === 3 && (/^0x0+$/.test(publication[7]) || /^0x0+$/.test(publication[9])))
    || (publicationState === 1 && (head !== publicationId || frozen || migrated))
    || frozen !== migrated;
  if (mismatch) return finish({ status: 'mismatch', included: false, publicationId });
  const inspect = async (item, kind) => {
    const calculated = await hashRegistrySubject({ subjectKind: kind, subjectId: item.subjectId, payload: item.payload, context });
    const result = await call(kind === 'evidence' ? 'verifyEvidence(bytes32,bytes32,bytes32,bytes32[])'
      : 'verifyRelationship(bytes32,bytes32,bytes32,bytes32[])',
    [publicationId, calculated.idHash, calculated.payloadSha256], 4, item.proof);
    const [included, active, revoked, subjectRevoked] = result.map(wordBool);
    if (active !== (publicationState === 1) || revoked !== (times[3] !== 0n)) throw new Error('Registry lifecycle responses disagree.');
    return { included, active, revoked, subjectRevoked };
  };
  const membership = await inspect(entry, subjectKind);
  const supports = subjectKind === 'relationship' ? await Promise.all(entry.payload.evidenceIds.map(async (id) => {
    const support = evidenceArtifact.entries.find((item) => item.subjectId === id);
    if (!support) throw new Error('Relationship support is missing.');
    return { subjectId: id, ...await inspect(support, 'evidence') };
  })) : [];
  const all = [membership, ...supports];
  const included = all.every((item) => item.included);
  const status = !included ? 'mismatch' : membership.revoked ? 'snapshot-revoked'
    : membership.subjectRevoked ? 'subject-revoked'
    : supports.some((item) => item.revoked || item.subjectRevoked) ? 'supporting-evidence-revoked' : migrated ? 'migrated'
    : publicationState === 2 ? 'superseded' : 'matched';
  return finish({ status, included, usable: status === 'matched', publicationId, publisher,
    successor: migrated ? successor : null, membership, supports,
    trustBoundary: 'Publication and inclusion only. This does not establish source truth, safety, endorsement, or freshness. RPC responses are trusted; this is not a light-client proof.' });
}
