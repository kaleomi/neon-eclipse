import {createRuntimeWeapons} from '../weapons/runtime.js';
import {MAP_ID} from './level.js';
import {currentDifficulty} from './combat-difficulty.js';
import * as THREE from '../node_modules/three/build/three.module.js';
import {createP4Runtime} from './p4-runtime.js';
// P4 integration seam, moved out of app.js unchanged: builds the p4API facade over the live session (native combat stays
// the single source of truth), creates the runtime into ctx.p4, wraps combatUI.registerHit / fieldRecord.hurt, and either
// boots P4 (hiding the overlay) or adds the hub link. Returns p4API (app.js keeps it as a binding for the P4 test probe).
export function createP4Bridge(ctx){
 const p4BaseWeapons=createRuntimeWeapons(),p4LightBase=new Map();ctx.scene.traverse(o=>{if(o.isLight)p4LightBase.set(o,o.intensity);});
 const p4API={map:MAP_ID,scene:ctx.scene,camera:ctx.camera,enemies:ctx.enemies,obstacles:ctx.obstacles,meleeRange:ctx.weapons[3].range,
  invalidate(){ctx.navigation.invalidate();ctx.roofEnemyNavigation?.invalidate?.();},canOccupy:(x,z,y)=>ctx.playerMotion.canOccupy(x,z,y),
  snapshot(){return {state:ctx.state,telemetryId:ctx.telemetryAttempt?.id,position:{x:ctx.camera.position.x,y:ctx.camera.position.y,z:ctx.camera.position.z},yaw:ctx.yaw,pitch:ctx.pitch,selected:ctx.selected,health:ctx.health,kills:ctx.kills,stage:ctx.mission.state.index,damage:ctx.fieldRecord.records.reduce((n,r)=>n+r.damage,0),difficulty:currentDifficulty().id,input:['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','KeyE','KeyR'].reduce((n,k,i)=>n+(ctx.keys.has(k)?1<<i:0),0)+(ctx.firing?256:0)+(ctx.aiming?512:0)};},
  carry(){return {...ctx.loadout.checkpoint(),...ctx.ordnance.checkpoint(),...ctx.emp.checkpoint(),...ctx.fieldKit.checkpoint(),selected:ctx.selected,health:ctx.health,rounds:ctx.rounds.map(n=>Number.isFinite(n)?n:null),reserves:ctx.reserves.map(n=>Number.isFinite(n)?n:null)};},
  parameters(params){for(let i=0;i<ctx.weapons.length;i++){const b=p4BaseWeapons[i];ctx.weapons[i].spread=b.spread*params.spread;ctx.weapons[i].kick=b.kick*params.recoil;ctx.weapons[i].reload=b.reload*params.reload;ctx.weapons[i].reserve=Number.isFinite(b.reserve)?Math.floor(b.reserve*params.ammo):b.reserve;}},
  environment(params){if(params.fog>.014&&ctx.scene.fog)ctx.scene.fog.density=Math.max(ctx.scene.fog.density,params.fog);if(params.light!==1)for(const [light,base] of p4LightBase)light.intensity=base*params.light;},
  start(stage,primary,carry){ctx.runMode='replay';ctx.reset(stage);p4API.parameters(ctx.p4.params);ctx.replayEntry=ctx.checkpoint();if(carry?.loadout){ctx.ordnance.reset(carry.ordnance);ctx.loadout.reset(carry.loadout);ctx.emp.reset(carry.emp,carry.tactical,{checkpoint:true});ctx.fieldKit.reset(carry.fieldKit);}else ctx.loadout.equip(primary);ctx.selected=carry&&Number.isInteger(carry.selected)&&ctx.weapons[carry.selected]&&ctx.loadout.allows(carry.selected)?carry.selected:ctx.loadout.first();ctx.handling.reset();
   if(carry&&Number.isFinite(carry.health)&&carry.health>0&&carry.health<=100)ctx.health=carry.health;
   ctx.rounds=ctx.weapons.map((w,i)=>i===3?Infinity:Math.max(0,Math.min(w.cap,carry&&Number.isFinite(carry.rounds?.[i])?carry.rounds[i]:w.cap)));
   ctx.reserves=ctx.weapons.map((w,i)=>i===3?Infinity:Math.max(0,Math.min(w.reserve,carry&&Number.isFinite(carry.reserves?.[i])?carry.reserves[i]:w.reserve)));
   ctx.hud();},
  inventoryOpen:()=>ctx.loadoutWorld.open,play:()=>ctx.enterPlay(),stop(){ctx.pause();ctx.enemyProjectiles.clear();document.exitPointerLock?.();},
  heal(amount){ctx.health=Math.min(100,ctx.health+Math.max(0,amount));ctx.hud();},resupply(type){if(type==='health')ctx.health=Math.min(100,ctx.health+35);else ctx.reserves=ctx.weapons.map(w=>w.reserve);ctx.hud();},
  makeRange(){for(let i=0;i<ctx.enemies.length;i++){const e=ctx.enemies[i],angle=(i-(ctx.enemies.length-1)/2)*.5,feet=ctx.camera.position.y-1.7;for(const radius of [10,8,6,4]){const x=ctx.camera.position.x+Math.sin(angle)*radius,z=ctx.camera.position.z-Math.cos(angle)*radius;if(ctx.playerMotion.canOccupy(x,z,feet)&&ctx.lineOfSight(new THREE.Vector3(x,feet+1.2,z))){e.group.position.set(x,feet,z);break;}}e.p4Target=true;e.speed=0;e.attack=Infinity;e.hp=250;e.maxHp=250;}},rangeSupplies(){ctx.reserves=ctx.weapons.map(w=>w.reserve);},
  moveRange(t,origins){for(let i=0;i<ctx.enemies.length;i++){const e=ctx.enemies[i],o=origins.get(e);if(!o)continue;const x=o.x+Math.sin(t*(.55+i*.15)+i)*2;if(ctx.playerMotion.canOccupy(x,o.z,e.group.position.y))e.group.position.x=x;e.group.rotation.y=Math.atan2(ctx.camera.position.x-e.group.position.x,ctx.camera.position.z-e.group.position.z);}},
  replenishRange(){ctx.spawnEncounter(ctx.mission.current);p4API.makeRange();}
 };
 ctx.p4=createP4Runtime(p4API);
 const p4HitBase=ctx.combatUI.registerHit;ctx.combatUI.registerHit=(damage,head,count,source)=>{ctx.p4.hit(damage,head,count,source);p4HitBase(damage,head,count);};
 const p4HurtBase=ctx.fieldRecord.hurt;ctx.fieldRecord.hurt=n=>{ctx.p4.hurt?.(n);p4HurtBase(n);};
 if(ctx.p4.active){ctx.overlay.style.setProperty('display','none','important');ctx.p4.boot();}
 else {const link=document.createElement('a');link.href='./p4-hub.html';link.textContent='行动中枢 / P4 ↗';link.className='p4-home-link';link.style.cssText='position:fixed;top:68px;right:28px;z-index:140;padding:10px 18px;color:#a2f5da;background:linear-gradient(135deg,#12343eee,#081820ee);border:1px solid #497c87;text-decoration:none;font:13px sans-serif;box-shadow:0 8px 24px #0008,inset 0 1px #abfff833';document.body.append(link);const hideStyle=document.createElement('style');hideStyle.textContent='body[data-play-state="playing"] .p4-home-link{display:none}';document.head.append(hideStyle);}
 return p4API;
}
