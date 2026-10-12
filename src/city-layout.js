// Deterministic, presentation-only city layout.
//
// Groups each district's projects into quarters using the existing classifier
// (districtClusterList in src/districts.js) and lays every group on a stable grid with
// streets between quarters. The map never derives facts from this geometry: quarter
// membership is navigation, not evidence, and no project moves at runtime — the layout is
// computed once from the loaded dataset and reused by the City (three.js) and Graph (SVG)
// views through the returned Map.
import { districtClusterForType, districtClusterList } from './districts.js';

const CELL = 60;         // 6 world units: room around each 4.1-wide project footprint.
const STREET = 65;      // 6.5-world-unit avenues connect compact functional quarters.
const MAX_COLS = 8;      // quarter grid width cap: no single long strip of buildings
const ROW_WIDTH = 1320;  // two large blocks, then three smaller ones; no stranded final row

// Authored wayfinding composition, in data units along the overview camera's ground axes.
// These positions describe the interface, never geography or a relationship. The largest
// district sits at the back; small districts remain in the foreground, away from its mass.
const DISTRICT_CENTERS = {
  DeFi: [-440, -610],
  Infrastructure: [560, -450],
  AI: [650, 380],
  Gaming: [-580, 430],
  Identity: [20, 760],
};

function gridDimensions(count) {
  const cols = Math.max(1, Math.min(MAX_COLS, Math.ceil(Math.sqrt(count * 1.45))));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

function districtConfigOf(districtConfigs, district) {
  if (!districtConfigs) return null;
  return districtConfigs[district] ?? null;
}

// Returns { positions: Map<id, {x, y}>, quarters: [{ district, id, label, count, cx, cy }] }.
// Coordinates use the same data units as project.x / project.y (the world render multiplies
// by its own SCALE), so both views can consume the map directly.
export function computeCityLayout(projects, districtConfigs) {
  const positions = new Map();
  const quarters = [];
  const monad = projects.find((project) => project.id === 'monad');
  if (monad) positions.set(monad.id, { x: monad.x, y: monad.y });

  const byDistrict = new Map();
  projects.forEach((project) => {
    if (project.id === 'monad') return;
    if (!byDistrict.has(project.district)) byDistrict.set(project.district, []);
    byDistrict.get(project.district).push(project);
  });

  const districtNames = [...byDistrict.keys()].sort();
  districtNames.forEach((district) => {
    const list = byDistrict.get(district);
    const config = districtConfigOf(districtConfigs, district);
    const authoredCenter = DISTRICT_CENTERS[district];
    const centroid = authoredCenter ? {
      x: (authoredCenter[0] + authoredCenter[1]) / Math.SQRT2,
      y: (authoredCenter[1] - authoredCenter[0]) / Math.SQRT2,
    } : list.reduce(
      (acc, project) => ({ x: acc.x + project.x / list.length, y: acc.y + project.y / list.length }),
      { x: 0, y: 0 },
    );
    const single = !config;
    if (single) {
      // Identity-scale districts keep their authored placement; there is nothing to split.
      list.forEach((project) => positions.set(project.id, { x: project.x, y: project.y }));
      return;
    }

    const clusters = districtClusterList(config, list).map((cluster) => ({
      ...cluster,
      projects: list
        .filter((project) => districtClusterForType(config, project.type).id === cluster.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }));
    const street = district === 'DeFi' ? STREET : 70;
    const rowWidthLimit = district === 'DeFi' ? ROW_WIDTH : 540;

    // Pack quarter blocks into rows (config order, widest first inside a row) so the island
    // keeps a compact rectangle instead of one long strip.
    const blocks = clusters.map((cluster) => {
      const { cols, rows } = gridDimensions(cluster.projects.length);
      return { ...cluster, cols, rows, width: cols * CELL, height: rows * CELL };
    });
    const rows = [];
    let currentRow = [];
    let currentWidth = 0;
    blocks.forEach((block) => {
      const needed = currentRow.length ? currentWidth + street + block.width : block.width;
      if (currentRow.length && needed > rowWidthLimit) {
        rows.push(currentRow);
        currentRow = [block];
        currentWidth = block.width;
      } else {
        currentRow.push(block);
        currentWidth = needed;
      }
    });
    if (currentRow.length) rows.push(currentRow);

    const totalHeight = rows.reduce((sum, row) => sum + Math.max(...row.map((block) => block.height)), 0) + street * (rows.length - 1);
    let cursorY = centroid.y - totalHeight / 2;
    rows.forEach((row) => {
      const rowWidth = row.reduce((sum, block) => sum + block.width, 0) + street * (row.length - 1);
      let cursorX = centroid.x - rowWidth / 2;
      const rowHeight = Math.max(...row.map((block) => block.height));
      row.forEach((block) => {
        block.projects.forEach((project, index) => {
          const col = index % block.cols;
          const gridRow = Math.floor(index / block.cols);
          positions.set(project.id, {
            x: Math.round((cursorX + col * CELL + CELL / 2) * 10) / 10,
            y: Math.round((cursorY + gridRow * CELL + CELL / 2) * 10) / 10,
          });
        });
        quarters.push({
          district,
          id: `${district}:${block.id}`,
          label: block.label,
          count: block.projects.length,
          cx: cursorX + block.width / 2,
          cy: cursorY + block.height / 2,
          width: block.width,
          height: block.height,
          labelX: cursorX + block.width / 2,
          labelY: cursorY - 24,
        });
        cursorX += block.width + street;
      });
      cursorY += rowHeight + street;
    });
  });

  return { positions, quarters };
}
