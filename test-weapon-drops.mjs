import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createLoadoutState} from './loadout-rules.js';
import {droppedPrimary,nearestWeaponDrop,DROP_CAPACITY,DROP_CHANCE,shouldDropWeapon} from './weapon-drop-rules.js';
import {createWeaponDrops} from './weapon-drops.js';
for(const e of [{type:'heavy',hp:1},{type:'warden',hp:0,boss:true},{type:'sentry',hp:0},{type:'swarmDrone',hp:0},{type:'hound',hp:0},{type:'assault',hp:NaN}])assert.equal(droppedPrimary(e),null);
assert.equal(droppedPrimary({type:'ranged',hp:-10}),6);assert.equal(droppedPrimary({type:'engineer',hp:0}),4);
const candidates=[{primary:1,x:0,y:0,z:-1,active:true},{primary:6,x:0,y:0,z:-2,active:true}],cameraPosition={x:0,y:1.7,z:0};assert.equal(nearestWeaponDrop(candidates,cameraPosition,0,()=>true),candidates[0]);assert.equal(nearestWeaponDrop(candidates,cameraPosition,1,()=>true),candidates[1]);assert.equal(nearestWeaponDrop(candidates,cameraPosition,0,d=>d.primary===6),candidates[1]);assert.equal(nearestWeaponDrop(candidates,{...cameraPosition,y:4.7},0,()=>true),null);
const oldDocument=globalThis.document;globalThis.document={createElement:()=>({hidden:false,style:{}}),head:{append(){}},body:{append(){}}};
try{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),loadout=createLoadoutState(),walls=[],ray=new T.Raycaster(),ammo=[4,2,10,Infinity,0,0,0,0],before=[...ammo];camera.position.set(0,1.7,0);let busy=false,selected=0,notifications=0;
 const drops=createWeaponDrops({random:()=>0,scene,camera,loadout,weapons:Array.from({length:8},(_,i)=>({name:'W'+i})),isBusy:()=>busy,onEquip:i=>{selected=i;},notify:()=>notifications++,hasSight:p=>{ray.set(camera.position,p.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(p);return !ray.intersectObjects(walls,false).length;}});
 const enemy={type:'heavy',hp:0,group:{position:new T.Vector3(0,0,-1.5)}};assert(drops.drop(enemy));const root=scene.getObjectByName('RECOVERABLE_WEAPONS');assert.equal(root.children.length,DROP_CAPACITY);const meshes=[];root.traverse(m=>{if(m.isMesh)meshes.push(m);});assert(meshes.length>DROP_CAPACITY&&meshes.length<=DROP_CAPACITY*25);assert(!drops.drop(enemy),'one roll / spawn per corpse');
 busy=true;assert(!drops.pick());assert.equal(loadout.state.primary,0);busy=false;
 const wall=new T.Mesh(new T.BoxGeometry(3,3,.1),new T.MeshBasicMaterial());wall.position.set(0,1.5,-.7);scene.add(wall);wall.updateWorldMatrix(true,false);walls.push(wall);assert(!drops.pick(),'real solid wall blocks pickup');walls.length=0;assert(drops.pick());assert.equal(selected,1);assert.equal(loadout.state.primary,1);assert.equal(drops.snapshot().length,0);assert.deepEqual(ammo,before);assert(!drops.pick(),'cannot pick a consumed drop twice');
 for(let n=0;n<40;n++){drops.reset();assert.equal(drops.snapshot().length,0);for(let i=0;i<20;i++)assert(drops.drop({...enemy,type:'ranged'}));assert.equal(drops.snapshot().length,DROP_CAPACITY);assert.equal(root.children.length,DROP_CAPACITY);}
 drops.reset();assert.equal(drops.snapshot().length,0);assert.equal(root.children.filter(m=>m.visible).length,0);assert(notifications>=2);assert.deepEqual(ammo,before);
 console.log('PASS: dead humanoid-only equipment, nearest/noncurrent/height/LOS, actual wall blocking, busy rejection, primary replacement without ammo changes, one-consumption and 40 resets/800 drops within a fixed four-slot, bounded-mesh pool');
}finally{globalThis.document=oldDocument;}

assert.equal(DROP_CAPACITY,4);assert.equal(DROP_CHANCE,.25);
const eligible={type:'assault',hp:0};assert.equal(Array.from({length:1000},(_,i)=>shouldDropWeapon(eligible,i/1000)).filter(Boolean).length,250);
for(const roll of [.25,.999,1,-.1,NaN,Infinity])assert(!shouldDropWeapon(eligible,roll));assert(shouldDropWeapon(eligible,0));
assert(!shouldDropWeapon({type:'sentry',hp:0},0));assert(!shouldDropWeapon({type:'assault',hp:1},0));
const oldDoc=globalThis.document;globalThis.document={createElement:()=>({hidden:false,style:{}}),head:{append(){}},body:{append(){}}};
try{let rolls=0;const loadout=createLoadoutState(),e={type:'heavy',hp:0,group:{position:new T.Vector3(0,0,-1)}};
 const absent=createWeaponDrops({scene:new T.Scene(),camera:new T.PerspectiveCamera(),loadout,weapons:[],random:()=>{rolls++;return .99;},hasSight:()=>true,isBusy:()=>false,onEquip(){},notify(){}});
 assert(!absent.drop(e));assert(!absent.drop(e));assert.equal(rolls,1,'failed rolls cannot be rerolled on the same corpse');assert.equal(absent.snapshot().length,0);absent.reset();assert(!absent.drop(e));assert.equal(rolls,2);
}finally{globalThis.document=oldDoc;}
console.log('PASS exact 25% probability boundary, four-slot capacity and one roll per corpse including unsuccessful rolls');
