import assert from 'node:assert/strict';
import {createPlane,stepPlane} from './flight-rules.js';
import {createFlightMission,stepFlightMission} from './flight-mission.js';
import {flightPilot} from './test-flight-pilot.mjs';
import {planeBoxes} from './test-flight-mission-route.mjs';
const results=[];
for(const hz of [30,60,120,144]){
 const p=createPlane(),m=createFlightMission(p,'recon'),phases=new Set();
 for(let i=0;i<hz*310&&m.status==='active';i++){
  phases.add(m.phase);const before={...p},input=flightPilot(p,m);if(m.phase==='upload')Object.assign(input,{throttle:-1,elevator:0,roll:0,brake:true});
  stepPlane(p,input,1/hz,planeBoxes);stepFlightMission(m,p,before,1/hz,{scan:true,boxes:planeBoxes});
 }
 assert.equal(m.status,'won',JSON.stringify({hz,p,m}));assert.equal(p.impacts,0);assert.equal(p.landings,1);assert.equal(m.recon.records.length,3);assert(m.result.uploaded);assert(phases.has('upload'));
 results.push({hz,time:+m.elapsed.toFixed(2),x:p.x,z:p.z,scans:m.recon.records.length});
}
console.log('PASS: real physics recon route, three stable scans, return, landing, stop and upload; no position injection; '+JSON.stringify(results));
