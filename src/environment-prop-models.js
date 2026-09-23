// EV01 / EL01 / EV02 / EN01. Authored visuals only: gameplay owns all colliders.
import * as T from '../node_modules/three/build/three.module.js';

export const ENVIRONMENT_PROP_ASSETS = Object.freeze({
  vent: Object.freeze({ id: 'EV01', name: '隔离阀控制台', file: 'vent-console-ev01.glb', triangles: 6000, meshes: 6 }),
  light: Object.freeze({ id: 'EL01', name: '照明配电控制台', file: 'light-console-el01.glb', triangles: 6000, meshes: 6 }),
  nozzle: Object.freeze({ id: 'EV02', name: '环形排气喷口', file: 'steam-nozzle-ev02.glb', triangles: 4000, meshes: 5 }),
  node: Object.freeze({ id: 'EN01', name: '悬浮储能节点', file: 'energy-node-en01.glb', triangles: 7000, meshes: 12 })
});
const noRaycast = () => {};

// Bevel all three axes without an external texture, modifier or DCC dependency.
function chamferBox(w, h, d, c) {
  c = Math.min(c, w / 5, h / 5, d / 5);
  const a = w / 2 - c, b = h / 2 - c;
  const shape = new T.Shape();
  const points = [[-a + c, -b], [a - c, -b], [a, -b + c], [a, b - c],
    [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c]];
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return new T.ExtrudeGeometry(shape, {
    depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c,
    bevelSegments: 1, steps: 1, curveSegments: 1
  }).translate(0, 0, -(d - 2 * c) / 2);
}

// Bake detail into material batches, separately for the moving/disappearing core.
function mergeSurfaces(group) {
  const batches = new Map();
  for (const object of [...group.children]) {
    if (!object.isMesh) { mergeSurfaces(object); continue; }
    object.updateMatrix();
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrix);
    if (!batches.has(object.material)) batches.set(object.material, []);
    batches.get(object.material).push(geometry);
    object.geometry.dispose();
    group.remove(object);
  }
  for (const [material, parts] of batches) {
    const geometry = new T.BufferGeometry();
    for (const attribute of ['position', 'normal']) {
      const data = new Float32Array(parts.reduce((n, g) => n + g.getAttribute(attribute).array.length, 0));
      let offset = 0;
      for (const part of parts) {
        const array = part.getAttribute(attribute).array;
        data.set(array, offset); offset += array.length;
      }
      geometry.setAttribute(attribute, new T.BufferAttribute(data, 3));
    }
    parts.forEach(g => g.dispose());
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new T.Mesh(geometry, material);
    mesh.name = material.userData.surfaceName || group.name + '_' + material.name;
    group.add(mesh);
  }
}

export function createEnvironmentPropVisual(type) {
  const spec = ENVIRONMENT_PROP_ASSETS[type];
  if (!spec) throw new RangeError('Unknown environment prop: ' + type);
  const root = new T.Group();
  root.name = spec.id + '_Visual';
  root.userData = { environmentProp: type, assetId: spec.id, version: 'environment-props-v1' };
  const material = (name, color, metalness, roughness) => new T.MeshStandardMaterial({
    name: spec.id + '_' + name, color, metalness, roughness
  });
  const shell = material('CeramicPaint', type === 'light' ? 0x46535a : 0x2e494e, .45, .46);
  const dark = material('Recesses', 0x101c22, .35, .66);
  const frame = material('AnodizedFrame', 0x647982, .78, .34);
  const steel = material('MachinedAlloy', 0xbac7c8, .86, .26);
  const marking = material('SafetyMarkings', type === 'node' ? 0xc5844f : 0xd8b66b, .22, .53);
  let status = null, baseStatus = null;
  if (type === 'vent' || type === 'light') {
    status = new T.MeshBasicMaterial({
      name: spec.id + '_StatusLight', color: type === 'vent' ? 0x6ff2d4 : 0xffd36a, toneMapped: false
    });
    status.userData = { environmentMutable: true, surfaceName: spec.id + '_Status' };
  } else if (type === 'node') {
    status = material('CapacitorLight', 0x9adfff, .25, .23);
    status.emissive.setHex(0x4a81cb); status.emissiveIntensity = .45;
    status.userData = { environmentMutable: true, surfaceName: 'EN01_CoreStatus' };
    baseStatus = material('InductionLight', 0x779bbb, .35, .29);
    baseStatus.emissive.setHex(0x416daa); baseStatus.emissiveIntensity = .25;
    baseStatus.userData = { environmentMutable: true, surfaceName: 'EN01_BaseStatus' };
  }
  let parent = root;
  const piece = (geometry, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh;
  };
  const box = (w, h, d, x, y, z, mat = shell, bevel = 0, rx = 0, ry = 0, rz = 0) =>
    piece(bevel ? chamferBox(w, h, d, bevel) : new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
  const cylinder = (rt, rb, h, x, y, z, mat = steel, segments = 16, rx = 0, rz = 0) =>
    piece(new T.CylinderGeometry(rt, rb, h, segments), mat, x, y, z, rx, 0, rz);
  const ring = (r, t, x, y, z, mat, horizontal = false, segments = 32) =>
    piece(new T.TorusGeometry(r, t, 6, segments), mat, x, y, z, horizontal ? Math.PI / 2 : 0);
  const bolt = (x, y, z, radius = .012) => cylinder(radius, radius, .009, x, y, z, steel, 6, Math.PI / 2);

  if (type === 'vent' || type === 'light') {
    // Floor pivot. The entire solid visual stays inside the .6 x 1.1 x .6 proxy.
    box(.59, .065, .59, 0, .0325, 0, dark, .014);
    box(.54, .94, .46, 0, .53, -.015, shell, .026);
    box(.58, .09, .53, 0, 1.045, -.025, frame, .017);
    box(.48, .70, .03, 0, .625, .24, frame, .017);
    box(.43, .63, .008, 0, .625, .259, dark, .013);
    for (const side of [-1, 1]) {
      box(.038, .89, .065, side * .278, .535, .21, frame, .009);
      box(.028, .13, .49, side * .278, .19, -.015, dark, .005);
      for (const y of [.255, .96]) bolt(side * .203, y, .28);
      for (let i = 0; i < 6; i++) box(.012, .017, .23, side * .275, .36 + i * .048, -.012, dark);
      for (const z of [-.238, .238]) {
        cylinder(.014, .014, .009, side * .244, .069, z, steel, 6);
      }
    }
    // Status remains bright and legible without painting the whole cabinet neon.
    box(.36, .015, .009, 0, 1.044, .245, status);
    box(.23, .012, .008, 0, .11, .225, status);
    box(.17, .053, .012, .105, .19, .236, marking, .006);
    for (let i = 0; i < 3; i++) box(.015, .049, .004, .06 + i * .047, .19, .245, dark, 0, 0, 0, -.32);
    // Rear service door, hinges, fasteners and an inset cable socket.
    box(.41, .68, .028, 0, .53, -.248, dark, .016);
    box(.37, .62, .012, 0, .53, -.266, shell, .014);
    for (const x of [-.152, .152]) for (const y of [.26, .80]) bolt(x, y, -.279);
    for (const y of [.37, .67]) box(.045, .07, .024, -.202, y, -.257, steel, .005);
    cylinder(.036, .036, .028, .095, .22, -.27, frame, 12, Math.PI / 2);
    cylinder(.025, .025, .009, .095, .22, -.286, dark, 12, Math.PI / 2);
    for (let i = 0; i < 5; i++) box(.20, .012, .007, 0, .49 + i * .039, -.277, dark);

    if (type === 'vent') {
      // Captive handwheel, visible spokes and a separate mechanical pressure gauge.
      cylinder(.041, .041, .018, 0, .625, .271, frame, 16, Math.PI / 2);
      ring(.105, .009, 0, .625, .278, marking);
      for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
        box(.193, .012, .012, 0, .625, .278, frame, 0, 0, 0, angle);
      }
      cylinder(.022, .022, .028, 0, .625, .278, steel, 8, Math.PI / 2);
      cylinder(.066, .066, .024, -.117, .864, .269, frame, 24, Math.PI / 2);
      cylinder(.055, .055, .008, -.117, .864, .285, steel, 24, Math.PI / 2);
      ring(.061, .004, -.117, .864, .285, dark);
      for (let i = 0; i < 7; i++) {
        const angle = -.78 * Math.PI + i * .26 * Math.PI;
        box(.005, .012, .003, -.117 + Math.sin(angle) * .044, .864 + Math.cos(angle) * .044, .291, dark, 0, 0, 0, -angle);
      }
      box(.006, .047, .003, -.109, .873, .293, marking, 0, 0, 0, -.55);
      for (const x of [.075, .155]) {
        cylinder(.027, .027, .017, x, .864, .274, frame, 12, Math.PI / 2);
        cylinder(.018, .018, .012, x, .864, .285, x < .1 ? status : marking, 12, Math.PI / 2);
      }
      for (const x of [-.12, 0, .12]) {
        box(.011, .061, .008, x, .375, .273, status);
        for (const sign of [-1, 1]) box(.029, .009, .008, x + sign * .009, .410, .273, status, 0, 0, 0, -sign * .72);
      }
      box(.31, .018, .009, 0, .315, .273, frame);
    } else {
      // Protected circuit breaker with a substantial lever, not another glowing cube.
      box(.15, .23, .025, -.102, .73, .273, frame, .012);
      box(.112, .184, .014, -.102, .73, .277, dark, .008);
      box(.079, .116, .024, -.102, .737, .277, marking, .008, -.14);
      box(.04, .006, .004, -.102, .793, .283, steel);
      ring(.012, .003, -.102, .667, .295, steel, false, 16);
      ring(.047, .007, .116, .784, .277, status);
      box(.055, .01, .008, .116, .728, .277, status);
      box(.036, .012, .008, .116, .708, .277, frame);
      for (const dx of [-.078, .078]) box(.025, .007, .007, .116 + dx, .786, .277, marking);
      for (let i = 0; i < 3; i++) {
        const x = -.13 + i * .13;
        box(.075, .14, .022, x, .425, .273, frame, .006);
        box(.046, .077, .008, x, .432, .288, dark, .004);
        box(.03, .038, .008, x, .449, .294, marking);
        box(.036, .012, .008, x, .36, .291, status);
      }
      box(.17, .012, .008, .08, .894, .273, status);
      box(.11, .008, .008, .05, .922, .273, frame);
    }
  } else if (type === 'nozzle') {
    // Floor pivot; vent slots are open geometry with a recessed dark chamber.
    const profile = [[0, 0], [.228, 0], [.246, .025], [.246, .073], [.19, .095],
      [.158, .17], [.158, .34], [.182, .40], [.187, .467], [.148, .467], [.14, .414], [0, .414]];
    piece(new T.LatheGeometry(profile.map(([x, y]) => new T.Vector2(x, y)), 24), shell);
    cylinder(.237, .237, .018, 0, .057, 0, dark, 24);
    cylinder(.163, .163, .045, 0, .275, 0, dark, 24);
    cylinder(.139, .139, .012, 0, .424, 0, dark, 24);
    ring(.184, .008, 0, .478, 0, steel, true);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const x = Math.sin(angle), z = Math.cos(angle);
      cylinder(.014, .014, .012, x * .21, .08, z * .21, steel, 6);
      box(.029, .19, .024, x * .161, .283, z * .161, frame, .005, 0, angle);
      box(.014, .016, .287, 0, .475, 0, steel, 0, 0, angle / 2);
      box(.034, .022, .014, x * .226, .035, z * .226, marking, 0, 0, angle);
    }
    cylinder(.031, .031, .03, 0, .474, 0, frame, 12);
  } else {
    const base = new T.Group(); base.name = 'EN01_Base'; root.add(base); parent = base;
    const profile = [[0, 0], [.60, 0], [.675, .036], [.66, .11], [.58, .18],
      [.49, .42], [.50, .48], [.535, .515], [.535, .575], [0, .575]];
    piece(new T.LatheGeometry(profile.map(([x, y]) => new T.Vector2(x, y)), 24), shell);
    cylinder(.63, .655, .026, 0, .112, 0, dark, 24);
    cylinder(.518, .52, .043, 0, .462, 0, dark, 24);
    cylinder(.432, .432, .008, 0, .58, 0, dark, 24);
    for (const radius of [.28, .383, .48]) ring(radius, .012, 0, .58, 0, baseStatus, true, 32);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, x = Math.sin(a), z = Math.cos(a);
      box(.065, .285, .037, x * .515, .325, z * .515, frame, .007, 0, a);
      box(.034, .076, .012, x * .54, .264, z * .54, marking, .003, 0, a);
      cylinder(.024, .024, .016, x * .60, .143, z * .60, steel, 6);
    }
    const core = new T.Group(); core.name = 'EN01_Core'; core.position.y = 1.5; root.add(core); parent = core;
    // Open structural cage exposes the luminous capacitor; no solid cube hides it.
    for (const sign of [-1, 1]) {
      box(.65, .06, .65, 0, sign * .31, 0, frame, .014);
      box(.48, .021, .48, 0, sign * .267, 0, dark, .009);
      ring(.194, .013, 0, sign * .223, 0, steel, true, 24);
      cylinder(.137, .165, .045, 0, sign * .203, 0, shell, 16);
      for (const x of [-.255, .255]) for (const z of [-.255, .255]) {
        cylinder(.018, .018, .013, x, sign * .343, z, steel, 6);
      }
      for (const y of [-.19, .19]) box(.53, .032, .028, 0, y, sign * .293, frame, .005);
      for (const x of [-.205, .205]) box(.022, .235, .018, x, 0, sign * .316, status, .004);
    }
    for (const x of [-.271, .271]) for (const z of [-.271, .271]) {
      box(.047, .56, .047, x, 0, z, shell, .008);
      box(.083, .07, .083, x, -.205, z, dark, .007);
      box(.083, .07, .083, x, .205, z, dark, .007);
    }
    cylinder(.103, .103, .412, 0, 0, 0, status, 20);
    for (const y of [-.15, -.05, .05, .15]) ring(.156, .014, 0, y, 0, marking, true, 24);
    for (const x of [-.307, .307]) box(.026, .29, .13, x, 0, 0, dark, .008);
  }
  mergeSurfaces(root);
  root.traverse(object => {
    object.raycast = noRaycast;
    if (object.isMesh) {
      object.castShadow = true; object.receiveShadow = true;
      object.userData.environmentPropVisual = true;
    }
  });
  return root;
}

export function getEnvironmentPropParts(root) {
  let authorRoot = null;
  root.traverse(o => { if (!authorRoot && o.userData.environmentProp) authorRoot = o; });
  if (!authorRoot) throw new TypeError('Not an environment prop');
  const id = authorRoot.userData.assetId;
  return {
    root: authorRoot, type: authorRoot.userData.environmentProp,
    status: root.getObjectByName(id + '_Status'),
    core: root.getObjectByName('EN01_Core'), base: root.getObjectByName('EN01_Base'),
    coreStatus: root.getObjectByName('EN01_CoreStatus'), baseStatus: root.getObjectByName('EN01_BaseStatus')
  };
}

// Shared by the live node and the gallery; never changes gameplay state.
export function setEnvironmentPropState(root, state = 'ready') {
  const parts = getEnvironmentPropParts(root);
  if (parts.type === 'node') {
    parts.core.visible = state !== 'spent';
    parts.coreStatus.material.emissive.setHex(state === 'low' ? 0xd68c42 : 0x4a81cb);
    parts.coreStatus.material.color.setHex(state === 'low' ? 0xffc38d : 0x9adfff);
    parts.baseStatus.material.emissiveIntensity = state === 'spent' ? .04 : .25;
  } else if (parts.status) {
    const normal = parts.type === 'vent' ? 0x6ff2d4 : 0xffd36a;
    parts.status.material.color.setHex(state === 'active' ? 0xffffff : state === 'off' || state === 'spent'
      ? (parts.type === 'vent' ? 0x3a5c58 : 0x5a4a2a) : normal);
  }
}

export function environmentPropStats(root) {
  let meshes = 0, triangles = 0;
  const materials = new Set();
  root.traverse(o => {
    if (!o.isMesh) return;
    meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) materials.add(material);
  });
  const bounds = new T.Box3().setFromObject(root);
  return { meshes, triangles, materials: materials.size, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
}

export function disposeEnvironmentProp(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const material of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) materials.add(material);
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}

// Immutable surfaces are shared. Only status materials are instance-owned.
export function createEnvironmentPropLibrary() {
  const templates = new Map(), instances = new Map();
  let disposed = false;
  const release = root => {
    const owned = instances.get(root);
    if (!owned) return;
    owned.forEach(m => m.dispose()); instances.delete(root);
  };
  return {
    create(type) {
      if (disposed) throw new Error('Environment prop library disposed');
      if (!templates.has(type)) templates.set(type, createEnvironmentPropVisual(type));
      const root = templates.get(type).clone(true), owned = new Map();
      root.traverse(o => {
        o.raycast = noRaycast;
        if (o.isMesh && o.material.userData.environmentMutable) {
          const shared = o.material;
          if (!owned.has(shared)) owned.set(shared, shared.clone());
          o.material = owned.get(shared);
        }
      });
      instances.set(root, owned); return root;
    },
    release,
    stats: () => ({ templates: templates.size, instances: instances.size }),
    dispose() {
      if (disposed) return;
      disposed = true;
      [...instances.keys()].forEach(release);
      templates.forEach(disposeEnvironmentProp); templates.clear();
    }
  };
}
