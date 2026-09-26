import * as THREE from './vendor/three.module.min.js';

// Voxel Island City View (visual architecture v2, docs/VOXEL_ISLAND_SPEC.md).
// Deterministic: every placement derives from project data or a seeded hash.

const SCALE = 0.1;
const ISLAND_R = 31.5;
const HASH_SEED = (x, z) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const roundedMetric = (x, z) => {
  const dx = Math.abs(x), dz = Math.abs(z);
  return Math.max(dx, dz) + 0.35 * Math.min(dx, dz);
};
const insideIsland = (x, z) => roundedMetric(x, z) < ISLAND_R + (HASH_SEED(x, z) - 0.5) * 1.6;
const nearLine = (v, c) => Math.abs(v - c) < 0.5;
const isRoadCell = (x, z) =>
  insideIsland(x, z) && roundedMetric(x, z) < ISLAND_R - 1.6 &&
  (nearLine(x, 0) || nearLine(z, 0) || nearLine(x, 14) || nearLine(x, -14) || nearLine(z, 20) ||
    Math.abs(roundedMetric(x, z) - 26.5) < 0.6);
const isPlazaCell = (x, z) => roundedMetric(x, z) < 5;

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
  scene.fog = new THREE.Fog('#0a0a0f', 150, 340);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 600);

  scene.add(new THREE.AmbientLight('#8a7fb8', 0.75));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(35, 60, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 160 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---------- terrain ----------
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(160, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.6;
  scene.add(water);

  const cellGeometry = new THREE.BoxGeometry(1, 2, 1);
  cellGeometry.translate(0, -1, 0);
  const terrainCells = [];
  for (let x = -36; x <= 36; x += 1) {
    for (let z = -36; z <= 36; z += 1) {
      if (!insideIsland(x, z)) continue;
      const coast = !(insideIsland(x + 1, z) && insideIsland(x - 1, z) && insideIsland(x, z + 1) && insideIsland(x, z - 1));
      const sand = coast || roundedMetric(x, z) > ISLAND_R - 1.3 + (HASH_SEED(x * 3, z * 7) - 0.5);
      let cellColor = COLORS.sand;
      if (!sand) {
        if (isPlazaCell(x, z)) cellColor = COLORS.plaza;
        else if (isRoadCell(x, z)) cellColor = COLORS.road;
        else cellColor = (x + z) % 2 ? COLORS.grassA : COLORS.grassB;
        if (!isRoadCell(x, z) && !isPlazaCell(x, z) && HASH_SEED(x * 5, z * 11) > 0.93) cellColor = COLORS.grassC;
      }
      terrainCells.push({ x, z, cellColor });
    }
  }
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

    scene.add(group);
    return { relationship, material, group };
  });

  // ---------- district labels ----------
  [
    { x: -14, z: 17.2, label: 'DeFi', color: '#9ad7c6' },
    { x: 18.3, z: 11, label: 'AI', color: '#91baff' },
    { x: 4.5, z: -6, label: 'Infrastructure', color: '#aa8ae8' },
    { x: 13.5, z: 24, label: 'Gaming', color: '#dbac80' },
    { x: 4.5, z: -15.5, label: 'Identity', color: '#d89cc9' },
  ].forEach((zone) => {
    const width = 64 + zone.label.length * 30;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '700 30px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = zone.color;
    ctx.fillText(zone.label.toUpperCase().split('').join('\u200a'), width / 2, 34);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4 * (width / 64), 4),
      // District labels are wayfinding, not geometry: exempt them from depth testing so
      // tall buildings never occlude them (scale plan: district ground labels stay always-on).
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        depthTest: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(zone.x, 0.09, zone.z);
    mesh.renderOrder = 10;
    scene.add(mesh);
  });

  // ---------- filler fabric (seeded, never beside a project) ----------
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
  let houses = 0;
  let trees = 0;
  for (let x = -34; x <= 34 && (houses < 38 || trees < 28); x += 1) {
    for (let z = -34; z <= 34 && (houses < 38 || trees < 28); z += 1) {
      if (!insideIsland(x, z) || isRoadCell(x, z) || isPlazaCell(x, z)) continue;
      if (roundedMetric(x, z) > ISLAND_R - 2.6) continue;
      if (projects.some((project) => Math.abs(project.x * SCALE - x) < 5 && Math.abs(project.y * SCALE - z) < 4.4)) continue;
      const roll = HASH_SEED(x * 7.13, z * 3.71);
      if (roll > 0.962 && houses < 38) {
        houses += 1;
        if (HASH_SEED(x, z * 5) > 0.72) {
          const height = 2.6 + HASH_SEED(x * 3, z) * 2.2;
          fillerMesh(1.5, height, 1.5, x, 0, z, COLORS.tower);
          fillerMesh(1.55, 0.35, 1.55, x, height, z, COLORS.towerRoof);
        } else {
          fillerMesh(1.7, 1.1, 1.7, x, 0, z, COLORS.house);
          fillerMesh(1.75, 0.35, 1.75, x, 1.1, z, COLORS.houseRoof);
        }
      } else if (roll > 0.93 && roll <= 0.962 && trees < 28) {
        trees += 1;
        fillerMesh(0.45, 0.9, 0.45, x, 0, z, COLORS.trunk);
        fillerMesh(1.7, 1.2, 1.7, x - 0.08, 0.9, z - 0.08, COLORS.leafA);
        fillerMesh(1.25, 0.8, 1.25, x + 0.06, 2.1, z + 0.06, COLORS.leafB);
      }
    }
  }

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
  const DEFAULT_VIEW = { azimuth: Math.PI / 4, elevation: 0.62, radius: 96 };
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
    control.targetGoal.x = Math.min(26, Math.max(-26, control.targetGoal.x));
    control.targetGoal.z = Math.min(26, Math.max(-26, control.targetGoal.z));
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
      if (object) return object.userData.projectId;
    }
    return null;
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedDistance = 0;
    introSkipped = true;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
      const hit = raycastProject(event);
      if (hit !== hoveredId) {
        hoveredId = hit;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
        labelElements.forEach((element, id) => element.classList.toggle('hover', id === hit));
      }
      return;
    }
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
        control.radiusGoal = Math.min(160, Math.max(45, control.radiusGoal * (pinchDistance / distance)));
      }
      pinchDistance = distance;
    }
  });

  function endPointer(event) {
    if (pointers.size === 1 && movedDistance < 6) {
      const hit = raycastProject(event);
      if (hit) onSelect(hit);
    }
    pointers.delete(event.pointerId);
    pinchDistance = 0;
  }
  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', endPointer);
  renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    control.radiusGoal = Math.min(160, Math.max(45, control.radiusGoal * Math.exp(event.deltaY * 0.0011)));
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
      const { relationship } = view;
      const active = relationship.from === state.selected || relationship.to === state.selected;
      const match = state.highlightRelationships.has(relationship.id);
      const fromVisible = isVisible(projects.find((item) => item.id === relationship.from));
      const toVisible = isVisible(projects.find((item) => item.id === relationship.to));
      view.material.opacity = !state.showLinks ? 0.02
        : !fromVisible || !toVisible ? 0.03
        : match ? 1
        : active ? 0.85
        : 0.24;
      view.group.visible = !state.graph && state.showLinks;
    });
  }

  function focusProject(id, { neighborhood = false } = {}) {
    const view = projectViews.get(id);
    if (!view) return;
    control.targetGoal.set(view.group.position.x, 1.4, view.group.position.z);
    control.radiusGoal = neighborhood ? 50 : 62;
  }

  function zoomBy(factor) {
    control.radiusGoal = Math.min(160, Math.max(45, control.radiusGoal * factor));
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
        const progress = Math.min(1, Math.max(0, (elapsed - 200 - index * 70) / 650));
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

    projectViews.forEach((view, id) => {
      const element = labelElements.get(id);
      const showLabel = isVisible(view.project) && !state.graph && (view.targetOpacity > 0.5 || id === state.selected);
      anchor.set(view.group.position.x, view.topY + 1.2, view.group.position.z).project(camera);
      const onScreen = anchor.z < 1;
      element.style.opacity = showLabel && onScreen ? (id === state.selected ? '1' : '0.85') : '0';
      element.style.transform = `translate(-50%, -100%) translate(${((anchor.x + 1) / 2) * width}px, ${((1 - anchor.y) / 2) * height}px)`;
    });
  }
  requestAnimationFrame(frame);

  return { sync, focusProject, zoomBy, reset };
}
