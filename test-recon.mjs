import assert from 'node:assert/strict';
import {RECON,RECON_TARGETS,createRecon,reconCondition,stepRecon} from './recon-rules.js';
import {createFlightMission,stepFlightMission,flightCourse} from './flight-mission.js';
import {createPlane} from './flight-rules.js';
const g=RECON_TARGETS[0],p={...createPlane(),...g,onGround:false,speed:34,verticalSpeed:0},tick=(r,s=p,dt=.1,scan=true,boxes=[])=>stepRecon(r,g,s,s,dt,{scan,boxes});
assert.equal(reconCondition(p,g),'ready');
for(const [change,reason] of [[{onGround:true},'airborne'],[{x:g.x+91},'range'],[{y:15},'altitude'],[{yaw:Math.PI},'heading'],[{roll:.51},'bank'],[{speed:51},'speed'],[{verticalSpeed:6.1},'vertical'],[{y:NaN},'airborne']]){
 const r=createRecon();tick(r);assert(r.progress>0);assert.equal(reconCondition({...p,...change},g),reason);tick(r,{...p,...change});assert.equal(r.progress,0);assert.equal(r.reason,reason);
}
const r=createRecon();for(let i=0;i<10;i++)tick(r);tick(r,p,.1,false);assert.equal(r.progress,0);assert.equal(r.reason,'hold');
const wall=[{minX:g.x-5,maxX:g.x+5,minZ:g.z-5,maxZ:g.z+5,h:20}];assert.equal(reconCondition(p,g,wall),'blocked');tick(r,p,.1,true,wall);assert.equal(r.progress,0);
for(const hz of [30,60,120,144]){const s=createRecon();for(let i=0;i<hz*1.5;i++)tick(s,p,1/hz);assert.equal(s.records.length,1);assert(Object.isFrozen(s.records[0]));for(let i=0;i<hz*2;i++)tick(s,p,1/hz);assert.equal(s.records.length,1);}
const m=createFlightMission(createPlane(),'recon');assert.equal(flightCourse(m).length,3);
const wrong={...p,...RECON_TARGETS[1]};stepFlightMission(m,wrong,wrong,.1,{scan:true});assert.equal(m.route.index,0,'out-of-order landmark cannot count');
for(let i=0;i<3;i++){const s={...p,...RECON_TARGETS[i]};for(let k=0;k<16;k++)stepFlightMission(m,s,s,.1,{scan:true});}
assert.equal(m.phase,'approach');assert.equal(m.status,'active');assert.equal(m.recon.records.length,3,'all records still require return');
const freeze=JSON.stringify(m);stepFlightMission(m,p,p,1,{paused:true,scan:true});assert.equal(JSON.stringify(m),freeze);
const upload=createFlightMission(createPlane(),'recon');upload.phase='upload';upload.approached=true;upload.recon.records=m.recon.records.slice();upload.route.complete=true;upload.route.index=3;
const parked={...createPlane(),z:-280,landings:1};for(let i=0;i<40;i++)stepFlightMission(upload,parked,parked,.1);assert.equal(upload.status,'active','parking alone does not upload');
for(let i=0;i<10;i++)stepFlightMission(upload,parked,parked,.1,{scan:true});assert(upload.recon.uploadTime>.9);
const before=JSON.stringify(upload);stepFlightMission(upload,parked,parked,.1,{scan:true,paused:true});assert.equal(JSON.stringify(upload),before);
stepFlightMission(upload,parked,parked,.1);assert.equal(upload.recon.uploadTime,0,'release resets upload');
for(let i=0;i<20;i++)stepFlightMission(upload,parked,parked,.1,{scan:true});assert.equal(upload.status,'won');assert(upload.result.uploaded);assert.equal(upload.result.records.length,3);assert(Object.isFrozen(upload.result.records));
const final=JSON.stringify(upload);stepFlightMission(upload,parked,parked,.1,{scan:true});assert.equal(JSON.stringify(upload),final);
const timeout=createFlightMission(createPlane(),'recon');timeout.elapsed=299.95;stepFlightMission(timeout,parked,parked,.1,{scan:true});assert.equal(timeout.status,'lost');assert.equal(timeout.result.uploaded,false);
const fresh=createFlightMission(createPlane(),'recon');assert.equal(fresh.recon.records.length,0);assert.equal(fresh.recon.uploadTime,0);assert.equal(createFlightMission(createPlane()).type,'return');
console.log('PASS: recon altitude/range/heading/bank/speed/vertical/occlusion checks, continuous F hold, release/interruption reset, per-target deduplication, ordering, pause, no airborne victory, explicit parked upload, timeout and fresh retry');

const incomplete=createFlightMission(createPlane(),'recon');incomplete.phase='upload';stepFlightMission(incomplete,parked,parked,.1,{scan:true});assert.equal(incomplete.status,'lost');assert.equal(incomplete.result.uploaded,false);
