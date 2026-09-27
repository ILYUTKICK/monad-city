#!/usr/bin/env node
// Phase 5.2 archipelago layout composer (build-time only, deterministic, run once per layout).
//
// Keeps src/main.js `projects` in sync with the archipelago layout:
//   - inserts city entries for selected intake projects that are not wired yet (Batch 2+),
//     generated from the reviewed intake draft manifests;
//   - rewrites the x/y coordinates of every entry so that each district forms its own island
//     and the Monad spire keeps a small central islet (Monad at (0, 0), district clusters on a
//     ring, buildings spiraling out per island). The island terrain itself is derived in
//     city3d.js from the resulting clusters (data-driven, per docs/WORKLOG Phase 5.1→5.2).
//
// Coordinates are illustrative layout: ring angles and spiral order encode no ranking.
// Other project fields of already-wired entries are untouched.

import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'src/main.js';
const RESEARCH_DIR = path.join('data', 'research');
const RING_RADIUS = 780; // project units between the world origin and each island center
// (660 → 780 at Batch 3: the DeFi island grew to 142 buildings; cross-island clearance
//  is asserted below and the larger ring keeps DeFi/Infrastructure/Gaming separated.)
const DISTRICT_ANGLES = {
  DeFi: (45 * Math.PI) / 180,
  Infrastructure: (117 * Math.PI) / 180,
  Gaming: (189 * Math.PI) / 180,
  AI: (261 * Math.PI) / 180,
  Identity: (333 * Math.PI) / 180,
};
const SPIRAL_GAP = { default: 74, DeFi: 76 }; // min center-to-center distance, project units
const MIN_CROSS_ISLAND = 150; // buildings of different islands never come closer than this
const DISTRICT_COLORS = {
  DeFi: '#93d6c6',
  AI: '#91baff',
  Infrastructure: '#a58aff',
  Gaming: '#e9b07c',
  Identity: '#e5a5cd',
};

function latestSeed(prefix) {
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  return path.join(RESEARCH_DIR, files[files.length - 1]);
}

function readOptionalSelection() {
  const file = latestSeed('batch-2-selection');
  if (!file) return null;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  return value.kind === 'monad-city-batch-2-selection' ? value : null;
}

function readMergedAwayIds() {
  const file = latestSeed('identity-merge-review-plan');
  if (!file) return new Set();
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  return value.kind === 'monad-city-identity-merge-review-plan' ? new Set(value.removedManifestIds ?? []) : new Set();
}

function readOptionalBatch3Selection() {
  const file = latestSeed('batch-3-selection');
  if (!file) return null;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  return value.kind === 'monad-city-batch-3-selection' ? value : null;
}

function hostnameOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function spiralCells(count, gap) {
  const cells = [];
  for (let ring = 0; cells.length < count; ring += 1) {
    const radius = ring * gap;
    const steps = ring === 0 ? 1 : Math.max(6, Math.round((2 * Math.PI * radius) / gap));
    for (let step = 0; step < steps && cells.length < count; step += 1) {
      const angle = (step / steps) * 2 * Math.PI + ring * 0.55;
      cells.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
  }
  return cells;
}

function main() {
  const src = fs.readFileSync(MAIN, 'utf8');
  const start = src.indexOf('const projects = [');
  const end = src.indexOf('\n];', start);
  if (start === -1 || end === -1) throw new Error('projects array not found in src/main.js');
  let slice = src.slice(start, end);

  // Insert city entries for selected intake projects that are not wired yet (Batch 2+).
  const existingIds = [...slice.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
  const selection = readOptionalSelection();
  const draftFile = latestSeed('proposals-draft');
  const draft = selection && draftFile ? JSON.parse(fs.readFileSync(draftFile, 'utf8')) : null;
  const proposalById = draft ? new Map(draft.proposals.map((proposal) => [proposal.proposalId, proposal])) : null;
  const newBlocks = [];
  const mergedAway = readMergedAwayIds();
  if (selection && proposalById) {
    selection.selected.forEach((item) => {
      if (existingIds.includes(item.proposalId) || mergedAway.has(item.proposalId)) return;
      const proposal = proposalById.get(item.proposalId);
      if (!proposal) throw new Error(`Selected proposal ${item.proposalId} missing from draft`);
      const manifest = proposal.manifest;
      const category = manifest.applicationType ?? 'ecosystem project';
      const abbr = manifest.name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').charAt(0).toUpperCase() || '•';
      const site = hostnameOf(manifest.site);
      newBlocks.push(`  {
    id: '${manifest.id}',
    name: '${manifest.name.replace(/'/g, '’')}',
    abbr: '${abbr}',
    district: '${manifest.district}',
    tag: 'Listed under ‘${category}’.',
    description:
      '${manifest.description.replace(/'/g, '’')}',
    x: 0,
    y: 0,
    h: 50,
    color: '${DISTRICT_COLORS[manifest.district] ?? '#93d6c6'}',
    state: 'Observed',
    type: '${category.replace(/'/g, '’')}',
    site: ${site ? `'${site}'` : 'null'},
  },`);
    });
  }
  if (newBlocks.length > 0) {
    // The slice ends right before "\n];" — the last existing entry already carries its comma,
    // so the new blocks append directly at the end of the array body.
    slice = `${slice}\n${newBlocks.join('\n')}`;
  }

  // Batch 3: the selection artifact carries full manifests (pending groups never entered the
  // intake draft). Insert entries for not-yet-wired items the same way.
  const batch3 = readOptionalBatch3Selection();
  if (batch3) {
    const wiredIds = [...slice.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
    const batch3Blocks = [];
    batch3.selected.forEach((item) => {
      if (wiredIds.includes(item.manifest.id)) return;
      const manifest = item.manifest;
      const category = manifest.applicationType ?? 'Ecosystem project';
      const abbr = manifest.name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').charAt(0).toUpperCase() || '•';
      const site = hostnameOf(manifest.site);
      const description = String(manifest.description).replace(/`/g, '').replace(/'/g, '’');
      batch3Blocks.push(`  {
    id: '${manifest.id}',
    name: '${manifest.name.replace(/'/g, '’')}',
    abbr: '${abbr}',
    district: '${manifest.district}',
    tag: 'Listed under ‘${category.replace(/'/g, '’')}’.',
    description:
      '${description}',
    x: 0,
    y: 0,
    h: 50,
    color: '${DISTRICT_COLORS[manifest.district] ?? '#93d6c6'}',
    state: 'Observed',
    type: '${category.replace(/'/g, '’')}',
    site: ${site ? `'${site}'` : 'null'},
  },`);
    });
    if (batch3Blocks.length > 0) {
      slice = `${slice}\n${batch3Blocks.join('\n')}`;
    }
  }

  const ids = [...slice.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
  const districts = [...slice.matchAll(/district: '([^']+)'/g)].map((match) => match[1]);
  if (ids.length !== districts.length) throw new Error('id/district count mismatch in projects array');

  // Group per island and assign local spiral cells.
  const byIsland = new Map();
  ids.forEach((id, index) => {
    const island = id === 'monad' ? '__monad' : districts[index];
    if (!byIsland.has(island)) byIsland.set(island, []);
    byIsland.get(island).push(id);
  });

  const placement = new Map();
  byIsland.forEach((list, island) => {
    if (island === '__monad') {
      placement.set('monad', { x: 0, y: 0 });
      return;
    }
    const angle = DISTRICT_ANGLES[island];
    if (angle === undefined) throw new Error(`No ring angle for district ${island}`);
    const centerX = Math.round(Math.cos(angle) * RING_RADIUS);
    const centerY = Math.round(Math.sin(angle) * RING_RADIUS);
    const gap = SPIRAL_GAP[island] ?? SPIRAL_GAP.default;
    spiralCells(list.length, gap).forEach((cell, index) => {
      placement.set(list[index], {
        x: Math.round(centerX + cell.x),
        y: Math.round(centerY + cell.y),
      });
    });
  });

  // Sanity: every project placed exactly once; cross-island clearance respected.
  if (placement.size !== ids.length) throw new Error('placement count mismatch');
  const points = ids.map((id) => ({ id, ...placement.get(id) }));
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const sameIsland =
        (a.id === 'monad' ? '__monad' : districts[i]) ===
        (b.id === 'monad' ? '__monad' : districts[j]);
      const limit = sameIsland ? (SPIRAL_GAP[districts[i]] ?? SPIRAL_GAP.default) * 0.85 : MIN_CROSS_ISLAND;
      if (dist < limit) {
        throw new Error(`Buildings too close: ${a.id} and ${b.id} at ${Math.round(dist)} (limit ${limit})`);
      }
    }
  }

  // Rewrite the x/y pairs of the projects slice in order.
  let offset = 0;
  const rewritten = slice.replace(/x: -?\d+,\n    y: -?\d+,/g, () => {
    const point = placement.get(ids[offset]);
    offset += 1;
    return `x: ${point.x},\n    y: ${point.y},`;
  });
  if (offset !== ids.length) throw new Error(`rewrote ${offset} of ${ids.length} coordinate pairs`);

  fs.writeFileSync(MAIN, src.slice(0, start) + rewritten + src.slice(end));
  const islandSummary = [...byIsland.entries()]
    .map(([island, list]) => `${island}:${list.length}`)
    .join(', ');
  console.log(
    `Archipelago layout written: ${ids.length} projects (${islandSummary})` +
      (newBlocks.length ? `, ${newBlocks.length} new entries inserted` : ''),
  );
}

main();
