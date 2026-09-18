import assert from 'node:assert/strict';
import {NAVAL_CHECKPOINT_STAGES,NAVAL_CHECKPOINT_DB,createNavalRun,navalCheckpointFromMission,restoreNavalCheckpoint,validNavalCheckpoint,canonicalNavalCheckpoint,navalCheckpointLabel,createNavalCheckpointStore} from './naval-checkpoint-model.js';
import {createJointCheckpointStore,JOINT_CHECKPOINT_DB} from './joint-checkpoint-store.js';
import {stepNavalMission,navalSummary} from './naval-mission.js';
import {NAVAL_PROFILES} from './naval-settings.js';
import {createYacht,stepYacht,yachtFree} from './maritime-rules.js';
import {CHASE_GATES,CHASE_EVAC,seaPath,pursuitInput,clearWaterLine} from './chase-rules.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Templates: every seat is open water, the pursuer sees the yacht, nothing overlaps, headings point along the route.
for(const [stage,t] of Object.entries(NAVAL_CHECKPOINT_STAGES)){
 for(const seat of [t.yacht,t.pursuer,t.interceptor])assert(yachtFree({...createYacht(),...seat}),stage+' seat on water');
 assert(clearWaterLine(t.pursuer,t.yacht,1),stage+' pursuer has line of sight');assert(dist(t.pursuer,t.yacht)>120&&dist(t.interceptor,t.yacht)>120,stage+' enemies start outside gun range');assert(dist(t.pursuer,t.interceptor)>60);
 const next=CHASE_GATES[t.index]||CHASE_EVAC;assert(dist(t.yacht,next)<dist(CHASE_GATES[t.index-1],next),stage+' yacht already past its gate');
}
// Fresh run has identity; idle mission (no gate) yields no checkpoint; each passed gate yields exactly one node.
{
 const player=createYacht(),task=createNavalRun(player,'hard');assert.match(task.runId,/^[a-zA-Z0-9-]{16,96}$/);assert.equal(task.recovered,false);assert.equal(navalCheckpointFromMission(task),null,'start line is not a safe node');
 for(let i=1;i<=3;i++){task.index=i;task.hull=57.2;task.elapsed=42.5;const c=navalCheckpointFromMission(task,1700000000000);assert(c&&validNavalCheckpoint(c)&&Object.isFrozen(c));assert.equal(c.stage,'gate-'+i);assert.equal(c.difficulty,'hard');assert.equal(c.hull,58);assert.equal(c.elapsedMs,42500);assert.equal(c.recovered,false);assert.match(navalCheckpointLabel(c),/困难 · 船体 58%/);}
 task.index=4;assert.equal(navalCheckpointFromMission(task),null,'past the last gate there is no node');task.index=2;task.status='lost';assert.equal(navalCheckpointFromMission(task),null);task.status='active';task.hull=0;assert.equal(navalCheckpointFromMission(task),null,'a dead hull is never saved');
 task.hull=100;task.elapsed=NAVAL_PROFILES.hard.timeLimit;assert.equal(navalCheckpointFromMission(task),null,'expired timer is not a node');
}
// Validation rejects tampered fields; restore never reads coordinates.
{
 const task=createNavalRun(createYacht(),'normal');task.index=2;task.hull=80;task.elapsed=60;const c=navalCheckpointFromMission(task,1700000000000);
 for(const patch of [{schema:2},{rule:'naval-v2'},{stage:'gate-4'},{stage:'drive'},{difficulty:'brutal'},{elapsedMs:-1},{elapsedMs:180000},{hull:0},{hull:101},{hull:50.5},{savedAt:NaN},{recovered:'true'},{runId:'short'}]){assert(!validNavalCheckpoint({...c,...patch}),JSON.stringify(patch));assert.throws(()=>restoreNavalCheckpoint({...c,...patch}));}
 assert.deepEqual(canonicalNavalCheckpoint({...c,x:1,velocity:9}),canonicalNavalCheckpoint(c));assert.equal(canonicalNavalCheckpoint(null),null);
 const r=restoreNavalCheckpoint({...c,x:99999,z:99999,yaw:9,hullBonus:999}),r2=restoreNavalCheckpoint(c);
 assert.notEqual(r.task.runId,task.runId);assert.notEqual(r.task.runId,r2.task.runId);assert.equal(r.task.recovered,true);assert.equal(r.task.status,'active');assert.equal(r.task.index,2);assert.equal(r.task.hull,80);assert.equal(r.task.elapsed,60);assert.equal(r.task.remaining,120);assert.equal(r.task.naval.profile.id,'normal');assert.equal(r.task.naval.members.length,2);
 assert.deepEqual({x:r.yacht.x,z:r.yacht.z,yaw:r.yacht.yaw},NAVAL_CHECKPOINT_STAGES['gate-2'].yacht);assert.equal(r.yacht.speed,0);assert.equal(r.yacht.impacts,0);assert(yachtFree(r.yacht));assert.deepEqual({x:r.player.x,z:r.player.z},{x:r.yacht.x,z:r.yacht.z});
 for(const ship of r.task.naval.members){assert.equal(ship.combat.enemyHull,100,'enemies come back fresh');assert.equal(ship.enemy.speed,0);assert(yachtFree(ship.enemy));assert.equal(ship.combat.warning,null);assert.equal(ship.combat.projectiles.length,0);}
 // Paused / zero dt leaves the restored mission frozen; a restored easy run has one enemy.
 const frozen=JSON.stringify(r.task);stepNavalMission(r.task,r.yacht,{...r.yacht},.1,{paused:true});stepNavalMission(r.task,r.yacht,{...r.yacht},0);assert.equal(JSON.stringify(r.task),frozen);
 const easy=restoreNavalCheckpoint({...c,difficulty:'easy',elapsedMs:1000});assert.equal(easy.task.naval.members.length,1);assert.equal(easy.task.remaining,209);
 // Grace period: enemies do not close in during the first head-start seconds after a restore.
 const before=r.task.naval.members.map(m=>({...m.enemy}));for(let i=0;i<60;i++)stepNavalMission(r.task,r.yacht,{...r.yacht},1/60);r.task.naval.members.forEach((m,i)=>assert(dist(m.enemy,before[i])<1,'enemy '+i+' holds during head start'));
}
// Restored runs are playable to a win from every node at 30/60/120 Hz with the same autopilot as test-naval.mjs.
const results=[];
for(const stage of Object.keys(NAVAL_CHECKPOINT_STAGES))for(const hz of [30,60,120]){
 const task0=createNavalRun(createYacht(),'normal');task0.index=NAVAL_CHECKPOINT_STAGES[stage].index;task0.hull=70;task0.elapsed=30;
 const {task,yacht:player}=restoreNavalCheckpoint(navalCheckpointFromMission(task0));let nav=[],repath=0,lastIndex=-1;
 for(let i=0;i<hz*160&&task.status==='active';i++){
  const dt=1/hz,goal=CHASE_GATES[task.index]||CHASE_EVAC;repath-=dt;if(repath<=0||lastIndex!==task.index){nav=seaPath(player,goal);repath=.6;lastIndex=task.index;}
  while(nav.length>1&&dist(player,nav[0])<13)nav.shift();const from={...player};stepYacht(player,pursuitInput(player,nav[0]||goal,nav,32),dt);stepNavalMission(task,player,from,dt,{fire:true});
  assert(yachtFree(player));
 }
 assert.equal(task.status,'won',JSON.stringify({stage,hz,status:task.status,hull:task.hull,index:task.index,reason:task.reason}));assert.equal(task.recovered,true,'win from a node stays flagged as recovered');assert(task.elapsed>30);
 results.push({stage,hz,time:+task.elapsed.toFixed(1),hull:Math.ceil(task.hull),sunk:navalSummary(task).total-navalSummary(task).alive});
}
// Store isolation: the naval store has its own database name and rejects joint checkpoints (and vice versa) at the validator.
assert.notEqual(NAVAL_CHECKPOINT_DB,JOINT_CHECKPOINT_DB);
assert.deepEqual(await createNavalCheckpointStore(null).read(),{ok:false,code:'unavailable'});assert.deepEqual(await createNavalCheckpointStore({open(){throw new DOMException('Denied','SecurityError');}}).read(),{ok:false,code:'denied'});
{
 const task=createNavalRun(createYacht(),'easy');task.index=1;const c=navalCheckpointFromMission(task);
 assert.equal((await createJointCheckpointStore(null).write({operationId:c.runId+':'+c.stage,checkpoint:c},0)).code,'corrupt','joint store refuses naval nodes');
 assert.equal((await createNavalCheckpointStore(null).write({operationId:'joint-run-0000000000:drive',checkpoint:{schema:1,rule:'joint-v1',runId:'joint-run-0000000000',stage:'drive',elapsedMs:1,savedAt:1,recovered:false}},0)).code,'corrupt','naval store refuses joint nodes');
}
console.log('PASS: naval checkpoint templates on open water with sight lines, one node per passed gate, strict validation, template-only restore with fresh enemies and head start, restored runs won from all 3 nodes at 30/60/120 Hz, store isolation',JSON.stringify(results));
