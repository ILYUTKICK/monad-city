#!/usr/bin/env node
// Phase 5.2 archipelago layout composer (build-time only, deterministic, run once per layout).
//
// Rewrites ONLY the x/y coordinates of the project entries in src/main.js so that each district
// forms its own island and the Monad spire keeps a small central islet:
//   - Monad stays at (0, 0);
//   - the five district clusters sit on a ring (radius 520 project units = 52 world units);
//   - buildings spiral out from each island center; the island terrain itself is derived in
//     city3d.js from the resulting clusters (data-driven, per docs/WORKLOG Phase 5.1→5.2).
//
// Coordinates are illustrative layout: ring angles and spiral order encode no ranking.
// All other project fields are untouched.

import fs from 'node:fs';

const MAIN = 'src/main.js';
const RING_RADIUS = 560; // project units between the world origin and each island center
const DISTRICT_ANGLES = {
  DeFi: (45 * Math.PI) / 180,
  Infrastructure: (117 * Math.PI) / 180,
  Gaming: (189 * Math.PI) / 180,
  AI: (261 * Math.PI) / 180,
  Identity: (333 * Math.PI) / 180,
};
const SPIRAL_GAP = { default: 74, DeFi: 76 }; // min center-to-center distance, project units
const MIN_CROSS_ISLAND = 150; // buildings of different islands never come closer than this

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
  const slice = src.slice(start, end);

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
  console.log(`Archipelago layout written: ${ids.length} projects (${islandSummary})`);
}

main();
