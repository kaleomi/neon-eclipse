// Generate E02 only. Does not rebuild or rewrite R07/A03/H12 or gameplay configuration.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {ENGINEER_ASSET,createEngineerVisual,makeEngineerClips,engineerStats,disposeEngineerVisual} from '../characters/engineer-guard.js';
class NodeFileReader {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onload?.({target:this});this.onloadend?.({target:this});}
  async readAsDataURL(blob){this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onload?.({target:this});this.onloadend?.({target:this});}
}
globalThis.FileReader ||= NodeFileReader;
const visual=createEngineerVisual(),hash=b=>createHash('sha256').update(b).digest('hex');
try {
  const clips=makeEngineerClips(visual.root);
  const binary=Buffer.from(await new GLTFExporter().parseAsync(visual.root,{binary:true,trs:true,animations:clips}));
  if(binary.readUInt32LE(0)!==0x46546c67||binary.readUInt32LE(4)!==2)throw Error('Invalid E02 GLB');
  const sourceHashes={};for(const p of ['characters/engineer-guard.js','characters/guard-geometry.js'])sourceHashes[p]=hash(await readFile(new URL('../'+p,import.meta.url)));
  const manifest={asset:ENGINEER_ASSET.file,version:ENGINEER_ASSET.version,role:'engineer',axis:'+Y up, +Z forward',units:'metres',
    description:'Original MENDER field engineer; rigid work armor, service pack and auxiliary manipulator. Not a skinned human.',
    ...engineerStats(visual.root),articulatedNodes:Object.keys(visual.rig.nodes).length,
    animations:clips.map(c=>({name:c.name,seconds:c.duration,tracks:c.tracks.length})),
    bytes:binary.length,sha256:hash(binary),sourceHashes,generator:{three:REVISION,node:process.versions.node},textures:0,externalDependencies:0};
  await mkdir(new URL('../models/',import.meta.url),{recursive:true});
  await writeFile(new URL('../models/'+ENGINEER_ASSET.file,import.meta.url),binary);
  await writeFile(new URL('../models/engineer-guard-e02.manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest,null,2));
} finally {disposeEngineerVisual(visual);}
