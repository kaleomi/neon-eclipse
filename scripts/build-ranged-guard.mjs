// Build only the R-07 asset; never rewrite environment models or game configuration.
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {createRangedGuardVisual, makeRangedGuardClips, rangedGuardStats, GUARD_ASSET_VERSION,
  disposeRangedGuardVisual} from '../characters/ranged-guard.js';

class NodeFileReader {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onload?.({target: this}); this.onloadend?.({target: this});
  }
  async readAsDataURL(blob) {
    this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
    this.onload?.({target: this}); this.onloadend?.({target: this});
  }
}
globalThis.FileReader ||= NodeFileReader;
const visual = createRangedGuardVisual();
try {
  const clips = makeRangedGuardClips(visual.root);
  const data = await new GLTFExporter().parseAsync(visual.root, {binary: true, trs: true, animations: clips});
  const buffer = Buffer.from(data);
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2) throw new Error('Invalid GLB header');
  const destination = new URL('../models/ranged-guard-r07.glb', import.meta.url);
  await mkdir(new URL('../models/', import.meta.url), {recursive: true});
  await writeFile(destination, buffer);
  const source = await readFile(new URL('../characters/ranged-guard.js', import.meta.url));
  const manifest = {asset: 'ranged-guard-r07.glb', version: GUARD_ASSET_VERSION,
    description: 'Original R-07 VIGIL ranged guard; rigid articulated PBR armor. Not a skinned human.',
    axis: '+Y up, +Z forward', units: 'metres', ...rangedGuardStats(visual.root),
    animations: clips.map(c => ({name: c.name, seconds: c.duration, tracks: c.tracks.length})),
    bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'),
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    textures: 0, externalDependencies: 0};
  await writeFile(new URL('../models/ranged-guard-r07.manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally { disposeRangedGuardVisual(visual); }
