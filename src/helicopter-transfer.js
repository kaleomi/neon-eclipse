import {HELICOPTER,HELICOPTER_SITE,helicopterSpeed,startHelicopter} from './helicopter-rules.js';

// Scene/storage-independent occupancy and ground movement. Call only during active simulation.
export const HELICOPTER_TRANSFER=Object.freeze({radius:.4,height:1.75,speed:3.2,turn:1.7,doorOffset:3.3,doorReach:1.8,stoppedRPM:.08});
const axis=n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0;
const reject=reason=>({ok:false,reason,event:null});
const finitePose=s=>s&&['x','y','z','yaw','vx','vy','vz','rpm','pitch','roll','yawRate'].every(k=>Number.isFinite(s[k]));
export function createHelicopterTransfer(craft){return {seat:'pilot',walker:{x:craft.x,y:0,z:craft.z,yaw:craft.yaw},remainder:0,sequence:0,lastEvent:null};}
export function helicopterGroundGate(s){
  if(!finitePose(s)||s.status!=='running')return '直升机尚未就绪或已损坏';
  if(!s.grounded||Math.abs(s.y)>.02)return '必须先安全落地';
  if(helicopterSpeed(s)>.15||Math.abs(s.vy)>.1||Math.abs(s.yawRate)>.05||Math.abs(s.pitch)>.04||Math.abs(s.roll)>.04)return '等待机身停稳并保持水平';
  return null;
}
function stoppedGate(s){return helicopterGroundGate(s)||(s.powered?'先按 I 熄火':s.rpm>HELICOPTER_TRANSFER.stoppedRPM?'等待旋翼降至 8% 以下':null);}
const local=(p,s)=>{const x=p.x-s.x,z=p.z-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);return {x:x*c+z*n,z:-x*n+z*c};};
export function helicopterDoors(s){const c=Math.cos(s.yaw),n=Math.sin(s.yaw);return [1,-1].map(side=>({x:s.x+side*HELICOPTER_TRANSFER.doorOffset*c,y:0,z:s.z+side*HELICOPTER_TRANSFER.doorOffset*n,yaw:s.yaw}));}
// Swept segment/AABB, including endpoints. Prevents walking or exiting through thin walls.
function crosses(a,b,box,r){
  let lo=0,hi=1;
  for(const [key,min,max] of [['x','minX','maxX'],['z','minZ','maxZ']]){
    const d=b[key]-a[key],low=box[min]-r,high=box[max]+r;
    if(Math.abs(d)<1e-12){if(a[key]<low||a[key]>high)return false;}
    else{const u=(low-a[key])/d,v=(high-a[key])/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;}
  }
  return true;
}
export function helicopterWalkClear(a,b,s,site=HELICOPTER_SITE,{includeCraft=true}={}){
  const r=HELICOPTER_TRANSFER.radius;
  if(![a.x,a.z,b.x,b.z,site.bounds].every(Number.isFinite)||site.bounds<=r)return false;
  if([a,b].some(p=>Math.abs(p.x)+r>=site.bounds||Math.abs(p.z)+r>=site.bounds))return false;
  if(site.obstacles.some(o=>o.maxY>0&&o.minY<HELICOPTER_TRANSFER.height&&crosses(a,b,o,r)))return false;
  // Conservative body, skid and tail exclusion; the stopped main rotor is above walking height.
  return !includeCraft||!crosses(local(a,s),local(b,s),{minX:-1.8,maxX:1.8,minZ:-2.7,maxZ:5.8},r);
}
function event(t,type){t.lastEvent=Object.freeze({sequence:++t.sequence,type});t.remainder=0;return {ok:true,reason:'',event:t.lastEvent};}
export function setHelicopterEngine(t,s,powered,{active=true}={}){
  if(!active)return reject('暂停期间不能操作');
  if(t.seat!=='pilot')return reject('请先回到舱门登机');
  const reason=helicopterGroundGate(s);if(reason)return reject(reason);
  if(typeof powered!=='boolean')return reject('无效的发动机指令');
  if(s.powered===powered)return reject(powered?'发动机已经启动':'发动机已经熄火');
  if(powered)startHelicopter(s);else{s.powered=false;s.collective=0;}
  return event(t,powered?'engine-started':'engine-stopped');
}
export function exitHelicopter(t,s,{site=HELICOPTER_SITE,active=true}={}){
  if(!active)return reject('暂停期间不能操作');
  if(t.seat!=='pilot')return reject('当前已经在步行');
  const reason=stoppedGate(s);if(reason)return reject(reason);
  const door=helicopterDoors(s).find(p=>helicopterWalkClear(s,p,s,site,{includeCraft:false})&&helicopterWalkClear(p,p,s,site));
  if(!door)return reject('两侧舱门都没有安全下机空间');
  t.walker={...door};t.seat='foot';return event(t,'exited');
}
export function boardHelicopter(t,s,{site=HELICOPTER_SITE,active=true}={}){
  if(!active)return reject('暂停期间不能操作');
  if(t.seat!=='foot')return reject('当前已经在驾驶位');
  const reason=stoppedGate(s);if(reason)return reject(reason);
  const door=helicopterDoors(s).find(p=>Math.hypot(t.walker.x-p.x,t.walker.z-p.z)<=HELICOPTER_TRANSFER.doorReach&&helicopterWalkClear(t.walker,p,s,site));
  if(!door)return reject('走近机身侧面的舱门标记，不能穿墙登机');
  t.seat='pilot';return event(t,'boarded'); // Boarding never starts the engine implicitly.
}
export function stepHelicopterWalking(t,s,input={},dt,site=HELICOPTER_SITE){
  if(t.seat!=='foot'||input?.paused||stoppedGate(s)||!Number.isFinite(dt)||dt<=0)return 0;
  input=input||{};t.remainder+=Math.min(dt,HELICOPTER.maxFrame);let advanced=0;
  while(t.remainder+1e-10>=HELICOPTER.step){
    const h=HELICOPTER.step,p=t.walker;t.remainder=Math.max(0,t.remainder-h);advanced+=h;
    p.yaw=Math.atan2(Math.sin(p.yaw+axis(input.yaw)*HELICOPTER_TRANSFER.turn*h),Math.cos(p.yaw+axis(input.yaw)*HELICOPTER_TRANSFER.turn*h));
    const f=axis(input.forward),r=axis(input.right),norm=Math.max(1,Math.hypot(f,r)),v=HELICOPTER_TRANSFER.speed*h/norm;
    const dx=(f*Math.sin(p.yaw)+r*Math.cos(p.yaw))*v,dz=(-f*Math.cos(p.yaw)+r*Math.sin(p.yaw))*v;
    // Independent axis sweeps permit sliding along a wall without tunnelling through its corner.
    let next={x:p.x+dx,z:p.z};if(helicopterWalkClear(p,next,s,site))p.x=next.x;
    next={x:p.x,z:p.z+dz};if(helicopterWalkClear(p,next,s,site))p.z=next.z;
  }
  return advanced;
}
// Detached, frozen task port: callers cannot mutate craft/occupancy through a snapshot.
export function helicopterTaskSnapshot(t,s){
  const craft=Object.freeze({x:s.x,y:s.y,z:s.z,yaw:s.yaw,grounded:s.grounded,powered:s.powered,rpm:s.rpm,status:s.status,speed:helicopterSpeed(s),verticalSpeed:s.vy,landings:s.landings});
  return Object.freeze({version:1,vehicle:'helicopter',seat:t.seat,craft,operator:Object.freeze({...t.walker}),sequence:t.sequence,event:t.lastEvent});
}
