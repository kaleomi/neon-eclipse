import * as T from './node_modules/three/build/three.module.js';
import {SENTRY,sentryScanYaw,inSentrySector} from './sentry-rules.js';
import {updateSentryFan} from './sentry-model.js';
import {voltClearPath} from './volt-world.js';
export function createSentryDirector({enemies,player,obstacles,projectiles,scaleCooldown=seconds=>seconds,canQueue=()=>true}){
 function update(dt,time,gate){
  if(!Number.isFinite(dt)||dt<0)return gate;
  for(const e of enemies){if(e.type!=='sentry'||e.hp<=0||e.empRemaining>0||e.empBlocked)continue;
   const g=e.group,parts=g.userData.parts;e.attack=Math.max(0,e.attack-dt);e.charge=Math.max(0,(e.charge||0)-dt);
   e.sentryHome??=g.rotation.y;e.sentryScan??=0;
   const pending=projectiles.hasPending(g);
   if(!pending){e.sentryScan+=dt;g.rotation.y=sentryScanYaw(e.sentryHome,e.sentryScan);}
   e.sentryPhase=pending?'locked':e.attack>0?'recover':'scan';
   const target=player.position.clone().add(new T.Vector3(0,-.35,0)),center=g.position.clone().add(new T.Vector3(0,1.42,0));
   if(dt>0&&!pending&&e.attack<=0&&gate<=0&&!projectiles.hasThreatTag?.('sentry')&&canQueue()&&inSentrySector(center,g.rotation.y,target)){
    const yaw=Math.atan2(target.x-center.x,target.z-center.z),origin=center.clone().add(new T.Vector3(Math.sin(yaw)*SENTRY.muzzle,0,Math.cos(yaw)*SENTRY.muzzle));
    const meshes=obstacles.filter(o=>o.owner!==g).map(o=>o.mesh);for(const mesh of meshes)mesh.updateWorldMatrix(true,false);
    if(voltClearPath(center,target,meshes)&&voltClearPath(origin,target,meshes)){
     const attack={color:'green',charge:SENTRY.warning+dt,speed:SENTRY.speed,damage:SENTRY.damage,angles:[-.09],bursts:SENTRY.bursts,burstDelay:SENTRY.burstDelay,burstOffset:.09,showAim:true};
     if(projectiles.queue(origin,target,false,g,attack)){g.rotation.y=yaw;e.charge=SENTRY.warning+(SENTRY.bursts-1)*SENTRY.burstDelay;e.attack=scaleCooldown(SENTRY.cooldown);e.sentryPhase='locked';gate=e.charge+.15;}
    }
   }
   parts.green.emissiveIntensity=e.sentryPhase==='locked'?2.1:1.1;parts.fan.material.opacity=e.sentryPhase==='locked'?.22:.12;parts.core.rotation.y=time;
   e.sentryVisual=(e.sentryVisual??0)-dt;if(e.sentryVisual<=0||e.sentryPhase==='locked'){updateSentryFan(e,obstacles);e.sentryVisual=.1;}
  }
  return gate;
 }
 return {update};
}
