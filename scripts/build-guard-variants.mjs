// Builds only A03 and H12, never touches the accepted R07 or environment assets.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {GUARD_VARIANTS,createGuardVariant,makeGuardVariantClips,guardVariantStats,disposeGuardVariant} from '../characters/guard-variants.js';
class NodeFileReader {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onload?.({target:this});this.onloadend?.({target:this});}
  async readAsDataURL(blob){this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onload?.({target:this});this.onloadend?.({target:this});}
}
globalThis.FileReader ||= NodeFileReader;
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const sources=['characters/guard-geometry.js','characters/guard-variants.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sources.map(async p=>[p,sha(await readFile(new URL('../'+p,import.meta.url)))])));
await mkdir(new URL('../models/',import.meta.url),{recursive:true});
for(const [type,spec]of Object.entries(GUARD_VARIANTS)){
  const v=createGuardVariant(type);
  try{
    const clips=makeGuardVariantClips(v.root,type),buffer=Buffer.from(await new GLTFExporter().parseAsync(v.root,{binary:true,trs:true,animations:clips}));
    if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2)throw Error('Invalid exported GLB');
    await writeFile(new URL('../models/'+spec.file,import.meta.url),buffer);
    const manifest={asset:spec.file,version:spec.version,type,code:spec.code,name:spec.name,label:spec.label,
      description:'Original rigid articulated armor; not a skinned human; visual-only geometry.',axis:'+Y up, +Z forward',units:'metres',displayScale:spec.displayScale,
      ...guardVariantStats(v.root),rigidJoints:13,animations:clips.map(c=>({name:c.name,seconds:c.duration,tracks:c.tracks.length})),
      ...(type==='heavy'?{coreSocket:{node:'H12_CoreSocket',position:[0,1.28,-.6],radius:.21,animated:false}}:{}),
      bytes:buffer.length,sha256:sha(buffer),sourceHashes,textures:0,externalDependencies:0};
    await writeFile(new URL('../models/'+spec.file.replace('.glb','.manifest.json'),import.meta.url),JSON.stringify(manifest,null,2)+'\n');
    console.log(JSON.stringify(manifest,null,2));
  }finally{disposeGuardVariant(v);}
}
