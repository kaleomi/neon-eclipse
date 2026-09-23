import assert from 'node:assert/strict';
import {createTrial,CIRCUITS} from '../src/p4-trial-rules.js';
import {createFixedClock,createInputRecorder,createInputReplay} from '../src/p4-replay.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let count=0;
for(const kind of Object.keys(CIRCUITS)){
 const results=[];
 for(const hz of [60,144]){const trial=createTrial(kind),clock=createFixedClock();trial.start();for(let frame=0;frame<hz*10;frame++)clock.advance(1/hz,(dt,tick)=>trial.step(dt,{throttle:1,steer:tick>120?.2:0,roll:tick>120?.2:0,elevator:.45,brake:false}));results.push(trial.position());}
 const error=Math.hypot(results[0].x-results[1].x,results[0].y-results[1].y,results[0].z-results[1].z);assert.ok(error<.05,kind+' replay drift');console.log(kind,'60/144 Hz deterministic input replay error',error.toFixed(9),'m');count++;
 const trial=createTrial(kind);trial.start();
 for(let tick=0;tick<60*CIRCUITS[kind].limit&&trial.state.phase==='playing';tick++){
  const s=trial.body,index=trial.state.gate;let g=CIRCUITS[kind].gates[index];
  if(kind==='bike'&&index===6&&s.z<78)g=[-5,0,90];
  const dx=g[0]-s.x,dz=g[2]-s.z,distance=Math.hypot(dx,dz),heading=Math.atan2(dx,-dz),angle=Math.atan2(Math.sin(heading-s.yaw),Math.cos(heading-s.yaw));
  let input;
  if(kind==='plane'){const targetPitch=s.onGround?.15:clamp(Math.atan2(g[1]-s.y,Math.max(50,distance)),-.3,.3);input={heading,elevator:clamp((targetPitch-s.pitch)*4+s.pitch*.64,-1,1),throttle:s.speed<38?1:-1,roll:0,rudder:0};}
  else{const target=Math.abs(angle)>.7?(kind==='yacht'?12:11):kind==='bike'?24:kind==='yacht'?25:23;input={throttle:s.speed<target?1:0,steer:clamp(angle*2,-1,1),brake:s.speed>target+2};}
  trial.step(1/60,input);
 }
 console.log(kind,'command-only circuit:',JSON.stringify({...trial.state,position:trial.position()}));
 assert.equal(trial.state.phase,'won',kind+' circuit must be physically completable using controls, not teleports');count++;
}
console.log('P4 vehicle rules:',count,'checks passed');
