// Convoy escort mission for the proving ground (Phase 3 / 7.5 mission 1). Pure rules, no rendering,
// no storage. A transport truck follows the road loop; hound drones ambush from fixed points, telegraph
// a lunge with a locked ground line, then dash. The player's rover takes wear through vehicle-durability.
// Coordinates metres, seconds, radians. Yaw convention matches vehicle-rules: forward(yaw)=(sin,-cos).
import {forward} from './vehicle-rules.js';
import {clamp} from './maritime-rules.js';
import {applyDamage} from './vehicle-durability.js';
export const ESCORT_PROFILES=Object.freeze({
 easy:Object.freeze({id:'easy',label:'简单',waves:[2,2,3],hp:42,truckDamage:10,roverDamage:8,telegraph:1.2,lungeSpeed:28,approachSpeed:17,stagger:1.2,description:'三波 2/2/3 只猎犬机 · 预警 1.2 秒 · 较低撞击伤害'}),
 normal:Object.freeze({id:'normal',label:'普通',waves:[2,3,3],hp:54,truckDamage:12,roverDamage:10,telegraph:1,lungeSpeed:32,approachSpeed:20,stagger:.9,description:'三波 2/3/3 只 · 预警 1 秒 · 标准伤害'}),
 hard:Object.freeze({id:'hard',label:'困难',waves:[3,3,4],hp:66,truckDamage:14,roverDamage:12,telegraph:.85,lungeSpeed:34,approachSpeed:23,stagger:.7,description:'三波 3/3/4 只 · 预警 0.85 秒 · 更高伤害与血量'})
});
export const normalizeEscort=value=>Object.hasOwn(ESCORT_PROFILES,value)?value:'normal';
export const TRUCK=Object.freeze({speed:11,accel:4,hull:100,waitDistance:70,resumeDistance:45,radius:1.6,halfLength:3.2,arriveRadius:10});
export const HOUND=Object.freeze({approachSpeed:14,engageRange:22,lungeSeconds:1.15,recoverSeconds:1.8,hitRadius:2.4,radius:1.1,height:1,circleSpeed:6,maxActive:6});
export const ESCORT_ROUTE=Object.freeze([{x:-105,z:60,name:'离开车库'},{x:-105,z:-105,name:'北侧弯道'},{x:105,z:-105,name:'东北弯道'},{x:105,z:105,name:'东南弯道'},{x:20,z:105,name:'南侧哨站 · 终点'}].map(Object.freeze));
export const AMBUSHES=Object.freeze([
 {id:'west',trigger:{x:-105,z:-30},radius:40,spawns:[{x:-138,z:-45},{x:-140,z:-15},{x:-136,z:-70},{x:-142,z:5}]},
 {id:'north',trigger:{x:30,z:-105},radius:40,spawns:[{x:25,z:-140},{x:55,z:-142},{x:0,z:-138},{x:75,z:-144}]},
 {id:'east',trigger:{x:105,z:40},radius:40,spawns:[{x:145,z:48},{x:150,z:70},{x:162,z:35},{x:146,z:90}]}
].map(a=>Object.freeze({...a,trigger:Object.freeze(a.trigger),spawns:Object.freeze(a.spawns.map(Object.freeze))})));
export const ESCORT_START=Object.freeze({truck:{x:-105,z:92,yaw:0},rover:{x:-99,z:105,yaw:0},player:{x:-102.5,z:110,yaw:0}});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const yawTo=(from,to)=>Math.atan2(to.x-from.x,-(to.z-from.z));
export function createEscort(difficulty='normal',active=false){
 const profile=ESCORT_PROFILES[normalizeEscort(difficulty)];
 return {status:active?'active':'idle',profile,elapsed:0,reason:'',truck:{...ESCORT_START.truck,speed:0,hull:TRUCK.hull,index:0,waiting:false,arrived:false,hitFlash:0,distance:0},hounds:[],waves:AMBUSHES.map(()=>false),waveIndex:0,killed:0,spawned:0,truckHits:0,roverHits:0,serial:0,lastNotice:null};
}
export function escortGoal(m){return m.truck.arrived?ESCORT_ROUTE.at(-1):ESCORT_ROUTE[m.truck.index]||ESCORT_ROUTE.at(-1);}
export function aliveHounds(m){return m.hounds.filter(h=>h.alive);}
// Truck body for rover collision: three circles along its axis.
export function truckBlocks(m,x,z,r){if(m.status==='idle')return false;const t=m.truck,f=forward(t.yaw);return [-TRUCK.halfLength*.7,0,TRUCK.halfLength*.7].some(d=>Math.hypot(x-t.x-f.x*d,z-t.z-f.z*d)<r+TRUCK.radius);}
function stepTruck(m,rover,h){
 const t=m.truck;if(t.arrived)return;
 const goal=ESCORT_ROUTE[t.index],far=dist(t,rover);
 if(!t.waiting&&far>TRUCK.waitDistance)t.waiting=true;else if(t.waiting&&far<=TRUCK.resumeDistance)t.waiting=false;
 const target=t.waiting?0:TRUCK.speed;t.speed=clamp(t.speed+clamp(target-t.speed,-TRUCK.accel*2*h,TRUCK.accel*h),0,TRUCK.speed);
 const desired=yawTo(t,goal);t.yaw=wrap(t.yaw+clamp(wrap(desired-t.yaw),-1.4*h,1.4*h));
 const f=forward(t.yaw),step=t.speed*h;t.x+=f.x*step;t.z+=f.z*step;t.distance+=step;
 if(dist(t,goal)<=(t.index===ESCORT_ROUTE.length-1?TRUCK.arriveRadius:6)){if(t.index===ESCORT_ROUTE.length-1){t.arrived=true;t.speed=0;}else t.index++;}
}
function spawnWave(m,ambush,count){
 for(let i=0;i<count&&aliveHounds(m).length<HOUND.maxActive;i++){const s=ambush.spawns[i%ambush.spawns.length];
  m.hounds.push({id:++m.serial,type:'hound',x:s.x+(i>=ambush.spawns.length?3:0),y:HOUND.height,z:s.z,yaw:0,r:HOUND.radius,hp:m.profile.hp,maxHp:m.profile.hp,alive:true,flash:0,respawn:Infinity,respawnIn:Infinity,mode:'hold',timer:i*(m.profile.stagger||0),lock:null,target:null,speed:0,hit:false});m.spawned++;}
}
function pickTarget(h,m,rover){return dist(h,m.truck)<=dist(h,rover)?'truck':'rover';}
function moveHound(h,to,speed,dt,free){
 const d=dist(h,to);if(d<1e-6)return;const dx=(to.x-h.x)/d,dz=(to.z-h.z)/d,step=Math.min(speed*dt,d);
 h.yaw=Math.atan2(dx,-dz);
 // Straight, then slide around obstacles by trying rotated headings.
 for(const turn of [0,.7,-.7,1.4,-1.4]){const c=Math.cos(turn),s=Math.sin(turn),nx=dx*c-dz*s,nz=dx*s+dz*c,x=h.x+nx*step,z=h.z+nz*step;if(!free||free(x,z,HOUND.radius)){h.x=x;h.z=z;return;}}
}
function stepHound(h,m,rover,wear,dt,free){
 if(!h.alive)return;h.flash=Math.max(0,h.flash-dt);const p=m.profile;
 const targetOf=k=>k==='truck'?m.truck:rover;
 if(h.mode==='hold'){h.timer-=dt;if(h.timer<=0)h.mode='approach';return;}
 if(h.mode==='approach'){
  h.target=pickTarget(h,m,rover);const t=targetOf(h.target);
  if(dist(h,t)<=HOUND.engageRange){h.mode='telegraph';h.timer=p.telegraph;const f=forward(t.yaw),lead=clamp(p.telegraph*(Number(t.speed)||0),0,18);h.lock={x:t.x+f.x*lead,z:t.z+f.z*lead};h.hit=false;h.yaw=yawTo(h,h.lock);}
  else moveHound(h,t,p.approachSpeed||HOUND.approachSpeed,dt,free);
 }else if(h.mode==='telegraph'){
  h.timer-=dt;h.yaw=yawTo(h,h.lock);if(h.timer<=0){h.mode='lunge';h.timer=HOUND.lungeSeconds;h.speed=p.lungeSpeed;}
 }else if(h.mode==='lunge'){
  h.timer-=dt;const before={x:h.x,z:h.z};const f=forward(h.yaw),step=h.speed*dt;h.x+=f.x*step;h.z+=f.z*step;
  if(free&&!free(h.x,h.z,HOUND.radius)){Object.assign(h,before);h.timer=0;}
  if(!h.hit){
   const tr=m.truck,ft=forward(tr.yaw),truckHit=[-TRUCK.halfLength*.7,0,TRUCK.halfLength*.7].some(d=>Math.hypot(h.x-tr.x-ft.x*d,h.z-tr.z-ft.z*d)<=HOUND.hitRadius+TRUCK.radius*.5);
   const fr=forward(rover.yaw),roverHit=[-1.25,0,1.25].some(d=>Math.hypot(h.x-rover.x-fr.x*d,h.z-rover.z-fr.z*d)<=HOUND.hitRadius);
   if(truckHit){tr.hull=Math.max(0,tr.hull-p.truckDamage);tr.hitFlash=.3;m.truckHits++;h.hit=true;h.timer=Math.min(h.timer,.15);}
   else if(roverHit){applyDamage(wear,p.roverDamage);rover.speed*=.55;m.roverHits++;h.hit=true;h.timer=Math.min(h.timer,.15);}
  }
  if(h.timer<=0){h.mode='recover';h.timer=HOUND.recoverSeconds;}
 }else if(h.mode==='recover'){
  h.timer-=dt;const t=targetOf(h.target||'truck'),away=yawTo(t,h),orbit={x:t.x+Math.sin(away+.6)*14,z:t.z-Math.cos(away+.6)*14};moveHound(h,orbit,HOUND.circleSpeed,dt,free);
  if(h.timer<=0){h.mode='approach';h.lock=null;}
 }
}
export function stepEscort(m,{rover,wear,paused=false,free=null},dt){
 if(m.status!=='active'||paused||!Number.isFinite(dt)||dt<=0)return null;
 const h=Math.min(dt,.25);m.elapsed+=h;m.truck.hitFlash=Math.max(0,m.truck.hitFlash-h);
 stepTruck(m,rover,h);
 const events=[];
 AMBUSHES.forEach((a,i)=>{if(!m.waves[i]&&dist(m.truck,a.trigger)<=a.radius){m.waves[i]=true;m.waveIndex=i+1;spawnWave(m,a,m.profile.waves[i]);events.push('wave');}});
 const killedBefore=m.killed;
 for(const hound of m.hounds){if(!hound.alive)continue;stepHound(hound,m,rover,wear,h,free);}
 m.killed=m.hounds.filter(x=>!x.alive).length;if(m.killed>killedBefore)events.push('kill');
 if(m.truck.hull<=0){end(m,'lost','运输卡车被摧毁');return events;}
 if(wear.hull<=0){end(m,'lost','护送车辆报废，车队失去掩护');return events;}
 if(m.truck.arrived&&aliveHounds(m).length===0&&m.waves.every(Boolean)){end(m,'won','车队抵达南侧哨站，全部伏击已清除');return events;}
 if(m.truck.arrived&&aliveHounds(m).length>0)events.push('holdout');
 return events;
}
function end(m,status,reason){m.status=status;m.reason=reason;for(const h of m.hounds)if(h.alive&&h.mode!=='approach'){h.mode='approach';h.lock=null;}}
// Gunner-seat autopilot: keep the rover 10-14 m behind the truck. Returns rover input; caller applies durability limits.
export function escortFollowInput(m,rover){
 const t=m.truck,f=forward(t.yaw),slot={x:t.x-f.x*12,z:t.z-f.z*12},d=dist(rover,slot);
 const desiredYaw=d>2.5?yawTo(rover,slot):t.yaw,err=wrap(desiredYaw-rover.yaw);
 const desiredSpeed=t.arrived&&d<4?0:clamp(t.speed+(d-2)*.9,0,22),diff=desiredSpeed-rover.speed;
 return {throttle:clamp(diff*.6,-1,1),steer:clamp(err*1.6,-1,1),brake:desiredSpeed<.5&&rover.speed>.8};
}
export function houndWarnings(m){return m.hounds.filter(h=>h.alive&&h.mode==='telegraph'&&h.lock).map(h=>({id:h.id,from:{x:h.x,z:h.z},to:h.lock,remaining:h.timer}));}
export function escortSummary(m){
 const alive=aliveHounds(m).length,total=m.profile.waves.reduce((a,b)=>a+b,0);
 return {status:m.status,label:m.profile.label,elapsed:m.elapsed,truckHull:Math.ceil(m.truck.hull),truckWaiting:m.truck.waiting,truckArrived:m.truck.arrived,legName:escortGoal(m).name,leg:m.truck.index,legs:ESCORT_ROUTE.length,wave:m.waveIndex,waves:AMBUSHES.length,alive,killed:m.killed,total,truckHits:m.truckHits,roverHits:m.roverHits,warnings:houndWarnings(m).length};
}
