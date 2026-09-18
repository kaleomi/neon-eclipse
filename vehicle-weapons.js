// Vehicle weapons for the proving ground: rover roof gun with gunner seat, aircraft cannon and two
// unguided rockets, plus a target range (ground plates, balloons, drone swarms). Pure rules, no
// rendering, no storage. Coordinates metres, seconds, radians. Hitscan and rockets are blocked by
// the same axis-aligned obstacle boxes the vehicles collide with, so targets behind buildings are safe.
import {forward,right} from './vehicle-rules.js';
import {clamp} from './maritime-rules.js';
export const ROOF_GUN=Object.freeze({interval:.09,damage:6,range:150,belt:120,reload:2.4,spread:.012,cruiseSeconds:3,pitchMin:-.3,pitchMax:.75,mountHeight:2.35,muzzleForward:.9});
export const PLANE_GUN=Object.freeze({interval:.11,damage:9,range:280,belt:160,reload:3,spread:.006,muzzleForward:4.2,muzzleDown:.2});
export const ROCKET=Object.freeze({count:2,speed:120,damage:70,splash:14,life:3.5,interval:.5,rearmSeconds:5});
export const TARGET_KINDS=Object.freeze({plate:'靶板',balloon:'气球靶',drone:'无人机'});
// Static layout. Drones orbit a centre; balloons and plates are fixed. Nothing sits on mission routes.
export const TARGETS=Object.freeze([
 {id:'plate-n1',type:'plate',x:-120,y:1.5,z:-40,r:1.5,hp:24,respawn:10},{id:'plate-n2',type:'plate',x:-90,y:1.5,z:-60,r:1.5,hp:24,respawn:10},
 {id:'plate-e1',type:'plate',x:120,y:1.5,z:-40,r:1.5,hp:24,respawn:10},{id:'plate-e2',type:'plate',x:120,y:1.5,z:40,r:1.5,hp:24,respawn:10},
 {id:'plate-s1',type:'plate',x:40,y:1.5,z:120,r:1.5,hp:24,respawn:10},{id:'plate-s2',type:'plate',x:-40,y:1.5,z:120,r:1.5,hp:24,respawn:10},
 {id:'balloon-1',type:'balloon',x:-450,y:70,z:-380,r:5,hp:36,respawn:14},{id:'balloon-2',type:'balloon',x:-400,y:95,z:-460,r:5,hp:36,respawn:14},
 {id:'balloon-3',type:'balloon',x:-500,y:110,z:-300,r:5,hp:36,respawn:14},{id:'balloon-4',type:'balloon',x:-430,y:60,z:-500,r:5,hp:36,respawn:14},
 ...[0,1,2,3].map(i=>({id:'drone-low-'+i,type:'drone',orbit:{x:0,z:0,radius:70,height:14,speed:11,phase:i*Math.PI/2},x:0,y:14,z:0,r:1.6,hp:18,respawn:9})),
 ...[0,1,2,3,4,5].map(i=>({id:'drone-high-'+i,type:'drone',orbit:{x:-450,z:-400,radius:70,height:85,speed:19,phase:i*Math.PI/3},x:0,y:85,z:0,r:2.2,hp:18,respawn:12}))
]);
export function createRange(){return {targets:TARGETS.map(t=>({...t,orbit:t.orbit?{...t.orbit}:null,maxHp:t.hp,alive:true,respawnIn:0,flash:0,angle:t.orbit?t.orbit.phase:0})),kills:0,shots:0,hits:0,time:0};}
export function stepRange(range,dt){
 if(!Number.isFinite(dt)||dt<=0)return;const h=Math.min(dt,.25);range.time+=h;
 for(const t of range.targets){
  t.flash=Math.max(0,t.flash-h);
  if(!t.alive){t.respawnIn-=h;if(t.respawnIn<=0){t.alive=true;t.hp=t.maxHp;}}
  if(t.orbit){t.angle+=t.orbit.speed/t.orbit.radius*h;t.x=t.orbit.x+Math.cos(t.angle)*t.orbit.radius;t.z=t.orbit.z+Math.sin(t.angle)*t.orbit.radius;t.y=t.orbit.height+Math.sin(t.angle*3)*1.5;}
 }
}
export function aliveTargets(range,type=null){return range.targets.filter(t=>t.alive&&(!type||t.type===type));}
export function damageTarget(range,target,amount){
 if(!target.alive)return false;target.hp-=Math.max(0,amount);target.flash=.25;range.hits++;
 if(target.hp>0)return false;target.alive=false;target.hp=0;target.respawnIn=target.respawn;range.kills++;return true;
}
// Ray helpers. Boxes are {minX,maxX,minZ,maxZ,h}; their vertical extent is 0..h.
export function raySphere(origin,dir,centre,radius){
 const ox=origin.x-centre.x,oy=origin.y-centre.y,oz=origin.z-centre.z,b=ox*dir.x+oy*dir.y+oz*dir.z,c=ox*ox+oy*oy+oz*oz-radius*radius;
 if(c<=0)return 0;const d=b*b-c;if(d<0)return null;const t=-b-Math.sqrt(d);return t>=0?t:null;
}
export function rayBox(origin,dir,box){
 let tmin=0,tmax=Infinity;
 for(const [o,d,lo,hi] of [[origin.x,dir.x,box.minX,box.maxX],[origin.y,dir.y,0,box.h??8],[origin.z,dir.z,box.minZ,box.maxZ]]){
  if(Math.abs(d)<1e-9){if(o<lo||o>hi)return null;continue;}
  let t1=(lo-o)/d,t2=(hi-o)/d;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return null;
 }
 return tmin;
}
export function rayGround(origin,dir){if(dir.y>=-1e-9)return null;const t=-origin.y/dir.y;return t>=0?t:null;}
export function hitscan(origin,dir,maxRange,range,boxes=[]){
 let best=null;
 for(const t of range.targets){if(!t.alive)continue;const d=raySphere(origin,dir,t,t.r);if(d!==null&&d<=maxRange&&(!best||d<best.distance))best={target:t,distance:d};}
 let block=rayGround(origin,dir);for(const b of boxes){const d=rayBox(origin,dir,b);if(d!==null&&(block===null||d<block))block=d;}
 if(block!==null&&block<=maxRange&&(!best||block<=best.distance))return {target:null,blocked:true,distance:block,point:{x:origin.x+dir.x*block,y:origin.y+dir.y*block,z:origin.z+dir.z*block}};
 if(!best)return {target:null,blocked:false,distance:maxRange,point:{x:origin.x+dir.x*maxRange,y:origin.y+dir.y*maxRange,z:origin.z+dir.z*maxRange}};
 return {...best,blocked:false,point:{x:origin.x+dir.x*best.distance,y:origin.y+dir.y*best.distance,z:origin.z+dir.z*best.distance}};
}
export function aimDirection(yaw,pitch){const f=forward(yaw),c=Math.cos(pitch);return {x:f.x*c,y:Math.sin(pitch),z:f.z*c};}
function jitter(dir,spread,random){
 if(!spread)return dir;const a=(random()-.5)*2*spread,b=(random()-.5)*2*spread;
 const up=Math.abs(dir.y)>.99?{x:1,y:0,z:0}:{x:0,y:1,z:0};
 const sx={x:dir.y*up.z-dir.z*up.y,y:dir.z*up.x-dir.x*up.z,z:dir.x*up.y-dir.y*up.x},sl=Math.hypot(sx.x,sx.y,sx.z)||1;
 const s={x:sx.x/sl,y:sx.y/sl,z:sx.z/sl},u={x:dir.y*s.z-dir.z*s.y,y:dir.z*s.x-dir.x*s.z,z:dir.x*s.y-dir.y*s.x};
 const out={x:dir.x+s.x*a+u.x*b,y:dir.y+s.y*a+u.y*b,z:dir.z+s.z*a+u.z*b},l=Math.hypot(out.x,out.y,out.z)||1;return {x:out.x/l,y:out.y/l,z:out.z/l};
}
export function createWeaponState(kind='roof'){
 const spec=kind==='plane'?PLANE_GUN:ROOF_GUN;
 return {kind,ammo:spec.belt,belt:spec.belt,reload:0,cooldown:0,rocketCooldown:0,rockets:kind==='plane'?ROCKET.count:0,shots:0,hits:0,kills:0,rocketShots:0,flash:0,effects:[],projectiles:[],serial:0,gunner:false,cruise:0,cruiseSpeed:0,aimYaw:0,aimPitch:0,rearm:0,rearming:false};
}
function pushEffect(w,effect){w.effects.push(effect);if(w.effects.length>24)w.effects.shift();}
function tickTimers(w,h){for(const key of ['cooldown','rocketCooldown','flash'])w[key]=Math.max(0,w[key]-h);w.effects=w.effects.filter(e=>(e.life-=h)>0);}
function tickReload(w,h){
 if(w.reload>0){w.reload=Math.max(0,w.reload-h);if(w.reload===0)w.ammo=w.belt;return true;}
 if(w.ammo<=0){w.reload=w.kind==='plane'?PLANE_GUN.reload:ROOF_GUN.reload;return true;}
 return false;
}
function fireHitscan(w,origin,dir,spec,range,boxes,random){
 const shot=hitscan(origin,jitter(dir,spec.spread,random),spec.range,range,boxes);
 w.ammo--;w.shots++;range.shots++;w.cooldown=spec.interval;w.flash=.06;
 let killed=false;if(shot.target){killed=damageTarget(range,shot.target,spec.damage);w.hits++;if(killed)w.kills++;}
 pushEffect(w,{kind:'tracer',from:{...origin},to:shot.point,hit:!!shot.target,killed,life:.08});
 return shot;
}
// Gunner seat: the rover keeps its heading and current speed for cruiseSeconds, then coasts.
export function enterGunner(w,rover){w.gunner=true;w.cruise=ROOF_GUN.cruiseSeconds;w.cruiseSpeed=Math.max(0,rover.speed);w.aimYaw=rover.yaw;w.aimPitch=0;}
export function leaveGunner(w){w.gunner=false;w.cruise=0;w.cruiseSpeed=0;}
export function gunnerDriveInput(w,rover,dt){
 if(!w.gunner)return null;const h=Math.min(Math.max(0,Number(dt)||0),.25);w.cruise=w.cruise-h<1e-9?0:w.cruise-h;
 if(w.cruise>0&&w.cruiseSpeed>0)return {throttle:clamp((w.cruiseSpeed-rover.speed)*.6,0,1),steer:0,brake:false};
 return {throttle:0,steer:0,brake:false};
}
export function aimTurret(w,dx,dy){w.aimYaw=Math.atan2(Math.sin(w.aimYaw+dx),Math.cos(w.aimYaw+dx));w.aimPitch=clamp(w.aimPitch+dy,ROOF_GUN.pitchMin,ROOF_GUN.pitchMax);}
export function roofMuzzle(w,rover,ground=0){const f=forward(w.aimYaw);return {x:rover.x+f.x*ROOF_GUN.muzzleForward,y:ground+ROOF_GUN.mountHeight,z:rover.z+f.z*ROOF_GUN.muzzleForward};}
export function stepRoofGun(w,rover,input,dt,range,boxes=[],{ground=0,paused=false,random=Math.random}={}){
 if(paused||!Number.isFinite(dt)||dt<=0)return null;const h=Math.min(dt,.25);tickTimers(w,h);
 if(tickReload(w,h))return null;
 if(!w.gunner||!input.fire||w.cooldown>0)return null;
 return fireHitscan(w,roofMuzzle(w,rover,ground),aimDirection(w.aimYaw,w.aimPitch),ROOF_GUN,range,boxes,random);
}
export function planeMuzzle(plane){const f=forward(plane.yaw),c=Math.cos(plane.pitch);return {x:plane.x+f.x*c*PLANE_GUN.muzzleForward,y:plane.y+Math.sin(plane.pitch)*PLANE_GUN.muzzleForward-PLANE_GUN.muzzleDown,z:plane.z+f.z*c*PLANE_GUN.muzzleForward};}
export function stepPlaneGun(w,plane,input,dt,range,boxes=[],{paused=false,random=Math.random}={}){
 if(paused||!Number.isFinite(dt)||dt<=0)return null;const h=Math.min(dt,.25);tickTimers(w,h);
 stepRockets(w,h,range,boxes);
 if(plane.crashed)return null;
 const dir=aimDirection(plane.yaw,plane.pitch);
 if(input.rocket&&w.rockets>0&&w.rocketCooldown===0){
  const m=planeMuzzle(plane);w.projectiles.push({id:++w.serial,x:m.x,y:m.y,z:m.z,vx:dir.x*ROCKET.speed+forward(plane.yaw).x*plane.speed*Math.cos(plane.pitch),vy:dir.y*ROCKET.speed,vz:dir.z*ROCKET.speed+forward(plane.yaw).z*plane.speed*Math.cos(plane.pitch),life:ROCKET.life});
  w.rockets--;w.rocketShots++;w.rocketCooldown=ROCKET.interval;w.flash=.1;pushEffect(w,{kind:'launch',from:m,life:.2});
 }
 if(tickReload(w,h))return null;
 if(!input.fire||w.cooldown>0)return null;
 return fireHitscan(w,planeMuzzle(plane),dir,PLANE_GUN,range,boxes,random);
}
function segmentSphere(a,b,c,r){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);if(l<1e-9)return Math.hypot(a.x-c.x,a.y-c.y,a.z-c.z)<=r?0:null;const t=raySphere(a,{x:dx/l,y:dy/l,z:dz/l},c,r);return t!==null&&t<=l?t/l:null;}
function explode(w,range,x,y,z){
 pushEffect(w,{kind:'blast',at:{x,y,z},life:.5});let killed=0;
 for(const t of range.targets){if(!t.alive)continue;const d=Math.hypot(t.x-x,t.y-y,t.z-z)-t.r;if(d>ROCKET.splash)continue;const amount=ROCKET.damage*(1-Math.max(0,d)/ROCKET.splash);w.hits++;if(damageTarget(range,t,amount)){killed++;w.kills++;}}
 return killed;
}
export function stepRockets(w,h,range,boxes=[]){
 const keep=[];
 for(const p of w.projectiles){
  const a={x:p.x,y:p.y,z:p.z},b={x:p.x+p.vx*h,y:p.y+p.vy*h,z:p.z+p.vz*h};
  let first=null,where=b;
  for(const t of range.targets){if(!t.alive)continue;const s=segmentSphere(a,b,t,t.r);if(s!==null&&(first===null||s<first)){first=s;where={x:a.x+(b.x-a.x)*s,y:a.y+(b.y-a.y)*s,z:a.z+(b.z-a.z)*s};}}
  if(first===null){
   const l=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(l>1e-9){const dir={x:(b.x-a.x)/l,y:(b.y-a.y)/l,z:(b.z-a.z)/l};let block=rayGround(a,dir);for(const box of boxes){const d=rayBox(a,dir,box);if(d!==null&&(block===null||d<block))block=d;}if(block!==null&&block<=l){first=block/l;where={x:a.x+dir.x*block,y:a.y+dir.y*block,z:a.z+dir.z*block};}}
  }
  if(first!==null){explode(w,range,where.x,where.y,where.z);continue;}
  p.x=b.x;p.y=b.y;p.z=b.z;p.life-=h;p.vy-=4*h;
  if(p.life<=0){explode(w,range,p.x,p.y,p.z);continue;}
  keep.push(p);
 }
 w.projectiles=keep;
}
// Rearm at a berth: parked and stopped for rearmSeconds refills the belt and rockets.
export function stepRearm(w,vehicle,dt,station,{paused=false,stopped=null}={}){
 if(paused||!Number.isFinite(dt)||dt<=0)return false;
 const still=stopped??Math.abs(Number(vehicle.speed)||0)<=.6,inside=!!station&&Math.hypot(vehicle.x-station.x,vehicle.z-station.z)<=station.radius;
 const full=w.ammo===w.belt&&w.reload===0&&(w.kind!=='plane'||w.rockets===ROCKET.count);
 if(!inside||!still||full){w.rearm=0;w.rearming=false;return false;}
 w.rearming=true;w.rearm+=Math.min(dt,.25);if(w.rearm+1e-9<ROCKET.rearmSeconds)return false;
 w.rearm=0;w.rearming=false;w.reload=0;w.ammo=w.belt;if(w.kind==='plane')w.rockets=ROCKET.count;return true;
}
export function weaponSummary(w){
 return {ammo:w.ammo,belt:w.belt,reloading:w.reload>0,reloadPercent:w.reload>0?Math.round((1-w.reload/(w.kind==='plane'?PLANE_GUN.reload:ROOF_GUN.reload))*100):100,rockets:w.rockets,shots:w.shots,hits:w.hits,kills:w.kills,accuracy:w.shots?Math.round(w.hits/w.shots*100):0,gunner:w.gunner,cruise:w.cruise,rearming:w.rearming,rearmPercent:Math.min(100,Math.round(w.rearm/ROCKET.rearmSeconds*100))};
}
export function rangeSummary(range){const alive=range.targets.filter(t=>t.alive).length;return {alive,total:range.targets.length,kills:range.kills,shots:range.shots,hits:range.hits};}
export function nearestTarget(range,origin,maxRange=Infinity,type=null){let best=null;for(const t of aliveTargets(range,type)){const d=Math.hypot(t.x-origin.x,(t.y??0)-(origin.y??0),t.z-origin.z);if(d<=maxRange&&(!best||d<best.distance))best={target:t,distance:d};}return best;}
export {right};
