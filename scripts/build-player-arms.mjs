// Rebuild models/player-arms-p01.glb + manifest from the source of truth characters/player-arms.js.
// Default: build in memory and compare against the shipped GLB/manifest. --write: persist both.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {PLAYER_ARMS_ASSET,createPlayerArmsVisual,makePlayerArmsClips,playerArmsStats,disposePlayerArmsVisual} from '../characters/player-arms.js';
class NodeFileReader{async readAsArrayBuffer(b){this.result=await b.arrayBuffer();this.onloadend?.({target:this});}async readAsDataURL(b){this.result=`data:${b.type||'application/octet-stream'};base64,${Buffer.from(await b.arrayBuffer()).toString('base64')}`;this.onloadend?.({target:this});}}
globalThis.FileReader ||= NodeFileReader;
const hash=b=>createHash('sha256').update(b).digest('hex');
const base=new URL('../',import.meta.url),models=new URL('../models/',import.meta.url);
const source='characters/player-arms.js';
const v=createPlayerArmsVisual();
try{
 const motions=makePlayerArmsClips(v.root);
 const binary=Buffer.from(await new GLTFExporter().parseAsync(v.root,{binary:true,trs:true,animations:motions}));
 const stats=playerArmsStats(v.root);
 const manifest={asset:PLAYER_ARMS_ASSET.file,version:PLAYER_ARMS_ASSET.version,role:'player-first-person-arms',
  axis:'+Y up, -Z forward (camera space)',units:'metres',
  description:'Original SENTINEL first-person arm/forearm assembly; rigid articulated armor joints, gloves, shoulder/chest collar housing. Not a skinned human.',
  ...stats,articulatedNodes:13,
  animations:motions.map(c=>({name:c.name,seconds:c.duration,tracks:c.tracks.length})),
  bytes:binary.length,sha256:hash(binary),
  sourceHashes:{[source]:hash(await readFile(new URL(source,base)))},
  generator:{three:REVISION,node:process.versions.node},textures:0,externalDependencies:0};
 const current=await readFile(new URL(PLAYER_ARMS_ASSET.file,models));
 const currentManifest=JSON.parse(await readFile(new URL('player-arms-p01.manifest.json',models)));
 const glbMatch=hash(current)===hash(binary),manifestMatch=currentManifest.sha256===manifest.sha256;
 console.log(glbMatch?'GLB byte-identical to shipped asset':'GLB DIFFERS from shipped asset');
 console.log(manifestMatch?'manifest sha reproducible':'manifest sha differs');
 console.log(JSON.stringify({bytes:manifest.bytes,sha256:manifest.sha256,meshes:stats.meshes,triangles:stats.triangles,materials:stats.materials,clips:motions.map(c=>c.name)}));
 if(process.argv.includes('--write')){
  await writeFile(new URL(PLAYER_ARMS_ASSET.file,models),binary);
  await writeFile(new URL('player-arms-p01.manifest.json',models),JSON.stringify(manifest,null,2)+'\n');
  console.log('WROTE models/'+PLAYER_ARMS_ASSET.file+' and manifest');
 }
}finally{disposePlayerArmsVisual(v);}
