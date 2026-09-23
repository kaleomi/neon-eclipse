import assert from 'node:assert/strict';
import {SEA_GUN,stepSeaCombat,gunTargetStatus,sweptBoatHit,clearSeaCombat} from '../src/sea-combat.js';
import {createSeaChase,stepSeaChase,seaPath,pursuitInput,CHASE_GATES,CHASE_EVAC,CHASE} from '../src/chase-rules.js';
import {createYacht,stepYacht} from '../src/maritime-rules.js';
function setup(){const player={...createYacht(),x:350,z:0},task=createSeaChase(player,{combat:true});task.elapsed=4;Object.assign(task.enemy,{x:350,z:70,yaw:0,speed:0});task.combat.enemyCooldown=0;return {player,task};}
{
 const {player,task}=setup();stepSeaCombat(task,player,{...player},{...task.enemy},1/120,{fire:true});assert.equal(task.combat.shots,1);assert.equal(task.combat.enemyHull,100,'player shot has travel time');assert.equal(task.combat.enemyShots,0,'warning does not deal immediate damage');assert(task.combat.warning);const snapshot=JSON.stringify(task);stepSeaCombat(task,player,{...player},{...task.enemy},.25,{fire:true,paused:true});assert.equal(JSON.stringify(task),snapshot);
}
for(const hz of [30,60,120,144]){
 const {player,task}=setup();
 for(let i=0;i<hz*9&&!task.combat.enemySunk;i++)stepSeaCombat(task,player,{...player},{...task.enemy},1/hz,{fire:true});
 assert(task.combat.enemySunk);assert.equal(task.combat.hits,5);assert.equal(task.combat.shots,5);assert.equal(task.combat.enemyHull,0);assert.equal(task.combat.projectiles.length,0);assert.equal(task.combat.warning,null);assert(task.hull>=76,'one visible volley, no unavoidable continuous damage');
}
{
 const {player,task}=setup();for(let i=0;i<120*3.5;i++)stepSeaCombat(task,player,{...player},{...task.enemy},1/120);
 assert.equal(task.combat.enemyShots,3);assert.equal(task.combat.enemyHits,3);assert.equal(task.hull,76,'stationary player takes exactly one 3-round volley');
}
{
 const {player,task}=setup();player.yaw=Math.PI/2;stepSeaCombat(task,player,{...player},{...task.enemy},1/120);const locked={...task.combat.warning.target};
 for(let i=0;i<120*3.5;i++){const from={...player};stepYacht(player,{throttle:1},1/120);stepSeaCombat(task,player,from,{...task.enemy},1/120);if(task.combat.warning)assert.deepEqual(task.combat.warning.target,locked,'aim point never follows after warning');}
 assert.equal(task.combat.enemyShots,3);assert.equal(task.combat.enemyHits,0,'actual yacht acceleration dodges fixed-target volley');assert.equal(task.hull,100);
}
{
 const {player,task}=setup();task.combat.warning={target:{x:350,z:0},remaining:1,shotsLeft:3,phase:'aim'};task.escaped=true;stepSeaCombat(task,player,{...player},{...task.enemy},.01);assert.equal(task.combat.warning,null,'escape cancels new enemy fire');
 Object.assign(task.enemy,{x:350,z:10});assert.equal(gunTargetStatus(player,task.enemy,task.combat),'close');stepSeaCombat(task,player,{...player},{...task.enemy},.1,{fire:true});assert.equal(task.combat.shots,0);
}
{
 const {player,task}=setup();Object.assign(player,{x:380,z:-230});Object.assign(task.enemy,{x:495,z:-230});assert.equal(gunTargetStatus(player,task.enemy,task.combat),'blocked');
 task.combat.projectiles.push({id:1,owner:'player',x:398,z:-230,vx:90,vz:0,life:3,travel:0});stepSeaCombat(task,player,{...player},{...task.enemy},.25);assert.equal(task.combat.projectiles.length,0);assert.equal(task.combat.enemyHull,100);assert.equal(task.combat.blocked,1,'island intercepts shell before enemy');assert.equal(task.combat.warning,null);
}
assert(sweptBoatHit({x:350,z:-10},{x:350,z:10},{x:340,z:0,yaw:0},{x:360,z:0,yaw:0})!==null,'fast moving hull and shell crossing are detected');
{
 const {player,task}=setup();task.combat.enemySunk=true;task.combat.enemyHull=0;stepSeaChase(task,player,{...player},.01);assert(task.escaped);assert.equal(task.status,'active','kill is not automatic mission victory');
 Object.assign(player,CHASE_EVAC);task.index=3;stepSeaChase(task,player,{...player},.01);assert.equal(task.status,'won');assert.equal(task.combat.projectiles.length,0);
}
{
 const {player,task}=setup();task.hull=1;task.combat.projectiles.push({id:1,owner:'enemy',x:350,z:6,vx:0,vz:-65,life:3,travel:0});stepSeaChase(task,player,{...player},.1);assert.equal(task.status,'lost');assert.equal(task.combat.projectiles.length,0);assert.equal(task.combat.warning,null);
 const again=createSeaChase(createYacht(),{combat:true});assert.equal(again.combat.enemyHull,100);assert.equal(again.combat.shots,0);assert.equal(again.combat.projectiles.length,0);
}
const runs=[];
for(const fire of [false,true])for(const hz of [30,60,120,144]){
 const player=createYacht(),task=createSeaChase(player,{combat:true});let nav=[],repath=0,lastIndex=-1;
 for(let i=0;i<hz*181&&task.status==='active';i++){
  const dt=1/hz,goal=CHASE_GATES[task.index]||CHASE_EVAC;repath-=dt;if(repath<=0||lastIndex!==task.index){nav=seaPath(player,goal);repath=.6;lastIndex=task.index;}
  while(nav.length>1&&Math.hypot(player.x-nav[0].x,player.z-nav[0].z)<13)nav.shift();const from={...player};stepYacht(player,pursuitInput(player,nav[0]||goal,nav,32),dt);stepSeaChase(task,player,from,dt,{fire});assert(task.combat.projectiles.length<=SEA_GUN.maxProjectiles);assert(task.combat.effects.length<=16);
 }
 assert.equal(task.status,'won','armed mission still completable with or without firing');assert(task.hull>0);runs.push({hz,fire,time:+task.elapsed.toFixed(2),hull:task.hull,hits:task.combat.hits,sunk:task.combat.enemySunk});
}
{
 const player=createYacht(),task=createSeaChase(player);const before=JSON.stringify(task.combat);stepSeaCombat(task,player,{...player},{...task.enemy},.1,{fire:true});assert.equal(JSON.stringify(task.combat),before,'disabled weapon compatibility');
 const {task:t}=setup();t.combat.warning={};t.combat.projectiles=[{}];clearSeaCombat(t.combat);assert.equal(t.combat.projectiles.length,0);assert.equal(t.combat.warning,null);
}
console.log('PASS: delayed shells, fixed visible warning, real yacht dodge, damage/cooldown, blocked/crossing shots, destruction, no instant victory, death/reset cleanup and complete armed/evade-only routes',JSON.stringify(runs));
{
 const player=createYacht(),task=createSeaChase(player,{combat:true});
 for(let i=0;i<120*65&&task.status==='active';i++){const from={...player};stepYacht(player,{},1/120);stepSeaChase(task,player,from,1/120);}
 assert.equal(task.status,'lost');assert(task.combat.enemyHits>=13,'idle full mission player loses to actual enemy rounds');assert.equal(task.contacts,0,'armed AI standoff prevents continuous point-blank ramming');
 assert.equal(task.combat.projectiles.length,0);assert.equal(task.combat.warning,null);
}
console.log('PASS: integrated armed AI uses standoff; idle loss is projectile damage, not repeated ramming');
