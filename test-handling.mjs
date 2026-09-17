import './test-naval.mjs';
import './test-sea-combat.mjs';
import './test-chase.mjs';
import './test-difficulty.mjs';
import './test-flight-settings.mjs';
import assert from 'node:assert/strict';
import {createYacht,stepYacht,yachtFree,YACHT} from './maritime-rules.js';
import {createPlane,stepPlane} from './flight-rules.js';
import {moveFlightHeading,wrapHeading,flightHeadingControls} from './flight-heading.js';
const boat={...createYacht(),x:350,z:500};let elapsed=0;for(;elapsed<10&&boat.speed<27.78;elapsed+=1/120)stepYacht(boat,{throttle:1},1/120);assert(elapsed<5,'0-100 km/h should be under five seconds in this arcade tune');const accelerationTime=elapsed;
for(let i=0;i<600;i++)stepYacht(boat,{throttle:1},1/120);assert.equal(boat.speed,YACHT.maxSpeed);const before={...boat};let brakeTime=0;for(;brakeTime<5&&boat.speed>0;brakeTime+=1/120)stepYacht(boat,{brake:true},1/120);assert.equal(boat.speed,0);const brakeDistance=boat.distance-before.distance;assert(brakeDistance>0&&brakeDistance<45);assert(brakeTime<3);
for(const start of [{x:245,z:30,yaw:-Math.PI/2},{x:270,z:225,yaw:0},{x:440,z:-150,yaw:0}]){const b={...createYacht(),...start,speed:32};for(let i=0;i<12;i++)stepYacht(b,{throttle:1},.25);assert(yachtFree(b),'full-speed coast/dock/island collision stays outside obstacles');assert(b.impacts>0);}
const errors=[];
for(const target of [-1,1]){
 const p={...createPlane(),x:-150,z:180,y:100,onGround:false,speed:35,throttle:.233,pitch:0};let last=Math.abs(target),maxOvershoot=0;
 for(let i=0;i<120*8;i++){stepPlane(p,{heading:target},1/120);const error=wrapHeading(target-p.yaw);maxOvershoot=Math.max(maxOvershoot,target>0?Math.max(0,-error):Math.max(0,error));if(i>240)assert(Math.abs(error)<last+.002,'heading converges without oscillation');last=Math.abs(error);}
 assert(!p.crashed);assert(last<.003);assert(Math.abs(p.roll)<.01);assert(maxOvershoot<.005);errors.push(last);
 const snapshot=JSON.stringify(p);stepPlane(p,{heading:target+1,paused:true},.1);assert.equal(JSON.stringify(p),snapshot);
}
assert(moveFlightHeading(0,0,-.3)<0);assert(moveFlightHeading(0,0,.3)>0);assert.equal(moveFlightHeading(0,0,100),1.35);
const wrap=flightHeadingControls({...createPlane(),yaw:Math.PI-.02,onGround:false,speed:35},-Math.PI+.02);assert(wrap.rudder>0&&wrap.roll>0,'wrap across +/- pi chooses short right turn');
const zero=createPlane(),unchanged=JSON.stringify(zero);stepPlane(zero,{heading:1},1/60);assert.equal(zero.yaw,0,'look cannot pivot a stopped aircraft');
const manual={...createPlane(),x:-100,z:100,y:80,onGround:false,speed:35,throttle:.233};stepPlane(manual,{heading:-1,roll:1},.25);assert(manual.yaw>0,'manual bank overrides opposite mouse target');
assert.deepEqual(flightHeadingControls(createPlane(),NaN),{roll:0,rudder:0});assert.equal(moveFlightHeading(.1,0,NaN),.1);
for(const hz of [30,60,144]){const p={...createPlane(),x:-100,z:100,y:80,onGround:false,speed:35,throttle:.233};for(let i=0;i<hz*5;i++)stepPlane(p,{heading:.7},1/hz);assert(Math.abs(wrapHeading(.7-p.yaw))<.015);}
console.log(`PASS: yacht max ${YACHT.maxSpeed*3.6} km/h, 0-100 ${accelerationTime.toFixed(2)}s, full braking ${brakeTime.toFixed(2)}s / ${Math.abs(brakeDistance).toFixed(1)}m; coast/dock/island sweeps; left/right look alignment, wrap, damped centering, pause, manual priority and frame rates`);
// A/D additive rudder: preserve mouse error, add yaw, carry the added bearing forward.
for(const sign of [-1,1])for(const hz of [30,60,144]){
 const spawn=()=>({...createPlane(),x:-150,z:100,y:100,onGround:false,speed:35,throttle:.233});
 const mouse=spawn(),combined=spawn(),keyboard=spawn();let target=sign*.6,keyTarget=0;
 for(let i=0;i<hz;i++){
  stepPlane(mouse,{heading:sign*.6},1/hz);
  target=wrapHeading(target+(stepPlane(combined,{heading:target,rudderAssist:sign},1/hz)||0));
  keyTarget=wrapHeading(keyTarget+(stepPlane(keyboard,{heading:keyTarget,rudderAssist:sign},1/hz)||0));
 }
 assert(sign*(combined.yaw-mouse.yaw)>.17,'same-direction keyboard plus mouse turns faster than mouse alone');
 assert(sign*keyboard.yaw>.19,'A/D-equivalent rudder works alone');
 const releasedYaw=keyboard.yaw;
 for(let i=0;i<hz*2;i++)stepPlane(keyboard,{heading:keyTarget},1/hz);
 assert(Math.abs(wrapHeading(keyboard.yaw-releasedYaw))<.01,'release does not pull back to old heading');
 const snapshot=JSON.stringify(keyboard);stepPlane(keyboard,{heading:keyTarget,rudderAssist:sign,paused:true},.1);assert.equal(JSON.stringify(keyboard),snapshot);
 const opposite=spawn();stepPlane(opposite,{heading:sign*.6,rudderAssist:-sign},.25);const reference=spawn();stepPlane(reference,{heading:sign*.6},.25);assert(sign*opposite.yaw<sign*reference.yaw,'opposite rudder counteracts rather than disables mouse');
}
const stoppedRudder=createPlane();stepPlane(stoppedRudder,{heading:0,rudderAssist:1},.25);assert.equal(stoppedRudder.yaw,0);
console.log('PASS: additive A/D rudder, faster combined turns both directions, keyboard-only steering, release bearing retention, opposing input, pause and 30/60/144 Hz');
