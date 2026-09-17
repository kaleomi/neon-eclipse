import assert from 'node:assert/strict';
import {createPlayerMotion} from './player-motion.js';
import {TRAIN_STAGES,TRAIN_ENTRIES,TRAIN_FLOORS,TRAIN_STAR_PLATFORMS,TRAIN_STAR,trainObstacles} from './train-data.js';
globalThis.location={search:'?map=train'};
const {createMission,chooseEncounterSpawns}=await import('./mission.js');
const {createTrainNavigation}=await import('./train-navigation.js');
const terminals=TRAIN_STAGES.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4,h:s.feetY+1.4}));
for(let i=0;i<5;i++){const obs=trainObstacles(i).concat(terminals),e=TRAIN_ENTRIES[i],spawns=chooseEncounterSpawns(TRAIN_STAGES[i],{...e,y:e.feetY+1.7},obs);assert.equal(spawns.length,TRAIN_STAGES[i].count,'safe spawns '+i);const m=createPlayerMotion(obs,[],{x:14,z:37.1});assert(m.canOccupy(e.x,e.z,e.feetY),'safe entry '+i);}
const obs=trainObstacles(4).concat(terminals),motion=createPlayerMotion(obs,[],{x:14,z:37.1}),p={x:0,z:32.5,y:3.2};motion.reset(p,1.5);
function walk(target){for(let i=0;i<5000;i++){const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.02)return;motion.step(.01,p,dx/d*Math.min(.05,d),dz/d*Math.min(.05,d));}assert.fail('walk blocked '+JSON.stringify(p)+' to '+JSON.stringify(target));}
walk({x:-3.5,z:32.5});walk({x:-3.5,z:24});assert.equal(motion.state.y,4.5,'rear roof staircase');
walk({x:0,z:23});for(let i=0;i<80;i++)motion.step(.01,p,0,i<60?-.05:0,i===0);assert.equal(motion.state.y,4.5,'jump actual gap');assert(p.z<21);
walk({x:3.6,z:10});walk({x:3.6,z:-10});walk({x:0,z:-18});walk({x:-3.5,z:-18});walk({x:-3.5,z:-9.5});assert.equal(motion.state.y,1.5,'control stair descent');
walk({x:0,z:-9.5});walk({x:0,z:-29});assert.equal(motion.state.y,1.5,'gangways to engine');
// New challenge: three outside roof jumps, not a free star in the carriage.
p.x=4;p.z=-25;motion.reset(p,4.5);
for(const plat of TRAIN_STAR_PLATFORMS){for(let i=0;i<100;i++){const dx=plat.x-p.x,dz=plat.z-p.z,d=Math.hypot(dx,dz);motion.step(.01,p,d>.01?dx/d*Math.min(.05,d):0,d>.01?dz/d*Math.min(.05,d):0,i===0);}assert(Math.abs(motion.state.y-plat.top)<.01,'star jump '+plat.top);}
for(const radius of [.65,.85]){const nav=createTrainNavigation(obs),actor={x:0,z:28,y:1.5},target={x:0,z:0,y:6.2};for(let i=0;i<15000;i++){const d=nav.route(actor,target),n=Math.hypot(d.x,d.z)||1;nav.move(actor,d.x/n*.035,d.z/n*.035,radius);}assert.equal(actor.y,4.5,'enemy roof '+radius+' '+JSON.stringify(actor));assert(Math.abs(actor.z)<5,'enemy crosses roof bridges '+JSON.stringify(actor));target.y=3.2;target.z=-28;for(let i=0;i<15000;i++){const d=nav.route(actor,target),n=Math.hypot(d.x,d.z)||1;nav.move(actor,d.x/n*.035,d.z/n*.035,radius);}assert.equal(actor.y,1.5,'enemy down '+JSON.stringify(actor));assert(actor.z<-22);}
const mission=createMission();for(let i=0;i<5;i++){let e=mission.tick(3.1,{player:{...TRAIN_STAGES[i],y:TRAIN_STAGES[i].feetY+1.7},held:true,clear:true});if(e?.type==='defense'){const before=mission.state.progress;mission.tick(2,{player:{x:2.3,z:-14,y:6.2},held:false,clear:true});assert.equal(mission.state.progress,before);e=mission.tick(16,{player:{x:2.3,z:-14,y:3.2},held:false,clear:true});}assert(e?.finished,'stage '+i);}assert(mission.state.complete);
console.log('PASS: train 5 stages, safe spawns/entries, both stairs, roof gap jump, roof/gangway traversal, 3 hidden-star jumps, two enemy sizes up/across/down, floor-specific defense');
