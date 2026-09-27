#!/usr/bin/env node
// Identity analysis for the seven batch-3 flags (build-time research, run once per pass).
//
// For each excluded brand-level group, assembles the evidence an owner needs to decide
// alias-merge vs separate-manifest: the pinned-registry entry, the explorer verification
// facts from the resolution artifact, and the existing city manifest it family-matches.
// The analysis RECOMMENDS nothing binding — `decision` stays null for the owner.
//
// Output: data/research/batch-3-identity-analysis-<UTC-date>.json (exclusive creation).

import fs from 'node:fs';
import path from 'node:path';

const norm = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

function latestArtifact(prefix) {
  const files = fs
    .readdirSync('data/research')
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) throw new Error(`no artifact ${prefix}-<date>.json`);
  return path.join('data', 'research', files[files.length - 1]);
}

function main() {
  const plan = JSON.parse(fs.readFileSync(latestArtifact('batch-3-review-plan'), 'utf8'));
  const selection = JSON.parse(fs.readFileSync(latestArtifact('batch-3-selection'), 'utf8'));
  const resolution = JSON.parse(fs.readFileSync(latestArtifact('pending-deployments'), 'utf8'));
  const mainSrc = fs.readFileSync('src/main.js', 'utf8');
  const cityBlock = mainSrc.slice(mainSrc.indexOf('const projects = ['), mainSrc.indexOf('\n];'));
  const city = [...cityBlock.matchAll(/id: '([^']+)',\n\s+name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));

  const resolutionByProposal = new Map(resolution.projects.map((p) => [p.proposedId, p]));
  const cityById = new Map(city.map((entry) => [entry.id, entry]));

  const cases = plan.identityFlags.map((flag) => {
    const resolutionRow = resolutionByProposal.get(flag.proposedId);
    const explorer = (resolutionRow?.explorer ?? []).filter((check) => check.hasCode);
    const verifiedNames = [...new Set(explorer.map((check) => check.contractName).filter(Boolean))];
    const family = city.filter(
      (entry) => {
        const candidate = norm(flag.proposedId);
        const existingId = norm(entry.id);
        const existingName = norm(entry.name);
        return candidate.length >= 3 && (existingId.startsWith(candidate) || candidate.startsWith(existingId) || existingName.startsWith(candidate) || candidate.startsWith(existingName));
      },
    );
    return {
      proposedId: flag.proposedId,
      canonicalName: flag.canonicalName,
      registryKey: flag.registryKey,
      registryFacts: resolutionRow?.registry ?? null,
      exclusionReasons: flag.reasons,
      explorerFacts: {
        addressesChecked: (resolutionRow?.explorer ?? []).length,
        liveContracts: explorer.length,
        verifiedContractNames: verifiedNames,
      },
      existingCityManifests: family.map((entry) => ({
        id: entry.id,
        name: entry.name,
      })),
      recommendation: null,
      decision: null,
      decisionOwner: 'owner',
    };
  });

  const generatedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = generatedAtUtc.slice(0, 10);
  const outPath = path.resolve(`data/research/batch-3-identity-analysis-${dateStamp}.json`);
  if (fs.existsSync(outPath)) throw new Error(`refusing to overwrite ${outPath}`);

  const artifact = {
    kind: 'monad-city-research-batch-3-identity-analysis',
    schemaVersion: '1',
    generatedAtUtc,
    question: 'For each of the seven excluded brand-level groups: is it the same entity as an existing city manifest (merge as alias) or a distinct project (separate manifest)?',
    method: 'Local analysis of the pinned-registry resolution facts, explorer verification results, and the wired city manifests. No network calls. Decisions belong to the owner; merging changes manifests and requires successor evidence records.',
    cases,
    note: 'Analysis artifact only. Nothing is merged, renamed, or excluded here; the batch-3 exclusions stand until the owner decides per case.',
  };

  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Identity analysis written: ${outPath} (${artifact.cases.length} cases)`);
  for (const c of artifact.cases) {
    console.log(`- ${c.canonicalName} (${c.proposedId}, key ${c.registryKey}) -> existing: ${c.existingCityManifests.map((m) => m.id).join(', ') || 'n/a'} | live contracts: ${c.explorerFacts.liveContracts} | verified names: ${c.explorerFacts.verifiedContractNames.join(', ') || 'none'}`);
  }
}

main();
