import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const { validatePublication, checkPublication, checkAvailability, verifyPublicationReceipt } = await import('../../tools/registry-publish/core.js');
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
