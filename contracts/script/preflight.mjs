#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = path.resolve(packageDirectory, '..');
const deploymentMode = process.argv.includes('--deployment');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: packageDirectory, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

function commandOutput(command, args) {
  const result = spawnSync(command, args, { cwd: packageDirectory, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw result.error || new Error(`${command} failed`);
  return result.stdout;
}

function foundryVersion() {
  const output = commandOutput('forge', ['--version']);
  const match = output.match(/forge Version: (\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error('Cannot parse forge version.');
  return match.slice(1).map(Number);
}

function atLeast(actual, expected) {
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) return actual[index] > expected[index];
  }
  return true;
}

const openZeppelinPackage = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, 'node_modules/@openzeppelin/contracts/package.json'), 'utf8'),
);
if (openZeppelinPackage.version !== '5.7.0') throw new Error('OpenZeppelin Contracts must resolve exactly to 5.7.0.');

const manifest = JSON.parse(
  fs.readFileSync(path.join(repositoryDirectory, 'data/registry/phase-3.5-v6/manifest.json'), 'utf8'),
);
if (manifest.deployment?.status !== 'unconfigured') throw new Error('The source registry bundle must remain unconfigured.');
for (const [key, value] of Object.entries(manifest.deployment)) {
  if (key !== 'status' && value !== null) throw new Error(`Source manifest deployment.${key} must remain null.`);
}

const currentFoundry = foundryVersion();
const requiredFoundry = [1, 8, 0];
if (!atLeast(currentFoundry, requiredFoundry)) {
  const message = `Foundry ${currentFoundry.join('.')} is below the deployment minimum ${requiredFoundry.join('.')}.`;
  if (deploymentMode) throw new Error(message);
  console.warn(`WARNING: ${message} Local verification will continue.`);
}

run('forge', ['fmt', '--check']);
run('forge', ['build']);
run('forge', deploymentMode ? ['test', '--network', 'monad'] : ['test']);
run(process.execPath, ['script/export-artifacts.mjs', '--check']);
run(process.execPath, ['script/e2e-client.mjs']);

console.log(deploymentMode ? 'Deployment preflight passed.' : 'Local contract preflight passed.');
