// Read-only JSON-RPC/ABI primitives. No wallet connection, signing, or transaction methods.
let nextRequestId = 1;
const HEX_BYTES = /^0x(?:[a-f0-9]{2})*$/i;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][a-f0-9]*)$/i;
const READ_METHODS = new Set(['eth_chainId', 'eth_getCode', 'eth_getBlockByNumber', 'eth_call']);

export function safeRpcUrl(value) {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    || url.username || url.password || url.hash) throw new Error('Invalid registry RPC URL.');
  return url.href;
}

export function decodeQuantity(value) {
  if (typeof value !== 'string' || !HEX_QUANTITY.test(value)) throw new Error('Invalid RPC quantity.');
  return BigInt(value);
}

export function hexBytes(value, expectedBytes = null) {
  if (typeof value !== 'string' || !HEX_BYTES.test(value)
    || (expectedBytes !== null && value.length !== 2 + expectedBytes * 2)) {
    throw new Error('Invalid RPC bytes.');
  }
  return Uint8Array.from(value.slice(2).match(/../g) || [], (byte) => Number.parseInt(byte, 16));
}

export function encodeWord(value, type = 'bytes32') {
  if (type === 'uint256') {
    const number = typeof value === 'bigint' ? value : BigInt(value);
    if (number < 0n || number >= 1n << 256n) throw new Error('Invalid ABI integer.');
    return number.toString(16).padStart(64, '0');
  }
  const size = type === 'address' ? 20 : type === 'bytes32' ? 32 : null;
  if (!size) throw new Error('Unsupported ABI type.');
  hexBytes(value, size);
  return value.slice(2).toLowerCase().padStart(64, '0');
}

export function encodeCall(selector, args = [], proof = null) {
  hexBytes(selector, 4);
  const words = args.map(({ value, type }) => encodeWord(value, type));
  if (proof === null) return selector + words.join('');
  if (!Array.isArray(proof) || proof.length > 64) throw new Error('Invalid Merkle proof length.');
  words.push(encodeWord(BigInt((words.length + 1) * 32), 'uint256'));
  return selector + words.join('') + encodeWord(BigInt(proof.length), 'uint256')
    + proof.map((value) => encodeWord(value)).join('');
}

export function decodeWords(value, expectedWords) {
  hexBytes(value, expectedWords * 32);
  return Array.from({ length: expectedWords }, (_, index) => `0x${value.slice(2 + index * 64, 66 + index * 64).toLowerCase()}`);
}

export function wordAddress(value) {
  hexBytes(value, 32);
  if (!/^0x0{24}/i.test(value)) throw new Error('Non-canonical ABI address.');
  return `0x${value.slice(-40)}`.toLowerCase();
}

export function wordBool(value) {
  hexBytes(value, 32);
  const number = BigInt(value);
  if (number !== 0n && number !== 1n) throw new Error('Non-canonical ABI boolean.');
  return number === 1n;
}

export async function readRpc(url, method, params, { fetchImpl = fetch, signal, timeoutMs = 10000 } = {}) {
  if (!READ_METHODS.has(method)) throw new Error('Registry RPC permits read methods only.');
  const endpoint = safeRpcUrl(url);
  const id = nextRequestId++;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Registry RPC returned HTTP ${response.status}.`);
    const body = await response.text();
    if (body.length > 1024 * 1024) throw new Error('Registry RPC response is too large.');
    const result = JSON.parse(body);
    if (result?.jsonrpc !== '2.0' || result?.id !== id || result.error
      || !Object.hasOwn(result, 'result')) throw new Error('Registry RPC returned an invalid response.');
    return result.result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function readBlock(url, blockTag = 'latest', options = {}) {
  const block = await readRpc(url, 'eth_getBlockByNumber', [blockTag, false], options);
  if (!block || typeof block !== 'object') throw new Error('Registry block is unavailable.');
  decodeQuantity(block.number);
  decodeQuantity(block.timestamp);
  hexBytes(block.hash, 32);
  if (blockTag !== 'latest' && block.number !== blockTag) throw new Error('Registry RPC returned the wrong block.');
  return { number: block.number, hash: block.hash.toLowerCase(), timestamp: block.timestamp };
}
