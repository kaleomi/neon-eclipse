// Build full-body P01 Sentinel glb
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {PLAYER_BODY_ASSET, createPlayerFullBodyVisual} from '../characters/player-body.js';

class NodeFileReader {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.({ target: this }); }
  async readAsDataURL(blob) { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.({ target: this }); }
}
globalThis.FileReader ||= NodeFileReader;

const base = new URL('../', import.meta.url), models = new URL('models/', base), write = process.argv.includes('--write');
const hash = b => createHash('sha256').update(b).digest('hex');

if (write) await mkdir(models, { recursive: true });

const {root} = createPlayerFullBodyVisual();
let meshes = 0, triangles = 0; const materials = new Set();
root.traverse(o => {
  if (o.isMesh) {
    meshes++;
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    materials.add(o.material);
  }
});
const bounds = new T.Box3().setFromObject(root);

const binary = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true, trs: true }));
const manifest = {
  asset: PLAYER_BODY_ASSET.file,
  id: PLAYER_BODY_ASSET.id,
  name: PLAYER_BODY_ASSET.name,
  label: PLAYER_BODY_ASSET.label,
  version: PLAYER_BODY_ASSET.version,
  units: 'metres',
  axis: '+Y up, -Z front',
  meshes,
  triangles,
  materials: materials.size,
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  bytes: binary.length,
  sha256: hash(binary),
  generator: { three: T.REVISION, node: process.versions.node },
  runtime: 'Full third-person / vehicle driver / shadow armor assembly, continuous with P01 first-person arms.'
};

const file = new URL(PLAYER_BODY_ASSET.file, models), meta = new URL(PLAYER_BODY_ASSET.file.replace('.glb', '.manifest.json'), models);
if (write) {
  await writeFile(file, binary);
  await writeFile(meta, JSON.stringify(manifest, null, 2) + '\n');
}
console.log(`${write ? 'WROTE' : 'VERIFIED'} ${PLAYER_BODY_ASSET.id}: ${meshes} meshes, ${triangles} triangles, ${binary.length} bytes`);
