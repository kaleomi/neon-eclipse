import assert from 'node:assert/strict';
import {createPlane,FLIGHT_GATES} from '../src/flight-rules.js';
import {createFlightMission,stepFlightMission,FLIGHT_MISSION,flightGoal} from '../src/flight-mission.js';
const tick=(m,p,dt=.1,from={...p},options)=>stepFlightMission(m,p,from,dt,options);
const airborne=(g=FLIGHT_GATES[0])=>({...createPlane(),...g,onGround:false,speed:32});
const prepared=()=>{const p=airborne();const m=createFlightMission(p);m.tookOff=true;m.phase='landing';m.approached=true;m.route.index=5;m.route.complete=true;return m;};
const idle=createFlightMission(),ground=createPlane();tick(idle,ground);assert.equal(idle.status,'idle');
const m=createFlightMission(ground),original=JSON.stringify(m);
for(const dt of [NaN,Infinity,0,-1])tick(m,ground,dt);tick(m,ground,.1,ground,{paused:true});assert.equal(JSON.stringify(m),original);
for(let i=0;i<30;i++)tick(m,ground);assert.equal(m.route.index,0);assert.equal(m.phase,'takeoff');assert(m.elapsed>2.9,'takeoff preparation counts toward limit');
const wrong=airborne(FLIGHT_GATES[1]);tick(m,wrong);assert.equal(m.route.index,0,'cannot skip first ring');
for(const g of FLIGHT_GATES){const p=airborne(g);tick(m,{...p,y:1.3,onGround:true});assert.equal(m.route.index,FLIGHT_GATES.indexOf(g),'ground pass rejected');tick(m,p);}
assert.equal(m.route.index,5);assert.equal(m.phase,'approach');assert.equal(m.status,'active','last flight gate cannot win');assert.equal(flightGoal(m),FLIGHT_MISSION.approach);
const a={...airborne(FLIGHT_MISSION.approach),yaw:Math.PI};tick(m,a,.1,{...a,z:a.z+1});assert.equal(m.phase,'approach','wrong heading rejected');
a.yaw=0;tick(m,a,.1,{...a,z:a.z-1});assert.equal(m.phase,'approach','wrong travel direction rejected');
tick(m,a,.1,{...a,z:a.z+1});assert.equal(m.phase,'landing');assert(m.approached);
const p={...createPlane(),z:-280,speed:30,landings:1};tick(m,p,.1,{...p,onGround:false,y:1.4});assert.equal(m.phase,'stop');assert.equal(m.status,'active');
p.speed=0;p.throttle=.2;for(let i=0;i<25;i++)tick(m,p);assert.equal(m.stopTime,0,'must reduce throttle too');p.throttle=0;
for(let i=0;i<10;i++)tick(m,p);assert(m.stopTime>.9);p.speed=2;tick(m,p);assert.equal(m.stopTime,0,'rolling resets continuous stop');p.speed=0;
for(let i=0;i<20;i++)tick(m,p);assert.equal(m.status,'won');assert(Object.isFrozen(m.result));assert.equal(m.stopTime,2);const won=JSON.stringify(m);tick(m,{...p,crashed:true});assert.equal(JSON.stringify(m),won,'terminal outcome immutable');
for(const hz of [30,60,144]){const q=prepared(),s={...p};tick(q,s,1/hz,{...s,onGround:false});for(let i=0;i<hz*2&&q.status==='active';i++)tick(q,s,1/hz);assert.equal(q.status,'won');}
for(const [patch,reason] of [[{x:-270},'指定跑道'],[{yaw:Math.PI},'北向']]){const q=prepared(),s={...p,...patch};tick(q,s,.1,{...s,onGround:false});assert.equal(q.status,'lost');assert(q.reason.includes(reason));}
const early=createFlightMission(p);early.tookOff=true;early.phase='route';tick(early,p,.1,{...p,onGround:false});assert.equal(early.status,'lost');assert.match(early.reason,/提前着陆/);
for(const s of [{...p,crashed:true},{...p,x:601},{...p,y:NaN}]){const q=createFlightMission(p);tick(q,s);assert.equal(q.status,'lost');}
const teleport=createFlightMission(p);tick(teleport,{...p,x:0},.1,p);assert.match(teleport.reason,/跳变/);
const timeout=createFlightMission(p);timeout.elapsed=299.95;tick(timeout,p);assert.equal(timeout.status,'lost');assert.equal(timeout.remaining,0);
const stop=prepared();tick(stop,p,.1,{...p,onGround:false});tick(stop,{...p,onGround:false});assert.equal(stop.status,'lost','cannot take off again instead of parking');
const frozen=createFlightMission(p);frozen.phase='stop';frozen.stopTime=1.9;const freeze=JSON.stringify(frozen);tick(frozen,p,.2,p,{paused:true});assert.equal(JSON.stringify(frozen),freeze);
const fresh=createFlightMission(createPlane());assert.equal(fresh.route.index,0);assert.equal(fresh.remaining,300);assert.equal(fresh.result,null);assert.equal(fresh.stopTime,0);
console.log('PASS: flight lifecycle, ordered altitude gates, no airborne victory, north approach, genuine runway landing, 2s continuous stop, heading/throttle checks, pause/invalid dt, early/wrong landing, boundary/crash/timeout/teleport failures, immutable result and fresh retry');
