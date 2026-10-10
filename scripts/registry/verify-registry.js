#!/usr/bin/env node

import process from 'node:process';
import { ACTIVE_REGISTRY_SNAPSHOT, readJson, validateRegistrySnapshot, verifyRegistryFiles } from './registry-io.js';
import { reviewedRegistryRelease } from './releases.js';

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Option --${name} requires a value`);
  return value;
}

try {
  const snapshotPath = option('snapshot', `data/evidence-snapshots/${ACTIVE_REGISTRY_SNAPSHOT.version}.json`);
  const registryDirectory = option('registry', `data/registry/${ACTIVE_REGISTRY_SNAPSHOT.version}`);
  const snapshot = readJson(snapshotPath);
  const release = reviewedRegistryRelease(snapshot.value.version);
  await validateRegistrySnapshot(snapshot.value);
  const verified = await verifyRegistryFiles(registryDirectory, snapshot.value);
  if (verified.manifest.snapshot.canonicalSha256 !== release.canonicalSha256) {
    throw new Error('Registry manifest is not bound to the reviewed approved snapshot');
  }
  console.log(JSON.stringify({
    valid: true,
    registry: verified.resolved,
    snapshotVersion: verified.manifest.snapshot.version,
    snapshotSha256: verified.manifest.snapshot.canonicalSha256,
    portableSnapshotId: verified.manifest.snapshot.portableSnapshotId,
    evidence: verified.manifest.commitments.evidence,
    relationship: verified.manifest.commitments.relationship,
    deployment: verified.manifest.deployment.status,
  }, null, 2));
} catch (error) {
  console.error(`Registry verification error: ${error.message}`);
  process.exitCode = 1;
}
