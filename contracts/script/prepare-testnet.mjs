#!/usr/bin/env node
// Builds a public, unsigned genesis deployment request. Never signs or broadcasts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const wallet = process.argv[2];
if (!/^0x[0-9a-fA-F]{40}$/.test(wallet || '') || /^0x0+$/.test(wallet)) throw new Error('Provide a nonzero public wallet address.');
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'contracts/artifacts/MonadCityRegistry.json')));
const encoded = spawnSync('cast', ['abi-encode', 'constructor(string,address,uint48,address,address,address,bytes32)',
  'monad-city:registry:main:v1', wallet, '172800', wallet, wallet, `0x${'00'.repeat(20)}`, `0x${'00'.repeat(32)}`], { encoding: 'utf8' });
if (encoded.status !== 0 || encoded.error) throw encoded.error || new Error('Constructor encoding failed.');
const data = artifact.bytecode.object + encoded.stdout.trim().slice(2);
const request = { schemaVersion: 1, status: 'unsigned', network: {
  name: 'Monad Testnet', chainId: 10143, rpcUrl: 'https://testnet-rpc.monad.xyz',
  explorer: 'https://testnet.monadscan.com', faucet: 'https://faucet.monad.xyz',
  source: 'https://docs.monad.xyz/ai/current-facts',
}, contract: { name: 'MonadCityRegistry', namespace: 'monad-city:registry:main:v1',
  admin: wallet, publisher: wallet, revoker: wallet, adminDelaySeconds: 172800,
  predecessor: `0x${'00'.repeat(20)}`, predecessorPublication: `0x${'00'.repeat(32)}`,
  compiler: artifact.compiler, creationCodeSha256: artifact.bytecode.sha256,
}, transaction: { from: wallet, chainId: '0x279f', value: '0x0', data },
  transactionDataSha256: `0x${crypto.createHash('sha256').update(Buffer.from(data.slice(2), 'hex')).digest('hex')}`,
  note: 'Local unsigned request. Fees, balance, nonce and network must be checked immediately before signing. No deployment or publication has happened.',
};
const output = path.join(root, 'tools/registry-deploy/request.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(request, null, 2) + '\n');
console.log(JSON.stringify({ request: output, wallet, chainId: 10143, adminDelaySeconds: 172800,
  transactionDataSha256: request.transactionDataSha256, status: request.status }, null, 2));
