// Separate operator tooling. The public application imports none of this module.
import { encodeWord, hexBytes, wordAddress, wordBool } from '../../src/onchain-rpc.js';

export const CHAIN = 10143;
export const RPC = 'https://testnet-rpc.monad.xyz';
export const NAMESPACE = 'monad-city:registry:main:v1';
export const CREATION_SHA = '0x93bde75678489480bbacd87c39fbf093a9bb8770a160881962fb9c05b00130d1';
export const TEMPLATE_SHA = '0xefc9ddb1fe06d922bdb235001ee6de5cdb42882a10fae7f188b46369b1a04c63';
const ZERO = `0x${'00'.repeat(32)}`;
const ZERO_ADDRESS = `0x${'00'.repeat(20)}`;
// Fixed compiler byte offsets, independent of artifact AST identifiers.
const IMMUTABLE_GROUPS = [[1703, 8720, 11210, 11562], [957, 2003], [3603, 11745], [3517], [3735]];
const fail = (condition, message) => { if (!condition) throw new Error(message); };
export async function hash(bytes) {
  return '0x' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export function constructorArgs(wallet) {
  const namespace = Array.from(new TextEncoder().encode(NAMESPACE), b => b.toString(16).padStart(2, '0')).join('');
  return [encodeWord(224n, 'uint256'), encodeWord(wallet, 'address'), encodeWord(172800n, 'uint256'),
    encodeWord(wallet, 'address'), encodeWord(wallet, 'address'), encodeWord(ZERO_ADDRESS, 'address'), encodeWord(ZERO),
    encodeWord(BigInt(namespace.length / 2), 'uint256'), namespace.padEnd(Math.ceil(namespace.length / 64) * 64, '0')].join('');
}
export async function validateRequest(request, artifact) {
  fail(request.schemaVersion === 1 && request.status === 'unsigned', 'Unsupported deployment request.');
  fail(request.network.chainId === CHAIN && request.network.rpcUrl === RPC, 'Unexpected deployment network.');
  const tx = request.transaction;
  fail(/^0x[0-9a-f]{40}$/i.test(tx.from) && tx.from.toLowerCase() !== ZERO_ADDRESS, 'Invalid deployment wallet.');
  fail(Object.keys(tx).sort().join(',') === 'chainId,data,from,value' && tx.chainId === '0x279f' && tx.value === '0x0', 'Unexpected transaction fields.');
  const roles = request.contract;
  fail(roles.namespace === NAMESPACE && roles.adminDelaySeconds === 172800 && roles.predecessor === ZERO_ADDRESS && roles.predecessorPublication === ZERO, 'Unexpected constructor settings.');
  fail(['admin', 'publisher', 'revoker'].every(role => roles[role]?.toLowerCase() === tx.from.toLowerCase()), 'Roles do not match the deployment wallet.');
  fail(await hash(hexBytes(artifact.bytecode.object)) === CREATION_SHA && roles.creationCodeSha256 === CREATION_SHA, 'Creation bytecode differs from the reviewed release.');
  fail(await hash(hexBytes(artifact.deployedBytecode.object)) === TEMPLATE_SHA, 'Runtime template differs from the reviewed release.');
  fail(tx.data.toLowerCase() === (artifact.bytecode.object + constructorArgs(tx.from)).toLowerCase(), 'Deployment data or constructor differs from the reviewed release.');
  fail(await hash(hexBytes(tx.data)) === request.transactionDataSha256, 'Deployment data hash mismatch.');
  return request;
}
export function validateWallet(chain, accounts, wallet) {
  fail(BigInt(chain) === BigInt(CHAIN), 'Switch your wallet to Monad Testnet (10143).');
  fail(accounts?.[0]?.toLowerCase() === wallet.toLowerCase(), `Select wallet ${wallet}.`);
}
let sequence = 0;
export async function rpc(method, params = []) {
  fail(['eth_chainId', 'eth_getBalance', 'eth_gasPrice', 'eth_estimateGas', 'eth_call', 'eth_getTransactionReceipt',
    'eth_getTransactionByHash', 'eth_getCode', 'eth_getBlockByNumber'].includes(method), 'Operator RPC permits read methods only.');
  const id = ++sequence;
  const response = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), signal: AbortSignal.timeout(20000) });
  fail(response.ok, 'Monad Testnet RPC is unavailable.');
  const body = await response.json();
  fail(body.id === id && !body.error, body.error?.message || 'Invalid RPC response.');
  return body.result;
}
export function mon(value) {
  const wei = BigInt(value);
  return `${wei / 10n ** 18n}.${(wei % 10n ** 18n).toString().padStart(18, '0').slice(0, 6)}`;
}
export function deploymentFee(estimate, gasPrice, balance) {
  const gas = (BigInt(estimate) * 110n + 99n) / 100n;
  fail(gas > 0n && gas <= 30000000n, 'Deployment gas is outside the prepared transaction limit.');
  const price = BigInt(gasPrice);
  fail(price > 0n, 'RPC returned an invalid gas price.');
  fail(BigInt(balance) >= gas * price, 'Insufficient test MON for the estimated fee.');
  return { gas: '0x' + gas.toString(16), gasPrice: '0x' + price.toString(16), maximumFeeWei: (gas * price).toString() };
}
export async function estimate(request, artifact, read = rpc) {
  fail(BigInt(await read('eth_chainId')) === BigInt(CHAIN), 'RPC network mismatch.');
  const tx = { from: request.transaction.from, data: request.transaction.data, value: '0x0' };
  const balance = await read('eth_getBalance', [tx.from, 'latest']);
  const gasPrice = await read('eth_gasPrice');
  const gasEstimate = await read('eth_estimateGas', [tx]);
  const fee = deploymentFee(gasEstimate, gasPrice, balance);
  const runtime = await read('eth_call', [{ ...tx, gas: fee.gas }, 'latest']);
  await validateRuntime(runtime, artifact);
  return { ...fee, balanceWei: BigInt(balance).toString(), estimatedGas: BigInt(gasEstimate).toString(), checkedAt: new Date().toISOString() };
}
export async function validateRuntime(code, artifact) {
  const actual = hexBytes(code);
  const expected = hexBytes(artifact.deployedBytecode.object);
  fail(actual.length === expected.length, 'Deployed runtime size mismatch.');
  for (const starts of IMMUTABLE_GROUPS) {
    const first = code.slice(2 + starts[0] * 2, 2 + (starts[0] + 32) * 2).toLowerCase();
    for (const start of starts) {
      fail(code.slice(2 + start * 2, 2 + (start + 32) * 2).toLowerCase() === first, 'Inconsistent runtime immutable values.');
      actual.fill(0, start, start + 32);
    }
  }
  fail(await hash(actual) === TEMPLATE_SHA, 'Deployed runtime differs from the reviewed release.');
  return hash(hexBytes(code));
}
export async function verifyReceipt(txHash, request, artifact, read = rpc) {
  hexBytes(txHash, 32);
  fail(BigInt(await read('eth_chainId')) === BigInt(CHAIN), 'RPC network mismatch.');
  const receipt = await read('eth_getTransactionReceipt', [txHash]);
  if (!receipt) return null;
  fail(receipt.transactionHash?.toLowerCase() === txHash.toLowerCase(), 'Receipt transaction mismatch.');
  fail(BigInt(receipt.status) === 1n, 'Deployment transaction reverted.');
  const tx = await read('eth_getTransactionByHash', [txHash]);
  fail(tx && tx.to === null && BigInt(tx.value) === 0n && tx.from.toLowerCase() === request.transaction.from.toLowerCase()
    && tx.input.toLowerCase() === request.transaction.data.toLowerCase() && BigInt(tx.chainId) === BigInt(CHAIN), 'Mined transaction does not match the prepared deployment.');
  fail(tx.blockHash === receipt.blockHash && tx.blockNumber === receipt.blockNumber, 'Transaction and receipt blocks differ.');
  const address = receipt.contractAddress;
  hexBytes(address, 20);
  const block = receipt.blockNumber;
  const checkedBlock = await read('eth_getBlockByNumber', [block, false]);
  fail(checkedBlock?.hash === receipt.blockHash, 'Deployment block has changed.');
  const code = await read('eth_getCode', [address, block]);
  const runtimeCodeSha256 = await validateRuntime(code, artifact);
  const call = async (name, args = '') => {
    const selector = artifact.methodIdentifiers[name];
    fail(/^[0-9a-f]{8}$/.test(selector || ''), 'Missing compiled ABI selector.');
    const result = await read('eth_call', [{ to: address, data: '0x' + selector + args }, block]);
    hexBytes(result, 32);
    return result;
  };
  const namespaceId = await hash(new TextEncoder().encode(NAMESPACE));
  const domain = await hash(new TextEncoder().encode('monad-city:registry:deployment-id:v1'));
  const deploymentId = await hash(hexBytes(domain + encodeWord(BigInt(CHAIN), 'uint256') + encodeWord(address, 'address') + namespaceId.slice(2)));
  const values = [namespaceId, deploymentId, '0x' + encodeWord(ZERO_ADDRESS, 'address'), ZERO, ZERO];
  for (const [index, starts] of IMMUTABLE_GROUPS.entries()) {
    for (const start of starts) fail('0x' + code.slice(2 + start * 2, 2 + (start + 32) * 2).toLowerCase() === values[index], 'Runtime immutable binding mismatch.');
  }
  fail(await call('namespaceId()') === namespaceId && await call('deploymentId()') === deploymentId, 'Registry identity mismatch.');
  fail(BigInt(await call('REGISTRY_PROTOCOL_VERSION()')) === 1n, 'Registry protocol mismatch.');
  fail(wordAddress(await call('defaultAdmin()')) === request.contract.admin.toLowerCase()
    && BigInt(await call('defaultAdminDelay()')) === 172800n, 'Administrator settings mismatch.');
  for (const role of ['PUBLISHER_ROLE()', 'REVOCER_ROLE()']) {
    const roleId = await call(role);
    fail(wordBool(await call('hasRole(bytes32,address)', encodeWord(roleId) + encodeWord(request.transaction.from, 'address'))), 'Required wallet role missing.');
  }
  fail(BigInt(await call('lineageDepth()')) === 0n && await call('predecessorPublicationId()') === ZERO
    && wordAddress(await call('predecessorRegistry()')) === ZERO_ADDRESS, 'Genesis lineage mismatch.');
  fail(await call('headPublicationId()') === ZERO && !wordBool(await call('publicationFrozen()'))
    && wordAddress(await call('successorRegistry()')) === ZERO_ADDRESS, 'Expected an empty genesis registry.');
  fail((await read('eth_getBlockByNumber', [block, false]))?.hash === receipt.blockHash, 'Deployment block changed during verification.');
  return { schemaVersion: 1, status: 'deployment-verified-publication-pending', chainId: CHAIN, address,
    transactionHash: txHash, blockNumber: BigInt(block).toString(), blockHash: receipt.blockHash,
    runtimeCodeSha256, namespace: NAMESPACE, namespaceId, deploymentId, roles: request.contract,
    transactionDataSha256: request.transactionDataSha256, checkedAt: new Date().toISOString(), rpcUrl: RPC,
    scope: 'Receipt and code checked at the deployment block through one trusted RPC. No publication, content availability or independent finality check is claimed.' };
}
