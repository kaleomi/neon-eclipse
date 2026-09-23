// --write generates assets. Without it, verify exact binaries AND provenance.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { REVISION } from '../node_modules/three/build/three.module.js';
import { GLTFExporter } from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { ENVIRONMENT_PROP_ASSETS, createEnvironmentPropVisual, environmentPropStats, disposeEnvironmentProp } from '../src/environment-prop-models.js';

class NodeFileReader {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.({ target: this }); }
  async readAsDataURL(blob) { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.({ target: this }); }
}
globalThis.FileReader ||= NodeFileReader;
const base = new URL('../', import.meta.url), models = new URL('models/', base);
const write = process.argv.includes('--write');
const hash = value => createHash('sha256').update(value).digest('hex');
const sourceHashes = {};
for (const path of ['src/environment-prop-models.js', 'scripts/build-environment-props.mjs']) {
  sourceHashes[path] = hash(await readFile(new URL(path, base)));
}
if (write) await mkdir(models, { recursive: true });
const assets = [];
for (const [type, spec] of Object.entries(ENVIRONMENT_PROP_ASSETS)) {
  const root = createEnvironmentPropVisual(type);
  try {
    const stats = environmentPropStats(root);
    if (stats.triangles > spec.triangles || stats.meshes > spec.meshes || stats.materials > 7) {
      throw Error(spec.id + ' exceeds its geometry/draw-call budget: ' + JSON.stringify(stats));
    }
    const binary = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true, trs: true }));
    const manifest = {
      asset: spec.file, id: spec.id, name: spec.name, type, version: 'environment-props-v1',
      units: 'metres', axis: '+Y up, +Z front', pivot: 'floor centre (y=0)',
      ...stats, bytes: binary.length, sha256: hash(binary), sourceHashes,
      textures: 0, animations: [], externalDependencies: 0,
      parts: type === 'node' ? { core: 'EN01_Core, pivot y=1.5', base: 'EN01_Base, pivot y=0' } : {},
      budgets: { triangles: spec.triangles, meshes: spec.meshes, materials: 7 },
      generator: { three: REVISION, node: process.versions.node },
      runtime: 'Shared authored procedural source. Game does not request these GLBs. Original gameplay proxies and rules are retained.'
    };
    const file = new URL(spec.file, models), meta = new URL(spec.file.replace('.glb', '.manifest.json'), models);
    if (write) {
      await writeFile(file, binary);
      await writeFile(meta, JSON.stringify(manifest, null, 2) + '\n');
    } else {
      const stored = JSON.parse(await readFile(meta, 'utf8'));
      if (hash(await readFile(file)) !== manifest.sha256 || JSON.stringify(stored) !== JSON.stringify(manifest)) {
        throw Error(spec.id + ' binary/manifest/provenance mismatch; rebuild intentionally with --write');
      }
    }
    assets.push(manifest);
    console.log(`${write ? 'WROTE' : 'VERIFIED'} ${spec.id}: ${stats.meshes} meshes, ${stats.materials} materials, ${stats.triangles} triangles, ${binary.length} bytes`);
  } finally { disposeEnvironmentProp(root); }
}
const catalog = { version: 'environment-props-v1', total: assets.length, assets };
const catalogPath = new URL('environment-props.manifest.json', models);
if (write) await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
else if (JSON.stringify(JSON.parse(await readFile(catalogPath, 'utf8'))) !== JSON.stringify(catalog)) throw Error('Catalog mismatch');
console.log('PASS environment props: ' + (write ? 'generated' : 'binary and provenance verified'));
