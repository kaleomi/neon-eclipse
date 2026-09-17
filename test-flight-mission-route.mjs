import assert from 'node:assert/strict';
import {createPlane,stepPlane} from './flight-rules.js';
import {createFlightMission,stepFlightMission} from './flight-mission.js';
import {createRover} from './vehicle-rules.js';
import {TEST_OBSTACLES,TEST_POLES} from './vehicle-world.js';
import {FIELD_BUILDINGS,DOCK} from './maritime-rules.js';
import {flightPilot} from './test-flight-pilot.mjs';
export const planeBoxes=[...TEST_OBSTACLES.map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2,h:b.h})),...TEST_POLES.map(([x,z])=>({minX:x-.25,maxX:x+.25,minZ:z-.25,maxZ:z+.25,h:12})),...FIELD_BUILDINGS,{...DOCK,h:.85}];
const rover=createRover(),rx=Math.abs(Math.cos(rover.yaw))*1.3+Math.abs(Math.sin(rover.yaw))*2.4,rz=Math.abs(Math.sin(rover.yaw))*1.3+Math.abs(Math.cos(rover.yaw))*2.4;
planeBoxes.push({minX:rover.x-rx,maxX:rover.x+rx,minZ:rover.z-rz,maxZ:rover.z+rz,h:2.5});
const results=[];
for(const hz of [30,60,120,144]){
 const p=createPlane(),m=createFlightMission(p),phases=new Set();
 for(let i=0;i<hz*310&&m.status==='active';i++){
  phases.add(m.phase);const before={...p};stepPlane(p,flightPilot(p,m),1/hz,planeBoxes);stepFlightMission(m,p,before,1/hz);
 }
 assert.equal(m.status,'won',JSON.stringify({hz,p,m}));assert.equal(p.impacts,0);assert.equal(p.landings,1);assert.equal(m.route.index,5);
 assert.deepEqual([...phases],['takeoff','route','approach','landing','stop']);
 results.push({hz,time:+m.elapsed.toFixed(2),x:+p.x.toFixed(2),z:+p.z.toFixed(2),landings:p.landings,impacts:p.impacts});
}
console.log('PASS: complete flight mission using real controller from spawn through five gates, north approach, runway touchdown and stable stop; full app obstacles and rover; '+JSON.stringify(results));
