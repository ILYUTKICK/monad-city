// Screen-space label placement with rectangle collision checks.
//
// Labels are DOM pills anchored to projected building/quarter positions. Each frame the
// engine projects anchors, filters out off-screen and panel-covered areas, then places
// labels greedily by priority with a handful of candidate offsets around the anchor.
// Lower-priority labels hide instead of shrinking; placements persist across small camera
// moves (hysteresis) so labels do not flicker.
const GAP = 8; // CSS px between label rectangles
// Candidate offsets around the anchor, tried in order. Each is [anchorDx, anchorDy,
// horizontal alignment] where alignment shifts the rect relative to the anchor x.
const CANDIDATES = [
  { dx: 0, dy: -10, align: 'center' },   // above the anchor
  { dx: 12, dy: -10, align: 'left' },    // above-right
  { dx: -12, dy: -10, align: 'right' },  // above-left
  { dx: 14, dy: 0, align: 'middle' },    // right
  { dx: -14, dy: 0, align: 'left-end' }, // left
  { dx: 0, dy: 12, align: 'center' },    // below
  { dx: 0, dy: -42, align: 'center' },
  { dx: 0, dy: 38, align: 'center' },
  { dx: 42, dy: 0, align: 'middle' },
  { dx: -42, dy: 0, align: 'left-end' },
  { dx: 36, dy: -40, align: 'center' },
  { dx: -36, dy: -40, align: 'center' },
  { dx: 36, dy: 38, align: 'center' },
  { dx: -36, dy: 38, align: 'center' },
  { dx: 0, dy: -70, align: 'center' },
  { dx: 0, dy: 66, align: 'center' },
];

let measureContext = null;
const measureCache = new Map(); // `${className}|${text}` -> { width, height }
const previous = new Map(); // Persistent candidate index; do not recreate every frame.

function measureLabel(text, className) {
  const key = `${className}|${text}`;
  if (measureCache.has(key)) return measureCache.get(key);
  if (!measureContext) {
    const canvas = document.createElement('canvas');
    measureContext = canvas.getContext('2d');
  }
  const font = className.includes('quarter')
    ? '600 13px "Instrument Sans", system-ui, sans-serif'
    : '500 12px "Instrument Sans", system-ui, sans-serif';
  measureContext.font = font;
  const textWidth = measureContext.measureText(text).width;
  const size = {
    width: Math.ceil(textWidth) + (className.includes('quarter') ? 22 : 18),
    height: className.includes('quarter') ? 27 : 24,
  };
  measureCache.set(key, size);
  return size;
}

function rectsOverlap(a, b, gap = GAP) {
  return a.left - gap < b.right && a.right + gap > b.left
    && a.top - gap < b.bottom && a.bottom + gap > b.top;
}

function inExclusions(rect, exclusions) {
  return exclusions.some((zone) => rect.left < zone.right && rect.right > zone.left
    && rect.top < zone.bottom && rect.bottom > zone.top);
}

function candidateRect(entry, candidate, size, width, height) {
  let left = entry.x + candidate.dx;
  if (candidate.align === 'center') left -= size.width / 2;
  else if (candidate.align === 'right') left -= size.width;
  else if (candidate.align === 'middle') left -= 0;
  else if (candidate.align === 'left-end') left -= size.width;
  let top = entry.y + candidate.dy;
  if (candidate.align === 'middle' || candidate.align === 'left-end') top -= size.height / 2;
  else if (candidate.dy < 0) top -= size.height;
  return { left, top, right: left + size.width, bottom: top + size.height };
}

function onViewport(rect, width, height) {
  return rect.left >= -4 && rect.top >= -4 && rect.right <= width + 4 && rect.bottom <= height + 4;
}

// entries: [{ id, priority, x, y, text, className }] — x/y are anchor positions in CSS px
// inside the label container. Returns Map<id, { left, top }>; ids missing from the result
// must be hidden by the caller.
export function placeLabels(entries, { width, height, exclusions = [] }) {
  const ordered = [...entries].sort((a, b) => b.priority - a.priority);
  const placed = [];
  const result = new Map();
  const activeIds = new Set(entries.map((entry) => entry.id));
  for (const id of previous.keys()) if (!activeIds.has(id)) previous.delete(id);

  ordered.forEach((entry) => {
    const size = measureLabel(entry.text, entry.className ?? '');
    const previousIndex = previous.get(entry.id);
    // Important focus labels may use the nearby diagonal slots when a narrow viewport
    // packs several endpoints together. Background names stay close to their building.
    const candidates = CANDIDATES.slice(0, entry.priority >= 50 ? undefined : 10)
      .map((candidate, index) => ({ ...candidate, index }));
    if (previousIndex !== undefined && previousIndex < candidates.length) {
      candidates.unshift(candidates.splice(previousIndex, 1)[0]);
    }
    let chosen = null;
    for (let index = 0; index < candidates.length; index += 1) {
      const rect = candidateRect(entry, candidates[index], size, width, height);
      if (!onViewport(rect, width, height)) continue;
      if (inExclusions(rect, exclusions)) continue;
      if (placed.some((other) => rectsOverlap(rect, other))) continue;
      chosen = { rect, index: candidates[index].index };
      break;
    }
    if (chosen) {
      placed.push(chosen.rect);
      previous.set(entry.id, chosen.index);
      result.set(entry.id, { left: chosen.rect.left, top: chosen.rect.top });
    } else {
      previous.delete(entry.id);
    }
  });
  return result;
}

export function invalidateLabelMeasurements() {
  measureCache.clear();
}
