import {stepHarborElite,queueHarborVent} from './harbor-elite.js';
import {sameEnemyLayer,enemyMuzzleHeight} from './roof-enemy-navigation.js';
import * as THREE from './node_modules/three/build/three.module.js';
import {ENEMY_TYPES,BOSS_PHASES,turnTowards,facingDot,movementIntent,stepBossState,recordBossAttack,enemyBehavior} from './enemy-rules.js';
import {animateEnemy} from './enemy-model.js';

export function createEnemyDirector({enemies,player,navigation,vertical=null,move,obstacles,projectiles,onBossEvent,onEliteWindow=()=>{},scaleCooldown=seconds=>seconds}){
 const moveEnemy=vertical?vertical.move:move;
 const ray=new THREE.Raycaster(),meshes=obstacles.map(o=>o.mesh);
 function update(dt,time,gate){
  for(const enemy of enemies){
   const profile=ENEMY_TYPES[enemy.type],pos=enemy.group.position,old=pos.clone();
   const dx=player.position.x-pos.x,dz=player.position.z-pos.z,dist=Math.hypot(dx,dz)||.001;
   enemy.charge=Math.max(0,(enemy.charge||0)-dt);enemy.attack-=dt;
   if(enemy.boss){
    const event=stepBossState(enemy,dt,enemy.charge===0&&!projectiles.hasPending(enemy.group));
    if(event.changed){projectiles.cancelOwner(enemy.group,true);enemy.charge=0;enemy.attack=1.5;}
    if(event.opened)enemy.attack=enemy.bossState.openRemaining+.4;
    if(event.changed||event.opened||event.closed)onBossEvent(enemy,event);
   }
   if(enemy.type==='harborElite'){const event=stepHarborElite(enemy,dt,!projectiles.hasPending(enemy.group));if(event.opened){enemy.fieldWindowUsed=false;onEliteWindow(enemy);}}
   const locked=enemy.type==='harborElite'&&enemy.eliteState?.ventRemaining>0||enemy.boss&&(enemy.bossState.openRemaining>0||enemy.bossState.transitionRemaining>0||enemy.bossState.openQueued);
   if(enemy.charge===0&&!locked)enemy.group.rotation.y=turnTowards(enemy.group.rotation.y,Math.atan2(dx,dz),profile.turn*dt);
   const origin=pos.clone().add(new THREE.Vector3(0,enemy.boss?2.6:enemy.type==='heavy'?1.65:1.6,0));
   const target=player.position.clone().add(new THREE.Vector3(0,-.35,0)),line=target.clone().sub(origin);
   ray.set(origin,line.clone().normalize());ray.far=line.length();
   const visible=dist<profile.range+10&&ray.intersectObjects(meshes,false).length===0;
   if(enemy.charge===0&&!locked){
    enemy.flankTime=(enemy.flankTime||0)+dt;while(enemy.flankRoute?.length&&Math.hypot(pos.x-enemy.flankRoute[0].x,pos.z-enemy.flankRoute[0].z)<1.1)enemy.flankRoute.shift();if(enemy.flankTime>16)enemy.flankRoute=[];const flank=enemy.flankRoute?.[0],navTarget=flank?new THREE.Vector3(flank.x,pos.y+1.7,flank.z):player.position;
    let climbing=!enemy.boss?vertical?.route(pos,navTarget,enemy.radius):null;if(flank)climbing={...(climbing||navigation.direction(pos,navTarget)),onDeck:false};
    const intent=climbing&&!climbing.onDeck?'approach':movementIntent(enemy.type,dist,visible);let direction=null;
    const side=(Math.floor(time/3+enemy.seed)%2?1:-1);
    if(intent==='approach')direction=climbing||navigation.direction(pos,player.position);
    else if(intent==='retreat')direction={x:-dx,z:-dz};
    else if(intent==='strafe')direction={x:-dz*side,z:dx*side};
    if(direction){
     const speed=enemy.speed*(enemy.boss&&enemy.bossState.phase===2?1.35:1),step=speed*dt*(intent==='strafe'?.65:1),length=Math.hypot(direction.x,direction.z)||1;
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
   if(enemy.attack<=0&&enemy.charge===0&&!locked&&dist<profile.range&&visible&&aligned&&gate<=0){
    const phase=enemy.boss?BOSS_PHASES[enemy.bossState.phase]:null,attack=phase?phase.attack:profile.attack;
    // Freeze position and aim during telegraph; all bolts retain this captured target.
    origin.set(pos.x,enemyMuzzleHeight(enemy),pos.z);
    if(projectiles.queue(origin,target,enemy.boss,enemy.group,attack)){
     enemy.charge=attack.charge+(attack.bursts-1)*(attack.burstDelay||.3)+.05;
     enemy.attack=scaleCooldown((phase?phase.cooldown:profile.cooldown)+Math.random()*.25);
     gate=enemy.boss?.55:enemyBehavior(enemy.type)==='ranged'?.45:.28;
     if(enemy.type==='harborElite')queueHarborVent(enemy);
     if(enemy.boss)recordBossAttack(enemy.bossState);
    }
   }
   animateEnemy(enemy,time,pos.distanceToSquared(old)>.00001,dist);
  }
  return gate;
 }
 return {update};
}
