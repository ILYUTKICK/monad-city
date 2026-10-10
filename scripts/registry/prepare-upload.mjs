#!/usr/bin/env node
// Reproduces the public folder to upload; never uploads or changes canonical data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readJson,verifyRegistryFiles,validateRegistrySnapshot} from './registry-io.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const registry=path.join(root,'data/registry/phase-3.5-v6');
const snapshot=readJson(path.join(root,'data/evidence-snapshots/phase-3.5-v6.json')).value;
await validateRegistrySnapshot(snapshot);
await verifyRegistryFiles(registry,snapshot);
const output=path.join(root,'artifacts/ipfs/phase-3.5-v6');
const relative=['manifest.json','evidence-proofs.json','relationship-proofs.json'];
fs.mkdirSync(path.join(output,'data/evidence-snapshots'),{recursive:true});
for(const name of relative)fs.copyFileSync(path.join(registry,name),path.join(output,name));
fs.copyFileSync(path.join(root,'data/evidence-snapshots/phase-3.5-v6.json'),path.join(output,'data/evidence-snapshots/phase-3.5-v6.json'));
await verifyRegistryFiles(output,snapshot);
console.log(JSON.stringify({folder:output,files:4,evidenceCount:193,relationshipCount:6,uploaded:false,instruction:'Upload this folder as public IPFS content. Do not upload a ZIP.'},null,2));
