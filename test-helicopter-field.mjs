import assert from 'node:assert/strict';
import {FIELD_HELI_SITE,HELI_PADS,createFieldHelicopter,parkHelicopter,canBoardHelicopter,helicopterExit,helicopterInput,helicopterStatusLabel,fieldGround,helicopterDoorPoints} from './helicopter-field.js';
import {stepHelicopter,helicopterContact,createHelicopter,startHelicopter,HELICOPTER_SITE} from './helicopter-rules.js';
import {LIGHTHOUSE_ISLAND,isFootSurface,FIELD_BUILDINGS,FIELD} from './maritime-rules.js';
import {CollisionGrid} from './vehicle-rules.js';
const grid=new CollisionGrid(FIELD_BUILDINGS,24,600),foot={geometry:grid,free:(x,z,r)=>isFootSurface(x,z,r)&&grid.free(x,z,r)};
// Ground adapter: island top, flat land, water.
assert.equal(fieldGround(LIGHTHOUSE_ISLAND.x,LIGHTHOUSE_ISLAND.z),LIGHTHOUSE_ISLAND.h);assert.equal(fieldGround(0,0),0);assert.equal(fieldGround(400,0),0);
assert.equal(fieldGround(260,180),.85,'dock deck');
// Original isolated site still behaves (ground defaults to 0): regression guard for helicopter-rules change.
{const s=createHelicopter();startHelicopter(s);for(let i=0;i<240;i++)stepHelicopter(s,{lift:1},1/60);assert(s.y>5);for(let i=0;i<60*30;i++)stepHelicopter(s,{lift:-1},1/60);assert(s.grounded);assert.equal(s.y,0);assert.equal(s.status,'running');}
// Spawn on island pad sits at island height and is stopped/cold.
const h=createFieldHelicopter(HELI_PADS.island);assert.equal(h.y,LIGHTHOUSE_ISLAND.h);assert(h.grounded);assert(!h.powered);assert.equal(h.speed,0);
// Idle on the pad (not powered): stays put; cannot fall through the island.
{const copy={...h};for(let i=0;i<120;i++)stepHelicopter(h,{lift:1},1/60,FIELD_HELI_SITE);assert.equal(h.y,copy.y);}
// Board only next to a door of a stopped craft; not from far, not while powered.
const doors=helicopterDoorPoints(h);assert.equal(doors.length,2);
assert(canBoardHelicopter({x:doors[0].x+.5,z:doors[0].z},h,foot));assert(!canBoardHelicopter({x:h.x+15,z:h.z},h,foot));
h.powered=true;h.status='running';assert(!canBoardHelicopter({x:doors[0].x,z:doors[0].z},h,foot));h.powered=false;h.status='ready';
// Take off from the island (7 m up), hover, land back softly on the island: ground height honoured.
h.status='running';h.powered=true;
for(let i=0;i<60*5;i++)stepHelicopter(h,{lift:1},1/60,FIELD_HELI_SITE);assert(h.y-LIGHTHOUSE_ISLAND.h>5,'climbed above island '+h.y);assert(!h.grounded);
assert.match(helicopterStatusLabel(h),/空中 · 高度/);assert.equal(helicopterExit(h,foot).ok,false);
for(let i=0;i<60*40&&!h.grounded;i++)stepHelicopter(h,{lift:-1},1/60,FIELD_HELI_SITE);
assert(h.grounded,'landed');assert.equal(h.status,'running',h.reason);assert(Math.abs(h.y-LIGHTHOUSE_ISLAND.h)<1e-9,'rests on island top, not sea level');
assert.equal(helicopterExit(h,foot).ok,false,'engine still running');h.powered=false;h.rpm=0;const ex=helicopterExit(h,foot);assert(ex.ok);assert(isFootSurface(ex.x,ex.z));
// Water touchdown is a crash; lighthouse tower and field buildings are obstacles; field ceiling applies.
{const w=createFieldHelicopter({x:400,y:0,z:0});w.status='running';w.powered=true;w.y=6;w.grounded=false;w.rpm=1;for(let i=0;i<60*30&&w.status==='running';i++)stepHelicopter(w,{lift:-1},1/60,FIELD_HELI_SITE);assert.equal(w.status,'crashed');assert.match(w.reason,/落水/);}
assert.equal(helicopterContact({x:LIGHTHOUSE_ISLAND.x,y:LIGHTHOUSE_ISLAND.h+5,z:LIGHTHOUSE_ISLAND.z,pitch:0,roll:0},FIELD_HELI_SITE),'lighthouse');
assert.equal(helicopterContact({x:-345,y:3,z:200,pitch:0,roll:0},FIELD_HELI_SITE),'building-0');
assert.match(String(helicopterContact({x:0,y:FIELD.ceiling,z:0,pitch:0,roll:0},FIELD_HELI_SITE)),/安全空域上限/);
assert.equal(helicopterContact({x:0,y:10,z:0,pitch:0,roll:0},FIELD_HELI_SITE),null);
// Park resets everything including a crash.
parkHelicopter(h,HELI_PADS.shore);assert.equal(h.status,'ready');assert.equal(h.x,HELI_PADS.shore.x);assert.equal(h.y,0);
// Input mapping.
const held=(...c)=>c.some(k=>['KeyW','KeyD','ShiftLeft','ArrowLeft'].includes(k));
assert.deepEqual(helicopterInput(held),{forward:1,right:-1,yaw:1,lift:1,brake:false});
assert.equal(HELICOPTER_SITE.bounds,110,'isolated prototype site untouched');
console.log('PASS: helicopter in the vehicle field — ground adapter (island/dock/water), pad spawn, door boarding gates, island takeoff/landing at height, water crash, tower/building/ceiling contact, park reset, key map; isolated site regression');
