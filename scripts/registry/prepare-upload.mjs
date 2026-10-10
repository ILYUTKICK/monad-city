#!/usr/bin/env node
// Reproduces the public folder to upload; never uploads or changes canonical data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readJson,verifyRegistryFiles,validateRegistrySnapshot} from './registry-io.js';
import { reviewedRegistryRelease } from './releases.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const release=reviewedRegistryRelease(process.argv[2] || 'phase-3.5-v7');
const registry=path.join(root,`data/registry/${release.version}`);
const snapshotPath=`data/evidence-snapshots/${release.version}.json`;
const snapshot=readJson(path.join(root,snapshotPath)).value;
await validateRegistrySnapshot(snapshot);
await verifyRegistryFiles(registry,snapshot);
const output=path.join(root,`artifacts/ipfs/${release.version}`);
const relative=['manifest.json','evidence-proofs.json','relationship-proofs.json'];
fs.mkdirSync(path.join(output,'data/evidence-snapshots'),{recursive:true});
for(const name of relative)fs.copyFileSync(path.join(registry,name),path.join(output,name));
fs.copyFileSync(path.join(root,snapshotPath),path.join(output,snapshotPath));
await verifyRegistryFiles(output,snapshot);
console.log(JSON.stringify({folder:output,files:4,evidenceCount:release.evidenceCount,relationshipCount:release.relationshipCount,uploaded:false,instruction:'Upload this folder as public IPFS content. Do not upload a ZIP.'},null,2));
