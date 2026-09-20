// Real Three.js integration checks; no renderer, player storage or gameplay mutations.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel, animateEnemy} from './enemy-model.js';
import {ENEMY_TYPES} from './enemy-rules.js';
import {createRangedGuardVisual, makeRangedGuardClips, rangedGuardStats, cloneRangedGuardVisual,
  disposeRangedGuardVisual, bindRangedGuardRig, GUARD_ASSET_VERSION} from './characters/ranged-guard.js';
const results = [];
function check(name, fn) { fn(); results.push(name); console.log('PASS:', name); }
function disposeGroup(g) { const geos = new Set(); g.traverse(o => { if (o.geometry) geos.add(o.geometry); });
  geos.forEach(x => x.dispose()); new Set(g.userData.ownedMaterials || []).forEach(m => m.dispose()); g.removeFromParent(); }
function proxySignature(g) { return g.children.filter(o => o.isMesh).map(o => ({zone: o.userData.hitZone,
  pos: o.position.toArray(), rot: o.rotation.toArray(), geo: [...o.geometry.attributes.position.array]})); }
const legacy = createEnemyModel('ranged', {rangedSample: false});
const current = createEnemyModel('ranged', {loadRangedAsset: false});
check('ranged only; root-level legacy hit geometry/transforms unchanged', () => {
  assert.deepEqual(proxySignature(current), proxySignature(legacy));
  assert(current.children.filter(o => o.isMesh).every(o => !o.visible && o.userData.rangedGuardProxy));
  assert(current.userData.parts.guard); assert.equal(current.userData.rangedGuardSource, 'procedural');
  assert.equal(ENEMY_TYPES.ranged.hp, 60); assert.equal(ENEMY_TYPES.ranged.radius, .65);
});
check('all other enemy types keep identical direct meshes and no R07 adapter', () => {
  for (const type of Object.keys(ENEMY_TYPES).filter(t => t !== 'ranged')) {
    const a = createEnemyModel(type), b = createEnemyModel(type, {rangedSample: false});
    assert.deepEqual(proxySignature(a), proxySignature(b), type);
    assert(!a.userData.parts?.guard, type); disposeGroup(a); disposeGroup(b);
  }
});
let rayCount = 0;
check('8,000+ front/rear/side rays preserve distances, hit zones and direct ownership in four poses', () => {
  for (const [time, walking, charge] of [[0, false, 0], [.31, true, 0], [.77, true, .5], [1.4, false, 1]]) {
    for (const g of [legacy, current]) {
      animateEnemy({group: g, type: 'ranged', hp: 60, seed: .4, charge}, time, walking, 10);
      g.updateMatrixWorld(true);
    }
    for (let yi = 0; yi <= 26; yi++) for (let xi = -10; xi <= 10; xi++) {
      const y = yi * .1, x = xi * .1;
      for (const [origin, dir] of [[[x, y, 5], [0, 0, -1]], [[x, y, -5], [0, 0, 1]],
        [[5, y, x], [-1, 0, 0]], [[-5, y, x], [1, 0, 0]]]) {
        const ray = new T.Raycaster(new T.Vector3(...origin), new T.Vector3(...dir));
        const a = ray.intersectObjects(legacy.children, false)[0], b = ray.intersectObjects(current.children, false)[0];
        assert.equal(!!b, !!a); if (a) { assert(Math.abs(a.distance - b.distance) < 1e-8);
          assert.equal(a.object.userData.hitZone, b.object.userData.hitZone); assert.equal(b.object.parent, current); }
        rayCount++;
      }
    }
  }
  assert(rayCount > 8000);
});
check('visual descendants cannot absorb recursively cast combat rays', () => {
  const root = current.userData.parts.guard.visual.root;
  root.updateWorldMatrix(true, true);
  const hits = new T.Raycaster(new T.Vector3(0, 1.94, 5), new T.Vector3(0, 0, -1)).intersectObject(root, true);
  assert.equal(hits.length, 0);
});
check('idle/patrol/aim/hit changes visual joints, not authoritative hit meshes', () => {
  const e = {group: current, type: 'ranged', hp: 60, seed: .2, charge: 0};
  animateEnemy(e, 10, false); const idle = current.userData.parts.guard.visual.rig.nodes.Thigh_R.rotation.x;
  animateEnemy(e, 10.1, true); assert.notEqual(current.userData.parts.guard.visual.rig.nodes.Thigh_R.rotation.x, idle);
  e.charge = 1; animateEnemy(e, 10.2, false); assert.equal(current.userData.parts.guard.pose.mode, 'Aim');
  e.hp = 20; animateEnemy(e, 10.3, false); animateEnemy(e, 10.4, false); assert(current.userData.parts.guard.pose.hit > 0);
});
const visual = createRangedGuardVisual();
check('geometry finite; <=12k triangles / 80 mesh batches / 8 materials; four exported motion clips', () => {
  const stats = rangedGuardStats(visual.root); assert(stats.triangles > 5000 && stats.triangles <= 12000);
  assert(stats.meshes <= 80); assert.equal(stats.materials, 8);
  visual.root.traverse(o => { if (o.isMesh) assert([...o.geometry.attributes.position.array].every(Number.isFinite)); });
  assert.deepEqual(makeRangedGuardClips(visual.root).map(c => c.name), ['Idle', 'Patrol', 'Aim', 'Hit']);
});
const binary = await readFile(new URL('./models/ranged-guard-r07.glb', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./models/ranged-guard-r07.manifest.json', import.meta.url), 'utf8'));
check('GLB v2 length/hash/source provenance; no external buffers or images', () => {
  assert.equal(binary.readUInt32LE(0), 0x46546c67); assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(binary.readUInt32LE(8), binary.length);
  assert.equal(manifest.sha256, createHash('sha256').update(binary).digest('hex'));
  const json = JSON.parse(binary.subarray(20, 20 + binary.readUInt32LE(12)).toString());
  assert.equal(json.animations.length, 4); assert.equal((json.images || []).length, 0);
  assert(json.buffers.every(b => !b.uri)); assert.equal((json.skins || []).length, 0);
  assert.equal(manifest.version, GUARD_ASSET_VERSION); assert(binary.length < 1500000);
});
assert.equal(manifest.sourceSha256, createHash('sha256').update(await readFile(new URL('./characters/ranged-guard.js', import.meta.url))).digest('hex'));
globalThis.ProgressEvent ||= class ProgressEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } };
const gltf = await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), '');
const template = gltf.scene.getObjectByName('R07_Visual');
check('GLB reload preserves rig names, geometry, materials and all animation tracks', () => {
  assert(template); bindRangedGuardRig(template); assert.deepEqual(rangedGuardStats(template), rangedGuardStats(visual.root));
  assert.deepEqual(gltf.animations.map(c => c.name), ['Idle', 'Patrol', 'Aim', 'Hit']);
  const mixer = new T.AnimationMixer(template); mixer.clipAction(gltf.animations[1]).play(); mixer.update(.225);
  assert(Math.abs(template.getObjectByName('R07_Thigh_R').rotation.x) > .1);
  mixer.stopAllAction(); mixer.uncacheRoot(template);
});
check('GLB instances own their geometry/materials; disposing one does not invalidate another', () => {
  const accentA = new T.MeshStandardMaterial(), accentB = new T.MeshStandardMaterial();
  const a = cloneRangedGuardVisual(template, accentA), b = cloneRangedGuardVisual(template, accentB);
  let disposedB = 0, disposedAccent = 0;
  b.root.traverse(o => { o.geometry?.addEventListener('dispose', () => disposedB++); });
  b.materials.forEach(m => m.addEventListener('dispose', () => disposedB++));
  accentA.addEventListener('dispose', () => disposedAccent++);
  const ma = []; a.root.traverse(o => { if (o.isMesh) ma.push(o); });
  const mb = []; b.root.traverse(o => { if (o.isMesh) mb.push(o); });
  ma.forEach((o, i) => { assert.notEqual(o.geometry, mb[i].geometry); assert.notEqual(o.material, mb[i].material); });
  disposeRangedGuardVisual(a); assert.equal(disposedB, 0); assert.equal(disposedAccent, 0);
  disposeRangedGuardVisual(b); accentA.dispose(); accentB.dispose();
});
check('twenty spawn/dispose cycles keep per-instance owned material lists unique', () => {
  for (let i = 0; i < 20; i++) {
    const g = createEnemyModel('ranged', {loadRangedAsset: false}), owned = g.userData.ownedMaterials;
    assert.equal(new Set(owned).size, owned.length);
    let disposed = 0; owned.forEach(m => m.addEventListener('dispose', () => disposed++));
    disposeGroup(g); assert.equal(disposed, owned.length);
  }
});
disposeGroup(current); disposeGroup(legacy); disposeRangedGuardVisual(visual);
console.log(JSON.stringify({passed: results.length, rayCount, stats: manifest}, null, 2));
