// Night-city environment: lighting rig, water with a calm reflection silhouette, island
// bases with a stone rim and road surfaces, shoreline trees and a few street lamps.
//
// Everything here is presentation: vegetation, lamps and reflections carry no trust, TVL,
// activity or evidence meaning, and never participate in project picking.

import * as THREE from './vendor/three.module.min.js';
import { hashId } from './city-buildings.js';

export const WATER_LEVEL = -2.7;

// ---------- lighting ----------

export function createLighting({ extent }) {
  const rig = new THREE.Group();
  const sun = new THREE.DirectionalLight('#e3def0', 2.35);
  sun.position.set(-extent * 0.5, extent * 0.9, extent * 0.35);
  sun.castShadow = true;
  const span = extent * 1.15;
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = extent * 3;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 3;
  rig.add(sun);
  const hemi = new THREE.HemisphereLight('#777084', '#242129', 1.35);
  rig.add(hemi);
  const fill = new THREE.DirectionalLight('#a59bad', 0.65);
  fill.position.set(extent * 0.4, extent * 0.5, -extent * 0.6);
  rig.add(fill);
  return rig;
}

// One outline drives the ground, the solid stone platform, and decoration bounds. The
// only shore allowance is this narrow ledge; callers pass the actual terrain half extents.
export const SHORE_MARGIN = 0.6;

export function islandOutline({ halfX, halfZ }, inset = 0) {
  const rx = Math.max(1, halfX - inset);
  const rz = Math.max(1, halfZ - inset);
  const corner = Math.min(3, rx * 0.3, rz * 0.3);
  const points = [];
  for (const [cx, cz, start] of [
    [rx - corner, rz - corner, 0], [-rx + corner, rz - corner, Math.PI / 2],
    [-rx + corner, -rz + corner, Math.PI], [rx - corner, -rz + corner, Math.PI * 1.5],
  ]) {
    for (let step = 0; step <= 4; step += 1) {
      const angle = start + step * Math.PI / 8;
      points.push([cx + Math.cos(angle) * corner, cz + Math.sin(angle) * corner]);
    }
  }
  return points;
}

function islandShape(bounds, inset = 0) {
  return new THREE.Shape(islandOutline(bounds, inset).map(([x, z]) => new THREE.Vector2(x, z)));
}

function withinIsland(island, x, z, inset = 1) {
  const rx = island.halfX - inset;
  const rz = island.halfZ - inset;
  const corner = Math.min(3, rx * 0.3, rz * 0.3);
  const dx = Math.abs(x - island.cx) - rx + corner;
  const dz = Math.abs(z - island.cz) - rz + corner;
  return Math.hypot(Math.max(0, dx), Math.max(0, dz)) + Math.min(Math.max(dx, dz), 0) <= corner;
}

// Shared water carries no district-specific marks. Reflections live in the corresponding
// district group so hiding an island also hides its contact and reflected silhouette.
export function createWater({ radius }) {
  const water = new THREE.Mesh(new THREE.CircleGeometry(radius, 72), new THREE.MeshBasicMaterial({ color: '#111422' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_LEVEL;
  return water;
}

export function createIslandReflection({ island }) {
  const width = island.halfX * 2 + 12;
  const depth = island.halfZ * 2 + 12;
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  const px = (x) => (x / width + 0.5) * canvas.width;
  const pz = (z) => (z / depth + 0.5) * canvas.height;
  const outline = islandOutline(island, -SHORE_MARGIN);
  // Tight silhouette/contact wash follows the rectangular island, never a radial disc.
  ctx.beginPath();
  outline.forEach(([x, z], index) => index ? ctx.lineTo(px(x + 1), pz(z + 1.6)) : ctx.moveTo(px(x + 1), pz(z + 1.6)));
  ctx.closePath();
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(4,5,10,0.8)';
  ctx.fillStyle = 'rgba(4,5,10,0.72)';
  ctx.fill();
  ctx.shadowBlur = 0;
  // Short localized fragments close to the two camera-facing shores; no full-water lines.
  for (let index = 0; index < 160; index += 1) {
    const seed = `reflection:${island.seed ?? island.key}:${index}`;
    const along = hashId(seed, 1) * 2 - 1;
    const offset = 0.7 + hashId(seed, 2) * 4;
    const side = index % 2;
    const x = side ? island.halfX + offset : along * (island.halfX - 1);
    const z = side ? along * (island.halfZ - 1) : island.halfZ + offset;
    const alpha = (1 - offset / 5) * (index % 7 === 0 ? 0.27 : 0.13);
    ctx.fillStyle = `rgba(161,152,175,${alpha})`;
    ctx.fillRect(px(x), pz(z), Math.max(2, 768 / width * (0.5 + hashId(seed, 3) * 1.1)), 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.85 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(island.cx, WATER_LEVEL + 0.02, island.cz);
  mesh.renderOrder = 1;
  return mesh;
}

// The active builder includes both solid stone and a continuous ground surface. Ground is
// painted with a connected street/perimeter network in the same local coordinates.
export function createIslandRim({ center, halfX, halfZ, seed, quarters = [], projects = [] }) {
  const bounds = { halfX, halfZ };
  const group = new THREE.Group();
  group.position.set(center.x, 0, center.z);
  const base = new THREE.Mesh(
    new THREE.ExtrudeGeometry(islandShape(bounds, -SHORE_MARGIN), { depth: 4.2, bevelEnabled: false }),
    new THREE.MeshLambertMaterial({ color: '#3b3448' }),
  );
  base.rotation.x = Math.PI / 2;
  base.position.y = -0.06;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const texture = islandTopTexture({ center, halfX, halfZ, seed, quarters, projects });
  const geometry = new THREE.ShapeGeometry(islandShape(bounds));
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, position.getX(index) / (halfX * 2) + 0.5, 1 - (position.getY(index) / (halfZ * 2) + 0.5));
  }
  const ground = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }));
  ground.rotation.x = Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  return group;
}

function islandTopTexture({ center, halfX, halfZ, seed, quarters, projects }) {
  const canvas = document.createElement('canvas');
  // Keep a common texel density: compact islands need no 1024² road texture.
  const size = Math.max(256, Math.min(1024, 2 ** Math.ceil(Math.log2(Math.max(halfX, halfZ) * 18))));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const px = (x) => (x / (halfX * 2) + 0.5) * size;
  const pz = (z) => (z / (halfZ * 2) + 0.5) * size;
  ctx.fillStyle = '#383441';
  ctx.fillRect(0, 0, size, size);
  for (let index = 0; index < 250; index += 1) {
    ctx.fillStyle = 'rgba(113,108,120,0.065)';
    ctx.fillRect(hashId(`${seed}:${index}`, 1) * size, hashId(`${seed}:${index}`, 2) * size, 5, 4);
  }
  const drawPath = (points, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * size / (halfX * 2);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach(([x, z], index) => index ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)));
    ctx.stroke();
  };
  const road = (points, width) => {
    drawPath(points, width + 0.65, '#45414c');
    drawPath(points, width, '#21232d');
  };
  const shore = islandOutline({ halfX, halfZ }, 1.5);
  drawPath([...shore, shore[0]], 0.65, '#45414b');
  const boxes = quarters.map((q) => ({
    minX: q.cx * 0.1 - q.width * 0.05 - center.x,
    maxX: q.cx * 0.1 + q.width * 0.05 - center.x,
    minZ: q.cy * 0.1 - q.height * 0.05 - center.z,
    maxZ: q.cy * 0.1 + q.height * 0.05 - center.z,
  }));
  // Access streets track each block edge; a common outside avenue joins every block.
  if (boxes.length) {
    const minX = Math.min(...boxes.map((b) => b.minX)) - 1;
    const maxX = Math.max(...boxes.map((b) => b.maxX)) + 1;
    const minZ = Math.min(...boxes.map((b) => b.minZ)) - 1;
    const maxZ = Math.max(...boxes.map((b) => b.maxZ)) + 1;
    road([[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ], [minX, minZ]], 1.6);
    boxes.forEach((box) => {
      const left = box.minX - 1;
      const right = box.maxX + 1;
      const top = box.minZ - 1;
      const bottom = box.maxZ + 1;
      road([[minX, top], [maxX, top]], 1.5);
      road([[left, top], [right, top], [right, bottom], [left, bottom], [left, top]], 1.5);
      // Narrow local lanes between rows join the wider quarter access streets.
      for (let z = box.minZ + 6; z < box.maxZ - 1; z += 6) road([[left, z], [right, z]], 0.9);
      for (let x = box.minX + 12; x < box.maxX - 1; x += 12) road([[x, top], [x, bottom]], 0.85);
    });
  } else {
    road([[-halfX + 2, 0], [halfX - 2, 0]], 1.3);
    ctx.fillStyle = '#45404f';
    ctx.fillRect(px(-3.9), pz(-3.9), 7.8 / (2 * halfX) * size, 7.8 / (2 * halfZ) * size);
  }
  // Individual project aprons connect entrances to the lane without extra buildings.
  projects.forEach((project) => {
    const x = project.x - center.x;
    const z = project.z - center.z;
    ctx.strokeStyle = '#49434f';
    ctx.lineWidth = Math.max(1, size / (halfX * 2) * 0.2);
    ctx.strokeRect(px(x - 2.3), pz(z - 2.3), 4.6 / (halfX * 2) * size, 4.6 / (halfZ * 2) * size);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function decorationPositions(island, avoid, kind) {
  const positions = [];
  const perimeter = (island.halfX + island.halfZ) * 4;
  const count = kind === 'tree' ? Math.min(120, Math.round(perimeter / 2.6)) : Math.min(12, Math.max(3, Math.round(perimeter / 20)));
  const seed = island.seed ?? island.key;
  for (let index = 0; index < count * 16 && positions.length < count; index += 1) {
    const key = `${kind}:${seed}:${index}`;
    // Half the candidates are along the shore; the rest occupy free street/plaza corners.
    let x = island.cx + (hashId(key, 1) * 2 - 1) * (island.halfX - 1.8);
    let z = island.cz + (hashId(key, 2) * 2 - 1) * (island.halfZ - 1.8);
    if (index % 2 === 0) {
      if (index % 4 === 0) x = island.cx + (index % 8 ? 1 : -1) * (island.halfX - 2.2);
      else z = island.cz + (index % 8 < 4 ? 1 : -1) * (island.halfZ - 2.2);
    }
    if (!withinIsland(island, x, z, 1.5)) continue;
    const clearance = kind === 'tree' ? 1.1 : 0.25;
    if (avoid.some((spot) => Math.hypot(x - spot.x, z - spot.z) < spot.r + clearance)) continue;
    if (positions.some((spot) => Math.hypot(x - spot.x, z - spot.z) < (kind === 'tree' ? 2.35 : 6))) continue;
    positions.push({ x, z, s: 0.82 + hashId(key, 3) * 0.28 });
  }
  return positions;
}

export function createVegetation({ islands, avoid = [] }) {
  const positions = islands.flatMap((island) => decorationPositions(island, avoid, 'tree'));
  const group = new THREE.Group();
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.13, 0.65, 5), new THREE.MeshLambertMaterial({ color: '#35302e' }), positions.length);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.5, 7), new THREE.MeshLambertMaterial({ color: '#4a6050' }), positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(({ x, z, s }, index) => {
    matrix.makeScale(s, s, s).setPosition(x, 0.325 * s, z);
    trunks.setMatrixAt(index, matrix);
    matrix.makeScale(s, s, s).setPosition(x, 1.7 * s, z);
    crowns.setMatrixAt(index, matrix);
  });
  trunks.castShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  group.add(trunks, crowns);
  return group;
}

export function createLamps({ islands, avoid = [] }) {
  const treeClearance = islands.flatMap((island) => decorationPositions(island, avoid, 'tree').map((tree) => ({ ...tree, r: 1.15 })));
  const positions = islands.flatMap((island) => decorationPositions(island, [...avoid, ...treeClearance], 'lamp'));
  const group = new THREE.Group();
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 4), new THREE.MeshBasicMaterial({ color: '#b3a6aa' }), positions.length);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.06, 1.25, 5), new THREE.MeshLambertMaterial({ color: '#262631' }), positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(({ x, z }, index) => {
    matrix.makeTranslation(x, 1.3, z);
    lights.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, 0.625, z);
    poles.setMatrixAt(index, matrix);
  });
  group.add(lights, poles);
  return group;
}
