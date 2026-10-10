#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceArtifactPath = path.join(packageDirectory, 'out/MonadCityRegistry.sol/MonadCityRegistry.json');
const outputDirectory = path.join(packageDirectory, 'artifacts');
const compiledOutputPath = path.join(outputDirectory, 'MonadCityRegistry.json');
const selectorsOutputPath = path.join(outputDirectory, 'ABI_SELECTORS.md');
const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : null;

if (!mode) throw new Error('Use --write to update committed artifacts or --check to verify them.');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hashBytecode(value) {
  const hex = typeof value === 'string' ? value.replace(/^0x/, '') : '';
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Compiler artifact contains invalid bytecode.');
  }
  return `0x${crypto.createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex')}`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const source = readJson(sourceArtifactPath);
const openZeppelin = readJson(path.join(packageDirectory, 'node_modules/@openzeppelin/contracts/package.json'));
const selectors = Object.fromEntries(Object.entries(source.methodIdentifiers).sort(([a], [b]) => a.localeCompare(b)));
const compiled = {
  schemaVersion: 1,
  contractName: 'MonadCityRegistry',
  sourceName: 'src/MonadCityRegistry.sol',
  compiler: {
    version: source.metadata.compiler.version,
    evmVersion: source.metadata.settings.evmVersion,
    optimizer: source.metadata.settings.optimizer,
    viaIR: source.metadata.settings.viaIR,
    bytecodeHash: source.metadata.settings.metadata.bytecodeHash,
    appendCBOR: source.metadata.settings.metadata.appendCBOR,
    openZeppelinContracts: openZeppelin.version,
  },
  abi: source.abi,
  methodIdentifiers: selectors,
  bytecode: {
    object: `0x${source.bytecode.object.replace(/^0x/, '')}`,
    sha256: hashBytecode(source.bytecode.object),
  },
  deployedBytecode: {
    object: `0x${source.deployedBytecode.object.replace(/^0x/, '')}`,
    templateSha256: hashBytecode(source.deployedBytecode.object),
    immutableReferences: source.deployedBytecode.immutableReferences,
    note: 'This compiler template contains immutable placeholders. Pin SHA-256 of eth_getCode for each real deployment.',
  },
};

const selectorRows = Object.entries(selectors).map(([signature, selector]) => `| \`0x${selector}\` | \`${signature}\` |`);
const selectorsMarkdown = `# MonadCityRegistry ABI selectors

Generated from the Solidity compiler artifact by \`npm run artifacts\`. Do not hand edit.

| Selector | Signature |
|---|---|
${selectorRows.join('\n')}
`;

const outputs = new Map([
  [compiledOutputPath, stableJson(compiled)],
  [selectorsOutputPath, selectorsMarkdown],
]);

if (mode === 'write') {
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const [filePath, content] of outputs) fs.writeFileSync(filePath, content);
  console.log(`Exported ${outputs.size} compiler-derived artifacts to ${outputDirectory}`);
} else {
  for (const [filePath, expected] of outputs) {
    const actual = fs.readFileSync(filePath, 'utf8');
    if (actual !== expected) throw new Error(`${path.relative(packageDirectory, filePath)} is stale; run npm run artifacts`);
  }
  console.log(`Verified ${outputs.size} compiler-derived artifacts.`);
}
