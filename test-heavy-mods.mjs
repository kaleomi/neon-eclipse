import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {freshWeaponMods,validWeaponMods,validWeaponModsEnvelope,modsAllowed,heavyProfile,heavyRow,HEAVY_MOD_INDICES,HEAVY_MOD_OPTIONS,MOD_SLOTS} from './weapon-mods-rules.js';
import {ORDNANCE} from './ordnance-rules.js';
import {launchCinder,advanceCinder} from './cinder-world.js';
import {validCheckpoint} from './campaign.js';
// Shape: heavy rows optional, legacy payload without `heavy` still valid and reads as stock.
const legacy={version:1,weapons:Array.from({length:8},()=>[0,0,0])};assert(validWeaponMods(legacy));assert.deepEqual(heavyRow(legacy,9),[0,0,0]);assert.deepEqual(heavyRow(legacy,11),[0,0,0]);
const v=freshWeaponMods();assert(validWeaponMods(v));assert.deepEqual(v.heavy,[[0,0,0],[0,0,0]]);
for(const bad of [{...v,heavy:[[0,0,0]]},{...v,heavy:[[3,0,0],[0,0,0]]},{...v,heavy:[[0,0],[0,0,0]]},{...v,heavy:null}])assert(!validWeaponMods(bad),JSON.stringify(bad.heavy));
assert(validWeaponModsEnvelope({version:2,heavy:'alien'}));
// Same star / challenge gates as regular guns.
v.heavy[0]=[1,0,0];assert(!modsAllowed(v,{stars:0}));assert(modsAllowed(v,{stars:1}));v.heavy[1]=[0,2,2];assert(!modsAllowed(v,{stars:2}));assert(modsAllowed(v,{stars:3}));assert(modsAllowed(v,{stars:2,awards:1}));
// Every option label exists for both heavies and all three slots.
for(const i of HEAVY_MOD_INDICES)for(const k of MOD_SLOTS)assert.equal(HEAVY_MOD_OPTIONS[i][k].length,3);
// Profiles: no damage / cap / reserve inflation, stock equals table, BREAKER has none.
assert.equal(heavyProfile(11),null);assert.equal(heavyProfile(0),null);
for(const i of HEAVY_MOD_INDICES){const stock=heavyProfile(i);assert.equal(stock.damage,ORDNANCE[i].damage);assert.equal(stock.reload,ORDNANCE[i].reload);assert.equal(stock.delay,ORDNANCE[i].delay);assert.equal(stock.range,ORDNANCE[i].range);assert.equal(stock.zoom,22);
 for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){const p=heavyProfile(i,[a,b,c]);assert.equal(p.damage,ORDNANCE[i].damage);assert.equal(p.cap,ORDNANCE[i].cap);assert.equal(p.reserve,ORDNANCE[i].reserve);assert(Object.isFrozen(p));assert(p.reload>0&&p.delay>0&&p.range>0);}}
// CINDER tradeoffs.
const c1=heavyProfile(9,[1,0,0]);assert(c1.launchSpeed>14&&c1.reload>ORDNANCE[9].reload);const c2=heavyProfile(9,[2,0,0]);assert(c2.launchSpeed<14&&c2.reload<ORDNANCE[9].reload);
const f1=heavyProfile(9,[0,1,0]);assert.equal(f1.fuse,.9);assert.equal(f1.radius,3.4);const f2=heavyProfile(9,[0,2,0]);assert.equal(f2.fuse,1.6);assert(f2.selfDamage>35&&f2.radius===4);
assert.equal(heavyProfile(9,[0,0,1]).zoom,16);assert.equal(heavyProfile(9,[0,0,2]).zoom,28);
// LANCE tradeoffs.
const l1=heavyProfile(10,[1,0,0]);assert.equal(l1.adsThreshold,.75);assert.equal(l1.secondTargetFactor,.6);assert.equal(l1.range,70);const l2=heavyProfile(10,[2,0,0]);assert.equal(l2.range,90);assert(l2.reload>ORDNANCE[10].reload);
const m1=heavyProfile(10,[0,1,0]);assert(m1.reload<ORDNANCE[10].reload&&m1.delay>ORDNANCE[10].delay);const m2=heavyProfile(10,[0,2,0]);assert.equal(m2.delay,.5);assert(m2.reload>ORDNANCE[10].reload);
assert.equal(heavyProfile(10,[0,0,1]).zoom,26);const s2=heavyProfile(10,[0,0,2]);assert.equal(s2.zoom,40);assert.equal(s2.adsThreshold,.95);assert.equal(heavyProfile(10,[1,0,2]).adsThreshold,.95);
// Launch options feed the real projectile: fuse and speed change, gravity and bounce path untouched.
const origin=new T.Vector3(0,1.7,0),dir=new T.Vector3(0,0,-1);const stock=launchCinder(origin,dir),fast=launchCinder(origin,dir,{speed:c1.launchSpeed,fuse:f1.fuse});assert.equal(stock.remaining,1.2);assert.equal(fast.remaining,.9);assert(fast.velocity.length()>stock.velocity.length());advanceCinder(stock,.3,[]);advanceCinder(fast,.3,[]);assert(fast.position.z<stock.position.z);advanceCinder(fast,1,[]);assert.equal(fast.remaining,0);
// Checkpoint envelope accepts heavy rows and old payloads alike.
const cp={stageIndex:0,health:100,rounds:[1,1,1],reserves:[0,0,0],selected:0,x:0,z:0,yaw:0,pitch:0,time:0,kills:0,collected:[]};assert(validCheckpoint({...cp,weaponMods:v}));assert(validCheckpoint({...cp,weaponMods:legacy}));assert(!validCheckpoint({...cp,weaponMods:{...v,heavy:[[9,0,0],[0,0,0]]}}));
console.log('PASS heavy workshop rows: optional legacy-safe shape, shared star/challenge gates, CINDER/LANCE tradeoffs without damage or ammo inflation, launch fuse/speed plumbing, checkpoint envelope');
