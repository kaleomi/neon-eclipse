import assert from 'node:assert/strict';
import {createRover,CollisionGrid,createDriveTrial,DRIVE_GATES,stepRover,stepDriveTrial,roverFree} from './vehicle-rules.js';
import {collisionBoxes} from './vehicle-world.js';
const car=createRover(),world=new CollisionGrid(collisionBoxes()),trial=createDriveTrial();
for(let i=0;i<120*180&&!trial.complete;i++){
 const gate=DRIVE_GATES[trial.index],want=Math.atan2(gate.x-car.x,-(gate.z-car.z));let angle=want-car.yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));
 const speed=Math.abs(angle)>.3?9:22;const from={x:car.x,z:car.z};
 stepRover(car,{steer:Math.max(-1,Math.min(1,angle*2)),throttle:car.speed<speed?1:0,brake:car.speed>speed+1},1/120,world);
 assert(roverFree(car,world));stepDriveTrial(trial,from,car,1/120,true);
}
assert(trial.complete,'entire route should be drivable using the actual vehicle controller');assert.equal(car.impacts,0);
console.log('PASS: actual controller drives all six ordered gates without teleportation or collisions in '+trial.elapsed.toFixed(1)+' simulated seconds');
