import assert from 'node:assert/strict';
import {createFrontierMission,spawnDrones,spawnTurrets,spawnMech,stepFrontierMission,stepFrontierPresentation,hostileDamageFraction,FRONTIER_EFFECT_TTL} from '../src/frontier-missions.js';
import {damageTarget} from '../src/vehicle-weapons.js';
import {RADAR_STATION} from '../src/frontier-site.js';
// Drone kill: explosion effect, falling wreck that lands on the ground callback, second explosion at impact, wreck timer runs, no per-step growth.
{
 const m=createFrontierMission('windfarm','normal',true);m.stage='snipe';m.completed=['drive','park','climb'];spawnDrones(m);
 const range={hits:0,kills:0};const d=m.hostiles[0];assert.equal(d.wrecked,false);
 while(d.alive)damageTarget(range,d,50);
 const s={kind:null,player:{x:0,z:-380},ground:()=>14};
 stepFrontierMission(m,s,.1);
 assert(d.wrecked&&d.wreckY<=d.y,'wreck state initialised');assert.equal(m.effects.filter(e=>e.type==='explode').length,1,'one air explosion');
 for(let i=0;i<60;i++)stepFrontierMission(m,s,.1);
 assert.equal(d.wreckY,14,'wreck rests on the ground callback height');assert(d.wreck>5,'wreck age accumulates');
 assert(m.effects.every(e=>e.age<e.ttl),'expired effects are dropped');assert(m.effects.length<=24,'effect ring capped');
 assert.equal(m.effectSerial,2,'exactly two explosions: air + ground impact');
 assert.deepEqual(m.effectCounts,{explode:2,collapse:0,step:0},'per-type effect counters for audio');assert.equal(m.lastEffect.type,'explode');
 // Live drones never carry wreck state.
 assert(m.hostiles.slice(1).every(h=>!h.wrecked&&h.wreck===0));
}
// Turret / dish collapse effect type; dish wreck timer; damage fraction.
{
 const m=createFrontierMission('platform','hard',true);m.stage='clear';spawnTurrets(m);
 const t=m.hostiles[0];while(t.alive)damageTarget({hits:0,kills:0},t,100);
 stepFrontierPresentation(m,.1,()=>12);assert.equal(m.effects[0].type,'collapse');assert.equal(m.effects[0].ttl,FRONTIER_EFFECT_TTL.collapse);
 assert.equal(hostileDamageFraction({hp:25,maxHp:100}),.75);assert.equal(hostileDamageFraction({hp:120,maxHp:100}),0);assert.equal(hostileDamageFraction(null),0);
}
// Mech: footsteps emitted per stride while pursuing, damage fraction tracks hp, wreck tilt state after death.
{
 const m=createFrontierMission('radar','easy',true);m.stage='boss';m.completed=['approach','dishes'];spawnMech(m);
 const b=m.mech;const rover={x:RADAR_STATION.gate.x,z:RADAR_STATION.gate.z+40,y:0};
 const s={kind:'rover',rover,player:null,boxes:[],ground:()=>0};
 let sawStep=false;for(let i=0;i<40;i++){stepFrontierMission(m,s,.1);if(m.effects.some(e=>e.type==='step'))sawStep=true;}
 assert(m.mechSteps>=2,'mech footsteps counted while walking: '+m.mechSteps);assert(sawStep,'step dust effects present while striding');assert(m.effects.every(e=>e.age<FRONTIER_EFFECT_TTL.step||e.type!=='step'),'old step dust expired');
 assert.equal(hostileDamageFraction(b),0);damageTarget({hits:0,kills:0},b,b.maxHp/2);assert(Math.abs(hostileDamageFraction(b)-.5)<1e-9);
 while(b.alive)damageTarget({hits:0,kills:0},b,200);stepFrontierMission(m,s,.1);
 assert(b.wrecked&&m.effects.some(e=>e.type==='collapse'),'mech collapse effect');
}
// Presentation step is safe on idle / empty missions and ignores non-positive dt.
{const m=createFrontierMission('windfarm');stepFrontierPresentation(m,0);stepFrontierPresentation(m,-1);stepFrontierPresentation(m,.5);assert.deepEqual(m.effects,[]);}
console.log('PASS: frontier presentation — drone explode/fall/ground impact, turret & dish collapse, mech footsteps/damage fraction/wreck, capped effect ring, idle safety');
