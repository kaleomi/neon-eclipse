// Build the 17 new enemy/Boss assets; index the seven preserved earlier deliveries.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {ROSTER_UNITS,createRosterUnit,makeRosterUnitClips} from '../characters/roster-units.js';
import {ARENA_BOSS_ASSETS,createArenaBossVisual,makeArenaBossClips} from '../characters/arena-boss-models.js';
import {stats,disposeArt} from '../characters/art-kit.js';
class NodeFileReader{async readAsArrayBuffer(b){this.result=await b.arrayBuffer();this.onloadend?.({target:this});}async readAsDataURL(b){this.result=`data:${b.type||'application/octet-stream'};base64,${Buffer.from(await b.arrayBuffer()).toString('base64')}`;this.onloadend?.({target:this});}}
globalThis.FileReader ||= NodeFileReader;
const hash=b=>createHash('sha256').update(b).digest('hex'),base=new URL('../',import.meta.url),models=new URL('../models/',import.meta.url);await mkdir(models,{recursive:true});
const registry=[];
const scales={harborElite:1.12,hound:.9,rusher:.92,artilleryMech:1.35,drone:.8,swarmDrone:.8,stalker:.95,warden:1.9};
for(const [specs,create,clips,source]of [[ROSTER_UNITS,createRosterUnit,makeRosterUnitClips,'characters/roster-units.js'],[ARENA_BOSS_ASSETS,createArenaBossVisual,makeArenaBossClips,'characters/arena-boss-models.js']]){
 for(const [type,spec]of Object.entries(specs)){
  const v=create(type);try{const motions=clips(v.root,type),binary=Buffer.from(await new GLTFExporter().parseAsync(v.root,{binary:true,trs:true,animations:motions}));
   const sourceHashes={};for(const f of [source,'characters/art-kit.js','characters/guard-geometry.js'])sourceHashes[f]=hash(await readFile(new URL(f,base)));
   const manifest={asset:spec.file,id:spec.id,version:spec.version,role:type,name:spec.name,axis:'+Y up, +Z forward',units:'metres',...stats(v.root),articulatedNodes:Object.keys(v.rig.nodes).length,
    animations:motions.map(c=>({name:c.name,seconds:c.duration,tracks:c.tracks.length})),bytes:binary.length,sha256:hash(binary),sourceHashes,generator:{three:REVISION,node:process.versions.node},textures:0,externalDependencies:0};
   await writeFile(new URL(spec.file,models),binary);await writeFile(new URL(spec.file.replace('.glb','.manifest.json'),models),JSON.stringify(manifest,null,2)+'\n');
   registry.push({...manifest,category:ARENA_BOSS_ASSETS[type]||type==='warden'?'boss':['hound','sentry','drone','swarmDrone','artilleryMech'].includes(type)?'mechanical':'specialist',gameScale:scales[type]||1,newInBatch:true});
   console.log('BUILT',type,manifest.triangles,'tri',manifest.meshes,'meshes',binary.length,'bytes');
  }finally{disposeArt(v);}
 }
}
if(!process.argv.includes('--new-only')){
 const previous=[['ranged','R07','VIGIL · 远程守卫','ranged-guard-r07'],['assault','A03','ASSAULT · 突击守卫','assault-guard-a03'],['heavy','H12','HEAVY · 重装守卫','heavy-guard-h12'],['engineer','E02','MENDER · 战地工程兵','engineer-guard-e02'],['commander','C01','VECTOR · 战术指挥官','commander-guard-c01'],['sniper','S09','KESTREL · 狙击守卫','sniper-guard-s09'],['shield','B04','BASTION · 护盾兵','shield-guard-b04']];
 for(const [type,id,name,file]of previous){const m=JSON.parse(await readFile(new URL(file+'.manifest.json',models)));const raw=await readFile(new URL(file+'.glb',models));if(hash(raw)!==m.sha256)throw Error('Existing asset hash mismatch: '+type);
  registry.unshift({...m,id,name,role:type,category:'infantry',gameScale:{heavy:1.12,shield:1.1,sniper:1.02}[type]||1,newInBatch:false});}
 const order=['ranged','assault','heavy','engineer','commander','sniper','shield','stalker','rusher','harborElite','hound','drone','swarmDrone','sentry','artilleryMech','warden','switchyard','overseer','elevator','skyhook','leviathan','tether','abyss','glacier'];registry.sort((a,b)=>order.indexOf(a.role)-order.indexOf(b.role));
 await writeFile(new URL('enemy-roster.manifest.json',models),JSON.stringify({version:'roster-v1',ordinary:15,bosses:9,total:24,assetKind:'rigid articulated hard-surface game models',assets:registry},null,2)+'\n');console.log('INDEXED',registry.length,'models');
}
