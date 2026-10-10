import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { checkRegistryRecord, validateRegistryConfig } from '../src/onchain.js';
import { sha256Hex, hexToBytes } from '../src/registry-proof.js';
import { REGISTRY_SELECTORS } from '../src/registry-abi.js';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
import {
  safeRpcUrl, decodeQuantity, hexBytes, encodeWord, encodeCall, decodeWords,
  wordAddress, wordBool, readRpc, readBlock,
} from '../src/onchain-rpc.js';

const digest = `0x${'12'.repeat(32)}`;
const address = `0x${'34'.repeat(20)}`;
const rpc = 'https://rpc.example.test/';
const rpcFixture = (answer) => async (_url, options) => {
  const request = JSON.parse(options.body);
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: answer }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

test('RPC endpoints reject credentials, insecure remote URLs and non-HTTP schemes', () => {
  for (const url of ['http://remote.test', 'https://user:secret@rpc.test', 'file:///tmp/a', 'https://rpc.test/#a']) {
    assert.throws(() => safeRpcUrl(url));
  }
  assert.equal(safeRpcUrl(rpc), rpc);
  assert.equal(safeRpcUrl('http://127.0.0.1:8545'), 'http://127.0.0.1:8545/');
});

test('strict hex parsing rejects malformed and non-canonical responses', () => {
  for (const value of ['0x00', '0x', '143', '0x-1', '0xgg']) assert.throws(() => decodeQuantity(value));
  assert.equal(decodeQuantity('0x8f'), 143n);
  assert.equal(hexBytes(digest, 32).length, 32);
  for (const value of ['0x1', `0x${'ab'.repeat(31)}`, `0x${'zz'.repeat(32)}`]) {
    assert.throws(() => hexBytes(value, 32));
  }
});

test('ABI encoding uses byte offsets and bounded arrays, decoding rejects truncated words', () => {
  const call = encodeCall('0x01020304', [
    { value: digest, type: 'bytes32' }, { value: 143n, type: 'uint256' },
  ], [digest]);
  const words = decodeWords(`0x${call.slice(10)}`, 5);
  assert.equal(BigInt(words[2]), 96n);
  assert.equal(BigInt(words[3]), 1n);
  assert.equal(words[4], digest);
  assert.throws(() => encodeCall('0x01020304', [], Array(65).fill(digest)));
  assert.throws(() => encodeWord(-1n, 'uint256'));
  assert.throws(() => encodeWord(1n << 256n, 'uint256'));
  assert.throws(() => decodeWords('0x00', 1));
  assert.equal(wordAddress(`0x${encodeWord(address, 'address')}`), address);
  assert.throws(() => wordAddress(`0x${'ff'.repeat(32)}`));
  assert.equal(wordBool(`0x${encodeWord(1n, 'uint256')}`), true);
  assert.throws(() => wordBool(`0x${encodeWord(2n, 'uint256')}`));
});

test('RPC is read-only and does not send wallet methods, credentials or redirects', async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, rpc);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    return rpcFixture('0x8f')(url, options);
  };
  assert.equal(await readRpc(rpc, 'eth_chainId', [], { fetchImpl }), '0x8f');
  await assert.rejects(readRpc(rpc, 'eth_sendTransaction', [], { fetchImpl }), /read methods only/);
  await assert.rejects(readRpc(rpc, 'personal_sign', [], { fetchImpl }), /read methods only/);
  assert.equal(calls, 1);
});

test('RPC rejects wrong response IDs, provider errors and invalid envelopes', async () => {
  for (const result of [{ jsonrpc: '2.0', id: -1, result: '0x8f' }, { jsonrpc: '2.0', error: { code: -1 } }, []]) {
    const fetchImpl = async () => new Response(JSON.stringify(result));
    await assert.rejects(readRpc(rpc, 'eth_chainId', [], { fetchImpl }), /invalid response/);
  }
});

test('numbered block reads reject missing or wrong blocks', async () => {
  const block = { number: '0x10', timestamp: '0x20', hash: digest };
  assert.deepEqual(await readBlock(rpc, '0x10', { fetchImpl: rpcFixture(block) }), block);
  await assert.rejects(readBlock(rpc, '0x11', { fetchImpl: rpcFixture(block) }), /wrong block/);
  await assert.rejects(readBlock(rpc, 'latest', { fetchImpl: rpcFixture(null) }), /unavailable/);
});

const snapshot = JSON.parse(await readFile(new URL('../data/evidence-snapshots/phase-3.5-v6.json', import.meta.url)));
const artifactNames = ['manifest', 'evidence-proofs', 'relationship-proofs'];
const artifacts = Object.fromEntries(await Promise.all(artifactNames.map(async (name) => [name,
  JSON.parse(await readFile(new URL(`../data/registry/phase-3.5-v6/${name}.json`, import.meta.url)))])));
const manifest = artifacts.manifest;
const code = '0x60006000';
const config = { status: 'configured', namespace: manifest.namespace.value, address, publisher: address,
  chainId: 143, rpcUrl: rpc, runtimeCodeSha256: await sha256Hex(hexToBytes(code)), manifestUri: 'https://example.test/manifest.json' };
const word = (value, type = 'bytes32') => `0x${encodeWord(value, type)}`;
const combine = (...values) => `0x${values.map((value) => value.slice(2)).join('')}`;
const expectedId = await sha256Hex(hexToBytes(combine(manifest.domains.publicationId.id,
  word(143, 'uint256'), word(address, 'address'), manifest.snapshot.portableSnapshotId)));
const deploymentId = await sha256Hex(hexToBytes(combine(manifest.domains.deploymentId.id,
  word(143, 'uint256'), word(address, 'address'), manifest.namespace.id)));
const zero = word(0, 'uint256');
config.publication = { id: expectedId, previousId: zero, blockNumber: 63, blockHash: digest, transactionHash: digest, publishedAt: 1800000000 };
config.lineage = { predecessorRegistry: `0x${'00'.repeat(20)}`, predecessorPublicationId: zero, depth: 0 };
const fixture = (changes = {}) => {
  let reads = 0;
  const block = { number: '0x40', timestamp: '0x80000000', hash: digest };
  const publication = [manifest.snapshot.portableSnapshotId, manifest.snapshot.versionHash,
    manifest.snapshot.canonicalSha256Bytes32, manifest.commitments.evidence.root, manifest.commitments.relationship.root,
    zero, zero, changes.revoked ? digest : zero, word(address, 'address'), changes.revoked ? word(address, 'address') : zero,
    word(193, 'uint256'), word(6, 'uint256'), word(Date.parse(snapshot.createdAt) / 1000, 'uint256'),
    word(Date.parse(snapshot.reviewedAt) / 1000, 'uint256'), word(1800000000, 'uint256'),
    word(changes.revoked ? 1800000001 : 0, 'uint256'), word(changes.revoked ? 3 : changes.superseded || changes.migrated ? 2 : 1, 'uint256')];
  return async (url, options) => {
    if (url.startsWith('/data/registry/')) {
      const name = url.split('/').at(-1).replace('.json', '');
      return new Response(JSON.stringify(artifacts[name]));
    }
    const request = JSON.parse(options.body);
    let result;
    if (request.method === 'eth_chainId') result = changes.wrongChain ? '0x1' : '0x8f';
    if (request.method === 'eth_getCode') { assert.equal(request.params[1], block.number); result = changes.wrongCode ? '0x' : code; }
    if (request.method === 'eth_getBlockByNumber') {
      reads++;
      result = { ...block, number: request.params[0] === 'latest' ? block.number : request.params[0], timestamp: request.params[0] === '0x3f' ? '0x6b49d200' : block.timestamp, hash: changes.reorg && reads > 2 ? `0x${'99'.repeat(32)}` : block.hash }; 
    }
    if (request.method === 'eth_call') {
      assert.equal(request.params[1], block.number);
      const data = request.params[0].data;
      const selector = data.slice(0, 10);
      const signature = Object.entries(REGISTRY_SELECTORS).find(([, value]) => value === selector)?.[0];
      const values = {
        'REGISTRY_PROTOCOL_VERSION()': [word(1, 'uint256')], 'namespaceId()': [manifest.namespace.id],
        'deploymentId()': [deploymentId], 'predecessorRegistry()': [zero], 'predecessorPublicationId()': [zero], 'lineageDepth()': [word(0, 'uint256')], 'publicationIdForVersion(bytes32)': [changes.notPublished ? zero : expectedId],
        'headPublicationId()': [changes.superseded ? digest : expectedId],
        'successorRegistry()': [changes.migrated ? word(`0x${'56'.repeat(20)}`, 'address') : zero],
        'publicationFrozen()': [word(changes.migrated ? 1 : 0, 'uint256')],
      };
      publication[6] = await sha256Hex(config.manifestUri);
      if (changes.wrongRoot) publication[3] = digest;
      if (signature === 'getPublication(bytes32)') result = combine(...publication);
      else if (signature?.startsWith('verify')) {
        const idHash = `0x${data.slice(74, 138)}`;
        result = combine(...[changes.notIncluded ? 0 : 1, changes.superseded || changes.revoked || changes.migrated ? 0 : 1,
          changes.revoked ? 1 : 0, changes.subjectRevoked || idHash === changes.revokedSupport ? 1 : 0].map((n) => word(n, 'uint256')));
      } else result = combine(...values[signature]);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
  };
};

test('unconfigured client performs no artifact or RPC request', async () => {
  const result = await checkRegistryRecord({ config: { status: 'unconfigured' }, snapshot, subjectId: 'any', fetchImpl: () => { throw new Error('Unexpected network'); } });
  assert.equal(result.status, 'unconfigured');
});

test('deployment configuration requires reviewed publication pins and consistent migration lineage', () => {
  assert.equal(validateRegistryConfig(config), true);
  assert.equal(validateRegistryConfig({ ...config, lineage: { predecessorRegistry: address, predecessorPublicationId: digest, depth: 1 } }), true);
  for (const edited of [
    { ...config, lineage: { ...config.lineage, depth: 1 } },
    { ...config, lineage: { ...config.lineage, predecessorRegistry: address } },
    { ...config, publication: { ...config.publication, id: zero } },
    { ...config, publication: { ...config.publication, blockHash: zero } },
    { ...config, publication: null }, { ...config, runtimeCodeSha256: zero },
  ]) assert.throws(() => validateRegistryConfig(edited));
});

test('client checks immutable roots, identity, publisher and lifecycle at one numbered block', async () => {
  const entry = artifacts['evidence-proofs'].entries[0];
  for (const [changes, expected] of [[{}, 'matched'], [{ revoked: true }, 'snapshot-revoked'], [{ subjectRevoked: true }, 'subject-revoked'],
    [{ superseded: true }, 'superseded'], [{ migrated: true }, 'migrated'], [{ notPublished: true }, 'not-published'],
    [{ wrongRoot: true }, 'mismatch'], [{ notIncluded: true }, 'mismatch'], [{ wrongChain: true }, 'unavailable'],
    [{ wrongCode: true }, 'unavailable'], [{ reorg: true }, 'unavailable']]) {
    const result = await checkRegistryRecord({ snapshot, subjectId: entry.subjectId, config, fetchImpl: fixture(changes) });
    assert.equal(result.status, expected, `${JSON.stringify(changes)}: ${result.message}`);
    assert.equal(result.usable === true, expected === 'matched');
  }
});

test('relationship check requires each exact supporting evidence record to remain unrevoked', async () => {
  const entry = artifacts['relationship-proofs'].entries[0];
  const support = artifacts['evidence-proofs'].entries.find((item) => item.subjectId === entry.payload.evidenceIds[0]);
  for (const [changes, expected] of [[{}, 'matched'], [{ revokedSupport: support.idHash }, 'supporting-evidence-revoked']]) {
    const result = await checkRegistryRecord({ subjectKind: 'relationship', snapshot, subjectId: entry.subjectId, config, fetchImpl: fixture(changes) });
    assert.equal(result.status, expected, result.message);
    assert.equal(result.supports.length, entry.payload.evidenceIds.length);
  }
});

test('client selectors remain identical to the compiled Solidity ABI', async () => {
  const compiled = JSON.parse(await readFile(new URL('../contracts/artifacts/MonadCityRegistry.json', import.meta.url)));
  for (const [signature, selector] of Object.entries(REGISTRY_SELECTORS)) assert.equal(selector, `0x${compiled.methodIdentifiers[signature]}`);
});
