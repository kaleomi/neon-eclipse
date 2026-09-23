import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {PLAYER_BODY_ASSET} from '../characters/player-body.js';

const hash = b => createHash('sha256').update(b).digest('hex');
const binary = fs.readFileSync(new URL('../models/'+(PLAYER_BODY_ASSET.file),import.meta.url));
const manifest = JSON.parse(fs.readFileSync(new URL('../models/'+(PLAYER_BODY_ASSET.file.replace('.glb', '.manifest.json')),import.meta.url), 'utf8'));

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
console.log('PASS: P01 Sentinel full-body mesh count, triangle count and GLB integrity verified');
