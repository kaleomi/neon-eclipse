// Chapter 2–9 cover dressing: fits the unchanged collision box, deterministic, cheap after commit(), leak-free.
import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {COVER_THEMES,createCoverProps} from '../src/cover-props.js';
import {STATION_COVER} from '../src/station-data.js';
import {ROOF_COVER} from '../src/roof-data.js';
import {TOWER_WALLS} from '../src/tower-data.js';
import {TRAIN_COVER} from '../src/train-data.js';
import {HARBOR_CONTAINERS} from '../src/harbor-data.js';
import {ORBITAL_COVER} from '../src/orbital-data.js';
import {DATACENTER_RACKS,DATACENTER_MAINFRAME} from '../src/datacenter-data.js';
import {POLAR_HUTS,POLAR_BANKS} from '../src/polar-data.js';
assert.deepEqual(COVER_THEMES,['crate','relay','locker','container','pod','rack','snowbank','hut']);
assert.throws(()=>createCoverProps(new T.Scene(),'reactor'),RangeError);
assert.throws(()=>createCoverProps(new T.Scene(),'crate').dress({w:0,h:1,d:1,x:0,z:0}),RangeError);
const tuple=d=>({w:d[0],h:d[1],d:d[2],x:d[3],z:d[4]});
// The exact selections each world makes, so budgets below describe production scenes.
const scenes={
 crate:[...STATION_COVER.map(tuple).filter((_,i)=>i<5||i>=9),...TRAIN_COVER],
 relay:ROOF_COVER.map(tuple).filter(o=>o.h<=4.2),
 locker:TOWER_WALLS.filter(o=>o.w<=2&&o.d<=2),
 container:HARBOR_CONTAINERS.filter(o=>!o.shipCabin&&o.top>=2),
 pod:ORBITAL_COVER.filter(o=>o.cover),
 rack:[...DATACENTER_RACKS,DATACENTER_MAINFRAME],
 hut:POLAR_HUTS.filter(o=>o.w>=1&&o.d>=1),
 snowbank:POLAR_BANKS.filter(o=>!o.ledge)
};
const tri=g=>g.index?g.index.count/3:g.attributes.position.count/3;
const budgets={crate:6000,relay:6000,locker:2500,container:9000,pod:8000,rack:16000,hut:6000,snowbank:12000};
let total=0;
for(const theme of COVER_THEMES){
 const specs=scenes[theme];assert(specs.length>0,theme+' has production covers');
 const scene=new T.Scene(),body=new T.MeshStandardMaterial(),props=createCoverProps(scene,theme,{body});
 const signatures=[];
 for(const spec of specs){
  const before=scene.children.length,group=props.dress(spec);assert.equal(scene.children.length,before+1,'one group per cover');
  const bottom=spec.bottom??0,h=(spec.top??bottom+spec.h)-bottom,box=new T.Box3().setFromObject(group),tol=.32;
  assert(box.min.x>=spec.x-spec.w/2-tol&&box.max.x<=spec.x+spec.w/2+tol,theme+' x footprint '+JSON.stringify(spec));
  assert(box.min.z>=spec.z-spec.d/2-tol&&box.max.z<=spec.z+spec.d/2+tol,theme+' z footprint '+JSON.stringify(spec));
  assert(box.min.y>=bottom-.05&&box.max.y<=bottom+h+1.2,theme+' height envelope '+JSON.stringify(spec));
  group.traverse(o=>{if(o.isMesh)signatures.push(o.geometry.type+o.position.toArray().map(v=>v.toFixed(3)).join(',')+o.scale.toArray().join(','));});
 }
 const parts=props.parts,merged=props.commit(),draws=merged.length;assert.deepEqual(props.commit(),merged,'commit is idempotent');
 assert(merged.length>=2&&merged.length<=7,theme+' merged draw calls '+merged.length);assert.equal(props.count,merged.length);
 assert(scene.children.every(o=>o.isMesh&&o.userData.coverProps===theme),'groups replaced by merged meshes');
 const triangles=merged.reduce((n,m)=>n+tri(m.geometry),0);assert(triangles<=budgets[theme],theme+' triangles '+triangles+' > '+budgets[theme]);total+=triangles;
 assert(merged.every(m=>m.geometry.boundingSphere&&m.matrixAutoUpdate===false));
 // Determinism: same specs -> identical part layout, without touching Math.random (Three's own UUIDs excepted).
 const random=Math.random;let again;try{Math.random=()=>{if(new Error().stack.includes('generateUUID'))return random();throw Error('cover dressing must not consume the game RNG');};const s2=new T.Scene(),p2=createCoverProps(s2,theme);const sig2=[];for(const spec of specs)p2.dress(spec);s2.traverse(o=>{if(o.isMesh)sig2.push(o.geometry.type+o.position.toArray().map(v=>v.toFixed(3)).join(',')+o.scale.toArray().join(','));});again=sig2;p2.dispose();assert.equal(s2.children.length,0);}finally{Math.random=random;}
 assert.deepEqual(again,signatures,theme+' deterministic layout');
 // Shared body material is caller-owned: never disposed here.
 let bodyDisposed=0;body.addEventListener('dispose',()=>bodyDisposed++);
 props.dispose();assert.equal(scene.children.length,0);assert.equal(props.count,0);assert.equal(bodyDisposed,0);
 console.log('PASS '+theme+': '+specs.length+' covers, '+parts+' parts -> '+draws+' static meshes, '+triangles+' triangles, footprint-bound, deterministic, leak-free');
}
assert(total<50000,'all eight themes together stay under 50k triangles: '+total);
console.log('PASS cover props: '+COVER_THEMES.length+' themes, '+total+' triangles across all production selections; no textures, no downloads, no collision/rule data touched');
