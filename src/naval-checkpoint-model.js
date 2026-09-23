// Checkpoints for 先遣队第 2 关「南湾突围」. Pure model: what a safe node is, how to validate one and how to
// rebuild a mission from it. Only approved templates are restored; saved coordinates or velocities are never read.
// Storage goes through createCheckpointStore (joint-checkpoint-store.js) with its own database name.
import {createNavalMission} from './naval-mission.js';
import {NAVAL_PROFILES,normalizeNaval} from './naval-settings.js';
import {createYacht} from './maritime-rules.js';
import {CHASE_GATES} from './chase-rules.js';
import {createCheckpointStore} from './joint-checkpoint-store.js';
export const NAVAL_CHECKPOINT_DB='neon-eclipse.naval-checkpoint.v1';
export const NAVAL_CHECKPOINT_RULE='naval-v1';
export const NAVAL_CHECKPOINT_CHANNEL='neon-eclipse.naval-checkpoint.events';
// One safe node per passed gate: the yacht is re-seated just past the gate, heading for the next one; the pursuer is
// re-seated ~145 m astern with line of sight and the interceptor ~150 m off the beam. Enemies come back fresh.
export const NAVAL_CHECKPOINT_STAGES=Object.freeze({
 'gate-1':Object.freeze({index:1,label:'已过北上水道 · 从第 1 检查点继续',yacht:{x:334,z:-86,yaw:.59},pursuer:{x:253,z:35,yaw:.59},interceptor:{x:467,z:-15,yaw:-1.24}}),
 'gate-2':Object.freeze({index:2,label:'已绕过北岛 · 从第 2 检查点继续',yacht:{x:526,z:-345,yaw:3.1},pursuer:{x:520,z:-490,yaw:3.1},interceptor:{x:377,z:-323,yaw:1.26}}),
 'gate-3':Object.freeze({index:3,label:'已完成外海折返 · 从第 3 检查点继续',yacht:{x:531,z:91,yaw:-2.56},pursuer:{x:520,z:-40,yaw:3},interceptor:{x:398,z:21,yaw:1.89}})
});
const stageForIndex=index=>Object.keys(NAVAL_CHECKPOINT_STAGES).find(k=>NAVAL_CHECKPOINT_STAGES[k].index===index)||null;
let runSerial=0;
export function newNavalRunId(){return globalThis.crypto?.randomUUID?.()||`naval-${Date.now()}-${++runSerial}-${Math.random().toString(36).slice(2).padEnd(10,'0')}`;}
// Wraps createNavalMission with run identity; naval-mission.js itself stays untouched.
export function createNavalRun(player,difficulty='normal',runId=newNavalRunId()){const task=createNavalMission(player,difficulty);task.runId=runId;task.recovered=false;return task;}
export function validNavalCheckpoint(c){
 return !!c&&c.schema===1&&c.rule===NAVAL_CHECKPOINT_RULE&&typeof c.runId==='string'&&/^[a-zA-Z0-9-]{16,96}$/.test(c.runId)&&Object.hasOwn(NAVAL_CHECKPOINT_STAGES,c.stage)&&Object.hasOwn(NAVAL_PROFILES,c.difficulty)&&Number.isSafeInteger(c.elapsedMs)&&c.elapsedMs>=0&&c.elapsedMs<NAVAL_PROFILES[c.difficulty].timeLimit*1000&&Number.isSafeInteger(c.hull)&&c.hull>=1&&c.hull<=100&&Number.isSafeInteger(c.savedAt)&&c.savedAt>=0&&c.savedAt<=8640000000000000&&typeof c.recovered==='boolean';
}
export function navalCheckpointFromMission(task,now=Date.now()){
 if(!task||task.status!=='active'||!task.naval||typeof task.runId!=='string'||!(task.hull>0))return null;
 const stage=stageForIndex(task.index);if(!stage||task.index>=CHASE_GATES.length+1)return null;
 const c={schema:1,rule:NAVAL_CHECKPOINT_RULE,runId:task.runId,stage,difficulty:task.naval.profile.id,elapsedMs:Math.round(task.elapsed*1000),hull:Math.max(1,Math.min(100,Math.ceil(task.hull))),savedAt:now,recovered:task.recovered===true};
 return validNavalCheckpoint(c)?Object.freeze(c):null;
}
export function canonicalNavalCheckpoint(c){return c===null?null:{schema:c.schema,rule:c.rule,runId:c.runId,stage:c.stage,difficulty:c.difficulty,elapsedMs:c.elapsedMs,hull:c.hull,savedAt:c.savedAt,recovered:c.recovered};}
export const navalCheckpointLabel=c=>NAVAL_CHECKPOINT_STAGES[c.stage].label+' · '+NAVAL_PROFILES[normalizeNaval(c.difficulty)].label+' · 船体 '+c.hull+'%';
// Rebuild the mission: fresh enemies on templates, saved gate index / difficulty / hull / elapsed, new run id.
export function restoreNavalCheckpoint(c){
 if(!validNavalCheckpoint(c))throw Error('Invalid naval checkpoint');
 const t=NAVAL_CHECKPOINT_STAGES[c.stage],profile=NAVAL_PROFILES[c.difficulty],yacht={...createYacht(),...t.yacht};
 const task=createNavalRun(yacht,c.difficulty);
 task.index=t.index;task.elapsed=c.elapsedMs/1000;task.remaining=Math.max(0,profile.timeLimit-task.elapsed);task.hull=c.hull;task.recovered=true;
 task.naval.members.forEach((ship,i)=>{Object.assign(ship.enemy,i===0?t.pursuer:t.interceptor,{speed:0,distance:0,impacts:0});ship.index=t.index;ship.elapsed=task.elapsed;ship.hull=c.hull;ship.ai.lastKnown={x:yacht.x,z:yacht.z};ship.ai.headStart=task.elapsed+profile.headStart;ship.ai.path=[];ship.ai.repath=0;});
 return {task,yacht,player:{x:yacht.x,z:yacht.z,yaw:yacht.yaw}};
}
export function createNavalCheckpointStore(factory){return createCheckpointStore({dbName:NAVAL_CHECKPOINT_DB,valid:validNavalCheckpoint,canonical:canonicalNavalCheckpoint},factory,arguments.length===0);}
