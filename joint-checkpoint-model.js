import {createJointMission,JOINT_STAGES} from './joint-mission.js';
import {createRover} from './vehicle-rules.js';
import {createYacht} from './maritime-rules.js';
import {createPlane} from './flight-rules.js';
export const CHECKPOINT_STAGES=Object.freeze({drive:'设备已领取 · 从车库继续',airfield:'海上交付已完成 · 从码头继续','board-plane':'已抵达机场 · 从登机前继续'});
export const CHECKPOINT_RULE='joint-v1';
export function validCheckpoint(c){return !!c&&c.schema===1&&c.rule===CHECKPOINT_RULE&&typeof c.runId==='string'&&/^[a-zA-Z0-9-]{16,96}$/.test(c.runId)&&Object.hasOwn(CHECKPOINT_STAGES,c.stage)&&Number.isSafeInteger(c.elapsedMs)&&c.elapsedMs>=0&&c.elapsedMs<=604800000&&Number.isSafeInteger(c.savedAt)&&c.savedAt>=0&&c.savedAt<=8640000000000000&&typeof c.recovered==='boolean';}
export function checkpointFromMission(m,now=Date.now()){
 const index=JOINT_STAGES.indexOf(m.stage);if(m.status!=='active'||!Object.hasOwn(CHECKPOINT_STAGES,m.stage)||!Array.isArray(m.completed)||m.completed.length!==index||!m.completed.every((s,i)=>s===JOINT_STAGES[i])||m.flightId!==null)return null;
 const c={schema:1,rule:CHECKPOINT_RULE,runId:m.runId,stage:m.stage,elapsedMs:Math.round(m.elapsed*1000),savedAt:now,recovered:m.recovered};return validCheckpoint(c)?Object.freeze(c):null;
}
export function canonicalCheckpoint(c){return c===null?null:{schema:c.schema,rule:c.rule,runId:c.runId,stage:c.stage,elapsedMs:c.elapsedMs,savedAt:c.savedAt,recovered:c.recovered};}
export function restoreJointCheckpoint(c){
 if(!validCheckpoint(c))throw Error('Invalid joint checkpoint');const mission=createJointMission(true),rover=createRover(),yacht=createYacht(),plane=createPlane();
 Object.assign(mission,{stage:c.stage,elapsed:c.elapsedMs/1000,completed:JOINT_STAGES.slice(0,JOINT_STAGES.indexOf(c.stage)),recovered:true});
 let player={x:-108.3,z:106.3,yaw:Math.atan2(3.3,1.3)};
 if(c.stage==='airfield'){Object.assign(rover,{x:207,z:195,yaw:Math.PI/2});player={x:271,z:180,yaw:-Math.PI/2};}
 if(c.stage==='board-plane'){Object.assign(rover,{x:-310,z:245,yaw:0});player={x:-316,z:249,yaw:Math.atan2(16,29)};}
 return {mission,rover,yacht,plane,player}; // Approved templates only, never deserialize saved coordinates or velocities.
}
