// Procedural night-city architecture for Monad City.
//
// Every project building is generated deterministically from its project ID: family,
// height tier, facade texture and detail layout come from a stable hash, never from array
// order, record counts or trust data. Height, windows and roof type carry no meaning about
// safety, activity, TVL, popularity or onchain status — they are presentation only.
//
// All builders return a THREE.Group whose meshes inherit the parent group's
// userData.projectId (set by city3d.js), so raycasting keeps one project per object.

import * as THREE from './vendor/three.module.min.js';

// Deterministic string hash → [0, 1).
export function hashId(id, salt = 0) {
  const value = String(id ?? '');
  let h = 2166136261 ^ salt;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const PALETTE = {
  wallA: '#514967',
  wallB: '#5d5573',
  wallC: '#6a6180',
  wallD: '#716785',
  roof: '#8a7ea8',
  roofDark: '#776b93',
  stone: '#302b43',
  windowDark: '#262238',
  windowWarm: '#cbb9a5',
  windowCool: '#8d84a8',
  trim: '#403a55',
};

// Shared geometry keeps 176 project objects cheap without changing their authored scales.
// BoxGeometry normally renders six material groups. Reordering its face indices lets all
// four walls render together and both roof-facing planes render together: two calls/body.
function createTwoMaterialUnitBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const source = geometry.index.array;
  const reordered = new source.constructor(source.length);
  const faceOrder = [0, 1, 4, 5, 2, 3]; // ±X, ±Z walls, then ±Y roof/base.
  faceOrder.forEach((face, target) => {
    reordered.set(source.subarray(face * 6, face * 6 + 6), target * 6);
  });
  geometry.setIndex(new THREE.BufferAttribute(reordered, 1));
  geometry.clearGroups();
  geometry.addGroup(0, 24, 0);
  geometry.addGroup(24, 12, 1);
  return geometry;
}

const BODY_BOX_GEOMETRY = createTwoMaterialUnitBox();
const UNIT_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const ROUND_TOWER_GEOMETRY = new THREE.CylinderGeometry(1, 1.04, 1, 18);
const ROUND_CAP_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 18);
const ARENA_DRUM_GEOMETRY = new THREE.CylinderGeometry(1, 1.06, 1, 20);
const ARENA_DOME_GEOMETRY = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const TECH_DOME_GEOMETRY = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const TAPERED_MAST_GEOMETRY = new THREE.CylinderGeometry(1, 1.5, 1, 6);
const STRAIGHT_MAST_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 6);

// ---------- facade textures ----------

// Windows are baked into a small canvas: mostly dark panes, 10–25% slightly warmer and
// brighter, the rest grey-lilac. Diffuse and emissive are deliberately separate: the latter
// has a black background and contains only the few lit panes. This preserves the moonlit
// wall planes and lets project-focus dimming quiet the windows without making walls glow.
const facadeCache = new Map();

function facadeCanvases({ floors, cols, seed, wallColor }) {
  const cell = 40;
  const diffuse = document.createElement('canvas');
  const emissive = document.createElement('canvas');
  diffuse.width = emissive.width = cols * cell;
  diffuse.height = emissive.height = floors * cell;
  const diffuseCtx = diffuse.getContext('2d');
  const emissiveCtx = emissive.getContext('2d');
  diffuseCtx.fillStyle = wallColor;
  diffuseCtx.fillRect(0, 0, diffuse.width, diffuse.height);
  emissiveCtx.fillStyle = '#000000';
  emissiveCtx.fillRect(0, 0, emissive.width, emissive.height);

  for (let row = 0; row < floors; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const roll = hashId(`${seed}:${row}:${col}`, 7);
      const inset = cols <= 2 ? 8 : 9;
      const x = col * cell + inset;
      const y = row * cell + 9;
      const w = cell - inset * 2;
      const h = cell - 21;
      let pane = PALETTE.windowDark;
      const lit = roll > 0.84;
      if (lit) pane = PALETTE.windowWarm;
      else if (roll > 0.58) pane = PALETTE.windowCool;
      diffuseCtx.fillStyle = pane;
      diffuseCtx.fillRect(x, y, w, h);
      // A narrow reveal gives each opening depth without drawing a bright grid.
      diffuseCtx.fillStyle = 'rgba(16,14,25,0.34)';
      diffuseCtx.fillRect(x, y, w, 2);
      diffuseCtx.fillRect(x, y, 2, h);
      if (pane === PALETTE.windowWarm) {
        diffuseCtx.fillStyle = 'rgba(255,236,208,0.16)';
        diffuseCtx.fillRect(x + 2, y + 2, w - 2, Math.max(2, h * 0.42));
        emissiveCtx.fillStyle = '#c2ae98';
        emissiveCtx.fillRect(x + 2, y + 2, w - 3, h - 3);
      }
    }
    // The slab joint is visible only at close range; the building mass wins in overview.
    diffuseCtx.fillStyle = 'rgba(20,18,30,0.24)';
    diffuseCtx.fillRect(0, row * cell + cell - 2, diffuse.width, 2);
  }
  return { diffuse, emissive };
}

function facadeMaterials({ floors, cols, seed, wallColor }) {
  // Eight stable pattern buckets preserve deterministic variation while bounding GPU
  // textures. Project identity still selects the bucket; evidence/data never participates.
  const seedBucket = Math.floor(hashId(seed, 149) * 8);
  const key = `${floors}|${cols}|${seedBucket}|${wallColor}`;
  if (facadeCache.has(key)) return facadeCache.get(key);
  const canvases = facadeCanvases({ floors, cols, seed: `facade-${seedBucket}`, wallColor });
  const texture = new THREE.CanvasTexture(canvases.diffuse);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const emissive = new THREE.CanvasTexture(canvases.emissive);
  emissive.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.MeshLambertMaterial({
    map: texture,
    emissive: new THREE.Color('#a38f7b'),
    emissiveMap: emissive,
    emissiveIntensity: 0.32,
  });
  const entry = { wall, dispose() { texture.dispose(); emissive.dispose(); wall.dispose(); } };
  facadeCache.set(key, entry);
  return entry;
}

// Emissive panes must dim with the building when the focus dims the city. A material-level
// switch is cheaper than re-generating textures.
export function setBuildingEmissive(group, factor) {
  group?.traverse?.((object) => {
    if (!object.isMesh || object.userData.emissiveFactor === undefined) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material?.emissiveIntensity !== undefined) {
        material.emissiveIntensity = object.userData.emissiveFactor * factor;
      }
    });
  });
}

// ---------- family builders ----------
// Shared footprint unit: ~3.2–4.2 world units wide. Height tiers: low 3–5, mid 6–9,
// tall 10–14. Roof color stays muted; the big flat turquoise roof of the old prototype is gone.

function floorCount(height, seed, { min = 3, max = 10 } = {}) {
  // 1.0–1.4 world units per readable level, varied per project but stable across reloads.
  const step = 1 + hashId(seed, 23) * 0.4;
  return Math.min(max, Math.max(min, Math.round(height / step)));
}

function boxWithFacade({ w, h, d, seed, floors, wallColor, variant }) {
  const facade = facadeMaterials({
    floors: Math.max(1, floors),
    cols: variant === 'narrow' ? 2 : w > 3.65 ? 4 : 3,
    seed,
    wallColor,
  });
  const side = facade.wall;
  const roofMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.roofDark });
  const mesh = new THREE.Mesh(BODY_BOX_GEOMETRY, [side, roofMaterial]);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.emissiveFactor = facade.wall.emissiveIntensity;
  return mesh;
}

function parapet({ w, d, y, color = PALETTE.trim }) {
  const material = new THREE.MeshLambertMaterial({ color });
  const group = new THREE.Group();
  const t = 0.16;
  const h = 0.22;
  const parts = [
    [w, h, t, 0, 0, -d / 2],
    [w, h, t, 0, 0, d / 2],
    [t, h, d, -w / 2, 0, 0],
    [t, h, d, w / 2, 0, 0],
  ];
  const mesh = new THREE.InstancedMesh(UNIT_BOX_GEOMETRY, material, parts.length);
  const matrix = new THREE.Matrix4();
  parts.forEach(([bw, bh, bd, x, yy, z], index) => {
    matrix.makeScale(bw, bh, bd);
    matrix.setPosition(x, y + bh / 2 + yy, z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function roofUnits({ seed, y, w, d }) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: '#454059' });
  const countRoll = hashId(seed, 31);
  const count = countRoll < 0.34 ? 0 : countRoll < 0.9 ? 1 : 2;
  if (!count) return group;
  const mesh = new THREE.InstancedMesh(UNIT_BOX_GEOMETRY, material, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const uw = 0.42 + hashId(seed, 40 + index) * 0.48;
    const uh = 0.18 + hashId(seed, 50 + index) * 0.26;
    matrix.makeScale(uw, uh, uw);
    matrix.setPosition(
      (hashId(seed, 60 + index) - 0.5) * (w - 1),
      y + uh / 2,
      (hashId(seed, 70 + index) - 0.5) * (d - 1),
    );
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

// Family 1: rectangular slab, recessed windows, flat roof with parapet.
function buildSlab({ id, width, height, depth, wallColor, roofDetail = true }) {
  const group = new THREE.Group();
  const floors = floorCount(height, id);
  const body = boxWithFacade({ w: width, h: height, d: depth, seed: id, floors, wallColor, variant: 'slab' });
  body.position.y = height / 2;
  group.add(body);
  group.add(parapet({ w: width, d: depth, y: height }));
  if (roofDetail) group.add(roofUnits({ seed: id, y: height, w: width - 0.6, d: depth - 0.6 }));
  return group;
}

// Family 2: stepped tower with one or two terraces.
function buildStepped({ id, width, height, depth, wallColor }) {
  const group = new THREE.Group();
  const tiers = hashId(id, 91) > 0.5 ? 3 : 2;
  let remaining = height;
  let y = 0;
  let w = width;
  let d = depth;
  for (let index = 0; index < tiers; index += 1) {
    const share = index === tiers - 1 ? remaining : remaining * (0.42 + hashId(id, 100 + index) * 0.16);
    const tierH = Math.max(0.9, share);
    remaining -= tierH;
    const floors = floorCount(tierH, `${id}:${index}`, { min: 1, max: 5 });
    const body = boxWithFacade({ w, h: tierH, d, seed: `${id}:${index}`, floors, wallColor, variant: 'slab' });
    body.position.y = y + tierH / 2;
    group.add(body);
    y += tierH;
    group.add(parapet({ w, d, y }));
    w *= 0.78;
    d *= 0.78;
  }
  group.add(roofUnits({ seed: id, y, w: w - 0.4, d: d - 0.4 }));
  return group;
}

// Family 3: narrow tower with a readable crown.
function buildNarrowTower({ id, height, wallColor }) {
  const group = new THREE.Group();
  const w = 2.1;
  const floors = floorCount(height, id, { min: 4, max: 10 });
  const body = boxWithFacade({ w, h: height, d: w, seed: id, floors, wallColor, variant: 'narrow' });
  body.position.y = height / 2;
  group.add(body);
  const crownMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.roof });
  const crown = new THREE.Mesh(UNIT_BOX_GEOMETRY, crownMaterial);
  crown.scale.set(w + 0.5, 0.5, w + 0.5);
  crown.position.y = height + 0.25;
  crown.castShadow = true;
  group.add(crown);
  // Antennae stay exceptional so a field of narrow towers does not become visual noise.
  if (hashId(id, 111) > 0.76) {
    const mast = new THREE.Mesh(
      STRAIGHT_MAST_GEOMETRY,
      new THREE.MeshLambertMaterial({ color: PALETTE.trim }),
    );
    const mastHeight = 0.8 + hashId(id, 110) * 0.8;
    mast.scale.set(0.05, mastHeight, 0.05);
    mast.position.y = height + 0.5 + mastHeight / 2;
    group.add(mast);
  }
  return group;
}

// Family 4: long low block with an open corner / inner yard.
function buildLowCourtyard({ id, width, depth, wallColor }) {
  const group = new THREE.Group();
  const height = 2.4 + hashId(id, 120) * 1.6;
  const t = Math.min(1.2, Math.max(0.9, Math.min(width, depth) * 0.22));
  const legs = [
    [width, -depth / 2 + t / 2],
    [width, depth / 2 - t / 2],
  ].map(([w, z]) => ({ w, d: t, x: 0, z }));
  legs.push({ w: t, d: depth - t * 2, x: -width / 2 + t / 2, z: 0 });
  const floors = floorCount(height, id, { min: 3, max: 5 });
  const facade = facadeMaterials({ floors, cols: 4, seed: id, wallColor });
  const roofMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.roofDark });
  const body = new THREE.InstancedMesh(BODY_BOX_GEOMETRY, [facade.wall, roofMaterial], legs.length);
  const matrix = new THREE.Matrix4();
  legs.forEach((leg, index) => {
    matrix.makeScale(leg.w, height, leg.d);
    matrix.setPosition(leg.x, height / 2, leg.z);
    body.setMatrixAt(index, matrix);
  });
  body.instanceMatrix.needsUpdate = true;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData.emissiveFactor = facade.wall.emissiveIntensity;
  group.add(body);
  const yard = new THREE.Mesh(UNIT_BOX_GEOMETRY, new THREE.MeshLambertMaterial({ color: '#3a3550' }));
  yard.scale.set(
    Math.max(0.8, width - t * 2 - 0.35),
    0.12,
    Math.max(0.8, depth - t * 2 - 0.35),
  );
  yard.position.y = 0.06;
  yard.receiveShadow = true;
  group.add(yard);
  return group;
}

// Family 5: rounded tower / cylinder with a roof ring.
function buildCylinder({ id, height, wallColor }) {
  const group = new THREE.Group();
  const radius = 1.5 + hashId(id, 130) * 0.5;
  const facade = facadeMaterials({ floors: floorCount(height, id), cols: 6, seed: id, wallColor });
  const body = new THREE.Mesh(ROUND_TOWER_GEOMETRY, facade.wall);
  body.scale.set(radius, height, radius);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData.emissiveFactor = facade.wall.emissiveIntensity;
  group.add(body);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius + 0.12, 0.12, 8, 22),
    new THREE.MeshLambertMaterial({ color: PALETTE.roof }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height + 0.06;
  ring.castShadow = true;
  group.add(ring);
  const cap = new THREE.Mesh(
    ROUND_CAP_GEOMETRY,
    new THREE.MeshLambertMaterial({ color: PALETTE.roofDark }),
  );
  cap.scale.set(radius + 0.12, 0.22, radius + 0.12);
  cap.position.y = height + 0.1;
  group.add(cap);
  return group;
}

// Infrastructure technical silhouette: low service block + mast + dish dome.
function buildTechnical({ id, height, wallColor }) {
  const group = new THREE.Group();
  const base = buildSlab({ id, width: 3.6, height: height * 0.55, depth: 3, wallColor, roofDetail: false });
  group.add(base);
  const dome = new THREE.Mesh(
    TECH_DOME_GEOMETRY,
    new THREE.MeshLambertMaterial({ color: PALETTE.wallC }),
  );
  dome.scale.setScalar(0.9);
  dome.position.set(0.4, height * 0.55, -0.3);
  dome.castShadow = true;
  group.add(dome);
  const mast = new THREE.Mesh(
    TAPERED_MAST_GEOMETRY,
    new THREE.MeshLambertMaterial({ color: PALETTE.trim }),
  );
  mast.scale.set(0.06, height * 0.75, 0.06);
  mast.position.set(-0.9, height * 0.55 + height * 0.375, 0.5);
  mast.castShadow = true;
  group.add(mast);
  return group;
}

// Gaming arena: round drum with a curved roof.
function buildArena({ id, height, wallColor }) {
  const group = new THREE.Group();
  const radius = 2.2;
  const facade = facadeMaterials({ floors: floorCount(height, id, { min: 3, max: 6 }), cols: 8, seed: id, wallColor });
  const drum = new THREE.Mesh(
    ARENA_DRUM_GEOMETRY,
    facade.wall,
  );
  drum.scale.set(radius, height, radius);
  drum.position.y = height / 2;
  drum.castShadow = true;
  drum.receiveShadow = true;
  drum.userData.emissiveFactor = facade.wall.emissiveIntensity;
  group.add(drum);
  const roof = new THREE.Mesh(
    ARENA_DOME_GEOMETRY,
    new THREE.MeshLambertMaterial({ color: PALETTE.roofDark }),
  );
  roof.scale.setScalar(radius * 0.92);
  roof.position.y = height;
  roof.castShadow = true;
  group.add(roof);
  return group;
}

// ---------- Monad complex ----------
// A small light complex: vertical core + two side blocks + plaza deck. The parts are one
// project object (monad), never extra projects.
export function buildMonadComplex() {
  const group = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.9, 0.5, 8),
    new THREE.MeshLambertMaterial({ color: '#3c3654' }),
  );
  deck.position.y = 0.25;
  deck.receiveShadow = true;
  group.add(deck);
  const core = buildNarrowTower({ id: 'monad-core', height: 11, wallColor: '#7d7492' });
  core.position.x = 0;
  group.add(core);
  const left = buildSlab({ id: 'monad-left', width: 2.6, height: 4.4, depth: 2.6, wallColor: '#6a6180' });
  left.position.set(-2.4, 0.5, 1.1);
  group.add(left);
  const right = buildSlab({ id: 'monad-right', width: 2.2, height: 5.6, depth: 2.2, wallColor: '#5d5573' });
  right.position.set(2.2, 0.5, -1);
  group.add(right);
  const plazaLight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12),
    new THREE.MeshBasicMaterial({ color: '#cbb9a5' }),
  );
  plazaLight.position.set(1.6, 0.55, 2);
  group.add(plazaLight);
  return group;
}

// ---------- family selection ----------

function baseFamily(roll) {
  // Cylinders are landmarks, not the default urban fabric. Slabs, steps and courtyards
  // carry most blocks while narrow towers punctuate the skyline.
  if (roll < 0.3) return 'slab';
  if (roll < 0.56) return 'stepped';
  if (roll < 0.72) return 'narrow';
  if (roll < 0.92) return 'courtyard';
  return 'cylinder';
}

function familyFor(project) {
  const roll = hashId(project.id, 3);
  if (project.district === 'Infrastructure' && roll > 0.55) return 'technical';
  if (project.district === 'Gaming' && roll > 0.62) return 'arena';
  return baseFamily(roll);
}

// Deterministic building for one project ID. districtBias nudges family choice for the two
// districts with a recognisable silhouette (Infrastructure technical, Gaming arena) — still
// hash-driven per project, never a claim about the real project.
export function buildProjectBuilding(project) {
  const heightRoll = hashId(project.id, 5);
  const heightVariant = hashId(project.id, 6);
  const wallRoll = hashId(project.id, 9);
  const wallColor = [PALETTE.wallA, PALETTE.wallB, PALETTE.wallC, PALETTE.wallD][Math.floor(wallRoll * 4)];
  const tier = heightRoll < 0.5 ? 'low' : heightRoll < 0.88 ? 'mid' : 'tall';
  const height = tier === 'low'
    ? 3.2 + heightVariant * 1.8
    : tier === 'mid'
      ? 6 + heightVariant * 3
      : 10.5 + heightVariant * 3.2;
  const width = 2.9 + hashId(project.id, 11) * 1.1;
  const depth = 2.9 + hashId(project.id, 13) * 1.1;

  const family = familyFor(project);

  switch (family) {
    case 'technical': return { family, group: buildTechnical({ id: project.id, height: Math.max(height, 5), wallColor }) };
    case 'arena': return { family, group: buildArena({ id: project.id, height: Math.max(height, 4), wallColor }) };
    case 'stepped': return { family, group: buildStepped({ id: project.id, width, height, depth, wallColor }) };
    case 'narrow': return { family, group: buildNarrowTower({ id: project.id, height: Math.max(height, tier === 'low' ? 5 : height), wallColor }) };
    case 'courtyard': return { family, group: buildLowCourtyard({ id: project.id, width: width + 0.8, depth: depth + 0.8, wallColor }) };
    case 'cylinder': return { family, group: buildCylinder({ id: project.id, height, wallColor }) };
    default: return { family: 'slab', group: buildSlab({ id: project.id, width, height, depth, wallColor }) };
  }
}

// Footprint radius used for arc anchors, tree avoidance and label anchors.
export function buildingFootprint(project) {
  const width = 2.9 + hashId(project.id, 11) * 1.1;
  const depth = 2.9 + hashId(project.id, 13) * 1.1;
  const family = familyFor(project);
  if (family === 'arena') return 2.45;
  if (family === 'technical') return 2.15;
  if (family === 'narrow') return 1.4;
  if (family === 'cylinder') return 1.75 + hashId(project.id, 130) * 0.5;
  if (family === 'courtyard') return Math.max(width, depth) / 2 + 0.65;
  return Math.max(width, depth) / 2 + 0.25;
}
