import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const { validateRequest, validateWallet, deploymentFee, validateRuntime, verifyReceipt, estimate } = await import('../../tools/registry-deploy/core.js');
const request = JSON.parse(fs.readFileSync(new URL('../../tools/registry-deploy/request.json', import.meta.url)));
const artifact = JSON.parse(fs.readFileSync(new URL('../../contracts/artifacts/MonadCityRegistry.json', import.meta.url)));
test('constructor bytes match independently encoded, pinned release', async () => {
  await validateRequest(request, artifact);
  const changed = structuredClone(request);
  changed.transaction.data = changed.transaction.data.slice(0, -2) + '01';
  await assert.rejects(validateRequest(changed, artifact), /constructor differs/);
  const diverted = structuredClone(request);
  diverted.transaction.to = request.transaction.from;
  await assert.rejects(validateRequest(diverted, artifact), /Unexpected transaction fields/);
  const roles = structuredClone(request);
  roles.contract.publisher = '0x' + '22'.repeat(20);
  await assert.rejects(validateRequest(roles, artifact), /Roles do not match/);
});
test('wallet checks reject Mainnet and a different signing account', () => {
  assert.doesNotThrow(() => validateWallet('0x279f', [request.transaction.from], request.transaction.from));
  assert.throws(() => validateWallet('0x1', [request.transaction.from], request.transaction.from), /Monad Testnet/);
  assert.throws(() => validateWallet('0x279f', ['0x' + '33'.repeat(20)], request.transaction.from), /Select wallet/);
});
test('fee guard rejects inadequate balance and unreasonable gas', () => {
  assert.deepEqual(deploymentFee('0x64', '0x2', '0xdc'), { gas: '0x6e', gasPrice: '0x2', maximumFeeWei: '220' });
  assert.throws(() => deploymentFee('0x64', '0x2', '0xdb'), /Insufficient/);
  assert.throws(() => deploymentFee(30000000, 1, 999999999), /gas.*limit/);
});
test('runtime comparison detects an instruction change and inconsistent immutables', async () => {
  const template = artifact.deployedBytecode.object;
  await validateRuntime(template, artifact);
  const code = (index, value) => template.slice(0, 2 + index * 2) + value + template.slice(4 + index * 2);
  await assert.rejects(validateRuntime(code(0, '00'), artifact), /runtime differs/);
  await assert.rejects(validateRuntime(code(1703, '01'), artifact), /Inconsistent/);
});
test('simulation fails before presenting a fee on a wrong RPC chain', async () => {
  await assert.rejects(estimate(request, artifact, async () => '0x1'), /RPC network mismatch/);
});
test('receipt checks distinguish pending from reverted and mismatched transactions', async () => {
  const txHash = '0x' + 'aa'.repeat(32);
  assert.equal(await verifyReceipt(txHash, request, artifact, async method => method === 'eth_chainId' ? '0x279f' : null), null);
  await assert.rejects(verifyReceipt(txHash, request, artifact, async method => method === 'eth_chainId' ? '0x279f' : {
    transactionHash: txHash, status: '0x0',
  }), /reverted/);
  await assert.rejects(verifyReceipt(txHash, request, artifact, async method => method === 'eth_chainId' ? '0x279f' : {
    transactionHash: '0x' + 'bb'.repeat(32), status: '0x1',
  }), /Receipt transaction mismatch/);
});
