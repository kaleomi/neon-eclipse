import * as T from './node_modules/three/build/three.module.js';
import {EMP,empEligible,empWithin} from './emp-rules.js';
import {voltAnchor,voltClearPath} from './volt-world.js';
import {SWARM_OFFSETS} from './swarm-rules.js';
// A sticky projectile: sweep every substep, including the release offset. No bounce or thin-wall penetration.
export function empLaunch(position,direction,obstacles){
 const dir=direction.clone().normalize(),start={position:position.clone(),velocity:dir.clone().multiplyScalar(EMP.speed).add(new T.Vector3(0,EMP.lift,0)),remaining:EMP.fuse,stuck:false};
 const desired=position.clone().addScaledVector(dir,.45);desired.y-=.12;
 const hit=sweep(position,desired,obstacles);start.position.copy(hit||desired);start.stuck=!!hit;return start;
}
function sweep(from,to,obstacles,prepared=null){
 const delta=to.clone().sub(from),length=delta.length();if(length<1e-9)return null;
 const ray=new T.Raycaster(from,delta.clone().normalize(),0,length+EMP.bodyRadius),meshes=prepared||obstacles.map(o=>o.mesh).filter(Boolean);if(!prepared)meshes.forEach(m=>m.updateWorldMatrix(true,false));
 const hit=ray.intersectObjects(meshes,false)[0];let distance=hit&&hit.distance-EMP.bodyRadius<=length?Math.max(0,hit.distance-EMP.bodyRadius):Infinity;
 if(to.y<=EMP.bodyRadius&&from.y>EMP.bodyRadius)distance=Math.min(distance,length*(from.y-EMP.bodyRadius)/(from.y-to.y));
 if(from.y<=EMP.bodyRadius&&to.y<from.y)distance=0;
 return Number.isFinite(distance)?from.clone().addScaledVector(delta,distance/length):null;
}
export function advanceEmp(state,dt,obstacles,points=null){
 if(!Number.isFinite(dt)||dt<=0)return;
 const meshes=obstacles.map(o=>o.mesh).filter(Boolean);meshes.forEach(m=>m.updateWorldMatrix(true,false));
 let remaining=Math.min(dt,state.remaining);
 while(remaining>1e-8){const step=Math.min(1/120,remaining);remaining-=step;state.remaining=Math.max(0,state.remaining-step);
  if(!state.stuck){const to=state.position.clone().addScaledVector(state.velocity,step);to.y-=EMP.gravity*step*step/2;const hit=sweep(state.position,to,obstacles,meshes);if(hit){state.position.copy(hit);state.stuck=true;}else{state.position.copy(to);state.velocity.y-=EMP.gravity*step;}}
  points?.push(state.position.clone());
 }
 if(state.remaining<1e-7)state.remaining=0;
}
export function predictEmp(position,direction,obstacles){const state=empLaunch(position,direction,obstacles),points=[state.position.clone()];advanceEmp(state,EMP.fuse,obstacles,points);return {point:state.position.clone(),points};}
export function applyEmp(point,enemies,obstacles,projectiles){
 const affected=[];
 for(const e of enemies){if(!e||e.hp<=0||e.boss)continue;const anchor=voltAnchor(e);if(!empWithin(point,anchor))continue;
  const meshes=obstacles.filter(o=>o.owner!==e.group).map(o=>o.mesh);meshes.forEach(m=>m.updateWorldMatrix(true,false));if(!voltClearPath(point,anchor,meshes))continue;
  // Shield carriers are not frozen: the EMP breaks their plate, the carrier keeps moving and fighting.
  if(e.type==='shield'){e.shieldDownRemaining=EMP.shieldDuration;affected.push(e);continue;}
  if(!empEligible(e))continue;
  projectiles.cancelOwner(e.group);e.charge=0;e.empRemaining=EMP.duration;e.empBlocked=true;e.attack=Math.max(e.attack||0,EMP.recovery);
  // Disabled members break formation; independent reactivation starts at the same location, never teleports to a moving pack.
  if(e.type==='swarmDrone'&&e.swarm){const o=SWARM_OFFSETS[e.swarmSlot];e.swarm={center:{x:e.group.position.x-o.x,y:e.group.position.y,z:e.group.position.z-o.z}};}
  affected.push(e);
 }
 return affected;
}
export function empVisual(e,disabled){const p=e.group.userData.parts;if(!p)return;if(p.sentry){p.fan.visible=!disabled;p.edge.visible=!disabled;p.green.emissiveIntensity=disabled?.08:1.1;if(disabled)e.sentryPhase='disabled';}else if(p.shield){p.shield.forEach(m=>m.visible=!disabled);p.shield[0].material.opacity=disabled?0:.75;p.shield[0].material.emissiveIntensity=disabled?.02:.9;}else if(p.accent)p.accent.emissiveIntensity=disabled?.08:1;}
