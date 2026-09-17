import {flightHeadingControls} from './flight-heading.js';
import {forward,right} from './vehicle-rules.js';
import {FIELD,PLANE_SPAWN,landSurface,ISLANDS,clamp} from './maritime-rules.js';
export const AIRCRAFT={stallSpeed:22,takeoffSpeed:28,maxSpeed:78,landingMaxSpeed:48,ceiling:300};
export const FLIGHT_GATES=[{x:-300,y:45,z:-280,name:'起飞爬升门'},{x:-65,y:95,z:-420,name:'北侧转弯门'},{x:270,y:100,z:-180,name:'海岸巡航门'},{x:120,y:70,z:120,name:'返场导航门'},{x:-200,y:40,z:80,name:'进场准备门'}];
export function createPlane(){return {...PLANE_SPAWN,pitch:0,roll:0,speed:0,throttle:0,verticalSpeed:0,onGround:true,crashed:false,stall:false,distance:0,impacts:0,landings:0};}
export function planeClear(s,boxes){
 const f=forward(s.yaw),r=right(s.yaw),points=[[0,0],[0,3.8],[0,-3.8],[-5.5,0],[5.5,0]];
 for(const [side,along] of points){
  const x=s.x+r.x*side+f.x*along,z=s.z+r.z*side+f.z*along;
  if(Math.abs(x)+1.2>FIELD.bounds||Math.abs(z)+1.2>FIELD.bounds)return false;
  for(const b of boxes){if(s.y-1>(b.h||8))continue;const dx=x-clamp(x,b.minX,b.maxX),dz=z-clamp(z,b.minZ,b.maxZ);if(dx*dx+dz*dz<1.44)return false;}
  for(const island of ISLANDS)if(s.y-1<island.h&&Math.hypot(x-island.x,z-island.z)<island.r+1.2)return false;
 }
 return true;
}
function crash(s){s.crashed=true;s.speed=0;s.throttle=0;s.verticalSpeed=0;s.impacts++;}
export function stepPlane(s,input,dt,boxes=[]){
 if(input.paused||s.crashed||!Number.isFinite(dt)||dt<=0)return;
 let manualHeadingDelta=0;
 const n=Math.ceil(Math.min(dt,.25)*120),h=Math.min(dt,.25)/n;
 for(let i=0;i<n;i++){
  s.throttle=clamp(s.throttle+(Number(input.throttle)||0)*.4*h,0,1);
  const drag=1.2+s.speed*.035+s.speed*s.speed*.002;
  s.speed=clamp(s.speed+(s.throttle*21-drag-(s.onGround&&input.brake?28:0))*h,0,AIRCRAFT.maxSpeed);
  const steering=Number.isFinite(input.heading)&&!input.roll&&!input.rudder?flightHeadingControls(s,input.heading+manualHeadingDelta):input;
  const assist=clamp(Number(input.rudderAssist)||0,-1,1),assistDelta=assist*(s.onGround?s.speed/(12+s.speed)*.65:.2)*h;
  manualHeadingDelta+=assistDelta;
  const elevator=clamp(Number(input.elevator)||0,-1,1),bank=clamp(Number(steering.roll)||0,-1,1);
  s.pitch=clamp(s.pitch+(elevator*.5-s.pitch*.32)*h,s.onGround?0:-.55,s.onGround?.16:.55);
  if(s.onGround){s.roll=0;s.yaw+=bank*s.speed/(12+s.speed)*.65*h;if(s.speed>=AIRCRAFT.takeoffSpeed&&s.pitch>.07){s.onGround=false;s.y+=.04;}}
  else{
   s.roll+=(bank*.82-s.roll)*(1-Math.exp(-2*h));
   s.yaw+=(Math.tan(s.roll)*9.81/Math.max(s.speed,12)+clamp(Number(steering.rudder)||0,-1,1)*.2)*h;
  }
  s.yaw+=assistDelta;
  const previous={x:s.x,y:s.y,z:s.z};s.stall=!s.onGround&&s.speed<AIRCRAFT.stallSpeed;
  s.verticalSpeed=s.onGround?0:Math.sin(s.pitch)*s.speed-(s.stall?(AIRCRAFT.stallSpeed-s.speed)*1.05:0);
  if(s.y>=FIELD.ceiling&&s.verticalSpeed>0){s.verticalSpeed=0;s.pitch=Math.min(s.pitch,0);}
  const f=forward(s.yaw),horizontal=s.onGround?s.speed:s.speed*Math.cos(s.pitch);
  s.x+=f.x*horizontal*h;s.z+=f.z*horizontal*h;s.y+=s.verticalSpeed*h;
  if(!planeClear(s,boxes)){Object.assign(s,previous);crash(s);break;}
  if(!s.onGround&&s.y<=1.3){
   if(!landSurface(s.x,s.z,7)||Math.abs(s.verticalSpeed)>6||Math.abs(s.roll)>.3||s.speed>AIRCRAFT.landingMaxSpeed||Math.abs(s.pitch)>.3){s.y=Math.max(1.3,s.y);crash(s);break;}
   s.onGround=true;s.y=1.3;s.pitch=0;s.roll=0;s.verticalSpeed=0;s.landings++;
  }
  if(s.onGround&&!landSurface(s.x,s.z,7)){Object.assign(s,previous);crash(s);break;}
  s.distance+=Math.hypot(s.x-previous.x,s.y-previous.y,s.z-previous.z);s.yaw=Math.atan2(Math.sin(s.yaw),Math.cos(s.yaw));
 }
 return manualHeadingDelta;
}
export function planeExit(s,footWorld){
 if(!s.onGround||s.y>2)return {ok:false,reason:'飞机仍在空中，不能离机。请安全降落。'};
 if(s.crashed)return {ok:false,reason:'飞机已受损，请在暂停菜单回收。'};
 if(s.speed>1)return {ok:false,reason:'请将飞机刹停，再离开座舱。'};
 const r=right(s.yaw),f=forward(s.yaw);
 for(const [side,along] of [[-8.5,0],[8.5,0],[-7,-4],[7,-4],[0,-7]]){
  const p={x:s.x+r.x*side+f.x*along,z:s.z+r.z*side+f.z*along};
  if(footWorld.free(p.x,p.z,.4)&&footWorld.geometry.clearSegment(s,p,.4))return {ok:true,...p};
 }
 return {ok:false,reason:'机身周围没有安全落脚点。'};
}
export function canBoardPlane(player,s,footWorld){return !s.crashed&&s.onGround&&s.speed<=1&&Math.hypot(player.x-s.x,player.z-s.z)<=10&&footWorld.geometry.clearSegment(player,s,.4);}
