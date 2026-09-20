// R-07 VIGIL: original hard-surface ranged-guard sample, +Z forward, metres.
// Pure Three.js asset source; no DOM, network, gameplay state or external textures.
import * as T from '../node_modules/three/build/three.module.js';
import {mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

export const GUARD_ASSET_VERSION = 'r07-v1';
export const GUARD_CLIPS = Object.freeze(['Idle', 'Patrol', 'Aim', 'Hit']);
const TAU = Math.PI * 2;
const noop = () => {};

function material(name, color, metalness, roughness, extra = {}) {
  return new T.MeshStandardMaterial({name, color, metalness, roughness, ...extra});
}
function palette(accent) {
  return {
    ceramic: material('R07_Ceramic', 0xb9c5c2, .42, .38),
    armor: material('R07_Armor', 0x40565b, .7, .4),
    edge: material('R07_Edge', 0x788a8e, .82, .3),
    suit: material('R07_Suit', 0x111a20, .12, .8),
    rubber: material('R07_Rubber', 0x202a2d, .04, .87),
    weapon: material('R07_Weapon', 0x243037, .8, .34),
    warning: material('R07_Identification', 0xbc8150, .4, .5),
    accent: accent || material('R07_Indicator', 0xc59bff, .35, .23,
      {emissive: 0xc59bff, emissiveIntensity: 1}),
  };
}
function group(parent, name, x = 0, y = 0, z = 0) {
  const g = new T.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  m.raycast = noop; m.userData.combatDecoration = true; parent.add(m); return m;
}
function box(parent, size, pos, mat, rotation = [0, 0, 0]) {
  return mesh(parent, new T.BoxGeometry(...size), mat, ...pos, ...rotation);
}
function cylinder(parent, r1, r2, length, pos, mat, rotation = [0, 0, 0], sides = 12) {
  return mesh(parent, new T.CylinderGeometry(r1, r2, length, sides, 1), mat, ...pos, ...rotation);
}
function plate(parent, points, depth, pos, mat, bevel = .012, rotation = [0, 0, 0]) {
  const shape = new T.Shape(); points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, {depth, steps: 1, curveSegments: 1,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1});
  geo.translate(0, 0, -depth / 2);
  return mesh(parent, geo, mat, ...pos, ...rotation);
}
function panel(parent, width, height, depth, pos, mat, bevel = .012, rotation = [0, 0, 0]) {
  const x = width / 2, y = height / 2, c = Math.min(width, height) * .17;
  return plate(parent, [[-x + c, -y], [x - c, -y], [x, -y + c], [x, y - c],
    [x - c, y], [-x + c, y], [-x, y - c], [-x, -y + c]], depth, pos, mat, bevel, rotation);
}
function strut(parent, a, b, r1, r2, mat) {
  const from = new T.Vector3(...a), to = new T.Vector3(...b), direction = to.clone().sub(from);
  const m = cylinder(parent, r1, r2, direction.length(), from.add(to).multiplyScalar(.5).toArray(), mat);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()); return m;
}
function bolt(parent, x, y, z, mat, radius = .016) {
  cylinder(parent, radius, radius, .009, [x, y, z], mat, [Math.PI / 2, 0, 0], 6);
}
function ribs(parent, n, width, startY, step, z, mat) {
  for (let i = 0; i < n; i++) box(parent, [width, .014, .024], [0, startY + i * step, z], mat);
}
function label07(parent, pos, mat, scale = .013) {
  // Small raised industrial numerals. Baked into the owning joint/material mesh.
  const digits = ['111,101,101,101,111', '111,001,001,010,010'];
  digits.forEach((digit, d) => digit.split(',').forEach((row, y) => [...row].forEach((on, x) => {
    if (on === '1') box(parent, [scale * .86, scale * .86, .003],
      [pos[0] + (d * 4 + x) * scale, pos[1] - y * scale, pos[2]], mat);
  })));
}
function helmet(parent, m) {
  // Octagonal ring loft: a sloping shell rather than a box with paint on it.
  const rings = [
    {y: -.21, x: .215, z: .218, front: .01},
    {y: -.09, x: .29, z: .27, front: .015},
    {y: .115, x: .295, z: .272, front: -.006},
    {y: .22, x: .208, z: .203, front: -.035},
  ];
  const pts = [], indices = [];
  for (const {y, x, z, front} of rings) {
    [[-.62, 1], [.62, 1], [1, .6], [1, -.6], [.62, -1], [-.62, -1], [-1, -.6], [-1, .6]]
      .forEach(([a, b]) => pts.push(a * x, y, b * z + front));
  }
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < 8; i++) {
    const a = j * 8 + i, b = j * 8 + (i + 1) % 8;
    indices.push(a, b, a + 8, b, b + 8, a + 8);
  }
  // Winding is made outward with an explicit surface-orientation pass below.
  for (let i = 1; i < 7; i++) { indices.push(0, i + 1, i); indices.push(24, 24 + i, 24 + i + 1); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); geo.setIndex(indices);
  // Side triangles point outward; bottom and top caps have opposite winding.
  const flat = geo.toNonIndexed(); geo.dispose(); flat.computeVertexNormals();
  // Supply UVs for uniform merge attributes; this sample deliberately has no image maps.
  flat.setAttribute('uv', new T.BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
  mesh(parent, flat, m.ceramic);
  panel(parent, .52, .105, .075, [0, .012, .28], m.weapon, .014);
  plate(parent, [[-.234, .024], [-.18, -.018], [.18, -.018], [.234, .024], [.19, .038], [-.19, .038]],
    .012, [0, -.002, .324], m.accent, .003);
  panel(parent, .42, .04, .035, [0, .091, .306], m.armor, .006, [-.15, 0, 0]);
  panel(parent, .28, .115, .065, [0, -.135, .268], m.armor, .01, [.24, 0, 0]);
  for (let i = -1; i <= 1; i++) box(parent, [.033, .065, .012], [i * .055, -.145, .307], m.suit, [.24, 0, 0]);
  for (const s of [-1, 1]) {
    panel(parent, .115, .12, .11, [s * .223, -.135, .22], m.ceramic, .009, [0, s * .45, 0]);
    cylinder(parent, .092, .092, .07, [s * .29, -.035, -.005], m.armor, [0, 0, Math.PI / 2]);
    cylinder(parent, .053, .053, .08, [s * .315, -.035, -.005], m.edge, [0, 0, Math.PI / 2]);
    panel(parent, .028, .15, .18, [s * .233, .118, -.068], m.armor, .004, [0, 0, -s * .23]);
  }
  panel(parent, .085, .1, .26, [0, .22, -.07], m.armor, .008);
  panel(parent, .18, .12, .055, [0, -.05, -.279], m.armor, .008);
  ribs(parent, 3, .12, -.075, .029, -.312, m.suit);
  label07(parent, [.09, .154, .235], m.armor, .009);
}
function rifle(parent, m) {
  const g = group(parent, 'R07_Rifle', 0, -.378, .186);
  g.rotation.x = 1.17; // Counter the ready-pose elbow bend; muzzle remains +Z.
  panel(g, .145, .17, .42, [0, .055, .035], m.weapon, .009);
  panel(g, .166, .10, .32, [0, .089, .09], m.armor, .008);
  panel(g, .11, .14, .18, [0, .036, -.22], m.rubber, .008);
  panel(g, .08, .23, .1, [0, -.10, -.035], m.rubber, .008, [-.24, 0, 0]);
  panel(g, .095, .22, .15, [0, -.12, .16], m.weapon, .008, [.18, 0, 0]);
  box(g, [.11, .035, .16], [0, -.236, .179], m.edge);
  cylinder(g, .03, .031, .32, [0, .085, .38], m.edge, [Math.PI / 2, 0, 0]);
  cylinder(g, .047, .045, .12, [0, .085, .535], m.weapon, [Math.PI / 2, 0, 0], 8);
  cylinder(g, .028, .028, .005, [0, .085, .598], m.suit, [Math.PI / 2, 0, 0], 8);
  box(g, [.06, .044, .28], [0, .17, .0], m.weapon);
  panel(g, .075, .068, .09, [0, .218, -.085], m.edge, .004);
  box(g, [.023, .021, .005], [0, .225, -.035], m.accent);
  for (let i = 0; i < 4; i++) box(g, [.012, .056, .025], [.079, .065, .03 + i * .049], m.suit);
  box(g, [.008, .024, .15], [.088, .113, .13], m.warning);
  return g;
}
function hand(parent, m, side) {
  panel(parent, .125, .14, .13, [0, -.385, .08], m.rubber, .012);
  panel(parent, .134, .09, .035, [0, -.365, .156], m.armor, .007);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * .027;
    cylinder(parent, .014, .012, .085, [x, -.46, .092], m.rubber, [.35, 0, 0], 6);
    panel(parent, .023, .034, .035, [x, -.435, .131], m.edge, .002);
  }
  cylinder(parent, .021, .017, .07, [side * -.08, -.395, .084], m.rubber, [0, 0, side * -.55], 7);
}
function optimize(root) {
  // Merge within each animated node and material, never across a joint.
  const nodes = []; root.traverse(o => { if (o.isGroup) nodes.push(o); });
  for (const node of nodes) {
    const batches = new Map();
    for (const o of node.children.slice()) if (o.isMesh) {
      o.updateMatrix(); const geom = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geom.applyMatrix4(o.matrix);
      if (!geom.attributes.uv) geom.setAttribute('uv', new T.BufferAttribute(new Float32Array(geom.attributes.position.count * 2), 2));
      const list = batches.get(o.material) || []; list.push(geom); batches.set(o.material, list);
      o.geometry.dispose(); node.remove(o);
    }
    for (const [mat, geos] of batches) {
      const geo = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
      if (!geo) throw new Error('R07 geometry merge failed');
      const merged = mesh(node, geo, mat); merged.name = node.name + '_' + mat.name;
      geo.computeBoundingBox(); geo.computeBoundingSphere();
    }
  }
}

export function createRangedGuardVisual({accentMaterial = null} = {}) {
  const m = palette(accentMaterial), root = new T.Group();
  root.name = 'R07_Visual'; root.userData.assetVersion = GUARD_ASSET_VERSION;
  root.userData.description = 'Original VIGIL ranged guard; rigid articulated armor, +Z forward; visual only.';
  const hips = group(root, 'R07_Hips', 0, .885, 0);
  panel(hips, .6, .2, .37, [0, .035, 0], m.suit, .024);
  panel(hips, .65, .10, .40, [0, .13, 0], m.armor, .014);
  panel(hips, .22, .095, .055, [0, .125, .223], m.edge, .006);
  panel(hips, .22, .23, .10, [0, -.055, .18], m.armor, .012);
  for (const s of [-1, 1]) {
    panel(hips, .21, .22, .13, [s * .245, .055, .2], m.rubber, .015, [0, 0, s * -.09]);
    box(hips, [.13, .035, .025], [s * .245, .132, .281], m.armor);
  }
  const chest = group(hips, 'R07_Chest', 0, .235, 0);
  panel(chest, .65, .58, .42, [0, .21, -.015], m.suit, .03);
  for (let i = 0; i < 3; i++) panel(chest, .49 - i * .035, .076, .08, [0, -.08 + i * .087, .237], m.armor, .009);
  for (const s of [-1, 1]) {
    const pts = [[.04, -.07], [.36, -.035], [.407, .155], [.32, .29], [.045, .25]].map(([x, y]) => [s * x, y]);
    plate(chest, pts, .10, [0, .275, .245], m.ceramic, .018, [-.09, 0, 0]);
    panel(chest, .043, .15, .08, [s * .315, .185, .28], m.armor, .005, [0, 0, -s * .36]);
    panel(chest, .065, .065, .052, [s * .325, .397, .338], m.edge, .006);
    bolt(chest, s * .30, .3, .314, m.weapon);
    box(chest, [.11, .018, .013], [s * .17, .368, .312], m.accent);
    strut(chest, [s * .33, .21, -.1], [s * .27, -.16, -.14], .023, .032, m.edge);
  }
  panel(chest, .11, .22, .035, [0, .312, .314], m.armor, .006);
  plate(chest, [[-.032, .048], [0, .017], [.032, .048], [.022, .065], [0, .044], [-.022, .065]], .009,
    [0, .322, .342], m.warning, .001);
  label07(chest, [.114, .232, .314], m.armor, .008);
  cylinder(chest, .205, .25, .07, [0, .575, 0], m.armor, [0, 0, 0], 12);
  cylinder(chest, .12, .14, .16, [0, .6, 0], m.suit, [0, 0, 0], 12);
  panel(chest, .44, .48, .24, [0, .24, -.342], m.armor, .025);
  panel(chest, .3, .36, .025, [0, .24, -.482], m.weapon, .01);
  ribs(chest, 7, .24, .12, .034, -.505, m.edge);
  for (const s of [-1, 1]) {
    cylinder(chest, .065, .065, .36, [s * .236, .20, -.346], m.edge, [0, 0, 0], 8);
    panel(chest, .08, .25, .025, [s * .236, .18, -.423], m.ceramic, .007);
  }
  const antenna = group(chest, 'R07_Antenna', -.385, .435, -.18);
  cylinder(antenna, .047, .053, .12, [0, .03, 0], m.armor);
  cylinder(antenna, .012, .024, .64, [0, .345, 0], m.weapon, [0, 0, -.09], 7);
  panel(antenna, .045, .075, .035, [.03, .68, 0], m.accent, .004);
  const head = group(chest, 'R07_Head', 0, .82, 0); helmet(head, m);

  for (const s of [-1, 1]) {
    const suffix = s === 1 ? 'R' : 'L';
    const upper = group(chest, 'R07_Arm_' + suffix, s * .535, .50, 0);
    cylinder(upper, .125, .125, .16, [s * .06, -.03, 0], m.suit, [0, 0, Math.PI / 2]);
    panel(upper, .32, .22, .45, [s * .08, .026, .02], m.armor, .025, [0, 0, -s * .15]);
    plate(upper, [[-.12, -.075], [.12, -.075], [.17, .025], [.10, .12], [-.11, .12], [-.16, .025]],
      .08, [s * .065, .04, .267], m.ceramic, .012, [0, 0, -s * .13]);
    panel(upper, .16, .029, .016, [s * .08, .086, .32], m.accent, .003, [0, 0, -s * .13]);
    cylinder(upper, .092, .078, .33, [s * .035, -.235, -.005], m.suit);
    panel(upper, .20, .235, .13, [s * .055, -.216, .082], m.armor, .018, [0, 0, -s * .04]);
    panel(upper, .10, .12, .04, [s * .055, -.20, .16], m.ceramic, .008);
    const fore = group(upper, 'R07_Forearm_' + suffix, s * .025, -.435, 0);
    cylinder(fore, .078, .078, .19, [0, 0, 0], m.edge, [0, 0, Math.PI / 2]);
    cylinder(fore, .039, .039, .208, [0, 0, 0], m.weapon, [0, 0, Math.PI / 2], 8);
    cylinder(fore, .069, .088, .285, [0, -.185, .03], m.rubber);
    plate(fore, [[-.094, .075], [.094, .075], [.10, -.08], [.066, -.245], [-.066, -.245], [-.10, -.08]],
      .1, [0, -.12, .10], m.ceramic, .014, [-.08, 0, 0]);
    panel(fore, .043, .17, .034, [0, -.151, .178], m.armor, .004);
    for (const x of [-.068, .068]) bolt(fore, x, -.082, .177, m.weapon, .011);
    cylinder(fore, .08, .08, .06, [0, -.325, .035], m.armor);
    hand(fore, m, s);
    if (s === 1) rifle(fore, m);
    else { panel(fore, .16, .105, .03, [0, -.105, .197], m.weapon, .007);
      box(fore, [.09, .008, .006], [0, -.105, .217], m.accent); }

    const thigh = group(hips, 'R07_Thigh_' + suffix, s * .26, -.015, 0);
    cylinder(thigh, .105, .115, .28, [0, -.17, 0], m.suit);
    plate(thigh, [[-.105, .11], [.105, .11], [.128, -.045], [.082, -.205], [-.082, -.205], [-.125, -.045]],
      .16, [0, -.14, .10], m.armor, .015);
    panel(thigh, .13, .19, .07, [0, -.16, .205], m.ceramic, .011, [.10, 0, 0]);
    box(thigh, [.12, .02, .012], [0, -.23, .247], m.warning);
    const shin = group(thigh, 'R07_Shin_' + suffix, 0, -.355, 0);
    cylinder(shin, .086, .086, .25, [0, 0, 0], m.weapon, [0, 0, Math.PI / 2]);
    panel(shin, .23, .18, .11, [0, -.018, .12], m.ceramic, .012, [.14, 0, 0]);
    bolt(shin, -.072, -.005, .19, m.weapon); bolt(shin, .072, -.005, .19, m.weapon);
    cylinder(shin, .10, .074, .30, [0, -.195, -.015], m.rubber);
    plate(shin, [[-.108, .092], [.108, .092], [.085, -.18], [.04, -.225], [-.062, -.225]],
      .065, [0, -.206, .10], m.armor, .014);
    panel(shin, .055, .24, .025, [0, -.21, .15], m.ceramic, .005, [.08, 0, 0]);
    for (const x of [-.102, .102]) strut(shin, [x, -.085, -.03], [x * .72, -.35, -.055], .02, .015, m.edge);
    const foot = group(shin, 'R07_Foot_' + suffix, 0, -.37, 0);
    panel(foot, .275, .11, .39, [0, -.07, .077], m.rubber, .016);
    panel(foot, .246, .087, .23, [0, -.008, .131], m.armor, .016, [.05, 0, 0]);
    panel(foot, .19, .052, .10, [0, .014, .206], m.ceramic, .009);
    for (let k = 0; k < 3; k++) box(foot, [.281, .024, .034], [0, -.094, -.04 + k * .105], m.weapon);
  }
  optimize(root);
  const rig = bindRangedGuardRig(root); poseRangedGuard(rig, {time: 0, mode: 'Idle'});
  return {root, rig, materials: Object.values(m).filter(mat => mat !== accentMaterial)};
}

export function bindRangedGuardRig(root) {
  const names = ['Hips', 'Chest', 'Head', 'Arm_R', 'Arm_L', 'Forearm_R', 'Forearm_L',
    'Thigh_R', 'Thigh_L', 'Shin_R', 'Shin_L', 'Foot_R', 'Foot_L'];
  const nodes = Object.fromEntries(names.map(name => [name, root.getObjectByName('R07_' + name)]));
  for (const name of names) if (!nodes[name]) throw new Error('Incomplete R07 rig: ' + name);
  return {root, nodes};
}
export function poseRangedGuard(rig, {time = 0, mode = 'Idle', phase = 0, hit = 0} = {}) {
  const n = rig.nodes, walking = mode === 'Patrol', aiming = mode === 'Aim';
  const t = time + phase, stride = walking ? Math.sin(t * TAU / .9) : 0;
  const breath = Math.sin(t * TAU / 2.4), recoil = Math.max(0, hit);
  n.Hips.position.y = .885 + (walking ? Math.cos(t * TAU / .45) * .010 : breath * .003);
  n.Hips.rotation.set(0, walking ? stride * .028 : 0, walking ? stride * .012 : 0);
  n.Chest.rotation.set(-.017 + breath * .007 - recoil * .10, aiming ? -.035 : .015, recoil * .08);
  n.Head.rotation.set(.018 + breath * .006 + recoil * .13, aiming ? .018 : Math.sin(t * .48) * .025, 0);
  for (const s of [-1, 1]) {
    const side = s === 1 ? 'R' : 'L', step = stride * s;
    n['Thigh_' + side].rotation.set(step * .30, 0, s * -.012);
    n['Shin_' + side].rotation.set(walking ? Math.max(0, -step) * .36 : .025, 0, 0);
    n['Foot_' + side].rotation.set(walking ? -step * .30 - Math.max(0, -step) * .36 : -.025, 0, 0);
  }
  // Rifle is a shoulder-carried rigid assembly. Forearm bend keeps its barrel forward.
  n.Arm_R.rotation.set(aiming ? -.51 : -.35 + stride * -.025, 0, -.018);
  n.Forearm_R.rotation.set(aiming ? -.71 - recoil * .10 : -.82, 0, 0);
  n.Arm_L.rotation.set(aiming ? -.50 : -.12 + stride * .16, aiming ? -.27 : 0, .045);
  n.Forearm_L.rotation.set(aiming ? -.72 : -.20, 0, 0);
}

export function makeRangedGuardClips(root) {
  const rig = bindRangedGuardRig(root), clips = [];
  for (const mode of GUARD_CLIPS) {
    const duration = mode === 'Patrol' ? .9 : mode === 'Hit' ? .5 : 2.4;
    const count = Math.round(duration * 30), times = Array.from({length: count + 1}, (_, i) => i / count * duration);
    const tracks = [], rotations = new Map(), positions = [];
    for (const node of Object.values(rig.nodes)) rotations.set(node, []);
    for (const time of times) {
      const hit = mode === 'Hit' ? Math.sin(Math.min(1, time / duration) * Math.PI) * Math.exp(-time * 4) : 0;
      poseRangedGuard(rig, {time: time === duration && mode !== 'Hit' ? 0 : time, mode: mode === 'Hit' ? 'Idle' : mode, hit});
      for (const [node, values] of rotations) values.push(...node.quaternion.toArray());
      positions.push(...rig.nodes.Hips.position.toArray());
    }
    for (const [node, values] of rotations) tracks.push(new T.QuaternionKeyframeTrack(node.name + '.quaternion', times, values));
    tracks.push(new T.VectorKeyframeTrack('R07_Hips.position', times, positions));
    clips.push(new T.AnimationClip(mode, duration, tracks));
  }
  poseRangedGuard(rig, {time: 0}); return clips;
}
export function rangedGuardStats(root) {
  let meshes = 0, triangles = 0; const materials = new Set();
  root.traverse(o => { if (o.isMesh) { meshes++; triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
  return {meshes, triangles, materials: materials.size};
}
export function cloneRangedGuardVisual(template, accentMaterial) {
  const root = template.clone(true), materials = new Map();
  root.traverse(o => { if (!o.isMesh) return;
    o.geometry = o.geometry.clone(); o.castShadow = true; o.receiveShadow = true; o.raycast = noop;
    o.userData.combatDecoration = true;
    const copy = m => { if (m.name === 'R07_Indicator' && accentMaterial) return accentMaterial;
      if (!materials.has(m)) materials.set(m, m.clone()); return materials.get(m); };
    o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
  });
  return {root, rig: bindRangedGuardRig(root), materials: [...materials.values()]};
}
export function disposeRangedGuardVisual(visual) {
  const geometries = new Set(); visual.root.traverse(o => { if (o.geometry) geometries.add(o.geometry); });
  geometries.forEach(g => g.dispose()); new Set(visual.materials).forEach(m => m.dispose());
}
