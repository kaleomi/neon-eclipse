import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';

const hash = b => createHash('sha256').update(b).digest('hex');
let groups = 0; const pass = s => { groups++; console.log('PASS ' + s); };

const roster = JSON.parse(fs.readFileSync(new URL('../models/player-weapons.manifest.json',import.meta.url), 'utf8'));
assert.equal(roster.total, 8); assert.equal(roster.assets.length, 8);

for (const manifest of roster.assets) {
  const binary = fs.readFileSync(new URL('../models/'+(manifest.asset),import.meta.url));
  assert.equal(binary.toString('ascii', 0, 4), 'glTF');
  assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(hash(binary), manifest.sha256);
  assert.equal(binary.length, manifest.bytes);

  const parsed = await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), '');
  let meshes = 0, triangles = 0;
  parsed.scene.traverse(o => {
    if (o.isMesh) {
      meshes++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      assert.equal(o.material.depthTest, true);
    }
  });
  assert.equal(meshes, manifest.meshes);
  assert.equal(triangles, manifest.triangles);
  pass(manifest.id + ' (' + manifest.code + ') GLB verification and parity');
}
