#!/usr/bin/env node
// Disposable loopback rehearsal only. No external RPC or private key is used.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { randomInt, webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const { estimate, validateRequest, verifyReceipt, hash } = await import('../../tools/registry-deploy/core.js');
const request = JSON.parse(fs.readFileSync(new URL('../../tools/registry-deploy/request.json', import.meta.url)));
const artifact = JSON.parse(fs.readFileSync(new URL('../artifacts/MonadCityRegistry.json', import.meta.url)));
const { validatePublication, checkPublication, verifyPublicationReceipt } = await import('../../tools/registry-publish/core.js');
const { encodeWord, hexBytes } = await import('../../src/onchain-rpc.js');
const pubRequest = JSON.parse(fs.readFileSync(new URL('../../tools/registry-publish/request.json', import.meta.url)));
const json = p => JSON.parse(fs.readFileSync(new URL('../../' + p, import.meta.url)));
const bundle = { manifest: json('data/registry/phase-3.5-v6/manifest.json'), evidenceArtifact: json('data/registry/phase-3.5-v6/evidence-proofs.json'), relationshipArtifact: json('data/registry/phase-3.5-v6/relationship-proofs.json'), snapshot: json('data/evidence-snapshots/phase-3.5-v6.json') };
const port = 20000 + randomInt(10000);
const endpoint = `http://127.0.0.1:${port}`;
let id = 0;
async function local(method, params = []) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }), signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}
const child = spawn('anvil', ['--silent', '--host', '127.0.0.1', '--port', String(port), '--chain-id', '10143'], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; child.stderr.on('data', data => { stderr += data; });
try {
  let started = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error('Loopback Anvil failed: ' + stderr);
    try { await local('eth_chainId'); started = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!started) throw new Error('Loopback Anvil did not start.');
  await validateRequest(request, artifact);
  // This impersonation affects the disposable local chain only, never Monad Testnet.
  await local('anvil_setBalance', [request.transaction.from, '0x4563918244f40000']);
  await local('anvil_impersonateAccount', [request.transaction.from]);
  const fee = await estimate(request, artifact, local);
  const txHash = await local('eth_sendTransaction', [{ ...request.transaction, gas: fee.gas, gasPrice: fee.gasPrice }]);
  let audit;
  for (let attempt = 0; attempt < 50; attempt++) {
    audit = await verifyReceipt(txHash, request, artifact, local);
    if (audit) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(audit, 'Local deployment receipt did not arrive.');
  assert.equal(audit.status, 'deployment-verified-publication-pending');
  assert.equal(audit.chainId, 10143);
  assert.equal(audit.roles.admin.toLowerCase(), request.transaction.from.toLowerCase());
  const mismatch = async (method, params) => {
    const result = await local(method, params);
    if (method === 'eth_getTransactionByHash') return { ...result, from: '0x' + '33'.repeat(20) };
    return result;
  };
  await assert.rejects(verifyReceipt(txHash, request, artifact, mismatch), /does not match/);
  const prepared = structuredClone(pubRequest);
  prepared.transaction.to = audit.address;
  prepared.deployment = audit;
  prepared.expectedPublicationId = await hash(hexBytes(bundle.manifest.domains.publicationId.id + encodeWord(10143n, 'uint256') + encodeWord(audit.address, 'address') + bundle.manifest.snapshot.portableSnapshotId.slice(2)));
  await validatePublication(prepared, artifact, bundle, audit);
  const pubFee = await checkPublication(prepared, artifact, audit, local);
  const pubHash = await local('eth_sendTransaction', [{ ...prepared.transaction, gas: pubFee.gas, gasPrice: pubFee.gasPrice }]);
  let published;
  for (let attempt = 0; attempt < 50; attempt++) {
    published = await verifyPublicationReceipt(pubHash, prepared, artifact, bundle, audit, local);
    if (published) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(published?.status, 'publication-receipt-verified');
  assert.equal(published.publicationId, prepared.expectedPublicationId);
  await assert.rejects(checkPublication(prepared, artifact, audit, local), /already has a publication/);
  const wrongInput = async (method, params) => {
    const result = await local(method, params);
    return method === 'eth_getTransactionByHash' ? { ...result, input: '0x1234' } : result;
  };
  await assert.rejects(verifyPublicationReceipt(pubHash, prepared, artifact, bundle, audit, wrongInput), /differs from/);
  console.log(JSON.stringify({ environment: 'disposable-loopback-only', result: 'pass',
    checks: ['request', 'estimate', 'constructor simulation', 'actual receipt and runtime', 'identity and roles', 'wrong sender rejected', 'publication simulation and receipt', 'duplicate publication blocked', 'wrong publication input rejected'],
    externalTransaction: false }, null, 2));
} finally { child.kill('SIGTERM'); }
