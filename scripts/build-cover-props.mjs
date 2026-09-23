// --write generates one representative GLB per cover theme for review; without it, verify binaries and provenance.
// The game never loads these GLBs: chapters build the same dressing procedurally from src/cover-props.js.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import { REVISION } from '../node_modules/three/build/three.module.js';
import { GLTFExporter } from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { COVER_THEMES, createCoverProps } from '../src/cover-props.js';

class NodeFileReader {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.({ target: this }); }
  async readAsDataURL(blob) { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.({ target: this }); }
}
globalThis.FileReader ||= NodeFileReader;
const base = new URL('../', import.meta.url), models = new URL('models/', base);
const write = process.argv.includes('--write');
const hash = value => createHash('sha256').update(value).digest('hex');
const sourceHashes = {};
for (const path of ['src/cover-props.js', 'scripts/build-cover-props.mjs']) sourceHashes[path] = hash(await readFile(new URL(path, base)));
// Representative production dimensions per theme (metres): chapter, obstacle source, size.
export const COVER_PROTOTYPES = {
  crate: { id: 'CP02', name: '车站货箱', chapter: '02 SWITCHYARD', source: 'STATION_COVER[0]', w: 2, h: 3.8, d: 2 },
  relay: { id: 'CP03', name: '天穹中继柜', chapter: '03 OVERSEER', source: 'ROOF_COVER[3]', w: 5, h: 2.4, d: 3 },
  locker: { id: 'CP04', name: '中枢服务器柜', chapter: '04 ELEVATOR', source: 'TOWER_WALLS[6]', w: 2, h: 4, d: 2 },
  container: { id: 'CP06', name: '港口集装箱', chapter: '06 LEVIATHAN', source: 'HARBOR_CONTAINERS[2]', w: 4.4, h: 3.4, d: 3 },
  pod: { id: 'CP07', name: '轨道配重舱', chapter: '07 TETHER', source: 'ORBITAL_COVER[0]', w: 3, h: 2.5, d: 3 },
  rack: { id: 'CP08', name: '数据中心机柜', chapter: '08 ABYSS', source: 'DATACENTER_RACKS[0]', w: 1.2, h: 2.4, d: 8 },
  snowbank: { id: 'CP09A', name: '极地雪堆', chapter: '09 GLACIER', source: 'POLAR_BANKS[0]', w: 6, h: 1.2, d: 1.4 },
  hut: { id: 'CP09B', name: '极地暖房墙', chapter: '09 GLACIER', source: 'POLAR_HUTS[0]', w: 5, h: 3, d: 0.3 }
};
if (write) await mkdir(models, { recursive: true });
const assets = [];
for (const theme of COVER_THEMES) {
  const proto = COVER_PROTOTYPES[theme], scene = new T.Scene(), props = createCoverProps(scene, theme);
  const spec = { w: proto.w, h: proto.h, d: proto.d, x: 0, z: 0 };
  const body = new T.Mesh(new T.BoxGeometry(spec.w, spec.h, spec.d), props.materials.body); body.position.y = spec.h / 2; body.name = 'Body';
  if (theme !== 'snowbank') scene.add(body);
  props.dress(spec); const merged = props.commit();
  const root = new T.Group(); root.name = 'NeonEclipse_Cover_' + theme; if (theme !== 'snowbank') root.add(body); for (const m of merged) root.add(m);
  let triangles = 0, meshes = 0; root.traverse(o => { if (o.isMesh) { meshes++; triangles += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; } });
  if (triangles > 4000 || meshes > 8) throw Error(proto.id + ' exceeds prototype budget: ' + JSON.stringify({ triangles, meshes }));
  const box = new T.Box3().setFromObject(root);
  const binary = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true, trs: true }));
  const file = 'cover-' + theme + '-' + proto.id.toLowerCase() + '.glb';
  const manifest = {
    asset: file, id: proto.id, name: proto.name, theme, chapter: proto.chapter, source: proto.source, version: 'cover-props-v1',
    units: 'metres', axis: '+Y up, +Z front', pivot: 'floor centre (y=0)', size: [spec.w, spec.h, spec.d],
    bounds: { min: box.min.toArray(), max: box.max.toArray() }, meshes, triangles, bytes: binary.length, sha256: hash(binary), sourceHashes,
    textures: 0, animations: [], externalDependencies: 0, budgets: { triangles: 4000, meshes: 8 },
    generator: { three: REVISION, node: process.versions.node },
    runtime: 'Review prototype only. Chapters dress their own collision boxes procedurally via src/cover-props.js; the game does not request this GLB.'
  };
  const target = new URL(file, models), meta = new URL(file.replace('.glb', '.manifest.json'), models);
  if (write) { await writeFile(target, binary); await writeFile(meta, JSON.stringify(manifest, null, 2) + '\n'); }
  else {
    const stored = JSON.parse(await readFile(meta, 'utf8'));
    if (hash(await readFile(target)) !== manifest.sha256 || JSON.stringify(stored) !== JSON.stringify(manifest)) throw Error(proto.id + ' binary/manifest/provenance mismatch; rebuild intentionally with --write');
  }
  assets.push(manifest); props.dispose(); body.geometry.dispose();
  console.log(`${write ? 'WROTE' : 'VERIFIED'} ${proto.id} ${theme}: ${meshes} meshes, ${triangles} triangles, ${binary.length} bytes`);
}
const catalog = { version: 'cover-props-v1', total: assets.length, assets };
const catalogPath = new URL('cover-props.manifest.json', models);
if (write) await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
else if (JSON.stringify(JSON.parse(await readFile(catalogPath, 'utf8'))) !== JSON.stringify(catalog)) throw Error('Catalog mismatch');
console.log('PASS cover props prototypes: ' + (write ? 'generated' : 'binary and provenance verified'));
