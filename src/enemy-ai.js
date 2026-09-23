import {refreshCommanderSupport,commandedCooldownRate,clearCommanderSupport} from './commander-rules.js';
import {createSentryDirector} from './sentry-director.js';
import {createSwarmCoordination} from './swarm-coordination.js';
import {voltClearPath} from './volt-world.js';
import {createSwarmDirector} from './swarm-director.js';
import {stepHarborElite,queueHarborVent} from './harbor-elite.js';
import {sameEnemyLayer,enemyMuzzleHeight} from './roof-enemy-navigation.js';
import * as THREE from '../node_modules/three/build/three.module.js';
import {ENEMY_TYPES,BOSS_PHASES,turnTowards,facingDot,movementIntent,stepBossState,recordBossAttack,enemyBehavior} from './enemy-rules.js';
import {animateEnemy} from './enemy-model.js';
import {createSquadCoordinator,rusherIntent,RUSHER,ARTILLERY,stepArtillery} from './squad.js';
import {environmentModifiers} from './interaction-rules.js';
const THERMAL_RANGE=26;

export function createEnemyDirector({enemies,player,navigation,vertical=null,move,obstacles,projectiles,onBossEvent,onEliteWindow=()=>{},scaleCooldown=seconds=>seconds,thermalVision=null,onRusherBlast=()=>{},onMortar=()=>{},squadEnabled=true,attackBudget=null,environment=null}){
 const squad=createSquadCoordinator({types:ENEMY_TYPES});const mortars=[];
 attackBudget?.register('mortars',()=>mortars.length);
 const coordination=createSwarmCoordination({position:e=>e.group.position,visible:(from,to)=>voltClearPath(from,to,obstacles.map(o=>o.mesh))});
 const budget=()=>(projectiles.countThreatTag?.('swarmDrone')||0)+(projectiles.countThreatTag?.('swarmCoordinated')||0);
 const canStart=()=>!projectiles.charging&&!projectiles.hasThreatTag?.('sentry')&&budget()<2;
 const sentry=createSentryDirector({enemies,player,obstacles,projectiles,scaleCooldown,canQueue:()=>!projectiles.charging&&budget()===0});
 const swarm=createSwarmDirector({enemies,player,navigation,obstacles,projectiles,scaleCooldown,canQueue:canStart,onDesignate:(source,point)=>coordination.publish(source,point,enemies)});
 const moveEnemy=vertical?vertical.move:move;
 const ray=new THREE.Raycaster();let nextActor=0;
 function update(dt,time,gate){
  const meshes=obstacles.map(o=>o.mesh);
  // Chapter 09 blizzard: while thermal vision is on, soft cover (snow banks) no longer hides the player inside THERMAL range.
  const thermal=thermalVision?.()===true,solidMeshes=thermal?obstacles.filter(o=>!o.bank&&!o.ledge).map(o=>o.mesh):meshes;
  refreshCommanderSupport(enemies,(a,b)=>voltClearPath(a.group.position.clone().add(new THREE.Vector3(0,1.4,0)),b.group.position.clone().add(new THREE.Vector3(0,1.4,0)),meshes));
  coordination.update(dt,enemies,player.position);
  let anyoneSees=false;
  for(let i=mortars.length-1;i>=0;i--){const m=mortars[i];m.remaining-=dt;if(m.remaining<=0){mortars.splice(i,1);onMortar({type:'land',x:m.x,z:m.z,radius:ARTILLERY.radius,damage:ARTILLERY.damage,owner:m.owner});}}
  gate=sentry.update(dt,time,gate);
  gate=swarm.update(dt,time,gate);
  const start=enemies.length?nextActor%enemies.length:0,ordered=[...enemies.slice(start),...enemies.slice(0,start)];
  for(const enemy of ordered){
   if(enemy.type==='swarmDrone'||enemy.type==='sentry'||enemy.empRemaining>0||enemy.empBlocked)continue;
   if(enemy.staggerRemaining>0){animateEnemy(enemy,time,false);continue;}
   if(enemy.engineerBuilding||enemy.engineerRepairing){animateEnemy(enemy,time,false);enemy.group.userData.parts.arms.forEach(a=>a.rotation.x=-.75);enemy.group.userData.parts.accent.emissiveIntensity=2+Math.sin(time*12)*.4;continue;}
   const profile=ENEMY_TYPES[enemy.type],pos=enemy.group.position,old=pos.clone();
   const env=environment?environmentModifiers(enemy,environment):null;enemy.envSlow=env?env.speed:1;
   const dx=player.position.x-pos.x,dz=player.position.z-pos.z,dist=Math.hypot(dx,dz)||.001;
   enemy.charge=Math.max(0,(enemy.charge||0)-dt);enemy.attack-=dt*commandedCooldownRate(enemy);
   if(enemy.boss){
    const event=stepBossState(enemy,dt,enemy.charge===0&&!projectiles.hasPending(enemy.group));
    if(event.changed){projectiles.cancelOwner(enemy.group,true);enemy.charge=0;enemy.attack=1.5;}
    if(event.opened)enemy.attack=enemy.bossState.openRemaining+.4;
    if(event.changed||event.opened||event.closed)onBossEvent(enemy,event);
   }
   if(enemy.type==='harborElite'){const event=stepHarborElite(enemy,dt,!projectiles.hasPending(enemy.group));if(event.opened){enemy.fieldWindowUsed=false;onEliteWindow(enemy);}}
   const locked=enemy.type==='harborElite'&&enemy.eliteState?.ventRemaining>0||enemy.boss&&(enemy.bossState.openRemaining>0||enemy.bossState.transitionRemaining>0||enemy.bossState.openQueued);

   const origin=pos.clone().add(new THREE.Vector3(0,enemy.boss?2.6:enemy.type==='heavy'?1.65:1.6,0));
   const target=player.position.clone().add(new THREE.Vector3(0,-.35,0)),line=target.clone().sub(origin);
   ray.set(origin,line.clone().normalize());ray.far=line.length();
   const visible=dist<profile.range+10&&ray.intersectObjects(thermal&&dist<THERMAL_RANGE?solidMeshes:meshes,false).length===0;
   if(visible)anyoneSees=true;
   if(enemy.type==='artilleryMech'&&stepArtillery(enemy,dt))enemy.group.userData.artilleryClosed=true;
   if(enemy.type==='rusher'){
    const r=rusherIntent(enemy,dist,dt);enemy.rusherBlink=r.blink;
    if(r.state==='detonate'){onRusherBlast({enemy,x:pos.x,z:pos.z,y:pos.y,radius:RUSHER.radius,damage:RUSHER.damage});enemy.hp=0;continue;}
    if(r.state!=='armed'){const nav=navigation.direction(pos,player.position)||{x:dx,z:dz};const len=Math.hypot(nav.x,nav.z)||1,step=enemy.speed*dt*(env?env.speed:1);enemy.group.rotation.y=Math.atan2(dx,dz);moveEnemy(pos,nav.x/len*step,nav.z/len*step,enemy.radius);}
    animateEnemy(enemy,time,r.state!=='armed',dist);continue;
   }
   const coordinated=enemy.group.userData.swarmCoordinated===true;
   if(coordinated&&visible)enemy.lastVisualPoint=player.position.clone();
   const squadTarget=squadEnabled&&!coordinated&&!enemy.flankRoute?.length?squad.target(enemy,player.position):null;
   // Squad flank offsets only apply while the squad has a fresh sighting; legacy omniscient pursuit is otherwise unchanged.
   const searchTarget=coordinated&&!visible?(enemy.swarmIntel?.point||enemy.lastVisualPoint||pos):squadTarget&&squadTarget.role==='flank'&&!squadTarget.search&&visible&&dist>4?new THREE.Vector3(squadTarget.x,player.position.y,squadTarget.z):player.position;
   if(enemy.charge===0&&!locked)enemy.group.rotation.y=turnTowards(enemy.group.rotation.y,Math.atan2(searchTarget.x-pos.x,searchTarget.z-pos.z),profile.turn*dt);
   if(enemy.charge===0&&!locked){
    enemy.flankTime=(enemy.flankTime||0)+dt;while(enemy.flankRoute?.length&&Math.hypot(pos.x-enemy.flankRoute[0].x,pos.z-enemy.flankRoute[0].z)<1.1)enemy.flankRoute.shift();if(enemy.flankTime>16)enemy.flankRoute=[];const flank=enemy.flankRoute?.[0],navTarget=flank?new THREE.Vector3(flank.x,pos.y+1.7,flank.z):searchTarget;
    let climbing=!enemy.boss?vertical?.route(pos,navTarget,enemy.radius):null;if(flank)climbing={...(climbing||navigation.direction(pos,navTarget)),onDeck:false};
    let intent=coordinated&&!visible&&Math.hypot(searchTarget.x-pos.x,searchTarget.z-pos.z)<1?'hold':climbing&&!climbing.onDeck?'approach':movementIntent(enemy.type,dist,visible);if(squadTarget&&visible&&!climbing){if(squadTarget.role==='cover'&&dist<profile.far&&dist>profile.near)intent='strafe';else if(squadTarget.role==='flank'&&dist>4&&Math.hypot(searchTarget.x-pos.x,searchTarget.z-pos.z)>1.2)intent='approach';}let direction=null;
    const side=(Math.floor(time/3+enemy.seed)%2?1:-1);
    if(intent==='approach')direction=climbing||navigation.direction(pos,searchTarget);
    else if(intent==='retreat')direction={x:-dx,z:-dz};
    else if(intent==='strafe')direction={x:-dz*side,z:dx*side};
    if(direction){
     const speed=enemy.speed*(enemy.boss&&enemy.bossState.phase===2?1.35:1)*(env?env.speed:1),step=speed*dt*(intent==='strafe'?.65:1),length=Math.hypot(direction.x,direction.z)||1;
     moveEnemy(pos,direction.x/length*step,direction.z/length*step,enemy.radius);
     if(pos.distanceToSquared(old)<step*step*.05)moveEnemy(pos,-dz/dist*step*side,dx/dist*step*side,enemy.radius);
    }
    // A small separation keeps mixed squads readable without changing map collision.
    for(const other of enemies)if(other!==enemy&&sameEnemyLayer(pos,other.group.position)){
     const ox=pos.x-other.group.position.x,oz=pos.z-other.group.position.z,d=Math.hypot(ox,oz),clearance=enemy.radius+other.radius+.15;
     if(d>.01&&d<clearance)moveEnemy(pos,ox/d*(clearance-d)*dt,oz/d*(clearance-d)*dt,enemy.radius);
    }
   }
   const aligned=facingDot(pos,enemy.group.rotation.y,player.position)>(enemyBehavior(enemy.type)==='ranged'?.95:.83);
   if(enemy.attack<=0&&enemy.charge===0&&!locked&&dist<profile.range*(env?env.range:1)&&visible&&aligned&&gate<=0&&(!coordinated||canStart())&&(!env||env.canTelegraph)){
    const phase=enemy.boss?BOSS_PHASES[enemy.bossState.phase]:null,attack=phase?phase.attack:profile.attack;
    // Freeze position and aim during telegraph; all bolts retain this captured target.
    origin.set(pos.x,enemyMuzzleHeight(enemy),pos.z);
    if(enemy.type==='artilleryMech'){if(dist>=ARTILLERY.minRange&&(attackBudget?attackBudget.allow('mortars'):projectiles.attackers<3)){mortars.push({x:player.position.x,z:player.position.z,remaining:ARTILLERY.telegraph,owner:enemy.group});onMortar({type:'telegraph',x:player.position.x,z:player.position.z,radius:ARTILLERY.radius,seconds:ARTILLERY.telegraph,owner:enemy.group});enemy.charge=ARTILLERY.telegraph+.1;enemy.attack=scaleCooldown(profile.cooldown+Math.random()*.4);gate=.5;nextActor=(enemies.indexOf(enemy)+1)%Math.max(1,enemies.length);}}
    else if(projectiles.queue(origin,target,enemy.boss,enemy.group,attack)){
     nextActor=(enemies.indexOf(enemy)+1)%Math.max(1,enemies.length);
     enemy.charge=attack.charge+(attack.bursts-1)*(attack.burstDelay||.3)+.05;
     enemy.attack=scaleCooldown((phase?phase.cooldown:profile.cooldown)+Math.random()*.25);
     gate=enemy.boss?.55:coordinated?attack.charge+.12:enemyBehavior(enemy.type)==='ranged'?.45:.28;
     if(enemy.type==='harborElite')queueHarborVent(enemy);
     if(enemy.boss)recordBossAttack(enemy.bossState);
    }
   }
   if(!enemy.boss&&enemy.charge>0){const aim=projectiles.aimTarget?.(enemy.group);if(aim)enemy.group.rotation.y=Math.atan2(aim.x-pos.x,aim.z-pos.z);}
   animateEnemy(enemy,time,pos.distanceToSquared(old)>.00001,dist);
  }
  if(squadEnabled)squad.update(dt,enemies,player.position,anyoneSees);
  return gate;
 }
 return {update,get coordination(){return coordination.state;},get squad(){return squad.state;},get mortars(){return mortars.map(m=>({...m}));},clear(){swarm.clear();coordination.clear();squad.clear();mortars.length=0;clearCommanderSupport(enemies);nextActor=0;}};
}
