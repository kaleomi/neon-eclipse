// --write exports B01 and E01 GLBs and manifests; default verifies byte identity.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {INTERACTIVE_PROP_ASSETS, createInteractivePropVisual, interactivePropStats, disposeInteractiveProp} from '../src/interactive-prop-models.js';

class NodeFileReader {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.({ target: this }); }
  async readAsDataURL(blob) { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.({ target: this }); }
}
globalThis.FileReader ||= NodeFileReader;

const base = new URL('../', import.meta.url), models = new URL('models/', base), write = process.argv.includes('--write');
const hash = b => createHash('sha256').update(b).digest('hex'), sourceHashes = {};
for (const path of ['src/interactive-prop-models.js', 'scripts/build-interactive-props.mjs']) {
  sourceHashes[path] = hash(await readFile(new URL(path, base)));
}
const assets = [];
if (write) await mkdir(models, { recursive: true });

for (const [type, spec] of Object.entries(INTERACTIVE_PROP_ASSETS)) {
  const root = createInteractivePropVisual(type);
  try {
    const stats = interactivePropStats(root);
    if (stats.meshes > 6 || stats.materials > 5 || stats.triangles >= 2500) throw Error(spec.id + ' exceeds the original geometry budget');
    const binary = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true, trs: true }));
    const manifest = {
      asset: spec.file,
      id: spec.id,
      name: spec.name,
      type,
      version: 'props-v3',
      units: 'metres',
      axis: '+Y up, +Z front',
      pivot: type === 'barrel' ? 'geometric centre (y=0)' : 'centre of sphere',
      ...stats,
      bytes: binary.length,
      sha256: hash(binary),
      sourceHashes,
      textures: 0,
      animations: [],
      externalDependencies: 0,
      generator: { three: REVISION, node: process.versions.node },
      runtime: 'Shared procedural source, identical authored geometry; zero network GLB loading in game.'
    };
    const file = new URL(spec.file, models), meta = new URL(spec.file.replace('.glb', '.manifest.json'), models);
    if (write) {
      await writeFile(file, binary);
      await writeFile(meta, JSON.stringify(manifest, null, 2) + '\n');
    } else {
      const stored = JSON.parse(await readFile(meta, 'utf8'));
      if (hash(await readFile(file)) !== manifest.sha256 || JSON.stringify(stored) !== JSON.stringify(manifest)) {
        throw Error(spec.id + ' reconstruction/provenance mismatch');
      }
    }
    assets.push(manifest);
    console.log(`${write ? 'WROTE' : 'VERIFIED'} ${spec.id}: ${manifest.meshes} meshes, ${manifest.triangles} triangles, ${manifest.bytes} bytes`);
  } finally {
    disposeInteractiveProp(root);
  }
}
const catalog = { version: 'props-v3', total: assets.length, assets };
if (write) await writeFile(new URL('interactive-props.manifest.json', models), JSON.stringify(catalog, null, 2) + '\n');
else if (JSON.stringify(JSON.parse(await readFile(new URL('interactive-props.manifest.json', models), 'utf8'))) !== JSON.stringify(catalog)) throw Error('Interactive catalog mismatch');
console.log('PASS interactive prop build ' + (write ? 'write' : 'verification'));
