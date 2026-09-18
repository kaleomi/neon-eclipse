import assert from 'node:assert/strict';
import {HELICOPTER_SITE,createHelicopter,startHelicopter,stepHelicopter} from './helicopter-rules.js';
import {HELICOPTER_TRANSFER,createHelicopterTransfer,helicopterGroundGate,helicopterDoors,helicopterWalkClear,setHelicopterEngine,exitHelicopter,boardHelicopter,stepHelicopterWalking,helicopterTaskSnapshot} from './helicopter-transfer.js';
import {HANDOVER_TERMINAL,HANDOVER_STEPS,createHelicopterHandover,startHelicopterHandover,stepHelicopterHandover,inspectHelicopterHandover,helicopterHandoverResult} from './helicopter-handover.js';
let count=0;const test=(name,fn)=>{fn();console.log('PASS '+name);count++;};
const setup=()=>{const s=createHelicopter();startHelicopter(s);return {s,t:createHelicopterTransfer(s)};};
const park=(t,s)=>{assert(setHelicopterEngine(t,s,false).ok);for(let i=0;i<300;i++)stepHelicopter(s,{},1/120);};
const snapshot=(t,s)=>JSON.stringify({t,s});
test('engine stops only on stable ground; no airborne shutdown or exit',()=>{
  const {s,t}=setup();s.y=10;s.grounded=false;const before=snapshot(t,s);
  assert(!setHelicopterEngine(t,s,false).ok);assert(!exitHelicopter(t,s).ok);assert.equal(snapshot(t,s),before);
  s.y=0;s.grounded=true;s.vx=.2;assert(helicopterGroundGate(s));s.vx=0;s.roll=.1;assert(helicopterGroundGate(s));s.roll=0;s.yawRate=.1;assert(helicopterGroundGate(s));
});
test('power and rotor gate: wait for coast-down, then exit at a real door',()=>{
  const {s,t}=setup();for(let i=0;i<300;i++)stepHelicopter(s,{},1/120);
  assert(!exitHelicopter(t,s).ok);assert(setHelicopterEngine(t,s,false).ok);assert(!exitHelicopter(t,s).ok);
  for(let i=0;i<300;i++)stepHelicopter(s,{},1/120);
  const before={x:s.x,z:s.z};assert(exitHelicopter(t,s).ok);assert.equal(t.seat,'foot');assert.deepEqual({x:s.x,z:s.z},before);
  assert.equal(t.walker.x,s.x+HELICOPTER_TRANSFER.doorOffset);assert.equal(t.walker.z,s.z);
});
test('reboarding requires proximity, leaves engine off, and emits ordered events',()=>{
  const {s,t}=setup();park(t,s);assert(exitHelicopter(t,s).ok);t.walker.x+=10;
  assert(!boardHelicopter(t,s).ok);t.walker.x-=10;assert(boardHelicopter(t,s).ok);assert.equal(s.powered,false);
  assert(!boardHelicopter(t,s).ok);assert(setHelicopterEngine(t,s,true).ok);assert.equal(t.sequence,4);assert.equal(t.lastEvent.type,'engine-started');
});
test('paused actions, crashed/invalid states and off-seat ignition are rejected without mutations',()=>{
  const {s,t}=setup();park(t,s);const before=snapshot(t,s);
  assert(!exitHelicopter(t,s,{active:false}).ok);assert(!setHelicopterEngine(t,s,true,{active:false}).ok);assert.equal(snapshot(t,s),before);
  assert(exitHelicopter(t,s).ok);assert(!setHelicopterEngine(t,s,true).ok);const foot=snapshot(t,s);assert(!boardHelicopter(t,s,{active:false}).ok);assert.equal(snapshot(t,s),foot);
  s.status='crashed';assert(!boardHelicopter(t,s).ok);s.status='running';s.yaw=NaN;assert(!boardHelicopter(t,s).ok);
});
test('unsafe right door selects left; both blocked refuses exit atomically',()=>{
  const {s,t}=setup();park(t,s);
  const wall=side=>({minX:s.x+side*2.7-.1,maxX:s.x+side*2.7+.1,minZ:s.z-1,maxZ:s.z+1,minY:0,maxY:4});
  const site={...HELICOPTER_SITE,obstacles:[wall(1),wall(-1)]};const before=snapshot(t,s);assert(!exitHelicopter(t,s,{site}).ok);assert.equal(snapshot(t,s),before);
  site.obstacles.pop();assert(exitHelicopter(t,s,{site}).ok);assert(t.walker.x<s.x);
});
test('door transform follows heading and swept boarding cannot cross a wall',()=>{
  const {s,t}=setup();park(t,s);s.yaw=Math.PI/2;const p=helicopterDoors(s)[0];assert(Math.abs(p.x-s.x)<1e-9);assert(Math.abs(p.z-s.z-3.3)<1e-9);
  assert(exitHelicopter(t,s).ok);t.walker.z+=1;
  const site={...HELICOPTER_SITE,obstacles:[{minX:p.x-1,maxX:p.x+1,minZ:p.z+.4,maxZ:p.z+.5,minY:0,maxY:3}]};
  assert(!boardHelicopter(t,s,{site}).ok);
});
test('walking swept collision blocks thin walls, airframe/tail and site boundary',()=>{
  const {s,t}=setup();park(t,s);assert(exitHelicopter(t,s).ok);const p={...t.walker};
  const site={...HELICOPTER_SITE,obstacles:[{minX:p.x+.01,maxX:p.x+.015,minZ:p.z-3,maxZ:p.z+3,minY:0,maxY:4}]};
  assert(!helicopterWalkClear(p,{x:p.x+5,z:p.z},s,site));stepHelicopterWalking(t,s,{right:1},.1,site);assert.equal(t.walker.x,p.x);
  assert(!helicopterWalkClear(p,s,s));assert(!helicopterWalkClear(p,{x:110,z:p.z},s));
  assert(!helicopterWalkClear({x:s.x-3,z:s.z+5},{x:s.x+3,z:s.z+5},s));
});
test('walking normalizes diagonal speed, rejects bad dt and cannot control an unoccupied craft',()=>{
  const {s,t}=setup();park(t,s);assert(exitHelicopter(t,s).ok);const p={...t.walker},pose={x:s.x,y:s.y,z:s.z};
  for(let i=0;i<60;i++)stepHelicopterWalking(t,s,{right:1,forward:1},1/60);
  assert(Math.abs(Math.hypot(t.walker.x-p.x,t.walker.z-p.z)-3.2)<1e-8);assert.deepEqual({x:s.x,y:s.y,z:s.z},pose);
  const before=snapshot(t,s);for(const dt of [0,-1,NaN,Infinity])stepHelicopterWalking(t,s,{right:1},dt);stepHelicopterWalking(t,s,{paused:true,right:1},.1);assert.equal(snapshot(t,s),before);
  stepHelicopterWalking(t,s,{right:Infinity,forward:NaN,yaw:NaN},.1);assert(Number.isFinite(t.walker.x+t.walker.z+t.walker.yaw));
});
test('ground walking is consistent at 30/60/120/144 Hz and stalls are bounded',()=>{
  const results=[];
  for(const hz of [30,60,120,144]){const {s,t}=setup();park(t,s);exitHelicopter(t,s);for(let i=0;i<hz*2;i++)stepHelicopterWalking(t,s,{right:1,yaw:.2},1/hz);results.push(t.walker);}
  for(const p of results)for(const key of ['x','z','yaw'])assert(Math.abs(p[key]-results[0][key])<1e-8);
  const {s,t}=setup();park(t,s);exitHelicopter(t,s);const x=t.walker.x;stepHelicopterWalking(t,s,{right:1},100);assert(t.walker.x-x<=.321);
});
test('task port is immutable and does not expose mutable aircraft or walker references',()=>{
  const {s,t}=setup(),p=helicopterTaskSnapshot(t,s);assert(Object.isFrozen(p));assert(Object.isFrozen(p.craft));assert(Object.isFrozen(p.operator));
  assert.throws(()=>{p.craft.x=123;},TypeError);s.x++;assert.notEqual(p.craft.x,s.x);
  assert.equal(createHelicopterTransfer(s).sequence,0);
});
test('task needs a real landing and explicit on-foot inspection; wrong stage/seat/range never advances',()=>{
  const {s,t}=setup(),m=createHelicopterHandover();assert.equal(helicopterHandoverResult(m),null);startHelicopterHandover(m);
  for(let i=0;i<150;i++)stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),.1);assert.equal(m.stage,0);assert(!inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s)).ok);
  Object.assign(s,{x:28,z:-32,landings:1});for(let i=0;i<10;i++)stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),.1);assert.equal(m.stage,1);
  assert(!inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s)).ok);park(t,s);exitHelicopter(t,s);assert(!inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s)).ok);
  Object.assign(t.walker,HANDOVER_TERMINAL);const before=JSON.stringify(m);assert(!inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s),{active:false}).ok);assert.equal(JSON.stringify(m),before);
  for(let i=0;i<30;i++)stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),.1);assert.equal(m.stage,1);
  assert(inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s)).ok);assert.equal(m.stage,2);assert(!inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s)).ok);
});
test('failed task and invalid time never award completion; attempts do not alias',()=>{
  const {s,t}=setup(),m=createHelicopterHandover(),other=createHelicopterHandover();startHelicopterHandover(m);const before=JSON.stringify(m);
  for(const dt of [0,-1,NaN,Infinity])stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),dt);assert.equal(JSON.stringify(m),before);
  s.status='crashed';stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),.1);assert.equal(m.status,'failed');s.status='running';stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),.1);assert.equal(m.status,'failed');assert.equal(helicopterHandoverResult(m),null);assert.equal(other.status,'ready');
});
test('complete B landing, native exit/walk/inspect/board and A return with inputs only (no pose/phase injection)',()=>{
  const {s,t}=setup(),m=createHelicopterHandover();startHelicopterHandover(m);
  let descending=false,lastStage=0,frames=0;
  const clamp=n=>Math.max(-1,Math.min(1,n));
  for(;frames<60*200&&m.status==='running';frames++){
    if(m.stage!==lastStage){descending=false;lastStage=m.stage;}
    let input={};
    if(m.stage===0||m.stage===3){
      if(!s.powered&&t.seat==='pilot')assert(setHelicopterEngine(t,s,true).ok);
      const goal=HANDOVER_STEPS[m.stage],dx=goal.x-s.x,dz=goal.z-s.z;
      if(Math.hypot(dx,dz)<1.5&&Math.hypot(s.vx,s.vz)<.3&&s.y>5)descending=true;
      if(descending)input=s.grounded?{}:Math.hypot(s.vx,s.vz)>.2||Math.abs(s.pitch)+Math.abs(s.roll)>.05?{brake:true}:{lift:-1};
      else{input.lift=clamp((11-s.y)*.4-s.vy*.35);if(s.y>6){input.forward=clamp((clamp(-dz*.15)*4+s.vz)*.35);input.right=clamp((clamp(dx*.15)*4-s.vx)*.35);}}
    }else if(m.stage===1){
      if(t.seat==='pilot'){
        if(s.powered)assert(setHelicopterEngine(t,s,false).ok);
        if(s.rpm<=.08)assert(exitHelicopter(t,s).ok);
      }else{
        const dx=HANDOVER_TERMINAL.x-t.walker.x,dz=HANDOVER_TERMINAL.z-t.walker.z;
        if(Math.hypot(dx,dz)<=1.3)assert(inspectHelicopterHandover(m,helicopterTaskSnapshot(t,s)).ok);
        else input={right:clamp(dx),forward:clamp(-dz)};
      }
    }else if(m.stage===2&&t.seat==='foot'){
      const door=helicopterDoors(s)[0],dx=door.x-t.walker.x,dz=door.z-t.walker.z;
      if(Math.hypot(dx,dz)<.8)assert(boardHelicopter(t,s).ok);else input={right:clamp(dx),forward:clamp(-dz)};
    }
    stepHelicopter(s,t.seat==='pilot'?input:{},1/60,HELICOPTER_SITE,(craft,h)=>{stepHelicopterWalking(t,craft,input,h);stepHelicopterHandover(m,helicopterTaskSnapshot(t,craft),h);});
    assert.notEqual(s.status,'crashed',JSON.stringify({s,m}));
  }
  assert.equal(m.status,'complete',JSON.stringify({s,t,m,frames}));assert.equal(s.landings,2);assert.deepEqual(m.completed,['land-b','inspect','board','land-a']);
  const result=helicopterHandoverResult(m);assert.equal(result.scope,'practice');assert.equal(result.eligibleForExpedition,false);assert(Object.isFrozen(result.completed));assert(result.timeMs>10000);
  const before=JSON.stringify(m);stepHelicopterHandover(m,helicopterTaskSnapshot(t,s),1);assert.equal(JSON.stringify(m),before);
  console.log('  Native transfer route simulation: '+(frames/60).toFixed(2)+' simulated seconds (not wall-time performance).');
});
console.log(`helicopter transfer/task: ${count}/${count} groups passed`);
