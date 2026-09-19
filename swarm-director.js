import * as T from './node_modules/three/build/three.module.js';
import {SWARM,SWARM_OFFSETS,swarmClear} from './swarm-rules.js';
import {voltClearPath} from './volt-world.js';
import {animateSwarm} from './swarm-model.js';
export function createSwarmDirector({enemies,player,navigation,obstacles,projectiles,scaleCooldown=seconds=>seconds,onDesignate=()=>{},canQueue=()=>true}){
 let cursor=0;
 function update(dt,time,gate){
  if(!Number.isFinite(dt)||dt<0)return gate;
  const drones=enemies.filter(e=>e.type==='swarmDrone'&&e.hp>0&&!(e.empRemaining>0||e.empBlocked));if(!drones.length){cursor=0;return gate;}
  const packs=new Map();for(const e of drones){const pack=e.swarm;if(!pack)continue;if(!packs.has(pack))packs.set(pack,[]);packs.get(pack).push(e);e.attack=Math.max(0,e.attack-dt);e.charge=Math.max(0,e.charge-dt);}
  for(const [pack,members] of packs){
   if(members.some(e=>projectiles.hasPending(e.group)))continue;
   const center=pack.center,dx=player.position.x-center.x,dz=player.position.z-center.z,distance=Math.hypot(dx,dz);
   const dir=distance>SWARM.standOff?navigation.direction(center,player.position):null;
   let mx=0,mz=0;if(dir){const length=Math.hypot(dir.x,dir.z)||1;const step=Math.min(SWARM.speed*dt,Math.max(0,distance-SWARM.standOff));mx=dir.x/length*step;mz=dir.z/length*step;}
   const safe=(x,z)=>members.every(e=>{const o=SWARM_OFFSETS[e.swarmSlot];return swarmClear(e.group.position,{x:center.x+x+o.x,y:center.y+Math.sin(time*2+e.swarmSlot)*SWARM.bob,z:center.z+z+o.z},obstacles);});
   if(!safe(mx,mz)){if(safe(mx,0))mz=0;else if(safe(0,mz))mx=0;else{mx=0;mz=0;}}
   if(safe(mx,mz)){center.x+=mx;center.z+=mz;for(const e of members){const o=SWARM_OFFSETS[e.swarmSlot];e.group.position.set(center.x+o.x,center.y+Math.sin(time*2+e.swarmSlot)*SWARM.bob,center.z+o.z);}}
  }
  const threat=projectiles.hasThreatTag?.('swarmDrone')||drones.some(e=>projectiles.hasPending(e.group)||projectiles.hasActive?.(e.group));
  if(gate<=0&&!threat&&dt>0&&canQueue()){
   for(let k=0;k<drones.length;k++){const i=(cursor+k)%drones.length,e=drones[i];if(e.attack>0)continue;
    const origin=e.group.position.clone(),target=player.position.clone().add(new T.Vector3(0,-.35,0));
    if(origin.distanceTo(target)>SWARM.range||!voltClearPath(origin,target,obstacles.map(o=>o.mesh)))continue;
    const attack={color:'blue',charge:SWARM.warning+dt,speed:13,damage:SWARM.damage,angles:[0],bursts:1,showAim:true};
    if(projectiles.queue(origin,target,false,e.group,attack)){const aim=projectiles.aimTarget?.(e.group),redirected=aim&&(Math.abs(aim.x-player.position.x)+Math.abs(aim.z-player.position.z)>1e-6);onDesignate(e,redirected?aim:player.position.clone());e.charge=SWARM.warning;e.attack=scaleCooldown(4);cursor=(i+1)%drones.length;gate=SWARM.warning+.12;break;}
   }
  }
  for(const e of drones){const aim=projectiles.aimTarget?.(e.group);if(aim)e.group.rotation.y=Math.atan2(aim.x-e.group.position.x,aim.z-e.group.position.z);else if(!projectiles.hasPending(e.group))e.group.rotation.y=Math.atan2(player.position.x-e.group.position.x,player.position.z-e.group.position.z);animateSwarm(e,time);}
  return gate;
 }
 return {update,clear(){cursor=0;}};
}
