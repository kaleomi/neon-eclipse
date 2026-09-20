// Generate C01 only. Does not rebuild or rewrite R07/A03/H12/E02 or gameplay configuration.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {COMMANDER_ASSET,createCommanderVisual,makeCommanderClips,commanderStats,disposeCommanderVisual} from '../characters/commander-guard.js';
class NodeFileReader {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onload?.({target:this});this.onloadend?.({target:this});}
  async readAsDataURL(blob){this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onload?.({target:this});this.onloadend?.({target:this});}
}
globalThis.FileReader ||= NodeFileReader;
const visual=createCommanderVisual(),hash=b=>createHash('sha256').update(b).digest('hex');
try {
  const clips=makeCommanderClips(visual.root);
  const binary=Buffer.from(await new GLTFExporter().parseAsync(visual.root,{binary:true,trs:true,animations:clips}));
  if(binary.readUInt32LE(0)!==0x46546c67||binary.readUInt32LE(4)!==2)throw Error('Invalid C01 GLB');
  const sourceHashes={};for(const p of ['characters/commander-guard.js','characters/guard-geometry.js'])sourceHashes[p]=hash(await readFile(new URL('../'+p,import.meta.url)));
  const manifest={asset:COMMANDER_ASSET.file,version:COMMANDER_ASSET.version,role:'commander',axis:'+Y up, +Z forward',units:'metres',
    description:'Original VECTOR tactical commander; rigid segmented mantle, dual communications blades and tactical terminal. Not a skinned human.',
    ...commanderStats(visual.root),articulatedNodes:Object.keys(visual.rig.nodes).length,
    animations:clips.map(c=>({name:c.name,seconds:c.duration,tracks:c.tracks.length})),
    bytes:binary.length,sha256:hash(binary),sourceHashes,generator:{three:REVISION,node:process.versions.node},textures:0,externalDependencies:0};
  await mkdir(new URL('../models/',import.meta.url),{recursive:true});
  await writeFile(new URL('../models/'+COMMANDER_ASSET.file,import.meta.url),binary);
  await writeFile(new URL('../models/commander-guard-c01.manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest,null,2));
} finally {disposeCommanderVisual(visual);}
