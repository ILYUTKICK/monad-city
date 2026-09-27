#!/usr/bin/env node
// Phase 5.1 Batch 1 composition (build-time only, deterministic).
//
// Takes the reviewed intake draft (proposals-draft-<date>.json, full drafts only) and ranks
// the new projects by DefiLlama TVL (scale plan §5.1: "top 30 by activity/TVL + official-
// directory presence"). The ranking is a batch-composition input ONLY: TVL never reaches
// manifests, placement, size, order, or any city visual.
//
// Writes a dated selection artifact into data/research/ documenting the ordered batch and the
// deferred remainder. Nothing here approves or promotes anything.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RESEARCH_DIR = path.join('data', 'research');
const BATCH_SIZE = 30;

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
  if (files.length === 0) {
    throw new Error(`No artifact ${prefix}-<date>.json found in ${RESEARCH_DIR}/`);
  }
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function main() {
  const draftPath = latestArtifact('proposals-draft');
  const defillamaPath = latestArtifact('defillama-monad');
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  const defillama = JSON.parse(fs.readFileSync(defillamaPath, 'utf8'));
  if (draft.kind !== 'monad-city-ecosystem-intake-draft') {
    throw new Error(`${draftPath} is not an intake draft`);
  }
  if (defillama.kind !== 'monad-city-research-seed') {
    throw new Error(`${defillamaPath} is not a research seed`);
  }

  const tvlBySlug = new Map(
    defillama.protocols
      .filter((protocol) => protocol.slug && typeof protocol.tvl === 'number')
      .map((protocol) => [protocol.slug, protocol.tvl]),
  );

  const fullDrafts = draft.proposals.filter((proposal) => proposal.status === 'draft');
  const ranked = fullDrafts
    .map((proposal) => {
      const slugs = proposal.manifest.sourceBases.defillama;
      const tvls = slugs.map((slug) => tvlBySlug.get(slug)).filter((tvl) => tvl !== undefined);
      const tvl = tvls.length > 0 ? Math.max(...tvls) : null;
      return {
        proposalId: proposal.proposalId,
        name: proposal.manifest.name,
        district: proposal.manifest.district,
        evidenceCandidateId: proposal.evidenceCandidates[0]?.id ?? null,
        defillamaSlugs: slugs,
        tvlUsd: tvl,
      };
    })
    .sort((left, right) => {
      if (left.tvlUsd === null && right.tvlUsd === null) return left.name.localeCompare(right.name);
      if (left.tvlUsd === null) return 1;
      if (right.tvlUsd === null) return -1;
      return right.tvlUsd - left.tvlUsd || left.name.localeCompare(right.name);
    });

  if (ranked.length < BATCH_SIZE) {
    throw new Error(`Only ${ranked.length} full drafts available; Batch 1 needs ${BATCH_SIZE}`);
  }

  const selected = ranked.slice(0, BATCH_SIZE);
  const deferred = ranked.slice(BATCH_SIZE);

  const artifact = {
    kind: 'monad-city-batch-1-selection',
    schemaVersion: '1',
    generatedAtUtc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    inputs: {
      draft: path.relative(process.cwd(), draftPath),
      defillama: path.relative(process.cwd(), defillamaPath),
    },
    rule: 'Top 30 full intake drafts by DefiLlama TVL (max across the project\'s DefiLlama slugs), ties by name. Batch-composition signal only — TVL is not rendered, ranked, or implied in the city.',
    batchSize: BATCH_SIZE,
    counts: { fullDrafts: fullDrafts.length, selected: selected.length, deferred: deferred.length },
    selected,
    deferred,
  };

  const outPath = path.join(RESEARCH_DIR, `batch-1-selection-${utcDateStamp()}.json`);
  if (fs.existsSync(outPath)) {
    throw new Error(`Refusing to overwrite existing file: ${outPath}`);
  }
  fs.writeFileSync(outPath, canonicalJson(artifact));
  console.log(
    `Batch 1 selection: ${selected.length} of ${fullDrafts.length} full drafts by TVL ` +
      `(deferred ${deferred.length}). Wrote ${outPath}`,
  );
  console.log(selected.map((item, index) => `${index + 1}. ${item.name} (${item.tvlUsd === null ? 'no TVL' : Math.round(item.tvlUsd).toLocaleString('en-US') + ' USD'})`).join('\n'));
}

try {
  main();
} catch (error) {
  console.error(`select-batch-1: ${error.message}`);
  process.exitCode = 1;
}
