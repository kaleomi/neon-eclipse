// Helicopter sling load: pick up a cargo crate from a hover, carry it on a cable, set it down in a drop zone.
// Pure rules (no DOM/three). Cargo follows the hook point with a damped spring so it lags/swings under acceleration.
import {HELICOPTER} from './helicopter-rules.js';
import {LIGHTHOUSE_ISLAND} from './maritime-rules.js';
export const SLING=Object.freeze({
 cable:9,            // m from belly hook to cargo top when taut
 hookRadius:4,       // horizontal m within which F hooks a resting crate
 hookMinHeight:5,hookMaxHeight:14, // hover band above the crate for hooking
 cargoHeight:1.6,cargoMass:1,
 spring:14,damping:4.5,            // horizontal follow
 safeDrop:3.2,       // m/s vertical impact that still counts as intact
 zoneRadius:7
});
export const SLING_CARGO=Object.freeze({id:'crate',x:214,z:104,name:'物资吊箱'});
export const SLING_ZONES=Object.freeze([
 {id:'garage',x:-92,z:118,name:'车库物资区'},
 {id:'island',x:LIGHTHOUSE_ISLAND.x-10,z:LIGHTHOUSE_ISLAND.z+6,name:'灯塔岛平台'}
]);
export function createSling(cargo=SLING_CARGO,zones=SLING_ZONES){
 return {cargo:{x:cargo.x,y:0,z:cargo.z,vx:0,vz:0,vy:0,resting:true,intact:true},hooked:false,cable:0,zones:zones.map(z=>({...z})),deliveries:0,drops:0,damaged:0,lastEvent:null,elapsedHooked:0};
}
function hookPoint(h){return {x:h.x,y:h.y-HELICOPTER.height*.35,z:h.z};}
// Can the crew hook right now? Returns null when allowed or a reason string.
export function hookBlocked(s,h,groundAt=()=>0){
 if(s.hooked)return null;
 if(!h.powered||h.grounded||h.status!=='running')return '需在空中悬停';
 const c=s.cargo;const d=Math.hypot(h.x-c.x,h.z-c.z);if(d>SLING.hookRadius)return '横向偏差 '+d.toFixed(1)+' m，需 ≤ '+SLING.hookRadius+' m';
 const above=hookPoint(h).y-(c.y+SLING.cargoHeight);
 if(above<SLING.hookMinHeight)return '太低，拉起到 '+SLING.hookMinHeight+' m 以上';
 if(above>SLING.hookMaxHeight)return '太高，下降到 '+SLING.hookMaxHeight+' m 以内';
 const speed=Math.hypot(h.vx||0,h.vz||0);if(speed>1.5)return '悬停速度过快 '+speed.toFixed(1)+' m/s';
 return null;
}
export function toggleHook(s,h,groundAt=()=>0){
 if(s.hooked){s.hooked=false;s.cable=0;s.lastEvent='release';return {ok:true,event:'release'};}
 const why=hookBlocked(s,h,groundAt);if(why)return {ok:false,reason:why};
 s.hooked=true;s.cable=SLING.cable;s.cargo.resting=false;s.elapsedHooked=0;s.lastEvent='hook';return {ok:true,event:'hook'};
}
export function zoneAt(s,x,z){return s.zones.find(zn=>Math.hypot(zn.x-x,zn.z-z)<=SLING.zoneRadius)||null;}
// Advance cargo. When hooked the crate hangs below the hook (cable length), horizontally following with a spring; the
// cable goes slack (crate rests) if the ground is closer than the cable. When free it falls under gravity and settles.
export function stepSling(s,h,dt,groundAt=()=>0){
 if(!Number.isFinite(dt)||dt<=0)return null;const c=s.cargo;const step=Math.min(dt,.05);let event=null;
 const g=groundAt(c.x,c.z);
 if(s.hooked){
  s.elapsedHooked+=step;
  const hp=hookPoint(h);
  const ax=(hp.x-c.x)*SLING.spring-c.vx*SLING.damping,az=(hp.z-c.z)*SLING.spring-c.vz*SLING.damping;
  c.vx+=ax*step;c.vz+=az*step;c.x+=c.vx*step;c.z+=c.vz*step;
  const hang=hp.y-s.cable-SLING.cargoHeight;const floor=groundAt(c.x,c.z);
  if(hang<=floor){c.y=floor;c.vy=0;if(!c.resting){c.resting=true;event='touchdown';}}
  else{c.vy=(hang-c.y)/step;c.y=hang;c.resting=false;}
  if(h.status==='crashed'){s.hooked=false;s.cable=0;event='release';}
 }else if(!c.resting){
  c.vy-=HELICOPTER.gravity*step;c.y+=c.vy*step;c.x+=c.vx*step;c.z+=c.vz*step;c.vx*=Math.max(0,1-step*2);c.vz*=Math.max(0,1-step*2);
  if(c.y<=g){c.y=g;c.resting=true;const impact=-c.vy;c.vy=c.vx=c.vz=0;
   if(impact>SLING.safeDrop){c.intact=false;s.damaged++;event='damaged';}
   else{const zone=zoneAt(s,c.x,c.z);if(zone){s.deliveries++;zone.delivered=(zone.delivered||0)+1;event='delivered';}else{s.drops++;event='dropped';}}}
 }
 if(event)s.lastEvent=event;return event;
}
// Extra body pitch/roll the pilot feels: load lag pulls the nose toward the crate. Pure helper for the renderer/HUD.
export function slingSummary(s,h){
 const c=s.cargo;const dx=c.x-h.x,dz=c.z-h.z;const swing=s.hooked?Math.hypot(dx,dz):0;
 return {hooked:s.hooked,swing,cargoY:c.y,resting:c.resting,intact:c.intact,deliveries:s.deliveries,drops:s.drops,damaged:s.damaged,cable:s.cable,lastEvent:s.lastEvent};
}
export function slingHint(s,h,groundAt){
 if(s.hooked)return '吊挂中 · 保持平稳飞行 · 到投放区上空缓慢下降，吊箱触地后按 F 脱钩';
 const why=hookBlocked(s,h,groundAt);return why?('吊挂：'+why):'吊挂就位 · 按 F 挂钩';
}
