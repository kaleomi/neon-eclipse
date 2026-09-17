import assert from 'node:assert/strict';
import {CollisionGrid,ROVER,createRover,stepRover,roverFree,canEnterRover,exitRover,walkPlayer,createDriveTrial,stepDriveTrial,DRIVE_GATES,terrainHeight} from './vehicle-rules.js';
import {collisionBoxes} from './vehicle-world.js';
const empty=new CollisionGrid([],24,10000);
const simulate=(seconds,input,rover=createRover({x:0,z:0,yaw:0}),world=empty,hz=60)=>{for(let i=0;i<seconds*hz;i++)stepRover(rover,input,1/hz,world);return rover;};
const fast=simulate(10,{throttle:1});assert(fast.speed<=ROVER.maxSpeed);assert(fast.speed>28);assert(fast.z<0);assert.equal(fast.x,0);
simulate(3,{brake:true},fast);assert.equal(fast.speed,0);const z=fast.z;simulate(2,{throttle:-1},fast);assert(fast.speed<0&&fast.speed>=-ROVER.reverseSpeed);assert(fast.z>z);
const idle=createRover({x:0,z:0,yaw:0});simulate(2,{steer:1},idle);assert.equal(idle.yaw,0);assert.equal(idle.distance,0);
const turn=simulate(2,{throttle:1,steer:1});assert(turn.x>0,'D turns toward right');
const back=simulate(2,{throttle:-1,steer:1});assert(back.yaw<0,'steering reverses naturally while reversing');
const paused=JSON.stringify(turn);stepRover(turn,{throttle:1,paused:true},1,empty);stepRover(turn,{},NaN,empty);assert.equal(JSON.stringify(turn),paused);
const wall=new CollisionGrid([{minX:-8,maxX:8,minZ:-15.1,maxZ:-15}]);
const slam=createRover({x:0,z:0,yaw:0});slam.speed=29;stepRover(slam,{throttle:1},.25,wall);stepRover(slam,{throttle:1},.25,wall);stepRover(slam,{throttle:1},.25,wall);
assert(slam.z>-15);assert(roverFree(slam,wall));assert(slam.impacts>0);assert(slam.impacts<3);assert.equal(slam.speed,0,'collision stops instead of tunnelling through thin walls');
const boundary=new CollisionGrid([],24,10),edge=simulate(10,{throttle:1},createRover({x:0,z:0,yaw:0}),boundary);assert(roverFree(edge,boundary));assert(edge.z>=-10+ROVER.radius+ROVER.halfLength);
const car=createRover({x:0,z:0,yaw:0});assert(canEnterRover({x:3,z:0},car,empty));assert(!canEnterRover({x:8,z:0},car,empty));
assert(!canEnterRover({x:3,z:0},car,new CollisionGrid([{minX:1.8,maxX:2,minZ:-8,maxZ:8}])));
car.speed=2;assert(!exitRover(car,empty).ok);car.speed=0;
const leftBlocked=new CollisionGrid([{minX:-4,maxX:-1.8,minZ:-4,maxZ:4}]);const exit=exitRover(car,leftBlocked);assert(exit.ok&&exit.x>0,'blocked left door falls back to right');
const sealed=new CollisionGrid([{minX:-5,maxX:-1.8,minZ:-6,maxZ:6},{minX:1.8,maxX:5,minZ:-6,maxZ:6},{minX:-5,maxX:5,minZ:2.6,maxZ:6}]);assert(!exitRover(car,sealed).ok);
const walker={x:0,z:4,yaw:0};for(let i=0;i<180;i++)walkPlayer(walker,{forward:1},1/60,empty,car);assert(walker.z>2.5,'walking cannot enter parked car collider');
const trial=createDriveTrial();stepDriveTrial(trial,{x:85,z:-110},{x:85,z:-100},.1,true);assert.equal(trial.index,0,'out of order gate rejected');
const g=DRIVE_GATES[0];stepDriveTrial(trial,{x:g.x,z:g.z+20},{x:g.x,z:g.z-20},.1,false);assert.equal(trial.index,0,'walking cannot pass vehicle gates');
for(const gate of DRIVE_GATES)assert(stepDriveTrial(trial,{x:gate.x,z:gate.z+20},{x:gate.x,z:gate.z-20},.1,true));assert(trial.complete);assert.equal(trial.index,6);const done=JSON.stringify(trial);stepDriveTrial(trial,g,g,1,true);assert.equal(JSON.stringify(trial),done);
const a=simulate(2,{throttle:1,steer:.3},undefined,empty,30),b=simulate(2,{throttle:1,steer:.3},undefined,empty,144);assert(Math.hypot(a.x-b.x,a.z-b.z)<.25,'frame rate drift bounded');
const boxes=collisionBoxes(),grid=new CollisionGrid(boxes);assert(roverFree(createRover(),grid));
for(const gate of DRIVE_GATES)assert(grid.free(gate.x,gate.z,ROVER.radius));
for(let x=-175;x<175;x+=7)for(let z=-175;z<175;z+=7){
 const brute=boxes.every(b=>{const dx=x-Math.max(b.minX,Math.min(b.maxX,x)),dz=z-Math.max(b.minZ,Math.min(b.maxZ,z));return dx*dx+dz*dz>=1;});assert.equal(grid.free(x,z,1),brute);
}
assert.equal(terrainHeight(0,0),0);assert(terrainHeight(60,10)>0);assert.equal(terrainHeight(35,10),0);
console.log('PASS: rover acceleration/braking/reverse/steering, frame rates, pause, thin-wall sweeps, world bounds, grid vs brute force, safe entry/exit, parked-car walk collision, ordered drive-only route, terrain and spawn safety');

const {vehicleEntryDecision}=await import('./vehicle-entry.js');
assert(!vehicleEntryDecision({pending:true}).allowed);assert(vehicleEntryDecision({state:'ready'}).allowed);assert(vehicleEntryDecision({state:'paused'}).description.includes('资格不会保留'));
