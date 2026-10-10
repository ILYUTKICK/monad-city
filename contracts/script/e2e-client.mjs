#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkRegistryRecord } from '../../src/onchain.js';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = path.resolve(packageDirectory, '..');
const chainId = 31_337;
const port = 20_000 + crypto.randomInt(10_000);
const rpcUrl = `http://127.0.0.1:${port}/`;
const namespace = 'monad-city:registry:main:v1';
const zeroAddress = `0x${'00'.repeat(20)}`;
const zeroWord = `0x${'00'.repeat(32)}`;
const manifestUri = 'ipfs://bafy-monad-city-phase-3-5-v6/manifest.json';
const manifest = readJson('data/registry/phase-3.5-v6/manifest.json');
const evidenceProofs = readJson('data/registry/phase-3.5-v6/evidence-proofs.json');
const relationshipProofs = readJson('data/registry/phase-3.5-v6/relationship-proofs.json');
const snapshot = readJson('data/evidence-snapshots/phase-3.5-v6.json');
const compilerArtifact = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, 'out/MonadCityRegistry.sol/MonadCityRegistry.json'), 'utf8'),
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryDirectory, relativePath), 'utf8'));
}

function sha256Hex(value) {
  const bytes = typeof value === 'string' && value.startsWith('0x')
    ? Buffer.from(value.slice(2), 'hex')
    : Buffer.from(value);
  return `0x${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function hashWords(...words) {
  return sha256Hex(`0x${words.map((word) => word.slice(2)).join('')}`);
}

function uintWord(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

function addressWord(value) {
  return `0x${value.slice(2).toLowerCase().padStart(64, '0')}`;
}

function cast(args) {
  const result = spawnSync('cast', args, { cwd: packageDirectory, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`cast ${args[0]} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

let requestId = 1;
async function rpc(method, params = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId++, method, params }),
  });
  const body = await response.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function waitForAnvil(child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`anvil exited with code ${child.exitCode}`);
    try {
      await rpc('eth_chainId');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('anvil did not start within five seconds');
}

async function waitForReceipt(transactionHash) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const receipt = await rpc('eth_getTransactionReceipt', [transactionHash]);
    if (receipt) {
      if (BigInt(receipt.status) !== 1n) throw new Error(`transaction ${transactionHash} reverted`);
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`transaction ${transactionHash} was not mined`);
}

async function transact(from, to, data) {
  const transactionHash = await rpc('eth_sendTransaction', [{ from, ...(to ? { to } : {}), data, gas: '0x1c9c380' }]);
  return waitForReceipt(transactionHash);
}

function constructorData({ admin, publisher, revoker, predecessor = zeroAddress, predecessorPublication = zeroWord }) {
  const encoded = cast([
    'abi-encode',
    'constructor(string,address,uint48,address,address,address,bytes32)',
    namespace,
    admin,
    '172800',
    publisher,
    revoker,
    predecessor,
    predecessorPublication,
  ]);
  return `0x${compilerArtifact.bytecode.object.replace(/^0x/, '')}${encoded.slice(2)}`;
}

async function deploy(options) {
  const receipt = await transact(options.admin, null, constructorData(options));
  if (!receipt.contractAddress) throw new Error('deployment receipt lacks a contract address');
  return { address: receipt.contractAddress.toLowerCase(), receipt };
}

function publishCall({ versionHash, snapshotSha256, evidenceRoot, relationshipRoot, previousPublicationId,
  evidenceCount, relationshipCount, createdAt, reviewedAt, uri }) {
  return cast([
    'calldata',
    'publish((bytes32,bytes32,bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,string))',
    `(${versionHash},${snapshotSha256},${evidenceRoot},${relationshipRoot},${previousPublicationId},${evidenceCount},${relationshipCount},${createdAt},${reviewedAt},${uri})`,
  ]);
}

async function publicationAudit(receipt) {
  const block = await rpc('eth_getBlockByNumber', [receipt.blockNumber, false]);
  return {
    blockNumber: BigInt(receipt.blockNumber).toString(),
    blockHash: block.hash.toLowerCase(),
    transactionHash: receipt.transactionHash.toLowerCase(),
    publishedAt: BigInt(block.timestamp).toString(),
  };
}

function fileFetch(input, init) {
  if (typeof input === 'string' && input.startsWith('/data/registry/')) {
    const resolved = path.resolve(repositoryDirectory, `.${input}`);
    const allowed = path.join(repositoryDirectory, 'data/registry/phase-3.5-v6');
    if (!resolved.startsWith(`${allowed}${path.sep}`)) return Promise.resolve(new Response('', { status: 404 }));
    return Promise.resolve(new Response(fs.readFileSync(resolved), { status: 200 }));
  }
  return fetch(input, init);
}

function expectStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${result.status} (${result.message || 'no detail'})`);
  }
}

const anvil = spawn('anvil', [
  '--silent', '--host', '127.0.0.1', '--port', String(port), '--chain-id', String(chainId),
], { cwd: packageDirectory, stdio: ['ignore', 'ignore', 'pipe'] });
let anvilError = '';
anvil.stderr.on('data', (chunk) => { anvilError += chunk.toString(); });

try {
  await waitForAnvil(anvil);
  const [admin, publisher, revoker] = (await rpc('eth_accounts')).map((address) => address.toLowerCase());
  const predecessor = await deploy({ admin, publisher, revoker });

  const v6Call = publishCall({
    versionHash: manifest.snapshot.versionHash,
    snapshotSha256: manifest.snapshot.canonicalSha256Bytes32,
    evidenceRoot: manifest.commitments.evidence.root,
    relationshipRoot: manifest.commitments.relationship.root,
    previousPublicationId: zeroWord,
    evidenceCount: manifest.commitments.evidence.count,
    relationshipCount: manifest.commitments.relationship.count,
    createdAt: Date.parse(snapshot.createdAt) / 1000,
    reviewedAt: Date.parse(snapshot.reviewedAt) / 1000,
    uri: manifestUri,
  });
  const publicationReceipt = await transact(publisher, predecessor.address, v6Call);
  const publication = await publicationAudit(publicationReceipt);
  const publicationId = hashWords(
    manifest.domains.publicationId.id,
    uintWord(chainId),
    addressWord(predecessor.address),
    manifest.snapshot.portableSnapshotId,
  );
  const runtimeCodeSha256 = sha256Hex(await rpc('eth_getCode', [predecessor.address, 'latest']));
  const config = {
    status: 'configured',
    namespace,
    chainId,
    address: predecessor.address,
    rpcUrl,
    runtimeCodeSha256,
    publisher,
    manifestUri,
    publication: { id: publicationId, previousId: zeroWord, ...publication },
    lineage: { predecessorRegistry: zeroAddress, predecessorPublicationId: zeroWord, depth: 0 },
  };

  const check = (subjectKind, subjectId) => checkRegistryRecord({
    subjectKind, subjectId, snapshot, config, fetchImpl: fileFetch,
  });

  expectStatus(await check('evidence', 'E-ZKSWAP-V2-REG-001'), 'matched', 'active evidence');
  expectStatus(await check('relationship', 'monad-switchboard'), 'matched', 'active relationship');

  const firstEvidence = evidenceProofs.entries.find((entry) => entry.subjectId === 'E-ZKSWAP-V2-REG-001');
  const revokeEvidence = cast([
    'calldata', 'revokeEvidence(bytes32,bytes32,bytes32,bytes32[],bytes32)',
    publicationId, firstEvidence.idHash, firstEvidence.payloadSha256, `[${firstEvidence.proof.join(',')}]`, sha256Hex('e2e evidence withdrawal'),
  ]);
  await transact(revoker, predecessor.address, revokeEvidence);
  expectStatus(await check('evidence', firstEvidence.subjectId), 'subject-revoked', 'global evidence revocation');

  const relationship = relationshipProofs.entries.find((entry) => entry.subjectId === 'monad-switchboard');
  const support = evidenceProofs.entries.find((entry) => entry.subjectId === relationship.payload.evidenceIds[0]);
  const revokeSupport = cast([
    'calldata', 'revokeEvidence(bytes32,bytes32,bytes32,bytes32[],bytes32)',
    publicationId, support.idHash, support.payloadSha256, `[${support.proof.join(',')}]`, sha256Hex('e2e relationship support withdrawal'),
  ]);
  await transact(revoker, predecessor.address, revokeSupport);
  expectStatus(
    await check('relationship', relationship.subjectId),
    'supporting-evidence-revoked',
    'relationship dependency revocation',
  );

  const v7Version = sha256Hex('local-e2e-v7');
  const v7Snapshot = sha256Hex('local-e2e-v7-snapshot');
  const v7Root = sha256Hex('local-e2e-v7-root');
  const v7Portable = hashWords(manifest.domains.snapshotId.id, manifest.namespace.id, v7Version, v7Snapshot);
  const v7PublicationId = hashWords(
    manifest.domains.publicationId.id, uintWord(chainId), addressWord(predecessor.address), v7Portable,
  );
  await transact(publisher, predecessor.address, publishCall({
    versionHash: v7Version,
    snapshotSha256: v7Snapshot,
    evidenceRoot: v7Root,
    relationshipRoot: zeroWord,
    previousPublicationId: publicationId,
    evidenceCount: 1,
    relationshipCount: 0,
    createdAt: Date.parse(snapshot.createdAt) / 1000,
    reviewedAt: Date.parse(snapshot.reviewedAt) / 1000,
    uri: 'ipfs://local-e2e-v7/manifest.json',
  }));
  expectStatus(await check('evidence', 'E-MEMETOK-REGISTRY-001'), 'superseded', 'superseded v6 evidence');

  const successor = await deploy({
    admin,
    publisher,
    revoker,
    predecessor: predecessor.address,
    predecessorPublication: v7PublicationId,
  });
  await transact(publisher, successor.address, publishCall({
    versionHash: sha256Hex('local-e2e-successor-v1'),
    snapshotSha256: sha256Hex('local-e2e-successor-snapshot'),
    evidenceRoot: sha256Hex('local-e2e-successor-root'),
    relationshipRoot: zeroWord,
    previousPublicationId: zeroWord,
    evidenceCount: 1,
    relationshipCount: 0,
    createdAt: Date.parse(snapshot.createdAt) / 1000,
    reviewedAt: Date.parse(snapshot.reviewedAt) / 1000,
    uri: 'ipfs://local-e2e-successor/manifest.json',
  }));
  const confirm = cast(['calldata', 'confirmSuccessor(address)', successor.address]);
  await transact(admin, predecessor.address, confirm);
  expectStatus(await check('evidence', 'E-MEMETOK-REGISTRY-001'), 'migrated', 'migrated predecessor');

  console.log(JSON.stringify({
    localOnly: true,
    chainId,
    checks: ['active', 'global-revocation', 'relationship-support-revocation', 'superseded', 'migration'],
    runtimeCodeSha256,
  }, null, 2));
} catch (error) {
  if (anvilError) process.stderr.write(anvilError);
  throw error;
} finally {
  anvil.kill('SIGTERM');
}
