import * as THREE from './vendor/three.module.min.js';
import { RELATIONSHIP_STATES, RELATIONSHIP_TYPES } from './data.js';

// Voxel Island City View (visual architecture v2, docs/VOXEL_ISLAND_SPEC.md).
// Deterministic: every placement derives from project data or a seeded hash.

const SCALE = 0.1;
const HASH_SEED = (x, z) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
// District islands are derived from the actual building clusters (docs/WORKLOG Phase 5.1→5.2):
// center = centroid of the group's buildings, radius = farthest building + beach margin.
// The layout stays data-driven — re-placing buildings reshapes the islands automatically.

const COLORS = {
  grassA: '#272238',
  grassB: '#242030',
  grassC: '#2a2542',
  road: '#3a3454',
  plaza: '#453d63',
  sand: '#3f3656',
  water: '#1e1a2d',
  body: '#574a80',
  pedestal: '#3a3356',
  house: '#443c60',
  houseRoof: '#655886',
  tower: '#4d4470',
  towerRoof: '#7a6ba0',
  trunk: '#262433',
  leafA: '#254634',
  leafB: '#2d5640',
  spireBody: '#e2d3ff',
  spireCap: '#a58aff',
  boatHull: '#8b84a3',
  boatSail: '#d9d2ee',
};

export function createCity3D({
  container,
  labelContainer,
  projects,
  relationships,
  onSelect,
  reducedMotion = false,
  beaconByProject = {},
}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'city-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0a0f');
  scene.fog = new THREE.Fog('#0a0a0f', 240, 560);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 700);

  scene.add(new THREE.AmbientLight('#8a7fb8', 0.75));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(60, 90, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 260 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---------- terrain: archipelago ----------
  // One island per district cluster; the Monad spire sits on its own central islet. Islands
  // are derived from the buildings themselves, so layout stays data-driven.
  const ISLAND_GROUPS = (() => {
    const groups = new Map();
    projects.forEach((project) => {
      const key = project.id === 'monad' ? '__monad' : project.district;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(project);
    });
    return [...groups.entries()].map(([key, list]) => {
      const cx = (list.reduce((sum, p) => sum + p.x, 0) / list.length) * SCALE;
      const cz = (list.reduce((sum, p) => sum + p.y, 0) / list.length) * SCALE;
      const farthest = Math.max(...list.map((p) => Math.hypot(p.x * SCALE - cx, p.y * SCALE - cz)));
      const radius = Math.max(farthest + 4.4, key === '__monad' ? 6.2 : 7.6);
      return { key, cx, cz, radius, list };
    });
  })();

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(340, 64),
    new THREE.MeshBasicMaterial({ color: COLORS.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.6;
  scene.add(water);

  const cellGeometry = new THREE.BoxGeometry(1, 2, 1);
  cellGeometry.translate(0, -1, 0);
  const terrainCells = [];
  ISLAND_GROUPS.forEach((island) => {
    const reach = Math.ceil(island.radius + 3);
    const cellDist = (x, z) => Math.hypot(x - island.cx, z - island.cz);
    const inside = (x, z) =>
      cellDist(x, z) < island.radius + (HASH_SEED(island.cx * 3 + x, island.cz * 7 + z) - 0.5) * 1.9;
    for (let x = Math.floor(island.cx) - reach; x <= Math.ceil(island.cx) + reach; x += 1) {
      for (let z = Math.floor(island.cz) - reach; z <= Math.ceil(island.cz) + reach; z += 1) {
        if (!inside(x, z)) continue;
        const coast = !(inside(x + 1, z) && inside(x - 1, z) && inside(x, z + 1) && inside(x, z - 1));
        const dist = cellDist(x, z);
        const sand = coast || dist > island.radius - 1.3 + (HASH_SEED(x * 3, z * 7) - 0.5);
        const plaza = dist < (island.key === '__monad' ? 3.4 : 2.1);
        let cellColor = COLORS.sand;
        if (!sand) {
          if (plaza) cellColor = COLORS.plaza;
          else cellColor = (x + z) % 2 ? COLORS.grassA : COLORS.grassB;
          if (!plaza && HASH_SEED(x * 5, z * 11) > 0.93) cellColor = COLORS.grassC;
        }
        terrainCells.push({ x, z, cellColor, island, plaza, sand, dist });
      }
    }
  });
  const terrain = new THREE.InstancedMesh(
    cellGeometry,
    new THREE.MeshLambertMaterial(),
    terrainCells.length,
  );
  const matrix = new THREE.Matrix4();
  const tempColor = new THREE.Color();
  terrainCells.forEach((cell, index) => {
    matrix.makeTranslation(cell.x, 0, cell.z);
    terrain.setMatrixAt(index, matrix);
    terrain.setColorAt(index, tempColor.set(cell.cellColor));
  });
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- shared helpers ----------
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  function addBox(group, w, h, d, x, y, z, material, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    group.add(mesh);
    return mesh;
  }

  function monogramTexture(letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.font = '900 150px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#16121f';
    ctx.fillText(letter, 128, 136);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  // ---------- buildings ----------
  const projectViews = new Map();

  projects.forEach((project) => {
    const group = new THREE.Group();
    group.position.set(project.x * SCALE, 0, project.y * SCALE);
    group.userData.projectId = project.id;
    const materials = [];
    const tracked = (options) => {
      const material = new THREE.MeshLambertMaterial({ ...options, transparent: true });
      materials.push(material);
      return material;
    };

    const isSpire = project.id === 'monad';
    const bodyH = project.h * SCALE;

    if (isSpire) {
      addBox(group, 4.6, 0.5, 3.8, 0, 0, 0, tracked({ color: '#4a4266' }));
      addBox(group, 3, 2.2, 2.5, 0, 0.5, 0, tracked({ color: COLORS.spireBody }));
      addBox(group, 2.1, 1.2, 1.8, 0, 2.7, 0, tracked({ color: COLORS.spireCap }));
      addBox(group, 1.1, 0.5, 1, 0, 3.9, 0, tracked({ color: COLORS.spireBody }));
      addBox(group, 0.12, 1.6, 0.12, 0, 4.4, 0, tracked({ color: COLORS.spireBody }), false);
      const tip = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42),
        tracked({ color: COLORS.spireCap, emissive: COLORS.spireCap, emissiveIntensity: 0.5 }),
      );
      tip.position.y = 6.4;
      group.add(tip);
    } else {
      addBox(group, 4.6, 0.35, 3.9, 0, 0, 0, tracked({ color: COLORS.pedestal }));
      addBox(group, 4.1, bodyH, 3.4, 0, 0.35, 0, tracked({ color: COLORS.body }));
      addBox(group, 4.1, 0.45, 3.4, 0, 0.35 + bodyH, 0, tracked({ color: project.color }));
      const monogram = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 2.1),
        tracked({ map: monogramTexture(project.abbr), transparent: true }),
      );
      monogram.material.alphaTest = 0.1;
      monogram.rotation.x = -Math.PI / 2;
      monogram.position.y = 0.35 + bodyH + 0.5;
      group.add(monogram);

      const beaconColor = beaconByProject[project.id];
      if (beaconColor) {
        const beacon = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.42, 0.42),
          tracked({ color: beaconColor, emissive: beaconColor, emissiveIntensity: 0.55 }),
        );
        beacon.position.set(0, 0.35 + bodyH + 1.1, 0);
        group.add(beacon);
      }
    }

    cityGroup.add(group);
    projectViews.set(project.id, {
      project,
      group,
      materials,
      topY: isSpire ? 6.9 : 0.35 + bodyH + 1,
      targetOpacity: 1,
    });
  });

  // ---------- selection & match rings ----------
  function flatRing(radiusInner, radiusOuter, fillColor, fillOpacity, strokeColor, strokeOpacity) {
    const group = new THREE.Group();
    group.rotation.x = -Math.PI / 2;
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(radiusInner, 48),
      new THREE.MeshBasicMaterial({ color: fillColor, transparent: true, opacity: fillOpacity, depthWrite: false }),
    );
    fill.position.y = 0.02;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radiusInner, radiusOuter, 48),
      new THREE.MeshBasicMaterial({ color: strokeColor, transparent: true, opacity: strokeOpacity, depthWrite: false }),
    );
    group.add(fill, ring);
    group.visible = false;
    scene.add(group);
    return group;
  }
  const selectedRing = flatRing(4.5, 4.95, '#c8acff', 0.12, '#c8acff', 0.95);
  const selectedOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.15, 0.55, 3.45)),
    new THREE.LineBasicMaterial({ color: '#c8acff', transparent: true, opacity: 0.95 }),
  );
  selectedOutline.visible = false;
  scene.add(selectedOutline);

  const matchRings = new Map();
  const matchRingFor = (id) => {
    if (!matchRings.has(id)) matchRings.set(id, flatRing(4.3, 4.7, '#a9d0ff', 0.06, '#a9d0ff', 0.7));
    return matchRings.get(id);
  };
  const matchBeacons = new Map();

  // ---------- relationship beams ----------
  const beamHitboxes = [];
  const beamViews = relationships.map((relationship) => {
    const from = projects.find((item) => item.id === relationship.from);
    const to = projects.find((item) => item.id === relationship.to);
    const a = new THREE.Vector3(from.x * SCALE, 2, from.y * SCALE);
    const b = new THREE.Vector3(to.x * SCALE, 2, to.y * SCALE);
    const nonFactual = relationship.evidenceState === 'AI-inferred' || relationship.evidenceState === 'illustrative';
    const sourced = relationship.dataMode === 'sourced-limited' && relationship.reviewStatus === 'approved';
    const beamColor = sourced ? '#8ebbd7' : nonFactual ? '#9d81bd' : '#7d7490';
    const material = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.24 });
    const group = new THREE.Group();
    const length = a.distanceTo(b);
    const direction = b.clone().sub(a).normalize();
    const angle = Math.atan2(b.z - a.z, b.x - a.x);

    if (nonFactual) {
      for (let offset = 0.8; offset < length - 0.8; offset += 2.1) {
        const segment = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.25, length - offset), 0.15, 0.15), material);
        segment.position.copy(a).addScaledVector(direction, offset);
        segment.rotation.y = -angle;
        group.add(segment);
      }
    } else {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(Math.max(length - 2.4, 1), 0.15, 0.15), material);
      beam.position.copy(a).add(b).multiplyScalar(0.5);
      beam.rotation.y = -angle;
      group.add(beam);
    }

    // Invisible, thicker hitbox so the thin beam is hoverable (raycast targets need volume;
    // the zero-opacity material keeps it visually absent).
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(length - 2.4, 1), 1.6, 1.6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitbox.position.copy(a).add(b).multiplyScalar(0.5);
    hitbox.rotation.y = -angle;
    hitbox.userData.relationshipId = relationship.id;
    group.add(hitbox);
    beamHitboxes.push(hitbox);

    scene.add(group);
    return { relationship, material, group };
  });

  // ---------- floating district buttons (one billboard sprite per island) ----------
  // Owner ask: «Надо сделать белые 3д кнопки над всеми 5 дистриктами» — the ground labels are
  // replaced by floating billboard buttons above each island. Content mirrors the district
  // panel (glyph, name, count); counts are data-driven from `projects` via the island groups.
  const DISTRICT_BUTTON_COLORS = {
    DeFi: '#9ad7c6',
    AI: '#91baff',
    Infrastructure: '#aa8ae8',
    Gaming: '#dbac80',
    Identity: '#d89cc9',
  };
  const DISTRICT_BUTTON_GLYPHS = {
    DeFi: '◫',
    AI: '✧',
    Infrastructure: '▥',
    Gaming: '⚄',
    Identity: '◎',
  };
  const districtButtons = [];
  ISLAND_GROUPS.forEach((island) => {
    if (island.key === '__monad') return;
    const label = island.key;
    const color = DISTRICT_BUTTON_COLORS[label] ?? '#aa8ae8';
    const glyph = DISTRICT_BUTTON_GLYPHS[label] ?? '◈';
    const text = `${label.toUpperCase()} · ${island.list.length}`;

    // One canvas per district, drawn once. Deterministic system monospace — web fonts may not
    // be loaded when the canvas draws.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = '700 44px ui-monospace, Menlo, monospace';
    ctx.font = font;
    const glyphWidth = ctx.measureText(`${glyph} `).width;
    const textWidth = ctx.measureText(text).width;
    const padding = 30;
    canvas.width = Math.ceil(glyphWidth + textWidth + padding * 2);
    canvas.height = 92;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, canvas.width - 3, canvas.height - 3, 22);
    ctx.fillStyle = 'rgba(10,10,16,0.88)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(glyph, padding, canvas.height / 2 + 2);
    ctx.fillStyle = '#f3edff';
    ctx.fillText(text, padding + glyphWidth, canvas.height / 2 + 2);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
      }),
    );
    // Always-on wayfinding, not geometry: exempt from depth testing and drawn above the
    // buildings (renderOrder) so tall towers never occlude the buttons. Altitude follows the
    // island's own skyline — maxTopY + 10 clears every rooftop name pill (a ~20px pill tops
    // out near topY + 6 at the default camera) — and world height 6 keeps the 44px canvas
    // type readable at the default camera (radius 300).
    sprite.renderOrder = 20;
    const maxTopY = Math.max(
      ...island.list.map((project) => (project.id === 'monad' ? 6.9 : 0.35 + project.h * SCALE + 1)),
    );
    sprite.position.set(island.cx, maxTopY + 10, island.cz);
    const worldH = 6.0;
    sprite.scale.set(worldH * (canvas.width / canvas.height), worldH, 1);
    sprite.userData.district = island.key;
    scene.add(sprite);
    districtButtons.push(sprite);
  });

  // ---------- filler fabric (seeded, never beside a project; scaled per island) ----------
  const fillerMaterials = [];
  const fillerMesh = (w, h, d, x, y, z, hex) => {
    const material = new THREE.MeshLambertMaterial({ color: hex, transparent: true });
    fillerMaterials.push(material);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  ISLAND_GROUPS.forEach((island) => {
    const grassCells = terrainCells.filter(
      (cell) => cell.island === island && !cell.plaza && !cell.sand,
    );
    const houseCap = Math.min(9, Math.round(grassCells.length / 42));
    const treeCap = Math.min(7, Math.round(grassCells.length / 55));
    let houses = 0;
    let trees = 0;
    grassCells.forEach((cell) => {
      const nearBuilding = island.list.some(
        (project) =>
          Math.abs(project.x * SCALE - cell.x) < 5 && Math.abs(project.y * SCALE - cell.z) < 4.4,
      );
      if (nearBuilding || cell.dist > island.radius - 2.4) return;
      const roll = HASH_SEED(cell.x * 7.13, cell.z * 3.71);
      if (roll > 0.962 && houses < houseCap) {
        houses += 1;
        if (HASH_SEED(cell.x, cell.z * 5) > 0.72) {
          const height = 2.6 + HASH_SEED(cell.x * 3, cell.z) * 2.2;
          fillerMesh(1.5, height, 1.5, cell.x, 0, cell.z, COLORS.tower);
          fillerMesh(1.55, 0.35, 1.55, cell.x, height, cell.z, COLORS.towerRoof);
        } else {
          fillerMesh(1.7, 1.1, 1.7, cell.x, 0, cell.z, COLORS.house);
          fillerMesh(1.75, 0.35, 1.75, cell.x, 1.1, cell.z, COLORS.houseRoof);
        }
      } else if (roll > 0.93 && roll <= 0.962 && trees < treeCap) {
        trees += 1;
        fillerMesh(0.45, 0.9, 0.45, cell.x, 0, cell.z, COLORS.trunk);
        fillerMesh(1.7, 1.2, 1.7, cell.x - 0.08, 0.9, cell.z - 0.08, COLORS.leafA);
        fillerMesh(1.25, 0.8, 1.25, cell.x + 0.06, 2.1, cell.z + 0.06, COLORS.leafB);
      }
    });
  });

  // ---------- boats + stars ----------
  [[-48, 52], [72, -30], [-20, -78]].forEach(([x, z]) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.5, 1),
      new THREE.MeshLambertMaterial({ color: COLORS.boatHull }),
    );
    hull.position.y = -0.95;
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.2),
      new THREE.MeshBasicMaterial({ color: COLORS.boatSail, side: THREE.DoubleSide }),
    );
    sail.position.set(0.2, 0.1, 0);
    boat.add(hull, sail);
    boat.position.set(x, 0, z);
    boat.rotation.y = HASH_SEED(x, z) * Math.PI;
    scene.add(boat);
  });
  {
    const positions = [];
    for (let i = 0; i < 70; i += 1) {
      const angle = HASH_SEED(i * 3.1, 7.7) * Math.PI * 2;
      const radius = 130 + HASH_SEED(i, i * 2.3) * 90;
      positions.push(Math.cos(angle) * radius, 40 + HASH_SEED(i * 1.7, i) * 70, Math.sin(angle) * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    scene.add(new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: '#cfc3ee', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.5 }),
    ));
  }

  // ---------- DOM labels ----------
  const labelElements = new Map();
  projects.forEach((project) => {
    const element = document.createElement('div');
    element.className = 'city-label';
    element.textContent = project.name;
    labelContainer.appendChild(element);
    labelElements.set(project.id, element);
  });
  const anchor = new THREE.Vector3();

  // ---------- controls ----------
  const DEFAULT_VIEW = { azimuth: Math.PI / 4, elevation: 0.62, radius: 300 };
  const control = {
    azimuth: DEFAULT_VIEW.azimuth, elevation: DEFAULT_VIEW.elevation, radius: DEFAULT_VIEW.radius,
    azimuthGoal: DEFAULT_VIEW.azimuth, elevationGoal: DEFAULT_VIEW.elevation, radiusGoal: DEFAULT_VIEW.radius,
    target: new THREE.Vector3(0, 1.2, 0), targetGoal: new THREE.Vector3(0, 1.2, 0),
  };

  function applyCamera() {
    control.azimuth += (control.azimuthGoal - control.azimuth) * 0.1;
    control.elevation += (control.elevationGoal - control.elevation) * 0.1;
    control.radius += (control.radiusGoal - control.radius) * 0.1;
    control.target.lerp(control.targetGoal, 0.1);
    const sinE = Math.sin(control.elevation);
    camera.position.set(
      control.target.x + control.radius * sinE * Math.cos(control.azimuth),
      control.target.y + control.radius * Math.sin(control.elevation),
      control.target.z + control.radius * sinE * Math.sin(control.azimuth),
    );
    camera.lookAt(control.target);
  }

  function panBy(dx, dy) {
    const scale = control.radius * 0.0016;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();
    control.targetGoal.addScaledVector(right, dx * scale).addScaledVector(forward, -dy * scale);
    control.targetGoal.x = Math.min(60, Math.max(-60, control.targetGoal.x));
    control.targetGoal.z = Math.min(60, Math.max(-60, control.targetGoal.z));
  }

  const raycaster = new THREE.Raycaster();
  const pointers = new Map();
  let pinchDistance = 0;
  let movedDistance = 0;
  let introSkipped = reducedMotion;
  let hoveredId = null;

  function raycastProject(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cityGroup.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && !object.userData.projectId) object = object.parent;
      if (object) return { id: object.userData.projectId, distance: hit.distance };
    }
    return null;
  }

  // ---------- relationship beam hover tooltip ----------
  // Disclosure only: the tooltip names the relationship and its evidence state; it never
  // implies verification, endorsement, or onchain fact.
  const beamTooltip = document.createElement('div');
  beamTooltip.className = 'beam-tooltip';
  beamTooltip.setAttribute('role', 'tooltip');
  beamTooltip.hidden = true;
  container.appendChild(beamTooltip);
  let hoveredBeamId = null;
  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);

  function raycastBeam(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(beamHitboxes, false);
    return hits.length ? hits[0].object.userData.relationshipId : null;
  }

  function raycastDistrictButton(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(districtButtons, false);
    return hits.length
      ? { district: hits[0].object.userData.district, distance: hits[0].distance }
      : null;
  }

  function beamBaseOpacity(view) {
    const { relationship } = view;
    const active = relationship.from === state.selected || relationship.to === state.selected;
    const match = state.highlightRelationships.has(relationship.id);
    const fromVisible = isVisible(projects.find((item) => item.id === relationship.from));
    const toVisible = isVisible(projects.find((item) => item.id === relationship.to));
    return !state.showLinks ? 0.02
      : !fromVisible || !toVisible ? 0.03
      : match ? 1
      : active ? 0.85
      : 0.24;
  }

  function fillBeamTooltip(relationship) {
    const from = projects.find((item) => item.id === relationship.from);
    const to = projects.find((item) => item.id === relationship.to);
    const sourced = relationship.dataMode === 'sourced-limited' && relationship.reviewStatus === 'approved';
    const stateInfo = RELATIONSHIP_STATES[relationship.evidenceState];
    const typeLabel = RELATIONSHIP_TYPES[relationship.type]?.label ?? relationship.type;
    const stateLabel = sourced
      ? `Sourced · ${relationship.claimStatus ?? 'sourced-limited'}`
      : stateInfo?.label ?? relationship.evidenceState;
    const meaning = sourced
      ? 'Limited source-backed record; supports only its cited scope — not verification, endorsement, or current operation.'
      : stateInfo?.meaning ?? 'Illustrative presentation; asserts no factual relationship.';
    beamTooltip.innerHTML =
      `<strong>${escapeHtml(from?.name ?? relationship.from)} ↔ ${escapeHtml(to?.name ?? relationship.to)}</strong>` +
      `<span>${escapeHtml(typeLabel)} · ${escapeHtml(stateLabel)}</span>` +
      `<small>${escapeHtml(meaning)}</small>`;
  }

  function positionBeamTooltip(event) {
    const rect = container.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 130), Math.max(rect.width - 130, 130));
    const y = event.clientY - rect.top;
    const below = y < 96;
    beamTooltip.style.left = `${x}px`;
    beamTooltip.style.top = `${y}px`;
    beamTooltip.classList.toggle('below', below);
  }

  function setBeamHover(relationshipId, event) {
    if (relationshipId === hoveredBeamId) {
      if (relationshipId && event) positionBeamTooltip(event);
      return;
    }
    if (hoveredBeamId) {
      const previous = beamViews.find((view) => view.relationship.id === hoveredBeamId);
      if (previous) previous.material.opacity = beamBaseOpacity(previous);
    }
    hoveredBeamId = relationshipId;
    if (relationshipId) {
      const view = beamViews.find((item) => item.relationship.id === relationshipId);
      if (view) view.material.opacity = Math.max(beamBaseOpacity(view), 0.6);
      fillBeamTooltip(view.relationship);
      beamTooltip.hidden = false;
      requestAnimationFrame(() => beamTooltip.classList.add('visible'));
      positionBeamTooltip(event);
    } else {
      beamTooltip.classList.remove('visible');
      beamTooltip.hidden = true;
    }
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedDistance = 0;
    introSkipped = true;
    setBeamHover(null);
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
      const hit = raycastProject(event);
      // Buttons float above the skyline, so a ray through a button often continues into a
      // building behind it. The frontmost target wins: a building in front of a button still
      // keeps the click; a building behind it leaves the button clickable.
      const buttonHit = raycastDistrictButton(event);
      const buttonFront = buttonHit && (!hit || buttonHit.distance < hit.distance);
      const projectId = buttonFront ? null : hit?.id ?? null;
      // Buildings keep hover priority; beams only hover where no building or button is in
      // front of the cursor.
      const beamHit = projectId || buttonFront ? null : raycastBeam(event);
      if (projectId !== hoveredId) {
        hoveredId = projectId;
        labelElements.forEach((element, id) => element.classList.toggle('hover', id === projectId));
      }
      setBeamHover(beamHit, event);
      renderer.domElement.style.cursor = projectId || buttonHit || beamHit ? 'pointer' : 'grab';
      return;
    }
    setBeamHover(null);
    const previous = pointers.get(event.pointerId);
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    movedDistance += Math.hypot(dx, dy);
    previous.x = event.clientX;
    previous.y = event.clientY;

    if (pointers.size === 1) {
      if (event.shiftKey) panBy(dx, dy);
      else {
        control.azimuthGoal -= dx * 0.005;
        control.elevationGoal = Math.min(1.31, Math.max(0.28, control.elevationGoal + dy * 0.004));
      }
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinchDistance) {
        control.radiusGoal = Math.min(215, Math.max(38, control.radiusGoal * (pinchDistance / distance)));
      }
      pinchDistance = distance;
    }
  });

  function endPointer(event) {
    if (pointers.size === 1 && movedDistance < 6) {
      const hit = raycastProject(event);
      // Same frontmost-target rule as hover: the button wins only when no building is in
      // front of it. Clicking it flies the camera to that island (no selection change).
      const buttonHit = raycastDistrictButton(event);
      const buttonFront = buttonHit && (!hit || buttonHit.distance < hit.distance);
      if (buttonFront) {
        focusIsland(buttonHit.district);
      } else if (hit) {
        onSelect(hit.id);
      }
    }
    pointers.delete(event.pointerId);
    pinchDistance = 0;
  }
  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', endPointer);
  renderer.domElement.addEventListener('pointerleave', () => {
    setBeamHover(null);
  });
  renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    control.radiusGoal = Math.min(215, Math.max(38, control.radiusGoal * Math.exp(event.deltaY * 0.0011)));
  }, { passive: false });
  container.addEventListener('pointerdown', () => { introSkipped = true; }, { once: true, capture: true });

  // ---------- state sync ----------
  const state = {
    selected: 'monad', filter: 'All districts', showLinks: true,
    highlightProjects: new Set(), highlightRelationships: new Set(), graph: false,
  };
  let running = true;
  const isVisible = (project) => state.filter === 'All districts' || project.district === state.filter;

  function sync(next) {
    Object.assign(state, next);
    running = !state.graph;
    container.classList.toggle('is-graph', state.graph);
    if (state.graph) {
      labelElements.forEach((element) => { element.style.opacity = '0'; });
      setBeamHover(null);
    }

    projectViews.forEach((view, id) => {
      const projectVisible = isVisible(view.project);
      const active = id === state.selected;
      const match = state.highlightProjects.has(id);
      view.targetOpacity = !projectVisible ? 0.08
        : state.highlightProjects.size && !active && !match ? 0.3
        : 1;
      const label = labelElements.get(id);
      label.classList.toggle('active', active);
      label.classList.toggle('match', match && !active);
      label.classList.toggle('dim', !projectVisible || (state.highlightProjects.size > 0 && !active && !match));
    });

    const selectedView = projectViews.get(state.selected);
    if (selectedView) {
      const { x, z } = selectedView.group.position;
      selectedRing.visible = !state.graph;
      selectedRing.position.set(x, 0.07, z);
      selectedOutline.visible = !state.graph;
      selectedOutline.position.set(x, selectedView.topY - 1.55, z);
    }

    projectViews.forEach((view, id) => {
      const match = state.highlightProjects.has(id) && id !== state.selected && isVisible(view.project);
      const ring = matchRingFor(id);
      ring.visible = match && !state.graph;
      if (match) ring.position.set(view.group.position.x, 0.07, view.group.position.z);

      let beacon = matchBeacons.get(id);
      if (match && !beacon) {
        beacon = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.75),
          new THREE.MeshBasicMaterial({ color: '#a9d0ff' }),
        );
        beacon.position.y = view.topY + 1.5;
        view.group.add(beacon);
        matchBeacons.set(id, beacon);
      } else if (!match && beacon) {
        beacon.removeFromParent();
        matchBeacons.delete(id);
      }
    });

    beamViews.forEach((view) => {
      view.material.opacity = Math.max(
        beamBaseOpacity(view),
        view.relationship.id === hoveredBeamId && !state.graph && state.showLinks ? 0.6 : 0,
      );
      view.group.visible = !state.graph && state.showLinks;
    });
  }

  function focusProject(id, { neighborhood = false } = {}) {
    const view = projectViews.get(id);
    if (!view) return;
    control.targetGoal.set(view.group.position.x, 1.4, view.group.position.z);
    control.radiusGoal = neighborhood ? 58 : 92;
  }

  // District navigation: frame the whole island (radius-sized, clamped) without changing
  // the project selection — the district filter already handles highlighting.
  function focusIsland(district) {
    const island = ISLAND_GROUPS.find((group) => group.key === district);
    if (!island) return;
    control.targetGoal.set(island.cx, 1.2, island.cz);
    control.radiusGoal = Math.min(150, Math.max(44, island.radius * 2.1 + 26));
  }

  function zoomBy(factor) {
    control.radiusGoal = Math.min(215, Math.max(38, control.radiusGoal * factor));
  }

  function reset() {
    control.targetGoal.set(0, 1.2, 0);
    control.azimuthGoal = DEFAULT_VIEW.azimuth;
    control.elevationGoal = DEFAULT_VIEW.elevation;
    control.radiusGoal = DEFAULT_VIEW.radius;
  }

  // ---------- intro ----------
  const introStart = performance.now();
  if (!reducedMotion) projectViews.forEach((view) => { view.group.scale.y = 0.001; });

  // ---------- render loop ----------
  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;

    if (!introSkipped) {
      const elapsed = performance.now() - introStart;
      let done = true;
      projectViews.forEach((view, id) => {
        const index = projects.findIndex((project) => project.id === id);
        const progress = Math.min(1, Math.max(0, (elapsed - 200 - Math.min(index, 45) * 70) / 650));
        if (progress < 1) done = false;
        view.group.scale.y = Math.max(0.001, 1 - Math.pow(1 - progress, 3));
      });
      control.azimuth = control.azimuthGoal + (1 - Math.min(1, elapsed / 1900)) * 0.35;
      if (done && elapsed > 2000) introSkipped = true;
    } else {
      projectViews.forEach((view) => { if (view.group.scale.y !== 1) view.group.scale.y = 1; });
    }

    applyCamera();

    projectViews.forEach((view) => {
      view.materials.forEach((material) => {
        material.opacity += (view.targetOpacity - material.opacity) * 0.12;
      });
    });
    fillerMaterials.forEach((material) => {
      material.opacity += ((state.highlightProjects.size ? 0.45 : 1) - material.opacity) * 0.12;
    });

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const targetWidth = Math.round(width * renderer.getPixelRatio());
    const targetHeight = Math.round(height * renderer.getPixelRatio());
    if (renderer.domElement.width !== targetWidth || renderer.domElement.height !== targetHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    // Label LOD (scale plan §6): at archipelago range only the selected / navigator-matched /
    // hovered buildings plus two "landmark" buildings per district keep name pills; the full
    // label layer returns as the camera closes in. Floating district buttons stay always-on.
    const landmarkLabels = (() => {
      const landmarks = new Set(['monad']);
      const perDistrict = new Map();
      projects.forEach((project) => {
        if (project.id === 'monad') return;
        if (!perDistrict.has(project.district)) perDistrict.set(project.district, []);
        perDistrict.get(project.district).push(project.id);
      });
      perDistrict.forEach((list) => list.slice(0, 2).forEach((id) => landmarks.add(id)));
      return landmarks;
    })();
    const labelsAtFullDetail = control.radius < 95;

    projectViews.forEach((view, id) => {
      const element = labelElements.get(id);
      const prominent =
        id === state.selected ||
        state.highlightProjects.has(id) ||
        hoveredId === id ||
        landmarkLabels.has(id);
      const showLabel =
        isVisible(view.project) &&
        !state.graph &&
        (labelsAtFullDetail
          ? view.targetOpacity > 0.5 || id === state.selected
          : prominent);
      anchor.set(view.group.position.x, view.topY + 1.2, view.group.position.z).project(camera);
      const onScreen = anchor.z < 1;
      element.style.opacity = showLabel && onScreen ? (id === state.selected ? '1' : '0.85') : '0';
      element.style.transform = `translate(-50%, -100%) translate(${((anchor.x + 1) / 2) * width}px, ${((1 - anchor.y) / 2) * height}px)`;
    });
  }
  requestAnimationFrame(frame);

  return { sync, focusProject, focusIsland, zoomBy, reset };
}
