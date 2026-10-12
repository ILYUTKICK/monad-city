import * as THREE from './vendor/three.module.min.js';
import {
  formatDistrictRouteTooltip,
  formatRelationshipGroupTooltip,
  formatRelationshipTooltip,
} from './relationship-tooltip.js';
import { placeLabels, invalidateLabelMeasurements } from './city-label-layout.js';
import { buildProjectBuilding, buildMonadComplex, buildingFootprint, setBuildingEmissive, hashId } from './city-buildings.js';
import { createLighting, createWater, createIslandRim, createIslandReflection, createVegetation, createLamps } from './city-environment.js';

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
  grassA: '#332e4a',
  grassB: '#312d45',
  grassC: '#2a2637',
  road: '#3d364c',
  plaza: '#453d63',
  sand: '#3a324c',
  water: '#171421',
  body: '#5b5075',
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
  districtLinks = [],
  layoutPositions = null,
  quarters = [],
  getExclusions = null,
  onSelect,
  onDistrictActivate = null,
  reducedMotion = false,
  beaconByProject = {},
}) {
  // Presentation-only layout (quarters from src/city-layout.js). Buildings read their
  // position through posOf so the factual project profile never carries view geometry.
  const posOf = (project) => layoutPositions?.get(project.id) ?? project;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'city-canvas';
  container.appendChild(renderer.domElement);
  labelContainer.removeAttribute('aria-hidden');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#090a12');
  scene.fog = new THREE.Fog('#090a12', 900, 2600);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 3000);
  // Night lighting rig: one soft moon key with shadows, hemisphere fill, and a cool counter
  // fill so facades never read as solid black. The rig extent follows the layout span.
  const cityExtent = (() => {
    let extent = 60;
    projects.forEach((project) => {
      const placed = posOf(project);
      extent = Math.max(extent, Math.abs(placed.x) * SCALE + 40, Math.abs(placed.y) * SCALE + 40);
    });
    return extent;
  })();
  const rig = createLighting({ extent: cityExtent });
  scene.add(rig);

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
      const cx = (list.reduce((sum, p) => sum + posOf(p).x, 0) / list.length) * SCALE;
      const cz = (list.reduce((sum, p) => sum + posOf(p).y, 0) / list.length) * SCALE;
      const farthest = Math.max(...list.map((p) => Math.hypot(posOf(p).x * SCALE - cx, posOf(p).y * SCALE - cz)));
      const radius = Math.max(farthest + 4.4, key === '__monad' ? 6.2 : 7.6);
      const minX = Math.min(...list.map((p) => posOf(p).x * SCALE)) - 6;
      const maxX = Math.max(...list.map((p) => posOf(p).x * SCALE)) + 6;
      const minZ = Math.min(...list.map((p) => posOf(p).y * SCALE)) - 6;
      const maxZ = Math.max(...list.map((p) => posOf(p).y * SCALE)) + 6;
      return { key, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, radius, list,
        minX, maxX, minZ, maxZ, halfX: (maxX - minX) / 2, halfZ: (maxZ - minZ) / 2 };
    });
  })();

  scene.add(createWater({ radius: 700 }));
  // Built-once district groups filter every shore, street, tree, lamp and reflection.
  const avoidSpots = projects.map((project) => {
    const placed = posOf(project);
    return { x: placed.x * SCALE, z: placed.y * SCALE, r: buildingFootprint(project) + 0.45 };
  });
  const environmentViews = new Map();
  ISLAND_GROUPS.forEach((island) => {
    const group = new THREE.Group();
    group.add(createIslandRim({
      center: { x: island.cx, z: island.cz }, halfX: island.halfX, halfZ: island.halfZ,
      seed: island.key, quarters: quarters.filter((quarter) => quarter.district === island.key),
      projects: island.list.map((project) => ({ x: posOf(project).x * SCALE, z: posOf(project).y * SCALE })),
    }));
    group.add(createIslandReflection({ island }));
    if (island.key !== '__monad') group.add(createVegetation({ islands: [island], avoid: avoidSpots }));
    group.add(createLamps({ islands: [island], avoid: avoidSpots }));
    scene.add(group);
    environmentViews.set(island.key, group);
  });

  // ---------- shared helpers ----------
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  // ---------- buildings ----------
  // Procedural families (src/city-buildings.js): family, height tier and facade texture are
  // derived from the project ID. They are presentation — never trust, TVL, activity or rank.
  const projectViews = new Map();

  projects.forEach((project) => {
    const group = new THREE.Group();
    const placed = posOf(project);
    group.position.set(placed.x * SCALE, 0, placed.y * SCALE);
    group.userData.projectId = project.id;
    const materials = [];

    const building = project.id === 'monad' ? buildMonadComplex() : buildProjectBuilding(project).group;
    building.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const cloneMaterial = (material) => {
        const copy = material.clone();
        copy.transparent = false;
        if (!materials.includes(copy)) materials.push(copy);
        return copy;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneMaterial)
        : cloneMaterial(object.material);
      object.castShadow = true;
      object.receiveShadow = true;
    });
    group.add(building);

    const bounds = new THREE.Box3().setFromObject(group);
    const topY = Math.max(bounds.max.y, 2);
    const footprint = project.id === 'monad' ? 3.4 : buildingFootprint(project);

    cityGroup.add(group);
    projectViews.set(project.id, {
      project,
      group,
      materials,
      baseColors: materials.map((material) => material.color.clone()),
      baseEmissive: materials.map((material) => material.emissiveIntensity ?? 0),
      topY,
      footprint,
      targetOpacity: 1,
      dim: 1,
      dimLast: 1,
      dimGoal: 1,
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
  const selectedRing = flatRing(3.0, 3.3, '#d6c0ff', 0.1, '#d6c0ff', 0.85);
  const selectedOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.15, 0.55, 3.45)),
    new THREE.LineBasicMaterial({ color: '#d6c0ff', transparent: true, opacity: 1 }),
  );
  selectedOutline.visible = false;
  scene.add(selectedOutline);

  const matchRings = new Map();
  const matchRingFor = (id) => {
    if (!matchRings.has(id)) matchRings.set(id, flatRing(3.0, 3.25, '#c3b3e1', 0.08, '#c3b3e1', 0.7));
    return matchRings.get(id);
  };
  const matchBeacons = new Map();

  // ---------- relationship beams ----------
  const beamHitboxes = [];
  const beamViews = relationships.map((relationship) => {
    const from = projects.find((item) => item.id === relationship.from);
    const to = projects.find((item) => item.id === relationship.to);
    const fromPos = posOf(from);
    const toPos = posOf(to);
    const a = new THREE.Vector3(fromPos.x * SCALE, 2, fromPos.y * SCALE);
    const b = new THREE.Vector3(toPos.x * SCALE, 2, toPos.y * SCALE);
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
    return { relationship, material, group, hitbox, shown: true };
  });

  // ---------- district aggregate routes ----------
  // Owner ask: wide Monad↔district routes. A district is a navigation category, not a
  // project, so no relationship record exists for it — each route is a runtime aggregate of
  // the district's approved project records and its tooltip discloses exactly that. It never
  // renders as a sourced relationship. The route is a soft curved band (reference §4.1):
  // navigation, not evidence.
  const districtBeamHitboxes = [];
  const districtBeamViews = districtLinks.flatMap((link) => {
    const monad = projects.find((item) => item.id === 'monad');
    const island = ISLAND_GROUPS.find((group) => group.key === link.district);
    if (!monad || !island) return [];
    const monadPos = posOf(monad);
    const a = new THREE.Vector3(monadPos.x * SCALE, 0.8, monadPos.y * SCALE);
    const b = new THREE.Vector3(island.cx, 0.8, island.cz);
    const distance = a.distanceTo(b);
    const lateral = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize();
    const mid = a.clone().add(b).multiplyScalar(0.5)
      .addScaledVector(lateral, distance * 0.12 * (hashId(`route:${link.district}`, 61) > 0.5 ? 1 : -1))
      .setY(1.2 + distance * 0.015);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const material = new THREE.MeshBasicMaterial({ color: '#7d71a8', transparent: true, opacity: 0.14 });
    const group = new THREE.Group();
    const width = Math.min(0.8, 0.3 + distance * 0.003);
    const band = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, width, 8), material);
    band.position.y = -width * 0.72; // most of the band sinks into the ground: a road, not a wall
    group.add(band);
    const hitbox = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, Math.max(2.6, width + 1.4), 5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitbox.userData.districtLink = link;
    group.add(hitbox);
    districtBeamHitboxes.push(hitbox);
    scene.add(group);
    return [{ link, material, group, hitbox, shown: true }];
  });

  // ---------- quarter labels (presentation-only navigation, never evidence) ----------
  // Quarter names come from the deterministic layout map, not from a parallel classifier.
  const quarterLabelElements = quarters.map((quarter) => {
    const element = document.createElement('div');
    element.className = 'city-label quarter';
    element.setAttribute('role', 'button');
    element.tabIndex = -1;
    element.textContent = `${quarter.label} · ${quarter.count}`;
    // Quarters are clickable navigation: click frames the block, a second click returns to
    // the whole district. Pure camera framing — never a filter or an evidence claim.
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      if (framing?.kind === 'quarter' && framing.id === quarter.id) focusIsland(quarter.district);
      else focusQuarter(quarter);
    });
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        element.click();
      }
    });
    labelContainer.appendChild(element);
    return { element, quarter };
  });

  // Static degree table: drives the high-degree emphasis cap (no fan repaints).
  const activeDegreeByProject = (() => {
    const degrees = new Map();
    relationships.forEach((relationship) => {
      degrees.set(relationship.from, (degrees.get(relationship.from) ?? 0) + 1);
      degrees.set(relationship.to, (degrees.get(relationship.to) ?? 0) + 1);
    });
    return degrees;
  })();

  // ---------- district callouts (DOM text + thin leader lines, brief §8) ----------
  // District names are screen-space text with a 1px two-segment leader and a dot at the
  // island edge — no billboard rectangles. Clicking a callout opens the district.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const calloutOverlay = document.createElementNS(SVG_NS, 'svg');
  calloutOverlay.classList.add('city-callout-lines');
  calloutOverlay.setAttribute('aria-hidden', 'true');
  labelContainer.appendChild(calloutOverlay);
  const districtCallouts = [];
  ISLAND_GROUPS.filter((island) => island.key !== '__monad').forEach((island) => {
    const element = document.createElement('div');
    element.className = 'district-callout';
    element.dataset.district = island.key;
    const count = projects.filter((project) => project.district === island.key).length;
    element.dataset.summary = island.key === 'Infrastructure' ? `${count} incl. Monad` : `${count} ${count === 1 ? 'project' : 'projects'}`;
    element.innerHTML = `<strong>${island.key}</strong><span>${count} ${count === 1 ? 'project' : 'projects'}${island.key === 'Infrastructure' ? ' incl. Monad' : ''}</span>`;
    element.setAttribute('role', 'button');
    element.tabIndex = 0;
    element.setAttribute('aria-label', `Explore ${island.key}, ${count} projects${island.key === 'Infrastructure' ? ' including central Monad' : ''}`);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onDistrictActivate?.(island.key);
      }
    });
    element.addEventListener('click', () => onDistrictActivate?.(island.key));
    labelContainer.appendChild(element);
    const polyline = document.createElementNS(SVG_NS, 'polyline');
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '2.6');
    calloutOverlay.append(polyline, dot);
    // Leader anchors to the island edge facing away from the city center (deterministic).
    const direction = new THREE.Vector2(island.cx, island.cz);
    if (direction.lengthSq() < 0.01) direction.set(0.4, -0.9);
    direction.normalize();
    const anchor = new THREE.Vector3(
      island.cx + direction.x * (island.halfX + 2.5),
      0.9,
      island.cz + direction.y * (island.halfZ + 2.5),
    );
    districtCallouts.push({ element, polyline, dot, island, anchor, district: island.key });
  });
  let districtCalloutsAllowed = true;

  function setDistrictButtonsVisible(visible) {
    districtCalloutsAllowed = visible;
  }

  // ---------- DOM labels ----------
  const labelElements = new Map();
  projects.forEach((project) => {
    const element = document.createElement('div');
    element.className = 'city-label';
    element.setAttribute('aria-hidden', 'true');
    element.textContent = project.name;
    labelContainer.appendChild(element);
    labelElements.set(project.id, element);
  });
  const anchor = new THREE.Vector3();

  // ---------- controls ----------
  const DEFAULT_VIEW = { azimuth: Math.PI / 4, elevation: 0.72, radius: 320 };
  const MAX_RADIUS = 1200;
  const control = {
    azimuth: DEFAULT_VIEW.azimuth, elevation: DEFAULT_VIEW.elevation, radius: DEFAULT_VIEW.radius,
    azimuthGoal: DEFAULT_VIEW.azimuth, elevationGoal: DEFAULT_VIEW.elevation, radiusGoal: DEFAULT_VIEW.radius,
    target: new THREE.Vector3(0, 1.2, 0), targetGoal: new THREE.Vector3(0, 1.2, 0),
  };

  function applyCamera() {
    const progress = reducedMotion ? 1 : 0.1;
    control.azimuth += (control.azimuthGoal - control.azimuth) * progress;
    control.elevation += (control.elevationGoal - control.elevation) * progress;
    control.radius += (control.radiusGoal - control.radius) * progress;
    control.target.lerp(control.targetGoal, progress);
    const cosE = Math.cos(control.elevation);
    camera.position.set(
      control.target.x + control.radius * cosE * Math.cos(control.azimuth),
      control.target.y + control.radius * Math.sin(control.elevation),
      control.target.z + control.radius * cosE * Math.sin(control.azimuth),
    );
    camera.lookAt(control.target);
  }

  let framing = { kind: 'overview' };
  let framingKey = '';
  let contentOffset = { x: 0, y: 0 };
  function availableMapRect(width, height) {
    let left = width < 941 ? 12 : 26;
    let right = width - (width < 941 ? 12 : 26);
    let top = width < 941 ? 62 : 74;
    const mobileChooser = state.filter === 'All districts' && state.linkMode !== 'project';
    const bottom = height - (width < 941 ? (mobileChooser ? 176 : 104) : 78);
    exclusionsCache.forEach((zone) => {
      if (zone.kind === 'focus-toolbar' && zone.bottom > 0 && zone.top < height * 0.4) {
        top = Math.max(top, zone.bottom + 14);
      }
      // Tall side panels reserve columns. Short map controls use top/bottom margins.
      if (zone.bottom - zone.top < 180 || zone.right - zone.left < 150
        || zone.right <= 0 || zone.left >= width || zone.top >= height || zone.bottom <= 0) return;
      if (zone.left < 40 && zone.right < width * 0.48) left = Math.max(left, zone.right + 18);
      if (zone.right > width - 40 && zone.left > width * 0.52) right = Math.min(right, zone.left - 18);
    });
    return { left, right: Math.max(left + 120, right), top, bottom: Math.max(top + 120, bottom) };
  }

  function framePoints(points, width, height, rect) {
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minZ = Math.min(...points.map((point) => point.z));
    const maxZ = Math.max(...points.map((point) => point.z));
    control.targetGoal.set((minX + maxX) / 2, 1.5, (minZ + maxZ) / 2);
    const fitCamera = camera.clone();
    const direction = new THREE.Vector3(
      Math.cos(control.elevationGoal) * Math.cos(control.azimuthGoal),
      Math.sin(control.elevationGoal),
      Math.cos(control.elevationGoal) * Math.sin(control.azimuthGoal),
    );
    const projectedBounds = (radius) => {
      fitCamera.position.copy(control.targetGoal).addScaledVector(direction, radius);
      fitCamera.lookAt(control.targetGoal);
      fitCamera.updateMatrixWorld(true);
      const projected = points.map((point) => point.clone().project(fitCamera));
      return {
        left: Math.min(...projected.map((point) => (point.x + 1) * width / 2)),
        right: Math.max(...projected.map((point) => (point.x + 1) * width / 2)),
        top: Math.min(...projected.map((point) => (1 - point.y) * height / 2)),
        bottom: Math.max(...projected.map((point) => (1 - point.y) * height / 2)),
        inFront: projected.every((point) => point.z > -1 && point.z < 1),
      };
    };
    const fits = (radius) => {
      const bounds = projectedBounds(radius);
      return bounds.inFront && bounds.right - bounds.left <= rect.right - rect.left
        && bounds.bottom - bounds.top <= rect.bottom - rect.top;
    };
    let low = 38;
    let high = MAX_RADIUS;
    for (let step = 0; step < 18; step += 1) {
      const middle = (low + high) / 2;
      if (fits(middle)) high = middle;
      else low = middle;
    }
    control.radiusGoal = high * 1.035;
    const bounds = projectedBounds(control.radiusGoal);
    // Center actual projected content, not the world-axis bounding-box midpoint.
    contentOffset.x = (bounds.left + bounds.right - rect.left - rect.right) / 2;
    contentOffset.y = (bounds.top + bounds.bottom - rect.top - rect.bottom) / 2;
    applyViewOffset(width, height, availableMapRect(width, height));
  }

  function applyViewOffset(width, height, rect) {
    camera.aspect = width / height;
    camera.setViewOffset(width, height,
      width / 2 - (rect.left + rect.right) / 2 + contentOffset.x,
      height / 2 - (rect.top + rect.bottom) / 2 + contentOffset.y, width, height);
    camera.updateProjectionMatrix();
  }

  function updateFraming(width, height, { force = false } = {}) {
    const rect = availableMapRect(width, height);
    if (!framing) contentOffset = { x: 0, y: 0 };
    applyViewOffset(width, height, rect);
    const key = [width, height, rect.left, rect.right, rect.top, rect.bottom,
      framing?.kind, framing?.district, framing?.id,
      state.linkMode, [...(state.projectFocusNeighborIds ?? [])].join(',')].join(':');
    if (!framing || (!force && key === framingKey)) return;
    framingKey = key;
    contentOffset = { x: 0, y: 0 };
    applyViewOffset(width, height, rect);
    if (diagnosticsEnabled) container.dataset.citySettled = 'false';
    const points = [];
    if (framing.kind === 'project') {
      const view = projectViews.get(framing.id);
      if (!view) return;
      const ids = new Set([framing.id]);
      if (state.linkMode === 'project') state.projectFocusNeighborIds?.forEach((id) => ids.add(id));
      ids.forEach((id) => {
        const endpoint = projectViews.get(id);
        if (!endpoint) return;
        const margin = ids.size === 1 ? 8 : endpoint.footprint + 2;
        [-margin, margin].forEach((dx) => [-margin, margin].forEach((dz) => {
          points.push(new THREE.Vector3(endpoint.group.position.x + dx, 0, endpoint.group.position.z + dz));
          points.push(new THREE.Vector3(endpoint.group.position.x + dx, endpoint.topY + 3, endpoint.group.position.z + dz));
        }));
      });
    } else if (framing.kind === 'quarter') {
      const quarter = quarters.find((item) => item.id === framing.id);
      if (!quarter) return;
      const hw = quarter.width * SCALE / 2 + 6;
      const hh = quarter.height * SCALE / 2 + 6;
      [-hw, hw].forEach((dx) => [-hh, hh].forEach((dz) => {
        points.push(new THREE.Vector3(quarter.cx * SCALE + dx, 0, quarter.cy * SCALE + dz));
      }));
      projects.forEach((project) => {
        if (project.district !== quarter.district) return;
        const placed = posOf(project);
        const wx = placed.x * SCALE;
        const wz = placed.y * SCALE;
        if (Math.abs(wx - quarter.cx * SCALE) <= quarter.width * SCALE / 2 + 1
          && Math.abs(wz - quarter.cy * SCALE) <= quarter.height * SCALE / 2 + 1) {
          const view = projectViews.get(project.id);
          if (view) points.push(new THREE.Vector3(wx, view.topY + 3, wz));
        }
      });
    } else {
      const islands = framing.kind === 'district'
        ? ISLAND_GROUPS.filter((island) => island.key === framing.district
          || (framing.district === 'Infrastructure' && island.key === '__monad')) : ISLAND_GROUPS;
      islands.forEach((island) => {
        [island.minX - 2, island.maxX + 2].forEach((x) => [island.minZ - 2, island.maxZ + 2].forEach((z) => {
          points.push(new THREE.Vector3(x, 0, z));
        }));
        island.list.forEach((project) => {
          const view = projectViews.get(project.id);
          points.push(new THREE.Vector3(view.group.position.x, view.topY + 3, view.group.position.z));
        });
        if (framing.kind === 'overview') {
          const topY = Math.max(...island.list.map((project) => projectViews.get(project.id).topY));
          points.push(new THREE.Vector3(island.cx, topY + 16, island.cz));
        }
      });
    }
    const labelPad = framing.kind === 'overview' ? (width < 941 ? 0 : 52) : (width < 941 ? 16 : 24);
    if (points.length) framePoints(points, width, height, {
      left: rect.left + labelPad, right: rect.right - labelPad,
      top: rect.top + 24, bottom: rect.bottom - 16,
    });
  }

  function panBy(dx, dy) {
    framing = null;
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
      if (object && projectViews.get(object.userData.projectId)?.group.visible) {
        return { id: object.userData.projectId, distance: hit.distance };
      }
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
  let hoveredBeam = null; // { relationshipId } or { districtLink } or null
  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);

  function renderBeamTooltip(content) {
    beamTooltip.innerHTML =
      `<strong>${escapeHtml(content.title)}</strong>` +
      `<span class="beam-tooltip-description">${escapeHtml(content.description)}</span>` +
      `<span class="beam-tooltip-status">${escapeHtml(content.status)}</span>` +
      (content.source ? `<small class="beam-tooltip-source">Source: ${escapeHtml(content.source)}</small>` : '') +
      (content.detail ? `<small>${escapeHtml(content.detail)}</small>` : '');
  }

  // Only shown beams participate in raycasting: an invisible line never steals the cursor
  // from a building. The sets are rebuilt on every sync.
  let shownBeamHitboxes = [];
  let shownDistrictHitboxes = [];

  function raycastBeam(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    // Thin relationship beams win over the fat district beams where both are hit.
    const hits = raycaster.intersectObjects(shownBeamHitboxes, false);
    if (hits.length) return { relationshipId: hits[0].object.userData.relationshipId };
    const districtHits = raycaster.intersectObjects(shownDistrictHitboxes, false);
    return districtHits.length ? { districtLink: districtHits[0].object.userData.districtLink } : null;
  }

  // ---------- project focus arcs ----------
  // In Project mode the selected project's connections render as smooth arcs between the
  // real buildings (brief §9). Each route groups all records to one neighbor; provenance
  // stays visible: sourced = solid lavender, declared/inferred = dashed. Hidden arcs are
  // excluded from picking.
  const arcViews = new Map();
  let shownArcHitboxes = [];

  function facadeAnchor(fromView, toView) {
    const direction = new THREE.Vector3().subVectors(toView.group.position, fromView.group.position);
    direction.y = 0;
    const length = direction.length() || 1;
    direction.normalize();
    return fromView.group.position.clone().addScaledVector(direction, fromView.footprint * 0.35).setY(fromView.topY + 0.25);
  }

  function dashedArcSegments(curve, material, segments = 12) {
    const group = new THREE.Group();
    const up = new THREE.Vector3(0, 1, 0);
    for (let index = 0; index < segments; index += 2) {
      const t0 = index / segments;
      const t1 = (index + 1) / segments;
      const start = curve.getPointAt(t0);
      const end = curve.getPointAt(t1);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 6), material);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const tangent = end.clone().sub(start).normalize();
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(up, tangent);
      mesh.scale.set(1, start.distanceTo(end), 1);
      group.add(mesh);
    }
    return group;
  }

  function disposeObject(root) {
    root.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose?.());
      else object.material?.dispose?.();
    });
  }

  function updateFocusArcs() {
    const routes = state.linkMode === 'project' && !state.graph ? (state.projectFocusRoutes ?? []) : [];
    const wanted = new Set(routes.map((route) => route.key));
    arcViews.forEach((view, key) => {
      if (!wanted.has(key)) {
        scene.remove(view.group);
        disposeObject(view.group);
        arcViews.delete(key);
      }
    });
    routes.forEach((route) => {
      if (arcViews.has(route.key)) return;
      const fromView = projectViews.get(route.fromId);
      const toView = projectViews.get(route.neighborId);
      if (!fromView || !toView) return;
      const start = facadeAnchor(fromView, toView);
      const end = facadeAnchor(toView, fromView);
      const distance = start.distanceTo(end);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const lateral = new THREE.Vector3(-(end.z - start.z), 0, end.x - start.x).normalize();
      mid.addScaledVector(lateral, Math.min(6, distance * 0.09));
      mid.y += Math.min(12, 2 + distance * 0.2);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const group = new THREE.Group();
      const sourced = route.records.every((record) => record.dataMode === 'sourced-limited' && record.reviewStatus === 'approved');
      const nonFactual = route.records.some((record) => record.evidenceState === 'AI-inferred' || record.evidenceState === 'illustrative');
      const color = sourced ? '#cbb9f5' : nonFactual ? '#9d81bd' : '#9a92b2';
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 });
      if (sourced) {
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 26, 0.075, 6), material));
      } else {
        group.add(dashedArcSegments(curve, material));
      }
      [start, end].forEach((point) => {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), material);
        marker.position.copy(point);
        group.add(marker);
      });
      const hitbox = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 20, 0.6, 5),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hitbox.userData.route = route;
      group.add(hitbox);
      scene.add(group);
      arcViews.set(route.key, { route, group, material, hitbox, shown: true });
    });
    shownArcHitboxes = [];
    arcViews.forEach((view) => {
      view.shown = state.linkMode === 'project' && !state.graph;
      if (view.shown) shownArcHitboxes.push(view.hitbox);
    });
  }

  function raycastArc(event) {
    if (!shownArcHitboxes.length) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(shownArcHitboxes, false);
    return hits.length ? hits[0].object.userData.route : null;
  }

  function beamShown(view) {
    const { relationship } = view;
    // Off is an explicit user choice: even a small Navigator result must not silently
    // re-enable individual lines (its buildings stay highlighted instead).
    if (state.linkMode === 'off') return false;
    if (state.linkMode === 'project') return false; // arcs replace straight beams in focus
    if (state.matchBeams && state.highlightRelationships.has(relationship.id)) return true;
    if (state.linkMode === 'overview') return false;
    return true; // 'all'
  }

  function beamBaseOpacity(view) {
    const { relationship } = view;
    if (state.linkMode === 'off') return 0.02;
    if (state.matchBeams && state.highlightRelationships.has(relationship.id)) return 1;
    if (state.linkMode === 'project') {
      return state.projectFocusIds?.has(relationship.id) ? 0.85 : 0.02;
    }
    if (state.linkMode === 'overview') return 0.02;
    const active = relationship.from === state.selected || relationship.to === state.selected;
    if (active) {
      // High-degree nodes keep their lines secondary even in All mode: the fan must not
      // repaint the whole city (the connection focus mode is the place for it).
      const degree = activeDegreeByProject.get(state.selected) ?? 0;
      return degree > 12 ? 0.4 : 0.85;
    }
    const fromVisible = isVisible(projects.find((item) => item.id === relationship.from));
    const toVisible = isVisible(projects.find((item) => item.id === relationship.to));
    return !fromVisible || !toVisible ? 0.03 : 0.24;
  }

  function districtBeamShown() {
    return state.filter === 'All districts' && (state.linkMode === 'overview' || state.linkMode === 'all');
  }

  function fillBeamTooltip(relationship) {
    const from = projects.find((item) => item.id === relationship.from);
    const to = projects.find((item) => item.id === relationship.to);
    renderBeamTooltip(formatRelationshipTooltip(
      relationship,
      from?.name ?? relationship.from,
      to?.name ?? relationship.to,
    ));
  }

  function positionBeamTooltip(event) {
    const rect = container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const tooltipWidth = beamTooltip.offsetWidth;
    const tooltipHeight = beamTooltip.offsetHeight;
    const edge = 12;
    const aboveGap = 14;
    const belowGap = 18;
    const halfWidth = tooltipWidth / 2;
    const minX = halfWidth + edge;
    const maxX = rect.width - halfWidth - edge;
    const x = maxX < minX ? rect.width / 2 : Math.min(Math.max(pointerX, minX), maxX);
    const roomAbove = pointerY - aboveGap - edge;
    const roomBelow = rect.height - pointerY - belowGap - edge;
    const fitsAbove = roomAbove >= tooltipHeight;
    const fitsBelow = roomBelow >= tooltipHeight;
    const below = !fitsAbove && (fitsBelow || roomBelow > roomAbove);
    const minY = below ? edge - belowGap : edge + aboveGap + tooltipHeight;
    const maxY = below
      ? rect.height - edge - belowGap - tooltipHeight
      : rect.height - edge + aboveGap;
    const y = maxY < minY ? pointerY : Math.min(Math.max(pointerY, minY), maxY);
    beamTooltip.style.left = `${x}px`;
    beamTooltip.style.top = `${y}px`;
    beamTooltip.classList.toggle('below', below);
  }

  function districtBeamBaseOpacity(view) {
    const island = ISLAND_GROUPS.find((group) => group.key === view.link.district);
    const districtVisible = island ? island.list.some((project) => isVisible(project)) : false;
    const monadVisible = isVisible(projects.find((item) => item.id === 'monad'));
    const selectedDistrict = projects.find((item) => item.id === state.selected)?.district;
    // A district with zero evidenced projects keeps its wayfinding line but stays faint —
    // a bright beam with "0 of N" backing would overstate the graph.
    const base = view.link.withRecords > 0 ? 0.16 : 0.09;
    return !districtVisible || !monadVisible ? 0.03
      : state.selected === 'monad' || selectedDistrict === view.link.district ? (view.link.withRecords > 0 ? 0.26 : 0.12)
      : base;
  }

  function fillDistrictTooltip(link) {
    renderBeamTooltip(formatDistrictRouteTooltip(link));
  }

  function fillRouteTooltip(route) {
    const from = projects.find((project) => project.id === route.fromId);
    const to = projects.find((project) => project.id === route.neighborId);
    renderBeamTooltip(formatRelationshipGroupTooltip(
      route.records,
      from?.name ?? route.fromId,
      to?.name ?? route.neighborId,
    ));
  }

  function setBeamHover(hit, event) {
    const token = hit
      ? hit.relationshipId ? `r:${hit.relationshipId}` : hit.districtLink ? `d:${hit.districtLink.district}` : `a:${hit.route.key}`
      : null;
    const previousToken = hoveredBeam
      ? hoveredBeam.relationshipId ? `r:${hoveredBeam.relationshipId}` : hoveredBeam.districtLink ? `d:${hoveredBeam.districtLink.district}` : `a:${hoveredBeam.route.key}`
      : null;
    if (token === previousToken) {
      if (token && event) positionBeamTooltip(event);
      return;
    }
    if (hoveredBeam) {
      if (hoveredBeam.relationshipId) {
        const previous = beamViews.find((view) => view.relationship.id === hoveredBeam.relationshipId);
        if (previous) previous.material.opacity = beamBaseOpacity(previous);
      } else if (hoveredBeam.districtLink) {
        const previous = districtBeamViews.find((view) => view.link.district === hoveredBeam.districtLink.district);
        if (previous) previous.material.opacity = districtBeamBaseOpacity(previous);
      } else {
        const previous = arcViews.get(hoveredBeam.route.key);
        if (previous) previous.material.opacity = 0.92;
      }
    }
    hoveredBeam = hit;
    if (hit) {
      if (hit.relationshipId) {
        const view = beamViews.find((item) => item.relationship.id === hit.relationshipId);
        if (view) view.material.opacity = Math.max(beamBaseOpacity(view), 0.6);
        fillBeamTooltip(view.relationship);
      } else if (hit.districtLink) {
        const view = districtBeamViews.find((item) => item.link.district === hit.districtLink.district);
        if (view) view.material.opacity = Math.max(districtBeamBaseOpacity(view), 0.4);
        fillDistrictTooltip(view.link);
      } else {
        const view = arcViews.get(hit.route.key);
        if (view) view.material.opacity = 1;
        fillRouteTooltip(hit.route);
      }
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
      const projectId = hit?.id ?? null;
      // Buildings keep hover priority; beams and focus arcs hover where no building is in
      // front of the cursor.
      const beamHit = projectId ? null : raycastBeam(event);
      const arcHit = projectId || beamHit ? null : raycastArc(event);
      if (projectId !== hoveredId) {
        hoveredId = projectId;
        labelElements.forEach((element, id) => element.classList.toggle('hover', id === projectId));
      }
      setBeamHover(arcHit ? { route: arcHit } : beamHit, event);
      renderer.domElement.style.cursor = projectId || beamHit || arcHit ? 'pointer' : 'grab';
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
        framing = null;
        control.azimuthGoal -= dx * 0.005;
        control.elevationGoal = Math.min(1.31, Math.max(0.28, control.elevationGoal + dy * 0.004));
      }
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinchDistance) {
        framing = null;
        control.radiusGoal = Math.min(MAX_RADIUS, Math.max(38, control.radiusGoal * (pinchDistance / distance)));
      }
      pinchDistance = distance;
    }
  });

  function endPointer(event) {
    if (pointers.size === 1 && movedDistance < 6) {
      const hit = raycastProject(event);
      if (hit) {
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
    framing = null;
    control.radiusGoal = Math.min(MAX_RADIUS, Math.max(38, control.radiusGoal * Math.exp(event.deltaY * 0.0011)));
  }, { passive: false });
  container.addEventListener('pointerdown', () => { introSkipped = true; }, { once: true, capture: true });

  // ---------- state sync ----------
  const state = {
    selected: null, filter: 'All districts', linkMode: 'overview',
    highlightProjects: new Set(), highlightRelationships: new Set(), graph: false,
    projectFocusIds: null, matchBeams: false,
  };
  // Panel/tool zones (container-relative CSS px) refreshed at most every 300ms via the
  // getExclusions callback from main.js — DOM rects are never read per frame.
  let exclusionsCache = [];
  let exclusionsAt = 0;
  const lastViewport = { width: 0, height: 0 };
  function refreshExclusions(now) {
    if (!getExclusions || now - exclusionsAt < 300) return;
    exclusionsAt = now;
    try {
      exclusionsCache = getExclusions() ?? [];
    } catch {
      exclusionsCache = [];
    }
  }
  let running = true;
  let sceneShadowDirty = true;
  const isVisible = (project) => Boolean(project) && (state.filter === 'All districts'
    || project.district === state.filter
    || (state.linkMode === 'project' && state.projectFocusNeighborIds?.has(project.id)));

  function sync(next) {
    Object.assign(state, next);
    if (diagnosticsEnabled) {
      container.dataset.citySettled = 'false';
      container.dataset.cityFilter = state.filter;
      container.dataset.citySelected = state.selected ?? '';
      container.dataset.cityLinkMode = state.linkMode;
    }
    sceneShadowDirty = true;
    running = !state.graph;
    container.classList.toggle('is-graph', state.graph);
    if (state.graph) {
      labelElements.forEach((element) => { element.style.opacity = '0'; });
      setBeamHover(null);
    }

    environmentViews.forEach((group, key) => {
      const island = ISLAND_GROUPS.find((item) => item.key === key);
      group.visible = state.filter === 'All districts' || key === state.filter
        || (state.filter === 'Infrastructure' && key === '__monad')
        || (state.linkMode === 'project' && island.list.some((project) =>
          project.id === state.selected || state.projectFocusNeighborIds?.has(project.id)));
    });

    projectViews.forEach((view, id) => {
      const projectVisible = isVisible(view.project);
      const active = id === state.selected;
      const match = state.highlightProjects.has(id);
      view.group.visible = projectVisible;
      // Dimming is a color multiplier, not transparency: unselected buildings keep their
      // facades readable while receding (brief §D).
      const neighbor = state.projectFocusNeighborIds?.has(id) ?? false;
      if (!projectVisible) view.dimGoal = 0.14;
      else if (active || match) view.dimGoal = 1;
      else if (state.linkMode === 'project' && state.selected) view.dimGoal = neighbor ? 0.88 : 0.38;
      else if (state.highlightProjects.size) view.dimGoal = 0.55;
      else view.dimGoal = 1;
      const label = labelElements.get(id);
      label.classList.toggle('active', active);
      label.classList.toggle('match', match && !active);
      label.classList.toggle('dim', !projectVisible || (state.highlightProjects.size > 0 && !active && !match));
    });
    if (hoveredId && !projectViews.get(hoveredId)?.group.visible) {
      hoveredId = null;
      labelElements.forEach((element) => element.classList.remove('hover'));
      renderer.domElement.style.cursor = 'grab';
      setBeamHover(null);
    }

    const selectedView = projectViews.get(state.selected);
    if (selectedView) {
      const { x, z } = selectedView.group.position;
      selectedRing.visible = !state.graph && isVisible(selectedView.project);
      selectedRing.position.set(x, 0.07, z);
      const ringScale = Math.max(0.7, selectedView.footprint / 1.9);
      selectedRing.scale.setScalar(ringScale);
      selectedOutline.visible = !state.graph && isVisible(selectedView.project);
      selectedOutline.position.set(x, 0.35, z);
      selectedOutline.scale.set(
        selectedView.footprint / 2.07,
        1,
        selectedView.footprint / 1.72,
      );
    } else {
      // District Lens state: no selection, so no selection ring may linger from the
      // previous city selection.
      selectedRing.visible = false;
      selectedOutline.visible = false;
    }

    projectViews.forEach((view, id) => {
      const match = state.highlightProjects.has(id) && id !== state.selected && isVisible(view.project);
      const ring = matchRingFor(id);
      ring.visible = match && !state.graph;
      if (match) ring.position.set(view.group.position.x, 0.07, view.group.position.z);

      let beacon = matchBeacons.get(id);
      if (match && !beacon) {
        beacon = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.85),
          new THREE.MeshBasicMaterial({ color: '#c3b3e1' }),
        );
        beacon.position.y = view.topY + 1.5;
        view.group.add(beacon);
        matchBeacons.set(id, beacon);
      } else if (!match && beacon) {
        beacon.removeFromParent();
        beacon.geometry.dispose();
        beacon.material.dispose();
        matchBeacons.delete(id);
      }
    });

    // Connection-focus arcs: rebuilt only when the shown route set changes (selection,
    // Ecosystem listing toggle, Show all), never per frame.
    updateFocusArcs();

    shownBeamHitboxes = [];
    beamViews.forEach((view) => {
      view.shown = beamShown(view);
      const base = view.shown ? beamBaseOpacity(view) : 0.02;
      const hovered = view.shown && hoveredBeam?.relationshipId === view.relationship.id && !state.graph;
      view.material.opacity = Math.max(base, hovered ? 0.6 : 0);
      view.group.visible = view.shown && !state.graph;
      if (view.shown) shownBeamHitboxes.push(view.hitbox);
    });

    shownDistrictHitboxes = [];
    const districtsShown = districtBeamShown() && !state.graph;
    districtBeamViews.forEach((view) => {
      const hovered = districtsShown && hoveredBeam?.districtLink?.district === view.link.district;
      view.material.opacity = Math.max(districtBeamBaseOpacity(view), hovered ? 0.4 : 0);
      view.group.visible = districtsShown;
      if (districtsShown) shownDistrictHitboxes.push(view.hitbox);
    });
    // A hover target that just became hidden must not keep its tooltip alive.
    if (hoveredBeam?.relationshipId && !beamViews.find((view) => view.relationship.id === hoveredBeam.relationshipId)?.shown) setBeamHover(null);
    if (hoveredBeam?.districtLink && !districtBeamShown()) setBeamHover(null);
  }

  function focusProject(id, { neighborhood = false } = {}) {
    const view = projectViews.get(id);
    if (!view) return;
    framing = { kind: 'project', id, neighborhood };
    updateFraming(container.clientWidth || 1, container.clientHeight || 1, { force: true });
  }

  // District navigation: frame the whole island (radius-sized, clamped) without changing
  // the project selection — the district filter already handles highlighting.
  function focusIsland(district) {
    const island = ISLAND_GROUPS.find((group) => group.key === district);
    if (!island) return;
    framing = { kind: 'district', district };
    updateFraming(container.clientWidth || 1, container.clientHeight || 1, { force: true });
  }

  // Quarter navigation inside a district: frame one quarter block (its buildings and
  // streets) without moving any building. Clicking the same quarter again returns to the
  // whole island.
  function focusQuarter(quarter) {
    framing = { kind: 'quarter', district: quarter.district, id: quarter.id };
    updateFraming(container.clientWidth || 1, container.clientHeight || 1, { force: true });
  }

  // ---- district scope camera API (consumed by the district routes in main.js) ----
  let previousCamera = null;

  function getCameraSnapshot() {
    return {
      azimuth: control.azimuthGoal,
      elevation: control.elevationGoal,
      radius: control.radiusGoal,
      target: control.targetGoal.clone(),
      framing: framing ? { ...framing } : null,
    };
  }

  function restoreCamera(snapshot) {
    if (!snapshot) return;
    control.azimuthGoal = snapshot.azimuth;
    control.elevationGoal = snapshot.elevation;
    control.radiusGoal = snapshot.radius;
    control.targetGoal.copy(snapshot.target);
    framing = snapshot.framing ? { ...snapshot.framing } : null;
    framingKey = '';
    if (reducedMotion) {
      control.azimuth = snapshot.azimuth;
      control.elevation = snapshot.elevation;
      control.radius = snapshot.radius;
      control.target.copy(snapshot.target);
    }
  }

  function applyDistrictFraming(district) {
    const island = ISLAND_GROUPS.find((group) => group.key === district);
    if (!island) return false;
    framing = { kind: 'district', district };
    control.elevationGoal = DEFAULT_VIEW.elevation;
    updateFraming(container.clientWidth || 1, container.clientHeight || 1, { force: true });
    if (reducedMotion) {
      control.target.copy(control.targetGoal);
      control.radius = control.radiusGoal;
    }
    return true;
  }

  function enterDistrict(district, { animate = true } = {}) {
    if (!previousCamera) previousCamera = getCameraSnapshot();
    // Inside a district world every billboard hides — the user is already here, and a
    // world-unit-sized button would dominate the close camera framing. The breadcrumb,
    // plaque, and tabs carry district context instead.
    setDistrictButtonsVisible(false);
    if (!animate || reducedMotion) {
      applyDistrictFraming(district);
      control.azimuth = control.azimuthGoal;
      control.elevation = control.elevationGoal;
    } else {
      applyDistrictFraming(district);
    }
  }

  function leaveDistrict({ restoreCamera: restore = true } = {}) {
    if (restore && previousCamera) restoreCamera(previousCamera);
    previousCamera = null;
    setDistrictButtonsVisible(true);
  }

  function zoomBy(factor) {
    framing = null;
    control.radiusGoal = Math.min(MAX_RADIUS, Math.max(38, control.radiusGoal * factor));
  }

  function reset() {
    control.azimuthGoal = DEFAULT_VIEW.azimuth;
    control.elevationGoal = DEFAULT_VIEW.elevation;
    framing = state.filter === 'All districts' ? { kind: 'overview' } : { kind: 'district', district: state.filter };
    updateFraming(container.clientWidth || 1, container.clientHeight || 1, { force: true });
  }

  // ---------- intro ----------
  const introStart = performance.now();
  if (!reducedMotion) projectViews.forEach((view) => { view.group.scale.y = 0.001; });

  // Opt-in DOM diagnostics contain only public scene state, never provider settings.
  const diagnosticsEnabled = new URLSearchParams(location.search).has('cityDebug');
  let diagnosticAt = 0;
  let diagnosticFrameAt = 0;
  const frameDeltas = [];
  const gl = diagnosticsEnabled ? renderer.getContext() : null;
  const gpuExtension = gl?.getExtension('WEBGL_debug_renderer_info');
  const hardware = diagnosticsEnabled ? {
    userAgent: navigator.userAgent,
    gpu: gpuExtension ? gl.getParameter(gpuExtension.UNMASKED_RENDERER_WEBGL) : 'unavailable',
  } : null;
  function updateDiagnostics(width, height, placed) {
    if (!diagnosticsEnabled) return;
    const now = performance.now();
    if (diagnosticFrameAt) frameDeltas.push(now - diagnosticFrameAt);
    diagnosticFrameAt = now;
    if (frameDeltas.length > 240) frameDeltas.shift();
    if (now - diagnosticAt < 500) return;
    diagnosticAt = now;
    const sorted = [...frameDeltas].sort((a, b) => a - b);
    const settled = Math.abs(control.radius - control.radiusGoal) < 0.1
      && control.target.distanceTo(control.targetGoal) < 0.05
      && Math.abs(control.azimuth - control.azimuthGoal) < 0.001
      && Math.abs(control.elevation - control.elevationGoal) < 0.001;
    container.dataset.citySettled = String(settled);
    const endpoints = [state.selected, ...(state.projectFocusNeighborIds ?? [])].filter(Boolean).map((id) => {
      const view = projectViews.get(id);
      const top = new THREE.Vector3(view.group.position.x, view.topY + 1.2, view.group.position.z).project(camera);
      const base = view.group.position.clone().project(camera);
      return { id, visible: view.group.visible, x: (top.x + 1) * width / 2, y: (1 - top.y) * height / 2,
        baseX: (base.x + 1) * width / 2, baseY: (1 - base.y) * height / 2 };
    });
    container.dataset.cityDiagnostics = JSON.stringify({
      hardware,
      viewport: { width, height }, dpr: renderer.getPixelRatio(), framing, safeRect: availableMapRect(width, height),
      radius: control.radius, settled,
      selected: state.selected, filter: state.filter, labels: [...placed.keys()], endpoints,
      islands: [...environmentViews].filter(([, group]) => group.visible).map(([key]) => key),
      islandScreenBounds: ISLAND_GROUPS.filter((island) => environmentViews.get(island.key).visible).map((island) => {
        const projected = [];
        [island.minX - 0.6, island.maxX + 0.6].forEach((x) => [island.minZ - 0.6, island.maxZ + 0.6].forEach((z) => {
          const point = new THREE.Vector3(x, -2.7, z).project(camera);
          projected.push({ x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 });
        }));
        island.list.forEach((project) => {
          const view = projectViews.get(project.id);
          const point = new THREE.Vector3(view.group.position.x, view.topY, view.group.position.z).project(camera);
          projected.push({ x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 });
        });
        return { district: island.key, left: Math.min(...projected.map((point) => point.x)),
          right: Math.max(...projected.map((point) => point.x)), top: Math.min(...projected.map((point) => point.y)),
          bottom: Math.max(...projected.map((point) => point.y)) };
      }),
      routes: [...arcViews.values()].filter((view) => view.shown).map((view) => view.route.neighborId),
      render: renderer.info.render, memory: renderer.info.memory, programs: renderer.info.programs.length,
      frameSamples: frameDeltas.length, meanFrameMs: frameDeltas.reduce((a, b) => a + b, 0) / (frameDeltas.length || 1),
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      positions: [...projectViews].map(([id, view]) => [id, view.group.position.x, view.group.position.z]),
    });
  }

  // ---------- render loop ----------
  let lastFrameAt = performance.now();
  let rafPending = false;
  function frame() {
    lastFrameAt = performance.now();
    // Self-chaining rAF with a timer watchdog: compositor-throttled webviews (backgrounded
    // panes, hidden in-app browsers) can stop dispatching rAF entirely, which would freeze
    // the whole city. The watchdog keeps a ~4fps heartbeat in that case and no-ops once
    // rAF resumes.
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        frame();
      });
    }
    if (!running) return;

    if (!introSkipped) {
      const elapsed = performance.now() - introStart;
      let done = true;
      projectViews.forEach((view, id) => {
        const index = projects.findIndex((project) => project.id === id);
        const progress = Math.min(1, Math.max(0, (elapsed - 100 - Math.min(index, 24) * 18) / 400));
        if (progress < 1) done = false;
        view.group.scale.y = Math.max(0.001, 1 - Math.pow(1 - progress, 3));
      });
      if (done && elapsed > 1000) introSkipped = true;
    } else {
      projectViews.forEach((view) => {
        if (view.group.scale.y !== 1) {
          view.group.scale.y = 1;
          sceneShadowDirty = true;
        }
      });
    }

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const targetWidth = Math.round(width * renderer.getPixelRatio());
    const targetHeight = Math.round(height * renderer.getPixelRatio());
    if (renderer.domElement.width !== targetWidth || renderer.domElement.height !== targetHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    refreshExclusions(performance.now());
    updateFraming(width, height);
    applyCamera();

    projectViews.forEach((view) => {
      // Color-based dimming: lerp a per-building factor and multiply base colors. Facades
      // stay readable when dimmed; no see-through transparency and no bright roofs.
      view.dim += (view.dimGoal - view.dim) * (reducedMotion ? 1 : 0.12);
      if (Math.abs(view.dim - view.dimLast) > 0.004) {
        view.materials.forEach((material, index) => {
          material.color.copy(view.baseColors[index]).multiplyScalar(view.dim);
          if (material.emissiveIntensity !== undefined) {
            material.emissiveIntensity = (view.baseEmissive[index] ?? 0) * view.dim;
          }
        });
        view.dimLast = view.dim;
      }
    });


    renderer.shadowMap.needsUpdate = sceneShadowDirty || !introSkipped;
    renderer.render(scene, camera);
    sceneShadowDirty = false;

    // ---------- label placement (screen-space, collision-checked) ----------
    // Priority: selected > hover > Navigator matches > project-focus neighbors > quarter
    // names (mid zoom) > full-detail layer. Lower-priority labels hide instead of
    // shrinking; panel zones are excluded; array order never creates landmarks.
    refreshExclusions(performance.now());
    if (lastViewport.width !== width || lastViewport.height !== height) {
      lastViewport.width = width;
      lastViewport.height = height;
      invalidateLabelMeasurements();
    }

    const focusNeighborIds = state.linkMode === 'project' && state.projectFocusRoutes
      ? new Set(state.projectFocusRoutes.map((route) => route.neighborId))
      : null;
    // Quarter names belong to the district scale; in Project focus the neighbor labels own
    // the screen space instead.
    const quartersVisible = state.linkMode !== 'project'
      && (state.filter !== 'All districts' || control.radius < 210) && control.radius > 42;
    const fullDetail = state.linkMode !== 'project' && control.radius < 105 && !quartersVisible;
    const labelEntries = [];
    const viewPoint = new THREE.Vector3();

    projectViews.forEach((view, id) => {
      if (!isVisible(view.project) || state.graph) return;
      const selected = id === state.selected;
      const hovered = hoveredId === id;
      const matched = state.highlightProjects.has(id);
      const neighbor = focusNeighborIds?.has(id) ?? false;
      const landmark = id === 'monad' && state.linkMode === 'overview'
        && (state.filter === 'All districts' || state.filter === 'Infrastructure');
      const show = selected || hovered || matched || neighbor || landmark || (fullDetail && view.targetOpacity > 0.5);
      if (!show) return;
      viewPoint.set(view.group.position.x, view.topY + 1.2, view.group.position.z);
      const cameraSpace = viewPoint.clone().applyMatrix4(camera.matrixWorldInverse);
      if (cameraSpace.z > -0.5) return; // behind the camera or on the camera plane
      anchor.copy(viewPoint).project(camera);
      const x = ((anchor.x + 1) / 2) * width;
      const y = ((1 - anchor.y) / 2) * height;
      if (x < -80 || x > width + 80 || y < -40 || y > height + 40) return;
      labelEntries.push({
        id,
        priority: selected ? 100 : hovered ? 90 : matched ? 70 : neighbor ? 50 : 10,
        x, y,
        text: view.project.name,
        className: '',
      });
    });

    if (quartersVisible && !state.graph) {
      quarterLabelElements.forEach(({ element, quarter }) => {
        if (state.filter !== 'All districts' && quarter.district !== state.filter) return;
        viewPoint.set((quarter.labelX ?? quarter.cx) * SCALE, 1.2, (quarter.labelY ?? quarter.cy) * SCALE);
        const cameraSpace = viewPoint.clone().applyMatrix4(camera.matrixWorldInverse);
        if (cameraSpace.z > -0.5) return;
        anchor.copy(viewPoint).project(camera);
        const x = ((anchor.x + 1) / 2) * width;
        const y = ((1 - anchor.y) / 2) * height;
        if (x < -100 || x > width + 100 || y < -40 || y > height + 40) return;
        labelEntries.push({
          id: `quarter:${quarter.id}`,
          priority: 60,
          x, y,
          text: `${quarter.label} · ${quarter.count}`,
          className: 'quarter',
          element,
        });
      });
    }

    const placed = placeLabels(labelEntries, { width, height, exclusions: exclusionsCache });
    const applyLabel = (element, id) => {
      const spot = placed.get(id);
      const show = Boolean(spot);
      element.style.opacity = show ? (id === state.selected ? '1' : '0.85') : '0';
      // Invisible quarter pills must not intercept building clicks; only visible ones are
      // interactive (project name labels stay pointer-transparent — selection is via buildings).
      element.style.pointerEvents = show && id.startsWith('quarter:') ? 'auto' : 'none';
      if (id.startsWith('quarter:')) {
        element.tabIndex = show ? 0 : -1;
        element.setAttribute('aria-hidden', String(!show));
      }
      if (spot) element.style.transform = `translate(${spot.left}px, ${spot.top}px)`;
    };
    labelElements.forEach(applyLabel);
    quarterLabelElements.forEach(({ element, quarter }) => applyLabel(element, `quarter:${quarter.id}`));

    // District callouts: text offset outward from the island edge, thin leader to the dot.
    // Visible at overview scale; hidden in district/focus contexts where the breadcrumb and
    // quarter names carry orientation instead.
    const calloutsVisible = !state.graph && districtCalloutsAllowed
      && state.filter === 'All districts' && state.linkMode !== 'project'
      && (framing?.kind === 'overview' || control.radius > 240);
    const calloutRects = [];
    const safe = availableMapRect(width, height);
    const mobile = width < 941;
    districtCallouts.forEach((callout, index) => {
      const hide = () => {
        callout.element.style.opacity = '0';
        callout.element.style.pointerEvents = 'none';
        callout.element.tabIndex = -1;
        callout.element.setAttribute('aria-hidden', 'true');
        callout.polyline.setAttribute('points', '');
        callout.dot.setAttribute('r', '0');
      };
      if (!calloutsVisible) { hide(); return; }
      anchor.copy(callout.anchor).project(camera);
      const ax = ((anchor.x + 1) / 2) * width;
      const ay = ((1 - anchor.y) / 2) * height;
      const w = mobile ? (width - 40) / 3 : callout.element.offsetWidth;
      const h = mobile ? 34 : callout.element.offsetHeight;
      let rect;
      if (mobile) {
        // All five districts stay reachable in a compact chooser below the islands.
        const col = index % 3;
        const row = Math.floor(index / 3);
        const left = 16 + col * (w + 4);
        const top = height - 160 + row * 36;
        rect = { left, top, right: left + w, bottom: top + h };
      } else {
        const direction = ax < (safe.left + safe.right) / 2 ? -1 : 1;
        const candidates = [
          [ax + (direction < 0 ? -w - 20 : 20), ay - h / 2],
          [ax + (direction < 0 ? 20 : -w - 20), ay - h / 2],
          [ax - w / 2, ay - h - 20], [ax - w / 2, ay + 20],
          [ax - w / 2, ay - h - 62], [ax - w / 2, ay + 62],
        ];
        for (const [x, y] of candidates) {
          const left = Math.max(safe.left + 4, Math.min(safe.right - w - 4, x));
          const top = Math.max(8, Math.min(height - h - 70, y));
          const candidate = { left, top, right: left + w, bottom: top + h };
          if (calloutRects.some((other) => rectsOverlapCompat(candidate, other))) continue;
          if (exclusionsCache.some((zone) => rectsOverlapCompat(candidate, zone))) continue;
          rect = candidate;
          break;
        }
      }
      if (!rect) { hide(); return; }
      calloutRects.push(rect);
      callout.element.style.opacity = '1';
      callout.element.style.pointerEvents = 'auto';
      callout.element.tabIndex = 0;
      callout.element.setAttribute('aria-hidden', 'false');
      callout.element.style.transform = 'translate(' + rect.left + 'px, ' + rect.top + 'px)';
      const startX = Math.max(rect.left, Math.min(rect.right, ax));
      const startY = rect.top + h / 2;
      callout.polyline.setAttribute('points', mobile ? '' : startX + ',' + startY + ' ' + ax + ',' + startY + ' ' + ax + ',' + ay);
      callout.dot.setAttribute('r', mobile ? '0' : '2.2');
      callout.dot.setAttribute('cx', String(ax));
      callout.dot.setAttribute('cy', String(ay));
    });
    updateDiagnostics(width, height, placed);

  }
  requestAnimationFrame(frame);
  setInterval(() => {
    if (running && performance.now() - lastFrameAt > 250) frame();
  }, 250);

  function rectsOverlapCompat(a, b) {
    return a.left - 6 < b.right && a.right + 6 > b.left && a.top - 6 < b.bottom && a.bottom + 6 > b.top;
  }

  return { sync, focusProject, focusIsland, zoomBy, reset, enterDistrict, leaveDistrict, getCameraSnapshot, restoreCamera };
}
