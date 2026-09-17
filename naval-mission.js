import {createSeaChase,stepPursuer,boatsTouch,clearWaterLine,CHASE_GATES,CHASE_EVAC,CHASE} from './chase-rules.js';
import {NAVAL_PROFILES,normalizeNaval} from './naval-settings.js';
import {stepSeaCombat,clearSeaCombat,gunTargetStatus,waterImpact,SEA_GUN} from './sea-combat.js';
import {clamp,routeStep} from './maritime-rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createNavalMission(player,difficulty='normal'){
 const task=createSeaChase(player,{combat:true}),profile=NAVAL_PROFILES[normalizeNaval(difficulty)],members=[{...task,id:0,role:'pursuer',label:'追击艇'}];
 if(profile.count>1){const second=createSeaChase(player,{combat:true});Object.assign(second.enemy,{x:485,z:-60,yaw:-Math.PI/2});members.push({...second,id:1,role:'interceptor',label:'拦截艇'});}
 members.forEach((ship,i)=>{Object.assign(ship.ai,{role:ship.role,maxSpeed:i?profile.interceptSpeed:profile.speed,headStart:profile.headStart});ship.combat.tuning=profile;ship.combat.enemyCooldown=4+i*2;});
 task.remaining=profile.timeLimit;task.naval={profile,members,selected:0,manualTarget:false,weaponCooldown:0,fireGate:0,nextShooter:0,volleys:0};return task;
}
export function aliveNaval(task){return task.naval.members.filter(ship=>!ship.combat.enemySunk);}
export function selectedNavalTarget(task){return task.naval.members[task.naval.selected];}
export function cycleNavalTarget(task){const n=task.naval;if(!n||task.status!=='active')return;const live=aliveNaval(task);if(!live.length)return;const at=live.findIndex(ship=>ship.id===n.selected);n.selected=live[(at+1)%live.length].id;n.manualTarget=true;}
export function navalSummary(task){
 const n=task.naval,members=n.members,alive=aliveNaval(task),target=selectedNavalTarget(task);
 return {target,alive:alive.length,total:members.length,sunk:alive.length===0,shots:members.reduce((sum,m)=>sum+m.combat.shots,0),hits:members.reduce((sum,m)=>sum+m.combat.hits,0),enemyShots:members.reduce((sum,m)=>sum+m.combat.enemyShots,0),enemyHits:members.reduce((sum,m)=>sum+m.combat.enemyHits,0),projectiles:members.reduce((sum,m)=>sum+m.combat.projectiles.length,0),warning:members.find(m=>m.combat.warning),hitFlash:Math.max(...members.map(m=>m.combat.hitFlash)),playerFlash:Math.max(...members.map(m=>m.combat.playerFlash))};
}
function endTask(task,status,reason){task.status=status;task.reason=reason;for(const ship of task.naval.members){ship.status=status;clearSeaCombat(ship.combat);}}
export function stepNavalMission(task,player,from,dt,{fire=false,paused=false,aboard=true}={}){
 if(paused||task.status!=='active'||!Number.isFinite(dt)||dt<=0)return;
 const h=Math.min(dt,.25),n=task.naval,p=n.profile,members=n.members;task.elapsed+=h;task.remaining=Math.max(0,p.timeLimit-task.elapsed);task.contactCooldown=Math.max(0,task.contactCooldown-h);n.weaponCooldown=Math.max(0,n.weaponCooldown-h);n.fireGate=Math.max(0,n.fireGate-h);
 if(!aboard){endTask(task,'lost','已离开任务游艇');return;}
 const before=members.map(ship=>({...ship.enemy}));
 for(const ship of members){ship.elapsed=task.elapsed;ship.index=task.index;ship.status='active';ship.combat.provoked=false;
  // The interceptor knows the route while pursuit is active; after losing the player it searches the last known position instead.
  if(ship.role==='interceptor'&&!ship.escaped&&distance(ship.enemy,player)>180)ship.ai.lastKnown={...(CHASE_GATES[task.index]||CHASE_EVAC)};
  stepPursuer(ship,player,h);
 }
 for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)if(!members[i].combat.enemySunk&&!members[j].combat.enemySunk&&boatsTouch(members[i].enemy,members[j].enemy)){
  for(const k of [i,j]){Object.assign(members[k].enemy,{...before[k],speed:0});members[k].ai.reverse=.8;members[k].ai.repath=0;}
 }
 if(player.impacts>task.lastImpacts){task.hull=Math.max(0,task.hull-clamp(8+Math.abs(from.speed)*.8,10,34)*p.collision);task.lastImpacts=player.impacts;}
 for(let i=0;i<members.length;i++){const ship=members[i];if(ship.combat.enemySunk||!boatsTouch(player,ship.enemy))continue;
  if(task.contactCooldown===0){task.hull=Math.max(0,task.hull-clamp(12+(Math.abs(from.speed)+Math.abs(before[i].speed))*.45,12,34)*p.collision);task.contacts++;task.contactCooldown=1.5;}
  Object.assign(player,{x:from.x,z:from.z,yaw:from.yaw,distance:from.distance,speed:0});Object.assign(ship.enemy,{...before[i],speed:0});ship.ai.reverse=1.3;ship.ai.repath=0;
 }
 const live=aliveNaval(task),current=selectedNavalTarget(task);
 if(!current||current.combat.enemySunk||!n.manualTarget&&gunTargetStatus(player,current.enemy,current.combat)!=='ready'){
  if(current?.combat.enemySunk)n.manualTarget=false;
  const ready=live.filter(ship=>gunTargetStatus(player,ship.enemy,ship.combat)==='ready').sort((a,b)=>distance(player,a.enemy)-distance(player,b.enemy));if(ready.length)n.selected=ready[0].id;else if(current?.combat.enemySunk&&live.length)n.selected=live[0].id;
 }
 const activeWarning=members.find(ship=>ship.combat.warning);let permitted=-1;
 if(!activeWarning&&n.fireGate===0){for(let offset=0;offset<members.length;offset++){const ship=members[(n.nextShooter+offset)%members.length],range=distance(player,ship.enemy);if(!ship.combat.enemySunk&&!ship.escaped&&ship.combat.enemyCooldown<=h&&range>=SEA_GUN.enemyMinRange&&range<=SEA_GUN.enemyRange&&waterImpact(ship.enemy,player)===null){permitted=ship.id;break;}}}
 for(const ship of members){
  const hadWarning=!!ship.combat.warning,oldShots=ship.combat.shots;ship.hull=task.hull;ship.combat.playerCooldown=n.weaponCooldown+h;
  stepSeaCombat(ship,player,from,before[ship.id],h,{fire:fire&&ship.id===n.selected&&n.weaponCooldown===0,enemyMayStart:ship.id===permitted,targets:members.map(m=>({task:m,previous:before[m.id]}))});
  task.hull=ship.hull;if(ship.combat.shots>oldShots)n.weaponCooldown=SEA_GUN.playerCooldown;
  if(hadWarning&&!ship.combat.warning){n.fireGate=p.fireGap;n.nextShooter=(ship.id+1)%members.length;n.volleys++;}
 }
 for(const ship of members){
  if(ship.combat.enemyHull<=0&&!ship.combat.enemySunk){ship.combat.enemySunk=true;ship.enemy.speed=0;clearSeaCombat(ship.combat);}
  if(ship.combat.enemySunk){ship.escaped=true;ship.escapeTime=p.loseSeconds;ship.ai.mode='disabled';continue;}
  const range=distance(player,ship.enemy),visible=clearWaterLine(ship.enemy,player,1);ship.distance=range;
  if(ship.combat.provoked){ship.escaped=false;ship.escapeTime=0;ship.ai.lastKnown={x:player.x,z:player.z};ship.ai.repath=0;}
  if(ship.escaped){if(range<p.reacquire&&visible){ship.escaped=false;ship.escapeTime=0;ship.ai.repath=0;}}
  else{ship.escapeTime=range>p.loseDistance||!visible?Math.min(p.loseSeconds,ship.escapeTime+h):0;if(ship.escapeTime>=p.loseSeconds)ship.escaped=true;}
 }
 if(activeWarning&&!activeWarning.combat.warning){n.fireGate=Math.max(n.fireGate,p.fireGap);n.nextShooter=(activeWarning.id+1)%members.length;}
 task.escaped=members.every(ship=>ship.combat.enemySunk||ship.escaped);task.escapeTime=Math.min(...members.map(ship=>ship.escapeTime));task.distance=aliveNaval(task).length?Math.min(...aliveNaval(task).map(ship=>distance(player,ship.enemy))):0;
 if(task.hull<=0){endTask(task,'lost','船体受损，无法继续航行');return;}if(task.remaining<=0){endTask(task,'lost','撤离窗口已关闭');return;}
 if(task.index<CHASE_GATES.length){routeStep(task,CHASE_GATES,from,player,0,true,23);task.complete=false;}
 if(task.index===CHASE_GATES.length&&task.escaped&&distance(player,CHASE_EVAC)<=CHASE.evacRadius&&Math.abs(player.speed)<=CHASE.evacSpeed){task.complete=true;endTask(task,'won','全部威胁已解除，成功抵达南湾撤离区');}
}
