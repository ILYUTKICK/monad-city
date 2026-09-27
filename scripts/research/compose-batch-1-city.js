#!/usr/bin/env node
// Phase 5.1 Batch 1 city-entry composer (build-time only, deterministic).
//
// Reads the batch-1 selection and the reviewed intake draft and emits the 30 `projects`
// entries for src/main.js as a JS literal. Placement is illustrative layout only:
// - height is uniform (every batch-1 project carries exactly one approved record; variation
//   would imply an evidence signal that does not exist);
// - coordinates come from a pure-math spiral around the district anchor, rejecting cells that
//   leave the island or crowd existing/new buildings;
// - ordering and coordinates never encode TVL, activity, or ranking.
//
// Output goes to stdout; paste the block into src/main.js after the last existing entry.

import fs from 'node:fs';
import path from 'node:path';

const RESEARCH_DIR = path.join('data', 'research');
const HEIGHT = 50;

const DISTRICT_ANCHORS = {
  DeFi: { x: -200, y: 120 },
  Infrastructure: { x: 45, y: -105 },
  Gaming: { x: 140, y: 205 },
  AI: { x: 215, y: 60 },
  Identity: { x: 150, y: -230 },
};

const DISTRICT_COLORS = {
  DeFi: '#93d6c6',
  AI: '#91baff',
  Infrastructure: '#a58aff',
  Gaming: '#e9b07c',
  Identity: '#e5a5cd',
};

// Island geometry mirrored from src/city3d.js (SCALE 0.1).
const SCALE = 0.1;
const roundedMetric = (x, z) => Math.abs(x) + 0.35 * Math.min(Math.abs(x), Math.abs(z));

function latestArtifact(prefix) {
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) throw new Error(`No artifact ${prefix}-<date>.json in ${RESEARCH_DIR}/`);
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function hostnameOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function spiralCells(anchor, count, existing) {
  const accepted = [];
  const minGap = 40;
  for (let ring = 0; ring <= 6 && accepted.length < count; ring += 1) {
    const radius = ring * 46;
    const steps = ring === 0 ? 1 : Math.max(6, Math.round((2 * Math.PI * radius) / 46));
    for (let step = 0; step < steps && accepted.length < count; step += 1) {
      const angle = (step / steps) * 2 * Math.PI + ring * 0.35;
      const x = Math.round(anchor.x + Math.cos(angle) * radius);
      const y = Math.round(anchor.y + Math.sin(angle) * radius);
      const islandX = x * SCALE;
      const islandZ = y * SCALE;
      if (roundedMetric(islandX, islandZ) > 27.5) continue;
      const tooCloseToExisting = existing.some(
        (project) => Math.hypot(project.x - x, project.y - y) < 55,
      );
      if (tooCloseToExisting) continue;
      const tooCloseToAccepted = accepted.some((cell) => Math.hypot(cell.x - x, cell.y - y) < minGap);
      if (tooCloseToAccepted) continue;
      accepted.push({ x, y });
    }
  }
  if (accepted.length < count) {
    throw new Error(`Placement ran out of island space for anchor ${JSON.stringify(anchor)}: ${accepted.length}/${count}`);
  }
  return accepted;
}

function main() {
  const selection = JSON.parse(fs.readFileSync(latestArtifact('batch-1-selection'), 'utf8'));
  const draft = JSON.parse(fs.readFileSync(latestArtifact('proposals-draft'), 'utf8'));
  const proposalById = new Map(draft.proposals.map((proposal) => [proposal.proposalId, proposal]));

  const existing = [
    ['monad', 0, 0], ['kuru', -170, 0], ['aPriori', -175, 105], ['magma', -80, 150],
    ['switchboard', 95, -100], ['pyth', -15, -160], ['talus', 185, 0], ['nad-arcade', 70, 170],
    ['pixel-forge', 190, 125], ['moca', 110, -210],
  ].map(([id, x, y]) => ({ id, x, y }));

  const perDistrict = {};
  selection.selected.forEach((item) => {
    const proposal = proposalById.get(item.proposalId);
    const district = proposal.manifest.district;
    if (!district) throw new Error(`${item.proposalId} has no district assigned`);
    (perDistrict[district] ??= []).push(proposal);
  });

  const cellsByDistrict = {};
  Object.entries(perDistrict).forEach(([district, proposals]) => {
    const anchor = DISTRICT_ANCHORS[district];
    if (!anchor) throw new Error(`No anchor for district ${district}`);
    cellsByDistrict[district] = spiralCells(anchor, proposals.length, existing);
  });

  const lines = [];
  Object.entries(perDistrict).forEach(([district, proposals]) => {
    proposals.forEach((proposal, index) => {
      const { x, y } = cellsByDistrict[district][index];
      const name = proposal.manifest.name;
      const abbr = name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').charAt(0).toUpperCase() || '•';
      const site = hostnameOf(proposal.manifest.site);
      const category = proposal.manifest.applicationType ?? 'ecosystem project';
      const description = proposal.manifest.description.replace(/'/g, '’');
      lines.push(`  {
    id: '${proposal.manifest.id}',
    name: '${name.replace(/'/g, '’')}',
    abbr: '${abbr}',
    district: '${district}',
    tag: 'Listed under ‘${category}’.',
    description:
      '${description}',
    x: ${x},
    y: ${y},
    h: ${HEIGHT},
    color: '${DISTRICT_COLORS[district]}',
    state: 'Observed',
    type: '${category.replace(/'/g, '’')}',
    site: ${site ? `'${site}'` : 'null'},
  },`);
    });
  });
  console.log(lines.join('\n'));
}

main();
