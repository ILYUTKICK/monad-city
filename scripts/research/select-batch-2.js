#!/usr/bin/env node
// Phase 5.2 Batch 2 composition (build-time only, deterministic).
//
// Selects the next intake wave for the city: every draft that passes the §3 bar but was not
// already promoted in Batch 1 — the manifest-only drafts (DefiLlama-registry evidence
// candidates) plus the five full drafts deferred from Batch 1 (App Portal evidence
// candidates). No TVL cap applies: scale plan §5.2 targets 100+ total projects, and every
// selected draft already passes the inclusion bar. The artifact records the selection for
// review; nothing here approves or promotes anything.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RESEARCH_DIR = path.join('data', 'research');

function utcDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function canonicalJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function latestArtifact(prefix) {
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) throw new Error(`No artifact ${prefix}-<date>.json found in ${RESEARCH_DIR}/`);
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function main() {
  const draftPath = latestArtifact('proposals-draft');
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  if (draft.kind !== 'monad-city-ecosystem-intake-draft') throw new Error(`${draftPath} is not an intake draft`);

  const alreadyLive = new Set([
    // Batch 1 (snapshot phase-3.5-v3)
    'aave-v3', 'pancakeswap', 'uniswap', 'curve', 'pendle', 'upshift', 'euler', 'lagoon',
    'curvance', 'renzo', 'beefy', 'yuzu-money', 'balancer', 'spectra', 'mento', 'symbiosis',
    'neverland', 'ample', 'perpl', 'woofi', 'leverup', 'kintsu', 'levr-bet', 'sumer-money',
    'monday-trade', 'capricorn', 'nad-fun', 'drake', 'kizzy', 'nabla-finance',
    // Existing city entities (never re-proposed by intake)
    'monad', 'kuru', 'aPriori', 'magma', 'switchboard', 'pyth',
  ]);

  const manifestOnly = draft.proposals.filter((proposal) => proposal.status === 'draft-manifest-only');
  const deferredBatch1 = draft.proposals.filter(
    (proposal) => proposal.status === 'draft' && !alreadyLive.has(proposal.proposalId),
  );

  if (manifestOnly.length === 0) throw new Error('No manifest-only drafts found; rerun the intake first');
  if (deferredBatch1.length === 0) throw new Error('No deferred Batch 1 drafts found');

  const selected = [...deferredBatch1, ...manifestOnly].map((proposal) => {
    const candidate = proposal.evidenceCandidates[0];
    if (!candidate) throw new Error(`Proposal ${proposal.proposalId} carries no evidence candidate`);
    return {
      proposalId: proposal.proposalId,
      name: proposal.manifest.name,
      district: proposal.manifest.district,
      evidenceCandidateId: candidate.id,
      evidenceKind: candidate.id.endsWith('-REG-001') ? 'defillama-registry' : 'app-portal',
    };
  });

  const artifact = {
    kind: 'monad-city-batch-2-selection',
    schemaVersion: '1',
    generatedAtUtc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    inputs: { draft: path.relative(process.cwd(), draftPath) },
    rule:
      'All intake drafts passing the §3 bar that were not promoted in Batch 1: manifest-only drafts (DefiLlama registry candidates) plus the five full drafts deferred from Batch 1 (App Portal candidates).',
    counts: {
      manifestOnly: manifestOnly.length,
      deferredBatch1: deferredBatch1.length,
      selected: selected.length,
      projectedCityTotal: 36 + selected.length,
    },
    selected,
  };

  const outPath = path.join(RESEARCH_DIR, `batch-2-selection-${utcDateStamp()}.json`);
  if (fs.existsSync(outPath)) throw new Error(`Refusing to overwrite existing file: ${outPath}`);
  fs.writeFileSync(outPath, canonicalJson(artifact));
  console.log(
    `Batch 2 selection: ${selected.length} drafts ` +
      `(${manifestOnly.length} manifest-only + ${deferredBatch1.length} deferred Batch 1). ` +
      `Projected city total: ${artifact.counts.projectedCityTotal}. Wrote ${outPath}`,
  );
}

try {
  main();
} catch (error) {
  console.error(`select-batch-2: ${error.message}`);
  process.exitCode = 1;
}
