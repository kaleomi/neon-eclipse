import assert from 'node:assert/strict';
import {createNavalMission,stepNavalMission,navalSummary,cycleNavalTarget} from './naval-mission.js';
import {NAVAL_PROFILES,NAVAL_KEY,readNavalDifficulty,writeNavalDifficulty} from './naval-settings.js';
import {createYacht,stepYacht,yachtFree} from './maritime-rules.js';
import {CHASE_GATES,CHASE_EVAC,seaPath,pursuitInput} from './chase-rules.js';
const results=[];
for(const level of ['easy','normal','hard'])for(const hz of [30,60,144])for(const fire of [false,true]){
 const player=createYacht(),task=createNavalMission(player,level);let nav=[],repath=0,lastIndex=-1,maxWarn=0;
 for(let i=0;i<hz*211&&task.status==='active';i++){
  const dt=1/hz,goal=CHASE_GATES[task.index]||CHASE_EVAC;repath-=dt;if(repath<=0||lastIndex!==task.index){nav=seaPath(player,goal);repath=.6;lastIndex=task.index;}
  while(nav.length>1&&Math.hypot(player.x-nav[0].x,player.z-nav[0].z)<13)nav.shift();const from={...player};stepYacht(player,pursuitInput(player,nav[0]||goal,nav,32),dt);stepNavalMission(task,player,from,dt,{fire});
  const warnings=task.naval.members.filter(m=>m.combat.warning).length;maxWarn=Math.max(maxWarn,warnings);assert(warnings<=1,'never simultaneous enemy warnings/volleys');assert(task.naval.members.every(m=>yachtFree(m.enemy)));assert(yachtFree(player));assert(navalSummary(task).projectiles<=48);
 }
 assert.equal(task.status,'won',JSON.stringify({level,hz,fire,status:task.status,hull:task.hull,index:task.index}));
 const summary=navalSummary(task);assert.equal(task.naval.members.length,NAVAL_PROFILES[level].count);assert.equal(summary.projectiles,0);assert(task.naval.members.every(m=>m.combat.warning===null));results.push({level,hz,fire,time:+task.elapsed.toFixed(1),hull:+task.hull.toFixed(1),hits:summary.hits,sunk:summary.sunk,maxWarn});
}
{
 const player=createYacht(),task=createNavalMission(player,'hard');cycleNavalTarget(task);assert.equal(task.naval.selected,1);cycleNavalTarget(task);assert.equal(task.naval.selected,0);const snapshot=JSON.stringify(task);stepNavalMission(task,player,{...player},.25,{fire:true,paused:true});assert.equal(JSON.stringify(task),snapshot);
 task.naval.members[0].combat.enemySunk=true;task.naval.members[0].combat.enemyHull=0;Object.assign(task.naval.members[1].enemy,{x:player.x+50,z:player.z});stepNavalMission(task,player,{...player},.01);assert.equal(task.escaped,false,'one destroyed ship does not remove remaining threat');assert.equal(task.status,'active');cycleNavalTarget(task);assert.equal(task.naval.selected,1);
 task.naval.members[1].combat.enemySunk=true;task.naval.members[1].combat.enemyHull=0;stepNavalMission(task,player,{...player},.01);assert(task.escaped);assert.equal(task.status,'active','two kills do not skip checkpoints');task.index=3;Object.assign(player,CHASE_EVAC);stepNavalMission(task,player,{...player},.01);assert.equal(task.status,'won');
}
{
 const player={...createYacht(),x:350,z:0},task=createNavalMission(player,'normal');Object.assign(task.naval.members[0].enemy,{x:350,z:70,speed:0});Object.assign(task.naval.members[1].enemy,{x:420,z:0,speed:0});let shots=0;for(let i=0;i<120;i++){cycleNavalTarget(task);stepNavalMission(task,player,{...player},1/120,{fire:true});shots=navalSummary(task).shots;}assert.equal(shots,1,'target switching cannot bypass shared weapon cooldown');
 const before=JSON.stringify(task);stepNavalMission(task,player,{...player},0,{fire:true});assert.equal(JSON.stringify(task),before);
 task.elapsed=180;stepNavalMission(task,player,{...player},.01);assert.equal(task.status,'lost');assert.equal(navalSummary(task).projectiles,0);assert(task.naval.members.every(m=>m.combat.warning===null));
}
{
 const player=createYacht(),task=createNavalMission(player,'hard');let lastWarning=-1,quiet=10,minQuiet=100,switches=0;
 for(let i=0;i<120*90&&task.status==='active';i++){
  const from={...player};stepYacht(player,{},1/120);stepNavalMission(task,player,from,1/120);const warning=task.naval.members.find(m=>m.combat.warning)?.id??-1;
  if(warning===-1)quiet+=1/120;else if(lastWarning===-1){minQuiet=Math.min(minQuiet,quiet);quiet=0;switches++;}lastWarning=warning;
 }
 assert.equal(task.status,'lost');assert(switches>=2);assert(minQuiet>=.98,'hard mode retains a full quiet gap between volleys');assert.equal(task.contacts,0,'idle player is not held in a ramming loop');
}
{
 const data=new Map([['campaign','keep']]),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert.equal(readNavalDifficulty(store),'normal');for(const id of ['easy','normal','hard']){assert(writeNavalDifficulty(id,store));assert.equal(readNavalDifficulty(store),id);}assert.equal(data.get('campaign'),'keep');data.set(NAVAL_KEY,'bad');assert.equal(readNavalDifficulty(store),'normal');const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.equal(readNavalDifficulty(denied),'normal');assert.equal(writeNavalDifficulty('hard',denied),false);
 const task=createNavalMission(createYacht(),'normal');writeNavalDifficulty('hard',store);assert.equal(task.naval.profile.id,'normal','preference changes do not alter an existing mission');
}
console.log('PASS: 3 naval profiles, dual roles, full armed/evade routes, all-threat extraction, nonoverlapping volleys/quiet gaps, shared cooldown, pause/cleanup and isolated settings',JSON.stringify(results));
{
 const player={...createYacht(),x:350,z:0},task=createNavalMission(player,'normal');Object.assign(task.naval.members[0].enemy,{x:350,z:50,yaw:0});Object.assign(task.naval.members[1].enemy,{x:350,z:100,yaw:0});task.naval.selected=1;task.naval.manualTarget=true;
 for(let i=0;i<120&&task.naval.members[0].combat.enemyHull===100;i++)stepNavalMission(task,player,{...player},1/120,{fire:true});
 assert.equal(task.naval.members[0].combat.enemyHull,80,'nearer non-selected hull intercepts and takes the shell');assert.equal(task.naval.members[1].combat.enemyHull,100);assert.equal(navalSummary(task).hits,1);
 stepNavalMission(task,player,{...player},.01,{aboard:false});assert.equal(task.status,'lost');assert.equal(navalSummary(task).projectiles,0);assert(task.naval.members.every(m=>m.combat.warning===null));
}
console.log('PASS: cross-target hull interception/damage and abort cleans every ship');
