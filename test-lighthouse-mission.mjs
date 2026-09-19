import assert from 'node:assert/strict';
import {createLighthouseMission,stepLighthouseMission,lighthouseGoal,lighthouseBoardAllowed,lighthouseSummary,onIslandTop,onPier,
  LIGHTHOUSE_POINTS,LIGHTHOUSE_STAGES,LIGHTHOUSE_PROFILES,normalizeLighthouse} from './lighthouse-mission.js';
import {createYacht,stepYacht,yachtFree,yachtExit,canBoardYacht,isFootSurface,footHeight,waterFree,FIELD_BUILDINGS,LIGHTHOUSE_ISLAND,LIGHTHOUSE_LANDING,ISLAND_PIER,YACHT_SPAWN} from './maritime-rules.js';
import {CollisionGrid,walkPlayer,createRover} from './vehicle-rules.js';
import {expeditionRecordFromMission,newExpeditionId} from './expedition-model.js';

// Surface geometry: island top and pier are walkable, water around them is not; pier ramp is monotonic.
const grid=new CollisionGrid(FIELD_BUILDINGS,24,600),foot={geometry:grid,free:(x,z,r)=>isFootSurface(x,z,r)&&grid.free(x,z,r)};
const I=LIGHTHOUSE_ISLAND;
assert(isFootSurface(I.x,I.z));assert(isFootSurface(I.x-15,I.z));assert(!isFootSurface(I.x+I.r+2,I.z));assert(!isFootSurface(I.x,I.z+I.r+1));
assert(isFootSurface((ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,ISLAND_PIER.minZ+1));assert(!isFootSurface(ISLAND_PIER.minX-3,ISLAND_PIER.minZ-3));
assert.equal(footHeight(I.x,I.z),I.h);assert.equal(footHeight(0,0),0);assert.equal(footHeight(260,180),.85);
let previous=-1;for(let z=ISLAND_PIER.minZ;z<=ISLAND_PIER.maxZ;z+=2){const h=footHeight((ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,z);assert(h>=previous,'pier ramp rises toward the island');previous=h;}
assert(previous<=I.h+1e-9);
assert(!waterFree((ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,ISLAND_PIER.minZ+3),'pier blocks the yacht');
assert(waterFree(LIGHTHOUSE_LANDING.x,LIGHTHOUSE_LANDING.z),'landing spot is open water');
assert(yachtFree({...LIGHTHOUSE_LANDING}),'yacht fits alongside the pier');
for(const key of ['survey-1','survey-2','survey-3'])assert(onIslandTop(LIGHTHOUSE_POINTS[key].x,LIGHTHOUSE_POINTS[key].z),key+' on island top');
assert(onPier((ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,ISLAND_PIER.minZ+2));assert(!onPier(0,0));

// Yacht parked at the landing can actually be exited onto the pier and re-boarded from it.
const yacht=createYacht();Object.assign(yacht,LIGHTHOUSE_LANDING,{speed:0});
const exit=yachtExit(yacht,{...foot,geometry:grid});assert(exit.ok,'exit near pier');assert(isFootSurface(exit.x,exit.z),'exit lands on walkable surface');
assert(canBoardYacht({x:exit.x,z:exit.z},yacht,foot));
// A player walking from the pier foot reaches the island top without falling through.
const rover=createRover();let player={x:(ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,z:ISLAND_PIER.minZ+1,yaw:Math.PI};
for(let i=0;i<120*12;i++)walkPlayer(player,{forward:1},1/120,foot,rover);
assert(onIslandTop(player.x,player.z),'walked onto island top '+JSON.stringify(player));
assert.equal(footHeight(player.x,player.z),I.h);

// Mission lifecycle at 120 Hz with synthetic-but-consistent inputs.
const m=createLighthouseMission('hard',true),s={kind:null,player:{x:200,z:180,yaw:0},yacht:createYacht(),action:false};
const hold=(n=1)=>{let changed=false;for(let i=0;i<Math.round(120*n);i++)changed=stepLighthouseMission(m,s,1/120)||changed;return changed;};
assert.equal(m.profile.id,'hard');assert.equal(m.stage,'board');assert.equal(lighthouseBoardAllowed(m,'rover'),false);assert.equal(lighthouseBoardAllowed(m,'yacht'),true);
assert.equal(lighthouseGoal(m,s).x,218,'walk to gangway entrance first');s.player={x:270,z:180};assert.equal(lighthouseGoal(m,s).name,LIGHTHOUSE_POINTS.board.name);
hold(.5);assert.equal(m.stage,'board','walking does nothing');
s.kind='yacht';assert(hold(.05));assert.equal(m.stage,'sail');assert.deepEqual(m.completed,['board']);
Object.assign(s.yacht,LIGHTHOUSE_LANDING,{speed:3});hold(1.5);assert.equal(m.stage,'sail','must stop');s.yacht.speed=0;hold(.5);assert.equal(m.stage,'sail','one second hold');hold(.6);assert.equal(m.stage,'land');
s.player={x:0,z:0};s.kind=null;hold(.1);assert.equal(m.stage,'land','must be on pier/island');s.player={x:(ISLAND_PIER.minX+ISLAND_PIER.maxX)/2,z:ISLAND_PIER.minZ+3};hold(.05);assert.equal(m.stage,'survey-1');
s.player={...LIGHTHOUSE_POINTS['survey-1']};hold(.5);assert.equal(m.stage,'survey-1','needs F');s.action=true;hold(1.5);assert.equal(m.stage,'survey-1','hard holds 2 s');assert(m.hold>1.4);s.action=false;hold(.1);assert.equal(m.hold,0,'hold resets');
s.action=true;hold(2.1);assert.equal(m.stage,'survey-2');assert.equal(m.surveys,1);
s.player={...LIGHTHOUSE_POINTS['survey-3']};hold(2.1);assert.equal(m.stage,'survey-2','order is enforced');
s.player={...LIGHTHOUSE_POINTS['survey-2']};hold(2.1);s.player={...LIGHTHOUSE_POINTS['survey-3']};hold(2.1);assert.equal(m.stage,'reboard');assert.equal(m.surveys,3);
s.action=false;s.kind='yacht';hold(.05);assert.equal(m.stage,'return');
Object.assign(s.yacht,YACHT_SPAWN,{speed:0});hold(.5);assert.equal(m.stage,'return','must disembark');s.kind=null;s.player={x:272,z:180};hold(.05);
assert.equal(m.status,'won');assert.equal(m.stage,'complete');assert.deepEqual(m.completed,LIGHTHOUSE_STAGES);
const frozen=JSON.stringify(m);hold(3);assert.equal(JSON.stringify(m),frozen,'terminal state is frozen');
const summary=lighthouseSummary(m);assert.equal(summary.stageIndex,LIGHTHOUSE_STAGES.length);assert.equal(summary.surveys,3);

// Time limit fails the run; pause freezes; profiles normalize.
const late=createLighthouseMission('easy',true);late.elapsed=LIGHTHOUSE_PROFILES.easy.timeLimit-.01;assert(stepLighthouseMission(late,{kind:null,player:{x:0,z:0},yacht:createYacht()},.1));assert.equal(late.status,'lost');
const paused=createLighthouseMission('normal',true),before=JSON.stringify(paused);stepLighthouseMission(paused,{...s,paused:true},1);assert.equal(JSON.stringify(paused),before);
assert.equal(normalizeLighthouse('nope'),'normal');assert.equal(createLighthouseMission().status,'idle');assert.equal(createLighthouseMission().runId,null);assert(createLighthouseMission('easy',true).runId);

// Expedition evidence: won flag alone is not enough; profile must match campaign difficulty.
const attempt=id=>({id:newExpeditionId(),campaignId:newExpeditionId(),mission:'lighthouse',difficulty:id,fromStart:true});
const record=expeditionRecordFromMission(attempt('hard'),m);assert(record);assert.equal(record.rule,'lighthouse-v1');assert.equal(record.difficulty,'hard');
assert.equal(expeditionRecordFromMission(attempt('normal'),m),null,'difficulty mismatch');
assert.equal(expeditionRecordFromMission(attempt('hard'),{...m,surveys:2}),null);
assert.equal(expeditionRecordFromMission(attempt('hard'),{...m,completed:m.completed.slice(0,-1)}),null);
assert.equal(expeditionRecordFromMission(attempt('hard'),{...m,elapsed:m.profile.timeLimit+1}),null);
assert.equal(expeditionRecordFromMission(attempt('hard'),{...m,recovered:true}),null);

// Real yacht physics: a two-waypoint pilot (line up west of the pier, then slide east alongside it) reaches the landing without collisions.
const y=createYacht();let arrived=false,leg=0;const waypoints=[{x:LIGHTHOUSE_LANDING.x-30,z:LIGHTHOUSE_LANDING.z-60},{x:LIGHTHOUSE_LANDING.x,z:LIGHTHOUSE_LANDING.z-45},LIGHTHOUSE_LANDING];
const steerTo=w=>{const want=Math.atan2(w.x-y.x,-(w.z-y.z));return Math.max(-1,Math.min(1,Math.atan2(Math.sin(want-y.yaw),Math.cos(want-y.yaw))*2));};
for(let i=0;i<120*240&&!arrived;i++){const w=waypoints[leg],d=Math.hypot(w.x-y.x,w.z-y.z);
 if(leg<2){stepYacht(y,{throttle:d>70?1:d>8?(y.speed>6?0:.3):0,steer:steerTo(w),brake:d<=8},1/120);if(d<=8&&Math.abs(y.speed)<.3)leg++;continue;}
 stepYacht(y,{throttle:d>10?(y.speed>4?0:.25):0,steer:steerTo(w),brake:d<=10},1/120);if(d<=12&&Math.abs(y.speed)<=.6)arrived=true;}
assert(arrived,'yacht can reach the landing');assert.equal(y.impacts,0,'no collision on the approach');
const parked={...y,speed:0},pierExit=yachtExit(parked,{...foot,geometry:grid});assert(pierExit.ok,'parked yacht can be exited onto the pier: '+JSON.stringify({x:y.x,z:y.z,yaw:y.yaw}));
console.log('PASS: lighthouse island foot surface / pier ramp, yacht exit and re-board at the pier, ordered 8-stage landing lifecycle, holds, time limit, pause, evidence rejection and physical approach');
