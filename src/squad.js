// Lightweight behavior tree + squad coordinator. Pure logic: no THREE, no DOM.
// Trees decide an *intent* per enemy per tick; movement, LOS and projectiles stay in enemy-ai.js.
export const RUNNING='running',SUCCESS='success',FAILURE='failure';
export const condition=fn=>ctx=>fn(ctx)?SUCCESS:FAILURE;
export const action=fn=>ctx=>{const r=fn(ctx);return r===undefined?SUCCESS:r;};
export const selector=(...children)=>ctx=>{for(const child of children){const r=child(ctx);if(r!==FAILURE)return r;}return FAILURE;};
export const sequence=(...children)=>ctx=>{for(const child of children){const r=child(ctx);if(r!==SUCCESS)return r;}return SUCCESS;};
export const inverter=child=>ctx=>{const r=child(ctx);return r===SUCCESS?FAILURE:r===FAILURE?SUCCESS:r;};

// Squad roles: press = advance on the player, flank = approach via the side offset, cover = hold at range and fire.
export const SQUAD_ROLES=Object.freeze(['press','flank','cover']);
export const SQUAD_RULES=Object.freeze({maxPress:2,maxFlank:2,flankOffset:6,memorySeconds:6,reassignSeconds:2.5});
const behaviorOf=(enemy,types)=>types[enemy.type]?.behavior||enemy.type;
const squadEligible=(enemy,types)=>!enemy.boss&&!types[enemy.type]?.noSquad&&enemy.type!=='sentry'&&enemy.type!=='swarmDrone'&&enemy.type!=='harborElite'&&enemy.hp>0;
// Deterministic assignment: melee-ish silhouettes press first, ranged silhouettes cover, extra pressers flank.
export function assignSquadRoles(enemies,types,player,rules=SQUAD_RULES){
 const members=enemies.filter(e=>squadEligible(e,types));
 const byDistance=[...members].sort((a,b)=>dist2(a,player)-dist2(b,player));
 let press=0,flank=0;const roles=new Map();
 for(const e of byDistance){
  const ranged=behaviorOf(e,types)==='ranged';
  let role;
  if(!ranged&&press<rules.maxPress){role='press';press++;}
  else if(!ranged&&flank<rules.maxFlank){role='flank';flank++;}
  else if(ranged)role='cover';
  else role='press';
  roles.set(e,role);
 }
 return roles;
}
function dist2(e,p){const dx=e.group.position.x-p.x,dz=e.group.position.z-p.z;return dx*dx+dz*dz;}
export function createSquadCoordinator({types,rules=SQUAD_RULES}){
 let roles=new Map(),reassign=0,lastKnown=null,lastSeen=Infinity,flankSign=1,roster=[];
 function update(dt,enemies,player,anyoneSees){
  roster=enemies;
  if(anyoneSees){lastKnown={x:player.x,z:player.z};lastSeen=0;}else lastSeen+=dt;
  reassign-=dt;if(reassign<=0||[...roles.keys()].some(e=>!enemies.includes(e))){roles=assignSquadRoles(enemies,types,player,rules);reassign=rules.reassignSeconds;flankSign=-flankSign;}
 }
 // Navigation target for a member given its role. Flankers aim at a point offset sideways from the player;
 // cover holds; press goes straight. Memory: without any sighting for memorySeconds the squad forgets and everyone approaches the last known point.
 function target(enemy,player){
  const role=roles.get(enemy)||'press',known=lastKnown||{x:player.x,z:player.z},remembered=lastSeen<rules.memorySeconds;
  if(!remembered)return {role,x:known.x,z:known.z,search:true};
  if(role==='flank'){const dx=known.x-enemy.group.position.x,dz=known.z-enemy.group.position.z,len=Math.hypot(dx,dz)||1,side=flankSign*(enemy.seed%2?1:-1);return {role,x:known.x+(-dz/len)*side*rules.flankOffset,z:known.z+(dx/len)*side*rules.flankOffset,search:false};}
  return {role,x:known.x,z:known.z,search:false};
 }
 return {update,target,role:e=>roles.get(e)||null,get state(){return {roles:Object.fromEntries([...roles].map(([e,r])=>[roster.indexOf(e)+':'+e.type,r])),lastKnown,lastSeen};},clear(){roles=new Map();reassign=0;lastKnown=null;lastSeen=Infinity;roster=[];}};
}

// ---- Rusher: self-destruct sprinter. Red blink accelerates as it closes; detonates 1 s after arming inside 2.2 m.
export const RUSHER=Object.freeze({armRange:2.2,fuse:1,radius:3.5,damage:38,selfKillDamage:24,deathBlastRadius:2.2});
export function rusherIntent(enemy,dist,dt){
 // returns {state:'stalk'|'armed'|'detonate', blink:0..1}
 if(enemy.hp<=0)return {state:'dead',blink:0};
 if(enemy.rusherArmed){enemy.rusherFuse=Math.max(0,(enemy.rusherFuse??RUSHER.fuse)-dt);return {state:enemy.rusherFuse===0?'detonate':'armed',blink:1};}
 if(dist<=RUSHER.armRange){enemy.rusherArmed=true;enemy.rusherFuse=RUSHER.fuse;return {state:'armed',blink:1};}
 return {state:'stalk',blink:Math.max(0,Math.min(1,1-(dist-RUSHER.armRange)/12))};
}
// Blast damage helper for both player and other enemies; falloff is linear to the radius edge.
export function rusherBlastDamage(distance,{radius=RUSHER.radius,damage=RUSHER.damage}={}){return Number.isFinite(distance)&&distance>=0&&distance<radius?damage*(1-distance/radius):0;}

// ---- Artillery mech: slow biped, mortar with a 2 s red ground circle on the player's position; knee joint hits expose the core.
export const ARTILLERY=Object.freeze({telegraph:2,radius:3,damage:26,minRange:6,legHits:2,exposeSeconds:5,legMultiplier:1.6,coreMultiplier:2.5,armorMultiplier:.2});
export function artilleryDamage(enemy,base,zone){
 const state=enemy.artillery??(enemy.artillery={legHits:0,exposed:0});
 if(state.exposed>0&&zone==='core')return {damage:base*ARTILLERY.coreMultiplier,weak:true,armored:false};
 if(zone==='leg'){state.legHits++;if(state.legHits>=ARTILLERY.legHits){state.legHits=0;state.exposed=ARTILLERY.exposeSeconds;}return {damage:base*ARTILLERY.legMultiplier,weak:true,armored:false};}
 if(state.exposed>0)return {damage:base,weak:false,armored:false};
 return {damage:base*ARTILLERY.armorMultiplier,weak:false,armored:true};
}
export function stepArtillery(enemy,dt){const s=enemy.artillery;if(!s)return false;const was=s.exposed>0;s.exposed=Math.max(0,s.exposed-dt);return was&&s.exposed===0;}
// Mortar: sample point when telegraph starts; the shell lands there after `telegraph` seconds regardless of where the player went.
export function mortarStrike(point,player,{radius=ARTILLERY.radius,damage=ARTILLERY.damage}={}){const d=Math.hypot(player.x-point.x,player.z-point.z);return d<radius?damage*(1-d/radius*.5):0;}
