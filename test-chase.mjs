import assert from 'node:assert/strict';
import {CHASE,CHASE_GATES,CHASE_EVAC,createSeaChase,stepSeaChase,seaPath,clearWaterLine,pursuitInput,boatsTouch} from './chase-rules.js';
import {createYacht,stepYacht,yachtFree} from './maritime-rules.js';
for(const [a,b] of [[{x:350,z:-230},{x:540,z:-230}],[{x:285,z:230},{x:285,z:140}],[{x:450,z:260},{x:555,z:260}],[{x:355,z:275},{x:278,z:180}]]){
 const path=seaPath(a,b);assert(path.length);let from=a;for(const node of path){assert(clearWaterLine(from,node),'all navigation legs clear islands/dock');from=node;}
}
assert(seaPath({x:224,z:50},{x:330,z:50}).length,'close-shore valid boat can find an offshore departure route');
const runs=[];
for(const hz of [30,60,120,144]){
 const player=createYacht(),task=createSeaChase(player);let path=[],repath=0,oldIndex=-1,stuckTime=0,maxStuck=0;
 for(let frame=0;frame<hz*181&&task.status==='active';frame++){
  const dt=1/hz,goal=CHASE_GATES[task.index]||CHASE_EVAC;
  repath-=dt;if(repath<=0||oldIndex!==task.index){path=seaPath(player,goal);repath=.6;oldIndex=task.index;}
  while(path.length>1&&Math.hypot(player.x-path[0].x,player.z-path[0].z)<13)path.shift();
  const from={...player};stepYacht(player,pursuitInput(player,path[0]||goal,path,32),dt);const enemyDistance=task.enemy.distance;stepSeaChase(task,player,from,dt);
  assert(yachtFree(player)&&yachtFree(task.enemy),'neither boat enters island/coast/dock');
  if(task.elapsed>CHASE.headStart&&task.enemy.distance-enemyDistance<dt*.2)stuckTime+=dt;else stuckTime=0;maxStuck=Math.max(maxStuck,stuckTime);
 }
 assert.equal(task.status,'won',JSON.stringify({hz,status:task.status,reason:task.reason,index:task.index,player,enemy:task.enemy,escaped:task.escaped}));
 assert.equal(task.index,3);assert(task.escaped);assert(task.hull>0);assert(task.elapsed<150);assert(maxStuck<8,'pursuer avoids long stalls');
 runs.push({hz,time:+task.elapsed.toFixed(2),hull:task.hull,impacts:task.enemy.impacts,maxStuck});
}
// Pause, idle and terminal state are immutable; replays always start fresh.
const p=createYacht(),t=createSeaChase(p);let snap=JSON.stringify([p,t]);stepSeaChase(t,p,{...p},.2,{paused:true});assert.equal(JSON.stringify([p,t]),snap);
const timeout=createSeaChase(p);timeout.elapsed=CHASE.timeLimit-.05;stepSeaChase(timeout,p,{...p},.1);assert.equal(timeout.status,'lost');
snap=JSON.stringify(timeout);stepSeaChase(timeout,p,{...p},.1);assert.equal(JSON.stringify(timeout),snap);
const abandoned=createSeaChase(p);stepSeaChase(abandoned,p,{...p},.1,{aboard:false});assert.equal(abandoned.status,'lost');
const broken=createSeaChase(p);broken.hull=5;p.impacts=1;stepSeaChase(broken,p,{...p,speed:32},.01);assert.equal(broken.status,'lost');
const retry=createSeaChase(createYacht());assert.equal(retry.hull,100);assert.equal(retry.index,0);assert.equal(retry.elapsed,0);assert.equal(retry.contacts,0);
// Collision damage has a cooldown and blocks passing through the enemy hull.
const contactPlayer={...createYacht(),x:350,z:200,speed:20},contact=createSeaChase(contactPlayer);Object.assign(contact.enemy,{x:350,z:196,speed:20});assert(boatsTouch(contactPlayer,contact.enemy));
stepSeaChase(contact,contactPlayer,{...contactPlayer,z:202},.01);const health=contact.hull;assert(health<100);assert.equal(contactPlayer.speed,0);stepSeaChase(contact,contactPlayer,{...contactPlayer},.01);assert.equal(contact.hull,health);
// No early extraction; pursuit reacquires nearby player after a successful escape.
const evac={...createYacht(),...CHASE_EVAC},early=createSeaChase(evac);early.escaped=true;stepSeaChase(early,evac,{...evac},.01);assert.equal(early.status,'active');
Object.assign(early.enemy,{x:evac.x+30,z:evac.z});stepSeaChase(early,evac,{...evac},.01);assert.equal(early.escaped,false);
console.log('PASS: full keyboard-equivalent chase routes, real moving pursuit AI, water-safe navigation, ordered gates/escape/extraction, pause, collision damage/cooldown, deadline, abort and fresh retry',JSON.stringify(runs));
