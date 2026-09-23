import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {INTERACTIVE_PROP_ASSETS, createInteractivePropVisual, createInteractivePropLibrary, interactivePropStats, disposeInteractiveProp} from '../src/interactive-prop-models.js';

const hash = b => createHash('sha256').update(b).digest('hex');
let groups = 0; const pass = s => { groups++; console.log('PASS ' + s); };

assert.throws(() => createInteractivePropVisual('invalid'), RangeError);
const roster = JSON.parse(fs.readFileSync(new URL('../models/interactive-props.manifest.json',import.meta.url), 'utf8'));
assert.equal(roster.total, 2); assert.equal(roster.assets.length, 2);

for (const [type, spec] of Object.entries(INTERACTIVE_PROP_ASSETS)) {
  const root = createInteractivePropVisual(type), stats = interactivePropStats(root);
  assert(stats.meshes <= 6); assert(stats.materials <= 5); assert(stats.triangles < 2500);
  root.traverse(o => {
    if (o.isMesh) {
      for (const a of Object.values(o.geometry.attributes)) assert([...a.array].every(Number.isFinite));
      assert.equal(o.material.depthTest, true);
    }
  });
  assert.equal(new T.Raycaster(new T.Vector3(0, 0, 3), new T.Vector3(0, 0, -1)).intersectObject(root, true).length, 0, 'visual cannot intercept shots');

  if (type === 'barrel') {
    assert(stats.bounds.min[0] >= -.60 && stats.bounds.max[0] <= .60);
    assert(stats.bounds.min[1] >= -.95 && stats.bounds.max[1] <= .98);
  } else {
    assert(stats.bounds.max[0] <= .14 && stats.bounds.max[1] <= .13 && stats.bounds.max[2] <= .14);
  }
  pass(spec.id + ' finite geometry, budget, visual-only raycasts, and bounds compliance');

  const binary = fs.readFileSync(new URL('../models/'+(spec.file),import.meta.url)), manifest = JSON.parse(fs.readFileSync(new URL('../models/'+(spec.file.replace('.glb', '.manifest.json')),import.meta.url), 'utf8'));
  assert.equal(binary.toString('ascii', 0, 4), 'glTF'); assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(hash(binary), manifest.sha256); assert.equal(binary.length, manifest.bytes);
  for (const [file, sha] of Object.entries(manifest.sourceHashes)) assert.equal(hash(fs.readFileSync(file)), sha, file + ' source provenance');

  const parsed = await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), '');
  const imported = interactivePropStats(parsed.scene);
  assert.equal(imported.triangles, stats.triangles); assert.equal(imported.meshes, stats.meshes);
  for (const side of ['min', 'max']) for (let i = 0; i < 3; i++) assert(Math.abs(imported.bounds[side][i] - stats.bounds[side][i]) < 1e-6);
  pass(spec.id + ' GLB parse, exported geometry parity, zero external dependencies');

  disposeInteractiveProp(root); disposeInteractiveProp(parsed.scene);
}

const lib = createInteractivePropLibrary();
const b1 = lib.create('barrel'), b2 = lib.create('barrel');
assert.equal(b1.children[0].geometry, b2.children[0].geometry);
b1.position.set(10, 0, 0); assert.equal(b2.position.x, 0);
lib.dispose();
assert.throws(() => lib.create('barrel'));
pass('interactive prop library clone pooling and disposal isolation');
