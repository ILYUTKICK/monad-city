#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { buildRegistryArtifacts, readJson, writeNewRegistryDirectory } from './registry-io.js';

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Option --${name} requires a value`);
  return value;
}

try {
  const snapshotPath = option('snapshot', 'data/evidence-snapshots/phase-3.5-v7.json');
  const outputDirectory = option('out', 'data/registry/phase-3.5-v7');
  const snapshot = readJson(snapshotPath);
  const sourcePath = path.relative(process.cwd(), snapshot.resolved).split(path.sep).join('/');
  const artifacts = await buildRegistryArtifacts(snapshot.value, sourcePath);
  const resolved = writeNewRegistryDirectory(outputDirectory, artifacts);
  console.log(JSON.stringify({
    exported: resolved,
    snapshotVersion: artifacts.manifest.snapshot.version,
    snapshotSha256: artifacts.manifest.snapshot.canonicalSha256,
    portableSnapshotId: artifacts.manifest.snapshot.portableSnapshotId,
    evidence: artifacts.manifest.commitments.evidence,
    relationship: artifacts.manifest.commitments.relationship,
    deployment: artifacts.manifest.deployment.status,
  }, null, 2));
} catch (error) {
  console.error(`Registry export error: ${error.message}`);
  process.exitCode = 1;
}
