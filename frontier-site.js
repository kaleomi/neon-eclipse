// Shared geometry for expedition missions 6–8 (wind farm, offshore platform, radar station) plus the on-foot marksman rifle.
// Pure rules, no rendering. Coordinates are metres; the field is the sea/land/air proving ground (coast at x=220).
import {FIELD,PLATFORM,clamp} from './maritime-rules.js';
import {hitscan,damageTarget,aimDirection} from './vehicle-weapons.js';
export {PLATFORM};
// ---- Wind farm (north land, z -300..-520). Turbine towers block vehicles, aircraft and shots.
export const TURBINES=Object.freeze([[-90,-330],[-10,-270],[60,-340],[-70,-420],[110,-450],[-120,-480],[-40,-540],[60,-540]].map(([x,z])=>Object.freeze({x,z,r:2,h:60,hub:44})));
export const WIND_GATES=Object.freeze([{x:-40,z:-300,name:'风电场入口'},{x:65,z:-400,name:'东侧机组间'},{x:40,z:-480,name:'北侧机组间'}].map(Object.freeze));
// Control tower: square deck 10 m up, reached by a ramp rising northwards from ground level.
export const CONTROL_TOWER=Object.freeze({x:0,z:-380,half:5,h:14,ramp:Object.freeze({minX:-2,maxX:2,minZ:-375,maxZ:-340})});
export const FARM_HELIPAD=Object.freeze({x:40,z:-360,y:0,r:7});
export const AIRFIELD_HELIPAD=Object.freeze({x:-262,z:200,y:0,r:8});
// ---- Offshore platform (deck height PLATFORM.h, east of the marina). Helipad on the south-east corner, charge core near centre, escape boat moored on the west face.
export const PLATFORM_HELIPAD=Object.freeze({x:432,z:72,y:PLATFORM.h,r:5.5});
export const PLATFORM_CORE=Object.freeze({x:418,z:60});
export const PLATFORM_MOORING=Object.freeze({x:393,z:60,yaw:-Math.PI/2});
export const PLATFORM_TURRETS=Object.freeze([{x:410,z:48},{x:432,z:48},{x:412,z:74}].map(Object.freeze));
// ---- Radar station (north-east land). Dishes sit on masts; the gate is on its south side.
export const RADAR_STATION=Object.freeze({x:150,z:-430,perimeter:60,gate:Object.freeze({x:150,z:-368})});
export const RADAR_DISHES=Object.freeze([{x:120,z:-400},{x:180,z:-405},{x:150,z:-470}].map(d=>Object.freeze({...d,r:3,h:8})));
export const MECH_SPAWN=Object.freeze({x:150,z:-505});
const inRect=(x,z,b,r=0)=>x-r>=b.minX&&x+r<=b.maxX&&z-r>=b.minZ&&z+r<=b.maxZ;
const onTowerDeck=(x,z,r=0)=>Math.abs(x-CONTROL_TOWER.x)+r<=CONTROL_TOWER.half&&Math.abs(z-CONTROL_TOWER.z)+r<=CONTROL_TOWER.half;
// Elevated foot surfaces added by these missions (tower deck + ramp). The platform deck lives in maritime-rules.
export function siteHeight(x,z){
 if(onTowerDeck(x,z))return CONTROL_TOWER.h;
 const rp=CONTROL_TOWER.ramp;if(inRect(x,z,rp))return CONTROL_TOWER.h*clamp((rp.maxZ-z)/(rp.maxZ-rp.minZ),0,1);
 return 0;
}
export const onControlTower=(x,z)=>onTowerDeck(x,z,.3);
// Walking: a step taller than knee height is a wall (deck edges), except along the ramp.
export function stepAllowed(from,to,heightAt){return Math.abs(heightAt(to.x,to.z)-heightAt(from.x,from.z))<=1.2;}
// Vehicle blockers: turbine towers, the control tower body (not its ramp), dish masts.
export const SITE_VEHICLE_BOXES=Object.freeze([
 ...TURBINES.map(t=>({minX:t.x-t.r,maxX:t.x+t.r,minZ:t.z-t.r,maxZ:t.z+t.r,h:t.h})),
 {minX:CONTROL_TOWER.x-CONTROL_TOWER.half,maxX:CONTROL_TOWER.x+CONTROL_TOWER.half,minZ:CONTROL_TOWER.z-CONTROL_TOWER.half,maxZ:CONTROL_TOWER.z+CONTROL_TOWER.half,h:CONTROL_TOWER.h},
 ...RADAR_DISHES.map(d=>({minX:d.x-1.5,maxX:d.x+1.5,minZ:d.z-1.5,maxZ:d.z+1.5,h:d.h}))
].map(Object.freeze));
export function siteBlocksVehicle(x,z,r){return SITE_VEHICLE_BOXES.some(b=>{const dx=x-clamp(x,b.minX,b.maxX),dz=z-clamp(z,b.minZ,b.maxZ);return dx*dx+dz*dz<r*r;});}
// Helicopter obstacle envelopes for helicopter-rules `site.obstacles` (minY/maxY).
export const SITE_HELI_OBSTACLES=Object.freeze(SITE_VEHICLE_BOXES.map((b,i)=>Object.freeze({id:'site-'+i,minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ,minY:0,maxY:b.h})));
export const FRONTIER_HELIPADS=Object.freeze({farm:FARM_HELIPAD,airfield:AIRFIELD_HELIPAD,platform:PLATFORM_HELIPAD});
// ---- On-foot marksman rifle. Fires through vehicle-weapons hitscan so mission hostiles and range targets share one damage path.
export const RIFLE=Object.freeze({interval:.8,damage:22,range:240,belt:8,reload:2.2,spread:.0025,eye:1.6});
export function createRifle(){return {kind:'rifle',ammo:RIFLE.belt,belt:RIFLE.belt,reload:0,cooldown:0,rocketCooldown:0,rockets:0,shots:0,hits:0,kills:0,rocketShots:0,flash:0,effects:[],projectiles:[],serial:0,gunner:false,cruise:0,cruiseSpeed:0,aimYaw:0,aimPitch:0,rearm:0,rearming:false};}
export function rifleEye(player,groundY){return {x:player.x,y:groundY+RIFLE.eye,z:player.z};}
export function stepRifle(w,player,pitch,groundY,input,dt,range,boxes=[],{paused=false,random=Math.random}={}){
 if(paused||!Number.isFinite(dt)||dt<=0)return null;const h=Math.min(dt,.25);
 w.cooldown=Math.max(0,w.cooldown-h);w.flash=Math.max(0,w.flash-h);w.effects=w.effects.filter(e=>(e.life-=h)>0);
 if(w.reload>0){w.reload=Math.max(0,w.reload-h);if(w.reload===0){w.ammo=w.belt;}return null;}
 if(w.ammo<=0){w.reload=RIFLE.reload;return null;}
 if(!input.fire||w.cooldown>0||!range)return null;
 const origin=rifleEye(player,groundY),base=aimDirection(player.yaw,pitch),a=(random()-.5)*2*RIFLE.spread,b=(random()-.5)*2*RIFLE.spread;
 const dir={x:base.x+a,y:base.y+b,z:base.z},l=Math.hypot(dir.x,dir.y,dir.z)||1;dir.x/=l;dir.y/=l;dir.z/=l;
 const shot=hitscan(origin,dir,RIFLE.range,range,boxes);
 w.ammo--;w.shots++;range.shots++;w.cooldown=RIFLE.interval;w.flash=.06;
 let killed=false;if(shot.target){killed=damageTarget(range,shot.target,RIFLE.damage);w.hits++;if(killed)w.kills++;}
 w.effects.push({kind:'tracer',from:origin,to:shot.point,hit:!!shot.target,killed,life:.08});if(w.effects.length>24)w.effects.shift();
 return shot;
}
export const withinField=(x,z)=>Math.abs(x)<=FIELD.bounds&&Math.abs(z)<=FIELD.bounds;
