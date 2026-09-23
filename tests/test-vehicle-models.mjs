import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {VEHICLE_ASSETS, createVehicleVisual, vehicleStats, disposeVehicle} from '../src/vehicle-models.js';

const hash = b => createHash('sha256').update(b).digest('hex');
let groups = 0; const pass = s => { groups++; console.log('PASS ' + s); };

assert.throws(() => createVehicleVisual('invalid'), RangeError);
const roster = JSON.parse(fs.readFileSync(new URL('../models/vehicles.manifest.json',import.meta.url), 'utf8'));
assert.equal(roster.total, 4); assert.equal(roster.assets.length, 4);

for (const [type, spec] of Object.entries(VEHICLE_ASSETS)) {
  const root = createVehicleVisual(type), stats = vehicleStats(root);
  assert(stats.meshes <= 6); assert(stats.materials <= 6); assert(stats.triangles < 5000);
  root.traverse(o => {
    if (o.isMesh) {
      for (const a of Object.values(o.geometry.attributes)) assert([...a.array].every(Number.isFinite));
      assert.equal(o.material.depthTest, true);
    }
  });
  assert.equal(new T.Raycaster(new T.Vector3(0, 10, 0), new T.Vector3(0, -1, 0)).intersectObject(root, true).length, 0, 'visual cannot intercept shots');
  pass(spec.id + ' finite geometry, mesh budget, and visual-only raycasts');

  const binary = fs.readFileSync(new URL('../models/'+(spec.file),import.meta.url)), manifest = JSON.parse(fs.readFileSync(new URL('../models/'+(spec.file.replace('.glb', '.manifest.json')),import.meta.url), 'utf8'));
  assert.equal(binary.toString('ascii', 0, 4), 'glTF'); assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(hash(binary), manifest.sha256); assert.equal(binary.length, manifest.bytes);
  for (const [file, sha] of Object.entries(manifest.sourceHashes)) assert.equal(hash(fs.readFileSync(file)), sha, file + ' source provenance');

  const parsed = await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), '');
  const imported = vehicleStats(parsed.scene);
  assert.equal(imported.triangles, stats.triangles); assert.equal(imported.meshes, stats.meshes);
  for (const side of ['min', 'max']) for (let i = 0; i < 3; i++) assert(Math.abs(imported.bounds[side][i] - stats.bounds[side][i]) < 1e-6);
  pass(spec.id + ' GLB parse, exported geometry parity, zero external dependencies');

  disposeVehicle(root); disposeVehicle(parsed.scene);
}
