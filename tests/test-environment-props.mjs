import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ENVIRONMENT_PROP_ASSETS, createEnvironmentPropVisual, createEnvironmentPropLibrary, getEnvironmentPropParts, setEnvironmentPropState, environmentPropStats, disposeEnvironmentProp } from '../src/environment-prop-models.js';
import { createInteractionWorld } from '../src/interaction-world.js';
import { INTERACTION_LAYOUTS } from '../src/interaction-layouts.js';
import { createEnergyNodes } from '../src/energy-nodes.js';

const hash = value => createHash('sha256').update(value).digest('hex');
let groups = 0;
const pass = text => { groups++; console.log('PASS ' + text); };
const close = (a, b, message, epsilon = 1e-5) => assert(Math.abs(a - b) < epsilon, `${message}: ${a} != ${b}`);
const boundsIn = (box, min, max, message) => {
  box.min.toArray().forEach((v, i) => assert(v >= min[i] - 1e-6, message + ' min ' + i + ': ' + v));
  box.max.toArray().forEach((v, i) => assert(v <= max[i] + 1e-6, message + ' max ' + i + ': ' + v));
};
assert.throws(() => createEnvironmentPropVisual('unknown'), RangeError);
const catalog = JSON.parse(readFileSync(new URL('../models/environment-props.manifest.json',import.meta.url), 'utf8'));
assert.equal(catalog.total, 4); assert.equal(catalog.assets.length, 4);

for (const [type, spec] of Object.entries(ENVIRONMENT_PROP_ASSETS)) {
  const root = createEnvironmentPropVisual(type), stats = environmentPropStats(root);
  assert(stats.meshes <= spec.meshes); assert(stats.triangles <= spec.triangles); assert(stats.materials <= 7);
  root.traverse(o => {
    if (!o.isMesh) return;
    for (const name of ['position', 'normal']) for (const value of o.geometry.getAttribute(name).array) assert(Number.isFinite(value));
    assert.equal(o.material.map, null); assert(o.userData.environmentPropVisual);
  });
  const envelope = type === 'nozzle' ? [[-.25, 0, -.25], [.25, .5, .25]]
    : type === 'node' ? [[-.7, 0, -.7], [.7, 1.85, .7]] : [[-.3, 0, -.3], [.3, 1.1, .3]];
  boundsIn(new T.Box3().setFromObject(root), ...envelope, type);
  if (type === 'node') {
    const parts = getEnvironmentPropParts(root);
    boundsIn(new T.Box3().setFromObject(parts.core), [-.35, 1.15, -.35], [.35, 1.85, .35], 'node core');
    boundsIn(new T.Box3().setFromObject(parts.base), [-.7, 0, -.7], [.7, .6, .7], 'node base');
  }
  const binary = readFileSync(new URL('../models/'+(spec.file),import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('../models/'+(spec.file.replace('.glb', '.manifest.json')),import.meta.url), 'utf8'));
  assert.equal(binary.readUInt32LE(0), 0x46546c67); assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(binary.readUInt32LE(8), binary.length); assert.equal(binary.length, manifest.bytes);
  assert.equal(hash(binary), manifest.sha256); assert.equal(manifest.triangles, stats.triangles);
  for (const [path, sha] of Object.entries(manifest.sourceHashes)) assert.equal(hash(readFileSync(path)), sha, path);
  assert.deepEqual(catalog.assets.find(a => a.id === spec.id), manifest);
  const json = JSON.parse(binary.subarray(20, 20 + binary.readUInt32LE(12)).toString('utf8'));
  assert(!json.images?.length && !json.textures?.length && !json.animations?.length);
  assert(json.buffers.every(buffer => !buffer.uri));
  const parsed = await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), '');
  const actual = environmentPropStats(parsed.scene);
  assert.equal(actual.meshes, stats.meshes); assert.equal(actual.triangles, stats.triangles);
  for (const key of ['min', 'max']) actual.bounds[key].forEach((v, i) => close(v, stats.bounds[key][i], type + ' GLB bounds'));
  getEnvironmentPropParts(parsed.scene); // stable named runtime parts survive export/import
  setEnvironmentPropState(parsed.scene, type === 'node' ? 'low' : 'off');
  disposeEnvironmentProp(parsed.scene); disposeEnvironmentProp(root);
  pass(spec.id + ' geometry budget, collider envelope, finite attributes, exact GLB and provenance');
}

{
  const library = createEnvironmentPropLibrary();
  const a = library.create('vent'), b = library.create('vent');
  const sa = getEnvironmentPropParts(a).status, sb = getEnvironmentPropParts(b).status;
  assert.equal(sa.geometry, sb.geometry); assert.notEqual(sa.material, sb.material);
  const original = sb.material.color.getHex(); sa.material.color.setHex(0xff0000);
  assert.equal(sb.material.color.getHex(), original, 'console states cannot bleed across instances');
  const n1 = library.create('node'), n2 = library.create('node');
  setEnvironmentPropState(n1, 'spent');
  assert.equal(getEnvironmentPropParts(n1).core.visible, false);
  assert.equal(getEnvironmentPropParts(n2).core.visible, true);
  close(getEnvironmentPropParts(n2).baseStatus.material.emissiveIntensity, .25, 'other node remains charged');
  const privateMat = getEnvironmentPropParts(n1).coreStatus.material;
  let releases = 0; privateMat.addEventListener('dispose', () => releases++);
  library.release(n1); library.release(n1); assert.equal(releases, 1);
  for (let i = 0; i < 300; i++) library.release(library.create(['vent', 'light', 'nozzle', 'node'][i % 4]));
  assert.deepEqual(library.stats(), { templates: 4, instances: 3 });
  const geometry = sa.geometry; let geometryReleases = 0;
  geometry.addEventListener('dispose', () => geometryReleases++);
  library.dispose(); library.dispose(); assert.equal(geometryReleases, 1);
  assert.throws(() => library.create('vent'), /disposed/);
  pass('bounded four-template cache, shared geometry, isolated mutable materials, idempotent release');
}

// Explicit pre-refinement proxy contract: self-contained, no ignored .tools baseline dependency.
for (const [map, layout] of Object.entries(INTERACTION_LAYOUTS)) {
  const scene = new T.Scene(), obstacles = [], hemi = new T.HemisphereLight(0xffffff, 0x222222, 2);
  const world = createInteractionWorld(scene, obstacles, layout, { lights: [hemi] });
  assert.equal(obstacles.length, 2);
  scene.updateMatrixWorld(true);
  for (const [i, entry] of [layout.vent, layout.light].entries()) {
    const proxy = obstacles[i], floor = entry.y || 0;
    assert.deepEqual([proxy.x, proxy.z, proxy.w, proxy.h, proxy.d, proxy.bottom, proxy.top, proxy.cover, proxy.interaction],
      [entry.x, entry.z, .6, 1.1, .6, floor, floor + 1.1, false, true]);
    assert.equal(proxy.mesh.geometry.type, 'BoxGeometry');
    assert.equal(proxy.mesh.material.visible, false);
    const original = new T.Mesh(new T.BoxGeometry(.6, 1.1, .6), new T.MeshBasicMaterial());
    original.position.copy(proxy.mesh.position); original.updateMatrixWorld(true);
    for (let j = 0; j < 8; j++) {
      const angle = j * Math.PI / 4;
      const center = proxy.mesh.position.clone();
      const origin = center.clone().add(new T.Vector3(Math.sin(angle) * 3, 0, Math.cos(angle) * 3));
      const ray = new T.Raycaster(origin, center.clone().sub(origin).normalize());
      const expected = ray.intersectObject(original, false)[0];
      const actual = ray.intersectObject(proxy.mesh, false)[0];
      assert(expected && actual); close(actual.distance, expected.distance, map + ' original proxy ray');
      const visual = proxy.mesh.children.find(o => o.userData.environmentProp);
      assert(visual); assert.equal(ray.intersectObject(visual, true).length, 0, 'decoration never catches shots');
    }
    original.geometry.dispose(); original.material.dispose();
  }
  const context = entry => ({ player: { x: entry.x + 1, z: entry.z }, feetY: entry.y || 0, held: true, busy: false });
  world.update(1.6, context(layout.vent)); assert.equal(world.vent.state.uses, 1);
  const vent = scene.getObjectByName('EV01_Status'); assert.equal(vent.material.color.getHex(), 0xffffff);
  world.update(.7, context(layout.light)); assert.equal(world.light.lit, false); close(hemi.intensity, .56, map + ' dark');
  assert.equal(scene.getObjectByName('EL01_Status').material.color.getHex(), 0x5a4a2a);
  assert.equal(vent.material.color.getHex(), 0xffffff, 'light state does not dim the vent');
  world.reset(); assert.equal(world.light.lit, true); close(hemi.intensity, 2, map + ' restored');
  world.dispose(); world.dispose(); assert.equal(obstacles.length, 0); assert.equal(scene.children.length, 0);
}
pass('nine chapter console placements, 144 proxy rays, decorative ray exclusion, state colours, light restoration');

{
  const scene = new T.Scene(), obstacles = [];
  const nodes = createEnergyNodes(scene, obstacles, [[0, 0], [3, 0]], { enemies: [], projectiles: { cancelOwner() {} } });
  scene.updateMatrixWorld(true);
  const proxies = [...obstacles], core = proxies[0].mesh;
  assert.deepEqual(proxies.map(o => [o.w, o.d, o.bottom, o.top]), [[.7, .7, 1.15, 1.85], [1.4, 1.4, 0, .6], [.7, .7, 1.15, 1.85], [1.4, 1.4, 0, .6]]);
  for (const proxy of proxies) {
    const original = proxy.mesh.clone(false); original.material = proxy.mesh.material.clone(); original.material.visible = true;
    original.updateMatrixWorld(true);
    for (let j = 0; j < 8; j++) {
      const angle = j * Math.PI / 4, center = proxy.mesh.position.clone();
      const origin = center.clone().add(new T.Vector3(Math.sin(angle) * 2, 0, Math.cos(angle) * 2));
      const ray = new T.Raycaster(origin, center.clone().sub(origin).normalize());
      close(ray.intersectObject(proxy.mesh, false)[0].distance, ray.intersectObject(original, false)[0].distance, 'node hit envelope');
    }
    original.material.dispose();
  }
  const visual = scene.children.find(o => o.userData.environmentProp === 'node');
  const other = scene.children.filter(o => o.userData.environmentProp === 'node')[1];
  const parts = getEnvironmentPropParts(visual), count = scene.children.length;
  const geometry = parts.coreStatus.geometry;
  for (let i = 0; i < 100; i++) {
    nodes.reset(); nodes.hit(core, 21);
    assert.equal(parts.coreStatus.material.emissive.getHex(), 0xd68c42);
    assert.equal(getEnvironmentPropParts(other).coreStatus.material.emissive.getHex(), 0x4a81cb);
    nodes.hit(core, 9); nodes.flush(); assert.equal(obstacles.length, 3);
    assert.equal(parts.core.visible, false); assert.equal(parts.base.visible, true);
    close(parts.baseStatus.material.emissiveIntensity, .04, 'spent base dims');
    assert.equal(parts.coreStatus.geometry, geometry); assert.equal(scene.children.length, count);
  }
  nodes.suspend(); assert.equal(visual.visible, false); assert.equal(obstacles.length, 0);
  nodes.reset(); assert.equal(visual.visible, true); assert.equal(parts.core.visible, true);
  nodes.reset(new T.Vector3(0, 1.7, 0)); assert.equal(visual.visible, false); assert.equal(nodes.snapshot()[0].enabled, false);
  pass('energy core/base proxies, 100 break/reset cycles, low-health/spent/disabled visuals and isolated states');
}
console.log('PASS environment props: ' + groups + ' groups');
