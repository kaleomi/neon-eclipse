// --write creates/refreshes only this batch; default verifies byte-identical reconstruction.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {MISSION_PROP_ASSETS,createMissionPropVisual,missionPropStats,disposeMissionProp} from '../src/mission-prop-models.js';
class NodeFileReader{
 async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.({target:this});}
 async readAsDataURL(blob){this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.({target:this});}
}
globalThis.FileReader ||= NodeFileReader;
const base=new URL('../',import.meta.url),models=new URL('models/',base),write=process.argv.includes('--write');
const hash=b=>createHash('sha256').update(b).digest('hex'),sourceHashes={};
for(const path of ['src/mission-prop-models.js','src/supply-symbols.js','scripts/build-mission-props.mjs'])sourceHashes[path]=hash(await readFile(new URL(path,base)));
const assets=[];
if(write)await mkdir(models,{recursive:true});
for(const [type,spec] of Object.entries(MISSION_PROP_ASSETS)){
 const root=createMissionPropVisual(type);
 try{
  const binary=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));
  const manifest={asset:spec.file,id:spec.id,name:spec.name,type,version:'props-v1',units:'metres',axis:'+Y up, +Z front',pivot:type==='terminal'?'floor centre':'pickup bobbing centre',...missionPropStats(root),bytes:binary.length,sha256:hash(binary),sourceHashes,textures:0,animations:[],externalDependencies:0,generator:{three:REVISION,node:process.versions.node},runtime:'Shared procedural source, identical authored geometry; no async GLB loading in mission world.'};
  const file=new URL(spec.file,models),meta=new URL(spec.file.replace('.glb','.manifest.json'),models);
  if(write){await writeFile(file,binary);await writeFile(meta,JSON.stringify(manifest,null,2)+'\n');}
  else{
   const stored=JSON.parse(await readFile(meta,'utf8'));
   if(hash(await readFile(file))!==manifest.sha256||stored.sha256!==manifest.sha256||JSON.stringify(stored.sourceHashes)!==JSON.stringify(sourceHashes))throw Error(spec.id+' reconstruction/provenance mismatch');
  }
  assets.push(manifest);console.log(`${write?'WROTE':'VERIFIED'} ${spec.id}: ${manifest.meshes} meshes, ${manifest.triangles} triangles, ${manifest.bytes} bytes`);
 }finally{disposeMissionProp(root);}
}
if(write)await writeFile(new URL('mission-props.manifest.json',models),JSON.stringify({version:'props-v1',total:assets.length,assets},null,2)+'\n');
console.log('PASS mission prop build '+(write?'write':'verification'));
