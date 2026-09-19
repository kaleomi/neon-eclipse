import {forward,right} from './vehicle-rules.js';
export const FIELD={bounds:600,coast:220,ceiling:300};
export const YACHT=Object.freeze({maxSpeed:32,reverseSpeed:7,thrust:9,braking:12,linearDrag:.1,quadraticDrag:.0018,steerResponse:4.5});
export const YACHT_SPAWN={x:278,z:180,yaw:0};
export const PLANE_SPAWN={x:-300,z:220,yaw:0,y:1.3};
export const DOCK={minX:205,maxX:272,minZ:174,maxZ:186};
export const GANGWAY={minX:270,maxX:275,minZ:178.5,maxZ:181.5};
export const ISLANDS=[{x:440,z:-230,r:35,h:6},{x:500,z:260,r:28,h:9}];
export const LIGHTHOUSE_ISLAND=ISLANDS[1];
// Floating pier runs north from the lighthouse island top down to water level (rising with z); the yacht parks alongside its west face.
export const ISLAND_PIER={minX:496,maxX:504,minZ:204,maxZ:240,low:.85};
export const LIGHTHOUSE_LANDING={x:491,z:216,yaw:0};
// Offshore platform (expedition mission 7): a raised steel deck on legs north-east of the marina. Boats cannot enter its footprint; feet and helicopters use the deck.
export const PLATFORM={minX:400,maxX:440,minZ:40,maxZ:80,h:12};
const onIsland=(x,z,r)=>Math.hypot(x-LIGHTHOUSE_ISLAND.x,z-LIGHTHOUSE_ISLAND.z)+r<=LIGHTHOUSE_ISLAND.r*.78;
export const FIELD_BUILDINGS=[{minX:-365,maxX:-325,minZ:175,maxZ:225,h:13},{minX:-366,maxX:-335,minZ:80,maxZ:130,h:9},{minX:173,maxX:205,minZ:218,maxZ:247,h:7}];
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const inRect=(x,z,b,r=0)=>x-r>=b.minX&&x+r<=b.maxX&&z-r>=b.minZ&&z+r<=b.maxZ;
export function isFootSurface(x,z,r=.4){return Math.abs(x)+r<=FIELD.bounds&&Math.abs(z)+r<=FIELD.bounds&&(x+r<=FIELD.coast||inRect(x,z,DOCK,r)||inRect(x,z,GANGWAY,r)||inRect(x,z,ISLAND_PIER,r)||inRect(x,z,PLATFORM,r)||onIsland(x,z,r));}
export function footHeight(x,z){
 if(x>=205&&((x<=272&&z>=174&&z<=186)||(x<=275&&z>=178.5&&z<=181.5)))return .85;
 if(onIsland(x,z,0))return LIGHTHOUSE_ISLAND.h;
 if(inRect(x,z,PLATFORM,0))return PLATFORM.h;
 if(inRect(x,z,ISLAND_PIER,0))return ISLAND_PIER.low+(LIGHTHOUSE_ISLAND.h-ISLAND_PIER.low)*clamp((z-ISLAND_PIER.minZ)/(ISLAND_PIER.maxZ-ISLAND_PIER.minZ),0,1);
 return 0;
}
export function landSurface(x,z,r=1){return x+r<=FIELD.coast&&Math.abs(x)+r<=FIELD.bounds&&Math.abs(z)+r<=FIELD.bounds;}
export function waterFree(x,z,r=2.7){
 if(x-r<=FIELD.coast||x+r>FIELD.bounds||Math.abs(z)+r>FIELD.bounds)return false;
 for(const b of [DOCK,ISLAND_PIER,PLATFORM]){const dx=x-clamp(x,b.minX,b.maxX),dz=z-clamp(z,b.minZ,b.maxZ);if(dx*dx+dz*dz<r*r)return false;}
 return ISLANDS.every(i=>Math.hypot(x-i.x,z-i.z)>i.r+r);
}
export function createYacht(){return {...YACHT_SPAWN,speed:0,steer:0,distance:0,impacts:0,cooldown:0};}
export function yachtFree(s){const f=forward(s.yaw);return [-4,0,4].every(d=>waterFree(s.x+f.x*d,s.z+f.z*d,2.7));}
export function stepYacht(s,input,dt){
 if(input.paused||!Number.isFinite(dt)||dt<=0)return;
 const count=Math.ceil(Math.min(dt,.25)*120),h=Math.min(dt,.25)/count;
 for(let i=0;i<count;i++){
  s.cooldown=Math.max(0,s.cooldown-h);const throttle=clamp(Number(input.throttle)||0,-1,1);s.steer+=(clamp(Number(input.steer)||0,-1,1)-s.steer)*(1-Math.exp(-YACHT.steerResponse*h));
  const oldSpeed=s.speed;let thrust=throttle*(s.speed*throttle<0?YACHT.braking:YACHT.thrust);
  if(input.brake)thrust=-Math.sign(s.speed)*YACHT.braking;
  s.speed=clamp(s.speed+(thrust-s.speed*YACHT.linearDrag-s.speed*Math.abs(s.speed)*YACHT.quadraticDrag-Math.sign(s.speed)*.13)*h,-YACHT.reverseSpeed,YACHT.maxSpeed);
  if((!throttle||input.brake)&&s.speed*oldSpeed<0)s.speed=0;
  const yaw=s.yaw+s.speed/(7+Math.abs(s.speed)*.4)*Math.tan(s.steer*.65/(1+.8*(Math.abs(s.speed)/YACHT.maxSpeed)**2))*h,f=forward((yaw+s.yaw)/2);
  const candidate={x:s.x+f.x*s.speed*h,z:s.z+f.z*s.speed*h,yaw};
  if(yachtFree(candidate)){s.distance+=Math.hypot(candidate.x-s.x,candidate.z-s.z);Object.assign(s,candidate);}
  else{if(Math.abs(s.speed)>1.2&&!s.cooldown){s.impacts++;s.cooldown=1;}s.speed=0;}
  s.yaw=Math.atan2(Math.sin(s.yaw),Math.cos(s.yaw));
 }
}
export function yachtExit(s,footWorld){
 if(Math.abs(s.speed)>.6)return {ok:false,reason:'请先将游艇停稳，再靠泊下船。'};
 const f=forward(s.yaw),r=right(s.yaw);
 for(const [side,along] of [[-6,0],[6,0],[-6,-2],[6,-2],[0,-9]]){
  const p={x:s.x+r.x*side+f.x*along,z:s.z+r.z*side+f.z*along};
  if(footWorld.free(p.x,p.z,.4)&&footWorld.geometry.clearSegment(s,p,.4))return {ok:true,...p};
 }
 return {ok:false,reason:'此处无法安全下船。请靠近码头或登船栈桥。'};
}
export function canBoardYacht(player,s,footWorld){const exit=yachtExit(s,footWorld);return exit.ok&&Math.hypot(player.x-s.x,player.z-s.z)<9&&Math.hypot(player.x-exit.x,player.z-exit.z)<3.5;}
export function bodyBlocksPlayer(x,z,plane,yacht){
 const planeF=forward(plane.yaw),planeR=right(plane.yaw),shipF=forward(yacht.yaw);
 if(plane.onGround&&Math.hypot(x-plane.x,z-plane.z)<9){
  const points=[[0,-3],[0,0],[0,3],[-5,0],[5,0]];
  if(points.some(([a,b])=>Math.hypot(x-plane.x-planeR.x*a-planeF.x*b,z-plane.z-planeR.z*a-planeF.z*b)<1.6))return true;
 }
 return [-4,0,4].some(d=>Math.hypot(x-yacht.x-shipF.x*d,z-yacht.z-shipF.z*d)<3.1);
}
export const WATER_GATES=[{x:350,z:180,name:'离港水道'},{x:475,z:70,name:'外湾浮标'},{x:470,z:-90,name:'北湾转向'},{x:300,z:-110,name:'返港水道'},{x:310,z:160,name:'靠泊引导'}];
export function routeStep(route,gates,from,to,dt,enabled,radius=15,vertical=false){
 if(route.complete)return false;if(route.started)route.elapsed+=dt;
 if(!enabled)return false;const target=gates[route.index];
 const axes=vertical?['x','y','z']:['x','z'];let length=0,dot=0;
 for(const key of axes){const d=to[key]-from[key];length+=d*d;dot+=(target[key]-from[key])*d;}
 const t=length?clamp(dot/length,0,1):0;
 const distance=Math.sqrt(axes.reduce((sum,key)=>sum+(from[key]+(to[key]-from[key])*t-target[key])**2,0));
 if(distance>radius)return false;route.started=true;route.index++;route.complete=route.index===gates.length;return true;
}
